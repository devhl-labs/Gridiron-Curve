import { writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  listCfbdCacheManifests,
  readCfbdSourceCache,
  type CfbdSourceCache,
} from "../../src/lib/cfbd/cache";
import {
  type RatingPrior,
} from "../../src/lib/ranking";
import {
  createChainedStartingPrior,
  selectBlendPolls,
} from "../../src/lib/ranking/view";
import {
  calculateBenchmarkRankings,
} from "./benchmark-engines";
import {
  cappedMarginPerformanceFamilyEngine,
  recordValueFamilyEngine,
  resultNetworkFamilyEngine,
  stabilizeOutputRankings,
  type CandidateEngine,
} from "./candidate-engines";
import {
  createOpponentWinPercentageScheduleRanks,
  seasonStage,
} from "./engine-benchmark";

export type PriorFadePolicy = {
  id: string;
  description: string;
  fadeWeeks: number;
  floor: number;
};

export const PRIOR_FADE_POLICIES = [
  {
    id: "curve-6-floor25",
    description:
      "Curve-style six-week linear fade from full prior weight to a 25% floor.",
    fadeWeeks: 6,
    floor: 0.25,
  },
  {
    id: "six-week-zero",
    description:
      "Six-week linear fade from full prior weight to no inherited weight.",
    fadeWeeks: 6,
    floor: 0,
  },
  {
    id: "four-week-zero",
    description:
      "Four-week linear fade from full prior weight to no inherited weight.",
    fadeWeeks: 4,
    floor: 0,
  },
] as const satisfies readonly PriorFadePolicy[];

type SeasonStage = ReturnType<typeof seasonStage>;
type Architecture =
  | "neutral"
  | "output-prior"
  | "integrated-prior"
  | "integrated-output-prior"
  | "curve";
type StartingBucket = "top-10" | "11-25" | "26-50" | "lower-field";

type RankingRow = {
  team: string;
  rank: number;
};

type VariantDefinition = {
  id: string;
  familyId: string | null;
  architecture: Architecture;
  policyId: string | null;
  purpose: string;
};

type StageMetrics = {
  movements: number[];
  predictionResults: number[];
  weakScheduleTop25Counts: number[];
  priorDisplacements: number[];
  priorOutsiderTop25Counts: number[];
};

type RecoveryMetrics = {
  finalNeutralErrors: number[];
  majorPriorMissErrors: number[];
  promotedTeamErrors: number[];
  demotedTeamErrors: number[];
};

type VariantMetrics = StageMetrics & {
  pollErrors: number[];
  stages: Record<SeasonStage, StageMetrics>;
  startingBuckets: Record<
    StartingBucket,
    {
      rankChanges: number[];
    }
  >;
  recovery: RecoveryMetrics;
  currentTop25: RankingRow[] | null;
  currentKeyTeams: Record<string, number | null> | null;
};

const CURRENT_KEY_TEAMS = [
  "Georgia",
  "Alabama",
  "Notre Dame",
  "Texas",
  "Ohio State",
  "Tennessee",
  "Utah",
  "James Madison",
  "SMU",
] as const;

const SELECTED_FAMILY_ENGINES = [
  resultNetworkFamilyEngine,
  recordValueFamilyEngine,
  cappedMarginPerformanceFamilyEngine,
] as const satisfies readonly CandidateEngine[];

export function priorWeight(
  completedWeeks: number,
  policy: PriorFadePolicy,
) {
  if (policy.fadeWeeks <= 0) return policy.floor;
  return Math.max(
    policy.floor,
    1 -
      ((1 - policy.floor) * completedWeeks) /
        policy.fadeWeeks,
  );
}

function average(values: number[]) {
  return values.length === 0
    ? null
    : values.reduce((total, value) => total + value, 0) / values.length;
}

function createStageMetrics(): StageMetrics {
  return {
    movements: [],
    predictionResults: [],
    weakScheduleTop25Counts: [],
    priorDisplacements: [],
    priorOutsiderTop25Counts: [],
  };
}

