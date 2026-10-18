import { readFileSync, writeFileSync } from "node:fs";
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
  calculatePublishedEvidenceRankings,
  recordValueFamilyEngine,
  resultNetworkFamilyEngine,
  type CandidateRanking,
} from "./candidate-engines";
import {
  createOpponentWinPercentageScheduleRanks,
  seasonStage,
} from "./engine-benchmark";

export type CompositeAggregator =
  | "block-arithmetic"
  | "block-geometric"
  | "capped-family-arithmetic"
  | "family-median";

export type CompositeCandidate = {
  id: string;
  aggregator: CompositeAggregator;
  outcomeWeight: number | null;
  performanceWeight: number | null;
  purpose: string;
};

type RankingRow = {
  team: string;
  rank: number;
};

type TeamRange = {
  team: string;
  minimumRank: number;
  maximumRank: number;
  reviewStatus: string;
};

type CalibrationLabels = {
  season: number;
  week: number;
  ranges: TeamRange[];
};

type SeasonStage = ReturnType<typeof seasonStage>;

type StageMetrics = {
  movements: number[];
  predictionResults: number[];
  weakScheduleTop25Counts: number[];
  highDisagreementDeviations: number[];
};

type TournamentMetrics = StageMetrics & {
  pollErrors: number[];
  stages: Record<SeasonStage, StageMetrics>;
  currentTop25: RankingRow[] | null;
  currentKeyTeams: Record<string, number | null> | null;
  calibration: ReturnType<typeof evaluateCalibration> | null;
};

type SeasonMetrics = {
  movements: number[];
  predictionResults: number[];
  weakScheduleTop25Counts: number[];
};

const OUTCOME_WEIGHTS = [
  { id: "O75-P25", outcome: 0.75 },
  { id: "O67-P33", outcome: 2 / 3 },
  { id: "O60-P40", outcome: 0.6 },
  { id: "O50-P50", outcome: 0.5 },
] as const;

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

const FAMILY_BASELINES = [
  {
    id: "Family.CanonicalResultNetwork",
    purpose: "Prior-aware Canonical Result Network family",
  },
  {
    id: "Family.RecordValue",
    purpose: "Prior-aware Record Value family",
  },
  {
    id: "Family.CappedMarginPerformance",
    purpose: "Prior-aware Capped-Margin Performance family",
  },
] as const;

const INCUMBENT_BASELINES = [
  {
    id: "Curve.5.0",
    purpose: "Published Curve ranking",
  },
] as const;

export const COMPOSITE_CANDIDATES: readonly CompositeCandidate[] = [
  ...(["block-arithmetic", "block-geometric", "capped-family-arithmetic"] as const)
    .flatMap((aggregator) =>
      OUTCOME_WEIGHTS.map(({ id, outcome }) => ({
        id: `${aggregator}.${id}`,
        aggregator,
        outcomeWeight: outcome,
        performanceWeight: 1 - outcome,
        purpose:
          aggregator === "block-arithmetic"
            ? "Weighted arithmetic mean of the Outcome Block and Performance rank positions."
            : aggregator === "block-geometric"
              ? "Weighted geometric mean of the Outcome Block and Performance rank positions."
              : "Weighted arithmetic mean after capping each family to 20 rank positions from the family median.",
      }))
    ),
  {
    id: "family-median",
    aggregator: "family-median",
    outcomeWeight: null,
    performanceWeight: null,
    purpose:
      "Median rank position across Result Network, Record Value, and Performance.",
  },
];

function average(values: number[]) {
  return values.length === 0
    ? null
    : values.reduce((total, value) => total + value, 0) / values.length;
}

function median(values: number[]) {
  const ordered = values.toSorted((left, right) => left - right);
  return ordered[Math.floor(ordered.length / 2)] ?? 0;
}

function createStageMetrics(): StageMetrics {
  return {
    movements: [],
    predictionResults: [],
    weakScheduleTop25Counts: [],
    highDisagreementDeviations: [],
  };
}

function createTournamentMetrics(): TournamentMetrics {
  return {
    ...createStageMetrics(),
    pollErrors: [],
    stages: {
      early: createStageMetrics(),
      middle: createStageMetrics(),
      late: createStageMetrics(),
    },
    currentTop25: null,
    currentKeyTeams: null,
    calibration: null,
  };
}

function createSeasonMetrics(): SeasonMetrics {
  return {
    movements: [],
    predictionResults: [],
    weakScheduleTop25Counts: [],
  };
}

