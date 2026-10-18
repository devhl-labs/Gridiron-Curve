import { writeFileSync } from "node:fs";
import path from "node:path";
import {
  listCfbdCacheManifests,
  readCfbdSourceCache,
  type CfbdSourceCache,
} from "../../src/lib/cfbd/cache";
import {
  calculateRankings,
  type RankingSystemId,
} from "../../src/lib/ranking";
import {
  createChainedStartingPrior,
  selectBlendPolls,
} from "../../src/lib/ranking/view";
import {
  CANDIDATE_ENGINES,
  type CandidateEngineFamily,
} from "./candidate-engines";
import {
  BENCHMARK_ENGINE_IDS,
  createOpponentWinPercentageScheduleRanks,
  seasonStage,
  spearmanRankCorrelation,
} from "./engine-benchmark";

type RankingRow = {
  team: string;
  rank: number;
};

type EngineAdapter = {
  id: string;
  family: CandidateEngineFamily | "incumbent";
  source: "incumbent" | "candidate";
  purpose: string;
  calculate(
    source: CfbdSourceCache,
    week: number,
    curvePrior: Record<string, number>,
  ): RankingRow[];
};

type EngineMetrics = {
  pollErrors: number[];
  movements: number[];
  weakScheduleTop25Counts: number[];
  predictionResults: number[];
  stages: Record<
    "early" | "middle" | "late",
    {
      movements: number[];
      weakScheduleTop25Counts: number[];
      predictionResults: number[];
    }
  >;
  currentTop25: RankingRow[] | null;
};

function average(values: number[]) {
  return values.length === 0
    ? null
    : values.reduce((total, value) => total + value, 0) / values.length;
}

function createMetrics(): EngineMetrics {
  return {
    pollErrors: [],
    movements: [],
    weakScheduleTop25Counts: [],
    predictionResults: [],
    stages: {
      early: {
        movements: [],
        weakScheduleTop25Counts: [],
        predictionResults: [],
      },
      middle: {
        movements: [],
        weakScheduleTop25Counts: [],
        predictionResults: [],
      },
      late: {
        movements: [],
        weakScheduleTop25Counts: [],
        predictionResults: [],
      },
    },
    currentTop25: null,
  };
}

const incumbentAdapters: EngineAdapter[] = BENCHMARK_ENGINE_IDS.map(
  (rankingSystemId) => ({
    id: rankingSystemId,
    family: "incumbent",
    source: "incumbent",
    purpose: "Published standalone engine",
    calculate(source, week, curvePrior) {
      return calculateRankings(
        source.games,
        week,
        rankingSystemId === "Curve.5.0" ? curvePrior : {},
        rankingSystemId as RankingSystemId,
      );
    },
  }),
);

const candidateAdapters: EngineAdapter[] = CANDIDATE_ENGINES.map(
  (engine) => ({
    id: engine.id,
    family: engine.family,
    source: "candidate",
    purpose: engine.purpose,
    calculate(source, week) {
      return engine.calculate(source.games, week);
    },
  }),
);

const engineAdapters = [...incumbentAdapters, ...candidateAdapters];

function rankingsByTeam(rankings: RankingRow[]) {
  return new Map(rankings.map(({ team, rank }) => [team, rank]));
}