function createVariantMetrics(): VariantMetrics {
  return {
    ...createStageMetrics(),
    pollErrors: [],
    stages: {
      early: createStageMetrics(),
      middle: createStageMetrics(),
      late: createStageMetrics(),
    },
    startingBuckets: {
      "top-10": { rankChanges: [] },
      "11-25": { rankChanges: [] },
      "26-50": { rankChanges: [] },
      "lower-field": { rankChanges: [] },
    },
    recovery: {
      finalNeutralErrors: [],
      majorPriorMissErrors: [],
      promotedTeamErrors: [],
      demotedTeamErrors: [],
    },
    currentTop25: null,
    currentKeyTeams: null,
  };
}

function rankingsByTeam(rankings: RankingRow[]) {
  return new Map(rankings.map(({ team, rank }) => [team, rank]));
}

function startingBucket(rank: number): StartingBucket {
  if (rank <= 10) return "top-10";
  if (rank <= 25) return "11-25";
  if (rank <= 50) return "26-50";
  return "lower-field";
}

function averageRanksByScore(
  rows: Array<{ team: string; score: number }>,
) {
  const ordered = rows.toSorted(
    (left, right) =>
      right.score - left.score ||
      left.team.localeCompare(right.team),
  );
  const ranks = new Map<string, number>();
  let groupStart = 0;
  while (groupStart < ordered.length) {
    let groupEnd = groupStart + 1;
    while (
      groupEnd < ordered.length &&
      ordered[groupEnd].score === ordered[groupStart].score
    ) {
      groupEnd += 1;
    }
    const averageRank = (groupStart + 1 + groupEnd) / 2;
    for (let index = groupStart; index < groupEnd; index += 1) {
      ranks.set(ordered[index].team, averageRank);
    }
    groupStart = groupEnd;
  }
  return ranks;
}

export function createPriorRanks(
  teams: string[],
  prior: RatingPrior,
) {
  return averageRanksByScore(
    teams.map((team) => ({
      team,
      score: prior[team] ?? 0.5,
    })),
  );
}

export { stabilizeOutputRankings };

function variantDefinitions() {
  const variants: VariantDefinition[] = [
    {
      id: "Curve.5.0",
      familyId: null,
      architecture: "curve",
      policyId: null,
      purpose:
        "Published Curve engine with its historical prior and internal six-week fade.",
    },
  ];
  for (const engine of SELECTED_FAMILY_ENGINES) {
    variants.push({
      id: `${engine.id}.Neutral`,
      familyId: engine.id,
      architecture: "neutral",
      policyId: null,
      purpose: `${engine.purpose} No preseason prior.`,
    });
    for (const policy of PRIOR_FADE_POLICIES) {
      variants.push(
        {
          id: `${engine.id}.Output.${policy.id}`,
          familyId: engine.id,
          architecture: "output-prior",
          policyId: policy.id,
          purpose:
            `${engine.purpose} Shared prior applied only to the output order.`,
        },
        {
          id: `${engine.id}.Integrated.${policy.id}`,
          familyId: engine.id,
          architecture: "integrated-prior",
          policyId: policy.id,
          purpose:
            `${engine.purpose} Shared prior regularizes team and opponent strength.`,
        },
        {
          id: `${engine.id}.IntegratedOutput.${policy.id}`,
          familyId: engine.id,
          architecture: "integrated-output-prior",
          policyId: policy.id,
          purpose:
            `${engine.purpose} Shared prior regularizes team and opponent strength, then applies the same output stabilization.`,
        },
      );
    }
  }
  return variants;
}

function fbsPredictionResults(
  source: CfbdSourceCache,
  week: number,
  ranks: Map<string, number>,
) {
  return source.games.flatMap((game) => {
    if (
      !game.completed ||
      game.seasonType === "postseason" ||
      game.week !== week + 1 ||
      game.homePoints === null ||
      game.awayPoints === null ||
      game.homePoints === game.awayPoints
    ) {
      return [];
    }
    const homeRank = ranks.get(game.homeTeam);
    const awayRank = ranks.get(game.awayTeam);
    if (homeRank === undefined || awayRank === undefined) return [];
    const predictedHome = homeRank < awayRank;
    const homeWon = game.homePoints > game.awayPoints;
    return [predictedHome === homeWon ? 1 : 0];
  });
}