function rankingsByTeam(rankings: RankingRow[]) {
  return new Map(rankings.map(({ team, rank }) => [team, rank]));
}

function tieSafeRankPositions(rankings: CandidateRanking[]) {
  const ordered = rankings.toSorted(
    (left, right) =>
      right.score - left.score ||
      left.team.localeCompare(right.team),
  );
  const positions = new Map<string, number>();
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
    const position = averageRank / (ordered.length + 1);
    for (let index = groupStart; index < groupEnd; index += 1) {
      positions.set(ordered[index].team, position);
    }
    groupStart = groupEnd;
  }
  return positions;
}

export function combineFamilyRankings(
  candidate: CompositeCandidate,
  resultNetwork: CandidateRanking[],
  recordValue: CandidateRanking[],
  performance: CandidateRanking[],
) {
  if (
    resultNetwork.length !== recordValue.length ||
    resultNetwork.length !== performance.length
  ) {
    throw new Error("Composite families must rank the same team field.");
  }
  const resultPositions = tieSafeRankPositions(resultNetwork);
  const recordPositions = tieSafeRankPositions(recordValue);
  const performancePositions = tieSafeRankPositions(performance);
  const cap = 20 / Math.max(1, resultNetwork.length - 1);

  return resultNetwork
    .map((base) => {
      const positions = [
        resultPositions.get(base.team),
        recordPositions.get(base.team),
        performancePositions.get(base.team),
      ];
      if (positions.some((position) => position === undefined)) {
        throw new Error(
          `Composite family rankings do not all contain ${base.team}.`,
        );
      }
      let [resultPosition, recordPosition, performancePosition] =
        positions as [number, number, number];

      if (candidate.aggregator === "family-median") {
        return {
          base,
          position: median([
            resultPosition,
            recordPosition,
            performancePosition,
          ]),
        };
      }

      if (candidate.aggregator === "capped-family-arithmetic") {
        const familyMedian = median([
          resultPosition,
          recordPosition,
          performancePosition,
        ]);
        const minimum = familyMedian - cap;
        const maximum = familyMedian + cap;
        resultPosition = Math.max(
          minimum,
          Math.min(maximum, resultPosition),
        );
        recordPosition = Math.max(
          minimum,
          Math.min(maximum, recordPosition),
        );
        performancePosition = Math.max(
          minimum,
          Math.min(maximum, performancePosition),
        );
      }

      const outcomePosition = (resultPosition + recordPosition) / 2;
      const outcomeWeight = candidate.outcomeWeight;
      const performanceWeight = candidate.performanceWeight;
      if (outcomeWeight === null || performanceWeight === null) {
        throw new Error(`${candidate.id} requires block weights.`);
      }
      const position =
        candidate.aggregator === "block-geometric"
          ? outcomePosition ** outcomeWeight *
            performancePosition ** performanceWeight
          : outcomeWeight * outcomePosition +
            performanceWeight * performancePosition;
      return { base, position };
    })
    .toSorted(
      (left, right) =>
        left.position - right.position ||
        left.base.team.localeCompare(right.base.team),
    )
    .map(({ base, position }, index) => ({
      ...base,
      rank: index + 1,
      score: -position,
    }));
}

function priorAwareFamilyRankings(
  source: CfbdSourceCache,
  week: number,
  prior: RatingPrior,
) {
  const calculate = (
    engine:
      | typeof resultNetworkFamilyEngine
      | typeof recordValueFamilyEngine
      | typeof cappedMarginPerformanceFamilyEngine,
  ) => {
    return calculatePublishedEvidenceRankings(
      engine,
      source.games,
      week,
      prior,
    );
  };
  return {
    resultNetwork: calculate(resultNetworkFamilyEngine),
    recordValue: calculate(recordValueFamilyEngine),
    performance: calculate(cappedMarginPerformanceFamilyEngine),
  };
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
    return [
      (homeRank < awayRank) === (game.homePoints > game.awayPoints)
        ? 1
        : 0,
    ];
  });
}