function top25Overlap(
  left: Map<string, number>,
  right: Map<string, number>,
) {
  const leftTop25 = new Set(
    [...left].filter(([, rank]) => rank <= 25).map(([team]) => team),
  );
  return [...right].filter(
    ([team, rank]) => rank <= 25 && leftTop25.has(team),
  ).length;
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

function summarize(metrics: EngineMetrics) {
  return {
    weakScheduleTop25PerSnapshot: average(
      metrics.weakScheduleTop25Counts,
    ),
    weeklyMovement: average(metrics.movements),
    pollMae: average(metrics.pollErrors),
    nextWeekOrderingAccuracy: average(metrics.predictionResults),
    stages: Object.fromEntries(
      (["early", "middle", "late"] as const).map((stage) => [
        stage,
        {
          weakScheduleTop25PerSnapshot: average(
            metrics.stages[stage].weakScheduleTop25Counts,
          ),
          weeklyMovement: average(metrics.stages[stage].movements),
          nextWeekOrderingAccuracy: average(
            metrics.stages[stage].predictionResults,
          ),
        },
      ]),
    ),
    currentTop25: metrics.currentTop25,
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

function main() {
  const outputPath = path.resolve(
    process.argv[2] ??
      "shawn/candidate-engine-benchmark-results.json",
  );
  const sources = loadSources();
  const metricsByEngine = new Map(
    engineAdapters.map((engine) => [engine.id, createMetrics()]),
  );
  const previousRanks = new Map<
    string,
    { season: number; ranks: Map<string, number> }
  >();
  const pairMetrics = new Map<
    string,
    { correlations: number[]; top25Overlaps: number[] }
  >();

  for (const source of sources) {
    const history = sources.filter(
      (candidate) => candidate.season < source.season,
    );
    const curvePrior = createChainedStartingPrior(
      source,
      history,
      "Curve.5.0",
    ).prior;

    for (let week = 1; week <= source.throughWeek; week += 1) {
      const stage = seasonStage(week);
      const commonScheduleRanks =
        createOpponentWinPercentageScheduleRanks(source.games, week);
      const weakScheduleMinimumRank =
        Math.floor(commonScheduleRanks.size * 0.75) + 1;
      const pollRanks = selectBlendPolls(source, week).polls.flatMap(
        (poll) => poll.ranks,
      );
      const snapshotRanks = new Map<string, Map<string, number>>();

      for (const engine of engineAdapters) {
        const rankings = engine.calculate(source, week, curvePrior);
        const ranks = rankingsByTeam(rankings);
        snapshotRanks.set(engine.id, ranks);
        const metrics = metricsByEngine.get(engine.id)!;
        const weakScheduleCount = rankings.filter(
          ({ team, rank }) =>
            rank <= 25 &&
            (commonScheduleRanks.get(team) ?? 0) >=
              weakScheduleMinimumRank,
        ).length;
        metrics.weakScheduleTop25Counts.push(weakScheduleCount);
        metrics.stages[stage].weakScheduleTop25Counts.push(
          weakScheduleCount,
        );

        for (const pollRank of pollRanks) {
          const rank = ranks.get(pollRank.school);
          if (rank !== undefined) {
            metrics.pollErrors.push(Math.abs(rank - pollRank.rank));
          }
        }

        const prior = previousRanks.get(engine.id);
        if (prior?.season === source.season) {
          for (const [team, rank] of ranks) {
            const previousRank = prior.ranks.get(team);
            if (previousRank === undefined) continue;
            const movement = Math.abs(rank - previousRank);
            metrics.movements.push(movement);
            metrics.stages[stage].movements.push(movement);
          }
        }
        previousRanks.set(engine.id, { season: source.season, ranks });

        const predictionResults = fbsPredictionResults(
          source,
          week,
          ranks,
        );
        metrics.predictionResults.push(...predictionResults);
        metrics.stages[stage].predictionResults.push(
          ...predictionResults,
        );

        if (source === sources.at(-1) && week === source.throughWeek) {
          metrics.currentTop25 = rankings.slice(0, 25);
        }
      }

      for (
        let leftIndex = 0;
        leftIndex < engineAdapters.length;
        leftIndex += 1
      ) {
        for (
          let rightIndex = leftIndex + 1;
          rightIndex < engineAdapters.length;
          rightIndex += 1
        ) {
          const left = engineAdapters[leftIndex];
          const right = engineAdapters[rightIndex];
          const leftRanks = snapshotRanks.get(left.id)!;
          const rightRanks = snapshotRanks.get(right.id)!;
          const correlation = spearmanRankCorrelation(
            leftRanks,
            rightRanks,
          );
          const key = `${left.id}|${right.id}`;
          const pair = pairMetrics.get(key) ?? {
            correlations: [],
            top25Overlaps: [],
          };
          if (correlation !== null) {
            pair.correlations.push(correlation);
          }
          pair.top25Overlaps.push(top25Overlap(leftRanks, rightRanks));
          pairMetrics.set(key, pair);
        }
      }
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    seasons: sources.length,
    snapshots: sources.reduce(
      (total, source) => total + source.throughWeek,
      0,
    ),
    predictionDefinition:
      "Whether the higher-ranked team before a game won the next completed FBS-vs-FBS game; venue and confidence are not considered.",
    engines: Object.fromEntries(
      engineAdapters.map((engine) => [
        engine.id,
        {
          source: engine.source,
          family: engine.family,
          purpose: engine.purpose,
          ...summarize(metricsByEngine.get(engine.id)!),
        },
      ]),
    ),
    pairs: [...pairMetrics]
      .map(([key, metrics]) => {
        const [left, right] = key.split("|");
        return {
          left,
          right,
          averageSpearman: average(metrics.correlations),
          averageTop25Overlap: average(metrics.top25Overlaps),
        };
      })
      .toSorted(
        (left, right) =>
          (right.averageSpearman ?? -1) -
            (left.averageSpearman ?? -1) ||
          left.left.localeCompare(right.left) ||
          left.right.localeCompare(right.right),
      ),
  };
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    JSON.stringify(
      {
        outputPath,
        seasons: report.seasons,
        snapshots: report.snapshots,
        candidates: Object.fromEntries(
          CANDIDATE_ENGINES.map((engine) => {
            const result = report.engines[engine.id];
            return [
              engine.id,
              {
                weakScheduleTop25PerSnapshot:
                  result.weakScheduleTop25PerSnapshot,
                weeklyMovement: result.weeklyMovement,
                pollMae: result.pollMae,
                nextWeekOrderingAccuracy:
                  result.nextWeekOrderingAccuracy,
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

main();