function updateMetrics({
  metrics,
  rankings,
  priorRanks,
  commonScheduleRanks,
  weakScheduleMinimumRank,
  pollRanks,
  predictionResults,
  stage,
  previousRanks,
}: {
  metrics: VariantMetrics;
  rankings: RankingRow[];
  priorRanks: Map<string, number>;
  commonScheduleRanks: Map<string, number>;
  weakScheduleMinimumRank: number;
  pollRanks: Array<{ rank: number; school: string }>;
  predictionResults: number[];
  stage: SeasonStage;
  previousRanks: Map<string, number> | null;
}) {
  const ranks = rankingsByTeam(rankings);
  const weakScheduleCount = rankings.filter(
    ({ team, rank }) =>
      rank <= 25 &&
      (commonScheduleRanks.get(team) ?? 0) >= weakScheduleMinimumRank,
  ).length;
  metrics.weakScheduleTop25Counts.push(weakScheduleCount);
  metrics.stages[stage].weakScheduleTop25Counts.push(weakScheduleCount);

  const priorOutsiderCount = rankings.filter(
    ({ team, rank }) =>
      rank <= 25 && (priorRanks.get(team) ?? Number.POSITIVE_INFINITY) > 25,
  ).length;
  metrics.priorOutsiderTop25Counts.push(priorOutsiderCount);
  metrics.stages[stage].priorOutsiderTop25Counts.push(
    priorOutsiderCount,
  );

  for (const { team, rank } of rankings) {
    const priorRank = priorRanks.get(team);
    if (priorRank !== undefined) {
      const displacement = Math.abs(rank - priorRank);
      metrics.priorDisplacements.push(displacement);
      metrics.stages[stage].priorDisplacements.push(displacement);
      metrics.startingBuckets[startingBucket(priorRank)].rankChanges.push(
        rank - priorRank,
      );
    }
    const previousRank = previousRanks?.get(team);
    if (previousRank !== undefined) {
      const movement = Math.abs(rank - previousRank);
      metrics.movements.push(movement);
      metrics.stages[stage].movements.push(movement);
    }
  }

  for (const pollRank of pollRanks) {
    const rank = ranks.get(pollRank.school);
    if (rank !== undefined) {
      metrics.pollErrors.push(Math.abs(rank - pollRank.rank));
    }
  }
  metrics.predictionResults.push(...predictionResults);
  metrics.stages[stage].predictionResults.push(...predictionResults);
}

function updateRecoveryMetrics(
  metrics: VariantMetrics,
  rankings: RankingRow[],
  priorRanks: Map<string, number>,
  finalNeutralRanks: Map<string, number>,
) {
  const ranks = rankingsByTeam(rankings);
  for (const [team, neutralRank] of finalNeutralRanks) {
    const rank = ranks.get(team);
    const priorRank = priorRanks.get(team);
    if (rank === undefined || priorRank === undefined) continue;
    const error = Math.abs(rank - neutralRank);
    metrics.recovery.finalNeutralErrors.push(error);
    if (Math.abs(priorRank - neutralRank) >= 25) {
      metrics.recovery.majorPriorMissErrors.push(error);
    }
    if (priorRank > 50 && neutralRank <= 25) {
      metrics.recovery.promotedTeamErrors.push(error);
    }
    if (priorRank <= 25 && neutralRank > 50) {
      metrics.recovery.demotedTeamErrors.push(error);
    }
  }
}

function summarizeStage(metrics: StageMetrics) {
  return {
    weeklyMovement: average(metrics.movements),
    nextWeekOrderingAccuracy: average(metrics.predictionResults),
    weakScheduleTop25PerSnapshot: average(
      metrics.weakScheduleTop25Counts,
    ),
    meanAbsoluteDisplacementFromPrior: average(
      metrics.priorDisplacements,
    ),
    priorOutsidersInTop25: average(
      metrics.priorOutsiderTop25Counts,
    ),
  };
}