function evaluateCalibration(
  rankings: RankingRow[],
  rangeMap: Map<string, TeamRange>,
) {
  const misses = rankings.flatMap(({ team, rank }) => {
    const range = rangeMap.get(team);
    if (!range) {
      throw new Error(`Missing calibration range for ${team}.`);
    }
    const distance =
      rank < range.minimumRank
        ? range.minimumRank - rank
        : rank > range.maximumRank
          ? rank - range.maximumRank
          : 0;
    return distance === 0
      ? []
      : [
          {
            team,
            rank,
            range: [range.minimumRank, range.maximumRank],
            distance,
            reviewStatus: range.reviewStatus,
          },
        ];
  });
  const statuses = [...new Set(
    [...rangeMap.values()].map(({ reviewStatus }) => reviewStatus),
  )];
  return {
    coverage: (rankings.length - misses.length) / rankings.length,
    missMae:
      misses.reduce((total, miss) => total + miss.distance, 0) /
      rankings.length,
    byReviewStatus: Object.fromEntries(
      statuses.map((reviewStatus) => {
        const ranges = [...rangeMap.values()].filter(
          (range) => range.reviewStatus === reviewStatus,
        );
        const statusMisses = misses.filter(
          (miss) => miss.reviewStatus === reviewStatus,
        );
        return [
          reviewStatus,
          {
            teams: ranges.length,
            coverage:
              (ranges.length - statusMisses.length) /
              Math.max(1, ranges.length),
            missMae:
              statusMisses.reduce(
                (total, miss) => total + miss.distance,
                0,
              ) / Math.max(1, ranges.length),
          },
        ];
      }),
    ),
    misses,
  };
}

function updateMetrics({
  metrics,
  seasonMetrics,
  rankings,
  previousRanks,
  familyRankMaps,
  commonScheduleRanks,
  weakScheduleMinimumRank,
  pollRanks,
  predictionResults,
  stage,
}: {
  metrics: TournamentMetrics;
  seasonMetrics: SeasonMetrics;
  rankings: RankingRow[];
  previousRanks: Map<string, number> | null;
  familyRankMaps: Map<string, number>[];
  commonScheduleRanks: Map<string, number>;
  weakScheduleMinimumRank: number;
  pollRanks: Array<{ rank: number; school: string }>;
  predictionResults: number[];
  stage: SeasonStage;
}) {
  const ranks = rankingsByTeam(rankings);
  const weakScheduleCount = rankings.filter(
    ({ team, rank }) =>
      rank <= 25 &&
      (commonScheduleRanks.get(team) ?? 0) >= weakScheduleMinimumRank,
  ).length;
  metrics.weakScheduleTop25Counts.push(weakScheduleCount);
  metrics.stages[stage].weakScheduleTop25Counts.push(weakScheduleCount);
  seasonMetrics.weakScheduleTop25Counts.push(weakScheduleCount);

  for (const { team, rank } of rankings) {
    const previousRank = previousRanks?.get(team);
    if (previousRank !== undefined) {
      const movement = Math.abs(rank - previousRank);
      metrics.movements.push(movement);
      metrics.stages[stage].movements.push(movement);
      seasonMetrics.movements.push(movement);
    }
    const familyRanks = familyRankMaps.flatMap((rankMap) => {
      const familyRank = rankMap.get(team);
      return familyRank === undefined ? [] : [familyRank];
    });
    if (
      familyRanks.length === familyRankMaps.length &&
      Math.max(...familyRanks) - Math.min(...familyRanks) >= 25
    ) {
      const deviation = Math.abs(rank - median(familyRanks));
      metrics.highDisagreementDeviations.push(deviation);
      metrics.stages[stage].highDisagreementDeviations.push(deviation);
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
  seasonMetrics.predictionResults.push(...predictionResults);
}

function summarizeStage(metrics: StageMetrics) {
  return {
    weeklyMovement: average(metrics.movements),
    nextWeekOrderingAccuracy: average(metrics.predictionResults),
    weakScheduleTop25PerSnapshot: average(
      metrics.weakScheduleTop25Counts,
    ),
    highDisagreementMedianDeviation: average(
      metrics.highDisagreementDeviations,
    ),
  };
}

function summarizeMetrics(metrics: TournamentMetrics) {
  return {
    ...summarizeStage(metrics),
    pollMae: average(metrics.pollErrors),
    stages: Object.fromEntries(
      (["early", "middle", "late"] as const).map((stage) => [
        stage,
        summarizeStage(metrics.stages[stage]),
      ]),
    ),
    calibration: metrics.calibration,
    currentKeyTeams: metrics.currentKeyTeams,
    currentTop25: metrics.currentTop25,
  };
}

function rankMetric(
  values: Array<{ id: string; value: number }>,
  direction: "ascending" | "descending",
) {
  return new Map(
    values
      .toSorted((left, right) => {
        const difference =
          direction === "ascending"
            ? left.value - right.value
            : right.value - left.value;
        return difference || left.id.localeCompare(right.id);
      })
      .map(({ id }, index) => [id, index + 1]),
  );
}

function leaveOneSeasonOut(
  candidateIds: string[],
  seasons: number[],
  seasonMetrics: Map<string, Map<number, SeasonMetrics>>,
) {
  const results = new Map(
    candidateIds.map((id) => [
      id,
      {
        balancedRanks: [] as number[],
        accuracyRanks: [] as number[],
        balancedWins: 0,
      },
    ]),
  );

  for (const omittedSeason of seasons) {
    const summaries = candidateIds.map((id) => {
      const bySeason = seasonMetrics.get(id)!;
      const included = seasons
        .filter((season) => season !== omittedSeason)
        .map((season) => bySeason.get(season)!);
      return {
        id,
        accuracy:
          average(included.flatMap((metrics) =>
            metrics.predictionResults
          )) ?? 0,
        movement:
          average(included.flatMap((metrics) => metrics.movements)) ??
          Number.POSITIVE_INFINITY,
        weakSchedule:
          average(included.flatMap((metrics) =>
            metrics.weakScheduleTop25Counts
          )) ?? Number.POSITIVE_INFINITY,
      };
    });
    const accuracyRanks = rankMetric(
      summaries.map(({ id, accuracy }) => ({ id, value: accuracy })),
      "descending",
    );
    const movementRanks = rankMetric(
      summaries.map(({ id, movement }) => ({ id, value: movement })),
      "ascending",
    );
    const weakScheduleRanks = rankMetric(
      summaries.map(({ id, weakSchedule }) => ({
        id,
        value: weakSchedule,
      })),
      "ascending",
    );
    const balanced = summaries
      .map(({ id }) => ({
        id,
        rank:
          ((accuracyRanks.get(id) ?? 0) +
            (movementRanks.get(id) ?? 0) +
            (weakScheduleRanks.get(id) ?? 0)) /
          3,
      }))
      .toSorted(
        (left, right) =>
          left.rank - right.rank || left.id.localeCompare(right.id),
      );
    const winner = balanced[0];
    if (winner) results.get(winner.id)!.balancedWins += 1;
    for (const { id, rank } of balanced) {
      results.get(id)!.balancedRanks.push(rank);
      results.get(id)!.accuracyRanks.push(accuracyRanks.get(id)!);
    }
  }

  return Object.fromEntries(
    candidateIds.map((id) => {
      const result = results.get(id)!;
      return [
        id,
        {
          balancedWins: result.balancedWins,
          averageBalancedRank: average(result.balancedRanks),
          averageAccuracyRank: average(result.accuracyRanks),
        },
      ];
    }),
  );
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

export function benchmarkCompositeCandidates(
  sources: CfbdSourceCache[],
  labels: CalibrationLabels,
) {
  const orderedSources = sources.toSorted(
    (left, right) => left.season - right.season,
  );
  const definitions = [
    ...INCUMBENT_BASELINES.map((definition) => ({
      ...definition,
      source: "incumbent" as const,
    })),
    ...FAMILY_BASELINES.map((definition) => ({
      ...definition,
      source: "family" as const,
    })),
    ...COMPOSITE_CANDIDATES.map((definition) => ({
      ...definition,
      source: "candidate" as const,
    })),
  ];
  const metricsById = new Map(
    definitions.map(({ id }) => [id, createTournamentMetrics()]),
  );
  const seasonMetricsById = new Map(
    definitions.map(({ id }) => [
      id,
      new Map(
        orderedSources.map(({ season }) => [
          season,
          createSeasonMetrics(),
        ]),
      ),
    ]),
  );
  const previousRanks = new Map<
    string,
    { season: number; ranks: Map<string, number> }
  >();
  const rangeMap = new Map(
    labels.ranges.map((range) => [range.team, range]),
  );

  for (const source of orderedSources) {
    const history = orderedSources.filter(
      (candidate) => candidate.season < source.season,
    );
    const starting = createChainedStartingPrior(
      source,
      history,
    );

    for (let week = 1; week <= source.throughWeek; week += 1) {
      const stage = seasonStage(week);
      const families = priorAwareFamilyRankings(
        source,
        week,
        starting.prior,
      );
      const familyRankMaps = [
        rankingsByTeam(families.resultNetwork),
        rankingsByTeam(families.recordValue),
        rankingsByTeam(families.performance),
      ];
      const rankingsById = new Map<string, RankingRow[]>([
        [
          "Curve.5.0",
          calculateBenchmarkRankings(
            "Curve.5.0",
            source.games,
            week,
            starting.prior,
          ),
        ],
        ["Family.CanonicalResultNetwork", families.resultNetwork],
        ["Family.RecordValue", families.recordValue],
        ["Family.CappedMarginPerformance", families.performance],
      ]);
      for (const candidate of COMPOSITE_CANDIDATES) {
        rankingsById.set(
          candidate.id,
          combineFamilyRankings(
            candidate,
            families.resultNetwork,
            families.recordValue,
            families.performance,
          ),
        );
      }

      const commonScheduleRanks =
        createOpponentWinPercentageScheduleRanks(source.games, week);
      const weakScheduleMinimumRank =
        Math.floor(commonScheduleRanks.size * 0.75) + 1;
      const pollRanks = selectBlendPolls(source, week).polls.flatMap(
        (poll) => poll.ranks,
      );

      for (const definition of definitions) {
        const rankings = rankingsById.get(definition.id);
        if (!rankings) {
          throw new Error(`Missing rankings for ${definition.id}.`);
        }
        const ranks = rankingsByTeam(rankings);
        const previous = previousRanks.get(definition.id);
        const metrics = metricsById.get(definition.id)!;
        updateMetrics({
          metrics,
          seasonMetrics:
            seasonMetricsById.get(definition.id)!.get(source.season)!,
          rankings,
          previousRanks:
            previous?.season === source.season ? previous.ranks : null,
          familyRankMaps,
          commonScheduleRanks,
          weakScheduleMinimumRank,
          pollRanks,
          predictionResults: fbsPredictionResults(source, week, ranks),
          stage,
        });
        previousRanks.set(definition.id, {
          season: source.season,
          ranks,
        });

        if (source.season === labels.season && week === labels.week) {
          metrics.calibration = evaluateCalibration(rankings, rangeMap);
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

  const candidateIds = COMPOSITE_CANDIDATES.map(({ id }) => id);
  return {
    generatedAt: new Date().toISOString(),
    seasons: orderedSources.length,
    snapshots: orderedSources.reduce(
      (total, source) => total + source.throughWeek,
      0,
    ),
    methodology: {
      prior:
        "All candidate families use the shared integrated-plus-output six-week zero-floor prior selected by the prior-aware experiment.",
      outcomeBlock:
        "Equal average of tie-safe Canonical Result Network and Record Value rank positions.",
      weights:
        "Only 75/25, 67/33, 60/40, and 50/50 Outcome/Performance weights were tested.",
      capped:
        "Each family rank position is limited to 20 rank positions from the three-family median before block weighting.",
      leaveOneSeasonOut:
        "For each omitted season, candidates receive ordinal ranks for pooled next-week ordering, weekly movement, and weak-schedule Top-25 incidence. Balanced rank is their unweighted mean.",
      calibration:
        "Current-snapshot intervals are provisional and partly derived from earlier computer evidence; they are a guardrail, not training truth.",
    },
    candidates: COMPOSITE_CANDIDATES,
    leaveOneSeasonOut: leaveOneSeasonOut(
      candidateIds,
      orderedSources.map(({ season }) => season),
      seasonMetricsById,
    ),
    results: Object.fromEntries(
      definitions.map((definition) => [
        definition.id,
        {
          ...definition,
          ...summarizeMetrics(metricsById.get(definition.id)!),
        },
      ]),
    ),
  };
}

function main() {
  const labelsPath = path.resolve(
    process.argv[2] ??
      "shawn/engine-calibration-ranges-2026-week-06.json",
  );
  const outputPath = path.resolve(
    process.argv[3] ?? "shawn/composite-tournament-results.json",
  );
  const labels = JSON.parse(
    readFileSync(labelsPath, "utf8"),
  ) as CalibrationLabels;
  const report = benchmarkCompositeCandidates(loadSources(), labels);
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    JSON.stringify(
      {
        outputPath,
        seasons: report.seasons,
        snapshots: report.snapshots,
        candidates: Object.fromEntries(
          COMPOSITE_CANDIDATES.map(({ id }) => {
            const result = report.results[id];
            return [
              id,
              {
                movement: result.weeklyMovement,
                earlyMovement: result.stages.early.weeklyMovement,
                ordering: result.nextWeekOrderingAccuracy,
                earlyOrdering:
                  result.stages.early.nextWeekOrderingAccuracy,
                weakScheduleTop25:
                  result.weakScheduleTop25PerSnapshot,
                calibrationCoverage: result.calibration?.coverage,
                jmu: result.currentKeyTeams?.["James Madison"],
                loo: report.leaveOneSeasonOut[id],
              },
            ];
          }),
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