function summarizeMetrics(metrics: VariantMetrics) {
  return {
    ...summarizeStage(metrics),
    pollMae: average(metrics.pollErrors),
    stages: Object.fromEntries(
      (["early", "middle", "late"] as const).map((stage) => [
        stage,
        summarizeStage(metrics.stages[stage]),
      ]),
    ),
    startingBuckets: Object.fromEntries(
      ([
        "top-10",
        "11-25",
        "26-50",
        "lower-field",
      ] as const).map((bucket) => {
        const changes = metrics.startingBuckets[bucket].rankChanges;
        return [
          bucket,
          {
            observations: changes.length,
            averageRankChange: average(changes),
            meanAbsoluteRankChange: average(
              changes.map((value) => Math.abs(value)),
            ),
          },
        ];
      }),
    ),
    finalRecovery: {
      finalNeutralMae: average(
        metrics.recovery.finalNeutralErrors,
      ),
      majorPriorMissMae: average(
        metrics.recovery.majorPriorMissErrors,
      ),
      majorPriorMissTeams:
        metrics.recovery.majorPriorMissErrors.length,
      promotedTeamMae: average(
        metrics.recovery.promotedTeamErrors,
      ),
      promotedTeams: metrics.recovery.promotedTeamErrors.length,
      demotedTeamMae: average(
        metrics.recovery.demotedTeamErrors,
      ),
      demotedTeams: metrics.recovery.demotedTeamErrors.length,
    },
    currentTop25: metrics.currentTop25,
    currentKeyTeams: metrics.currentKeyTeams,
  };
}

function loadSources() {
  return listCfbdCacheManifests()
    .toSorted((left, right) => left.season - right.season)
    .map(({ season }) => {
      const source = readCfbdSourceCache(season);
      if (!source) throw new Error(`Missing source cache for ${season}.`);
      return source;
    });
}

export function benchmarkPriorArchitectures(
  sources: CfbdSourceCache[],
) {
  const orderedSources = sources.toSorted(
    (left, right) => left.season - right.season,
  );
  const definitions = variantDefinitions();
  const metricsByVariant = new Map(
    definitions.map(({ id }) => [id, createVariantMetrics()]),
  );
  const previousRanks = new Map<
    string,
    { season: number; ranks: Map<string, number> }
  >();
  const priorCoverage: Array<{
    season: number;
    teams: number;
    teamsWithPrior: number;
    coverage: number;
    description: string;
  }> = [];

  for (const source of orderedSources) {
    const history = orderedSources.filter(
      (candidate) => candidate.season < source.season,
    );
    const starting = createChainedStartingPrior(
      source,
      history,
    );
    const finalNeutralByFamily = new Map(
      SELECTED_FAMILY_ENGINES.map((engine) => [
        engine.id,
        engine.calculate(source.games, source.throughWeek),
      ]),
    );
    const teams =
      finalNeutralByFamily.get(SELECTED_FAMILY_ENGINES[0].id)?.map(
        ({ team }) => team,
      ) ?? [];
    const seasonPriorRanks = createPriorRanks(teams, starting.prior);
    const teamsWithPrior = teams.filter((team) =>
      Object.hasOwn(starting.prior, team)
    ).length;
    const coverage = teamsWithPrior / Math.max(1, teams.length);
    priorCoverage.push({
      season: source.season,
      teams: teams.length,
      teamsWithPrior,
      coverage,
      description: starting.description,
    });

    for (let week = 1; week <= source.throughWeek; week += 1) {
      const stage = seasonStage(week);
      const commonScheduleRanks =
        createOpponentWinPercentageScheduleRanks(source.games, week);
      const weakScheduleMinimumRank =
        Math.floor(commonScheduleRanks.size * 0.75) + 1;
      const pollRanks = selectBlendPolls(source, week).polls.flatMap(
        (poll) => poll.ranks,
      );
      const snapshotRankings = new Map<string, RankingRow[]>();
      snapshotRankings.set(
        "Curve.5.0",
        calculateBenchmarkRankings(
          "Curve.5.0",
          source.games,
          week,
          starting.prior,
        ),
      );

      for (const engine of SELECTED_FAMILY_ENGINES) {
        const neutral = engine.calculate(source.games, week);
        snapshotRankings.set(`${engine.id}.Neutral`, neutral);
        for (const policy of PRIOR_FADE_POLICIES) {
          const weight = priorWeight(week, policy);
          snapshotRankings.set(
            `${engine.id}.Output.${policy.id}`,
            stabilizeOutputRankings(
              neutral,
              starting.prior,
              weight,
            ),
          );
          const integrated = engine.calculate(source.games, week, {
              prior: starting.prior,
              priorWeight: weight,
            });
          snapshotRankings.set(
            `${engine.id}.Integrated.${policy.id}`,
            integrated,
          );
          snapshotRankings.set(
            `${engine.id}.IntegratedOutput.${policy.id}`,
            stabilizeOutputRankings(
              integrated,
              starting.prior,
              weight,
            ),
          );
        }
      }

      for (const definition of definitions) {
        const rankings = snapshotRankings.get(definition.id);
        if (!rankings) {
          throw new Error(`Missing rankings for ${definition.id}.`);
        }
        const ranks = rankingsByTeam(rankings);
        const prior = previousRanks.get(definition.id);
        const metrics = metricsByVariant.get(definition.id)!;
        updateMetrics({
          metrics,
          rankings,
          priorRanks: seasonPriorRanks,
          commonScheduleRanks,
          weakScheduleMinimumRank,
          pollRanks,
          predictionResults: fbsPredictionResults(source, week, ranks),
          stage,
          previousRanks:
            prior?.season === source.season ? prior.ranks : null,
        });
        previousRanks.set(definition.id, {
          season: source.season,
          ranks,
        });

        if (week === source.throughWeek && definition.familyId) {
          const finalNeutral = finalNeutralByFamily.get(
            definition.familyId,
          );
          if (!finalNeutral) {
            throw new Error(
              `Missing final neutral ranking for ${definition.familyId}.`,
            );
          }
          if (coverage >= 0.9) {
            updateRecoveryMetrics(
              metrics,
              rankings,
              seasonPriorRanks,
              rankingsByTeam(finalNeutral),
            );
          }
        }
        if (
          source === orderedSources.at(-1) &&
          week === source.throughWeek
        ) {
          metrics.currentTop25 = rankings.slice(0, 25);
          metrics.currentKeyTeams = Object.fromEntries(
            CURRENT_KEY_TEAMS.map((team) => [
              team,
              ranks.get(team) ?? null,
            ]),
          );
        }
      }
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    seasons: orderedSources.length,
    snapshots: orderedSources.reduce(
      (total, source) => total + source.throughWeek,
      0,
    ),
    methodology: {
      prior:
        "The same leakage-safe preseason AP/Coaches plus prior-season final Curve order supplied by createChainedStartingPrior.",
      neutral:
        "Current-season games only; retained as the structural and late-season baseline.",
      outputPrior:
        "Blend neutral rank percentile with the shared preseason prior after the engine calculates.",
      integratedPrior:
        "Use the shared prior to regularize team and opponent-strength estimates inside the engine without a separate output blend.",
      integratedOutputPrior:
        "Use the shared prior inside the engine and then apply the same output stabilization as the output-only architecture. This isolates whether prior-aware opponent estimates add value.",
      recovery:
        "Final-week prior-aware ranks are compared with the same family's final neutral order. Prior-specific recovery metrics include seasons with at least 90% team coverage.",
      pollMae:
        "Secondary and partly circular because the shared prior contains preseason AP and Coaches polls.",
    },
    policies: PRIOR_FADE_POLICIES.map((policy) => ({
      ...policy,
      weightsByWeek: Object.fromEntries(
        Array.from({ length: 12 }, (_, index) => [
          index + 1,
          priorWeight(index + 1, policy),
        ]),
      ),
    })),
    priorCoverage,
    variants: Object.fromEntries(
      definitions.map((definition) => [
        definition.id,
        {
          ...definition,
          ...summarizeMetrics(metricsByVariant.get(definition.id)!),
        },
      ]),
    ),
  };
}

function main() {
  const outputPath = path.resolve(
    process.argv[2] ??
      "shawn/prior-aware-engine-benchmark-results.json",
  );
  const report = benchmarkPriorArchitectures(loadSources());
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    JSON.stringify(
      {
        outputPath,
        seasons: report.seasons,
        snapshots: report.snapshots,
        variants: Object.fromEntries(
          Object.entries(report.variants).map(([id, metrics]) => [
            id,
            {
              earlyMovement: metrics.stages.early.weeklyMovement,
              earlyAccuracy:
                metrics.stages.early.nextWeekOrderingAccuracy,
              overallAccuracy: metrics.nextWeekOrderingAccuracy,
              majorPriorMissMae:
                metrics.finalRecovery.majorPriorMissMae,
            },
          ]),
        ),
      },
      null,
      2,
    ),
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main();
}
