import { writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  listCfbdCacheManifests,
  readCfbdSourceCache,
  type CfbdSourceCache,
} from "../../src/lib/cfbd/cache";
import {
  calculateRankings,
  hasUsableBoxScore,
  type Game,
  type RankingSystemId,
  type TeamRanking,
} from "../../src/lib/ranking";
import {
  createChainedStartingPrior,
  selectBlendPolls,
} from "../../src/lib/ranking/view";

export const BENCHMARK_ENGINE_IDS = [
  "Curve.5.0",
  "RecordMatrix.1.0",
  "Pairwise.1.0",
  "Sequence.1.0",
  "LeastSquares.1.0",
  "VictoryPaths.1.0",
  "ScheduleRecord.1.0",
] as const satisfies readonly RankingSystemId[];

type BenchmarkEngineId = (typeof BENCHMARK_ENGINE_IDS)[number];
type SeasonStage = "early" | "middle" | "late";

type MetricAccumulator = {
  pollErrors: number[];
  movements: number[];
  weakScheduleTop25Counts: number[];
};

type EngineAccumulator = MetricAccumulator & {
  stages: Record<SeasonStage, MetricAccumulator>;
  snapshotCount: number;
  currentTop25: Array<{ rank: number; team: string }> | null;
};

type PairAccumulator = {
  correlations: number[];
  top25Overlaps: number[];
};

type OpponentResult = {
  opponent: string;
  result: number;
};

function average(values: number[]) {
  return values.length === 0
    ? null
    : values.reduce((total, value) => total + value, 0) / values.length;
}

function createMetricAccumulator(): MetricAccumulator {
  return {
    pollErrors: [],
    movements: [],
    weakScheduleTop25Counts: [],
  };
}

function createEngineAccumulator(): EngineAccumulator {
  return {
    ...createMetricAccumulator(),
    stages: {
      early: createMetricAccumulator(),
      middle: createMetricAccumulator(),
      late: createMetricAccumulator(),
    },
    snapshotCount: 0,
    currentTop25: null,
  };
}

export function seasonStage(week: number): SeasonStage {
  if (week <= 4) return "early";
  if (week <= 9) return "middle";
  return "late";
}

function getFbsTeams(games: Game[]) {
  const teams = new Set<string>();
  let hasClassifications = false;
  for (const game of games) {
    if (game.seasonType === "postseason") continue;
    if (game.homeClassification !== undefined) hasClassifications = true;
    if (game.awayClassification !== undefined) hasClassifications = true;
    if (game.homeClassification === "fbs") teams.add(game.homeTeam);
    if (game.awayClassification === "fbs") teams.add(game.awayTeam);
  }
  if (!hasClassifications) {
    for (const game of games) {
      if (game.seasonType === "postseason") continue;
      teams.add(game.homeTeam);
      teams.add(game.awayTeam);
    }
  }
  return teams;
}

export function createOpponentWinPercentageScheduleRanks(
  games: Game[],
  throughWeek: number,
) {
  const fbsTeams = getFbsTeams(games);
  const completed = games.filter(
    (game) =>
      game.completed &&
      game.seasonType !== "postseason" &&
      game.week <= throughWeek &&
      game.homePoints !== null &&
      game.awayPoints !== null &&
      (fbsTeams.has(game.homeTeam) || fbsTeams.has(game.awayTeam)),
  );
  const schedules = new Map<string, OpponentResult[]>(
    [...fbsTeams].map((team) => [team, []]),
  );
  const allResults = new Map<string, OpponentResult[]>();

  for (const game of completed) {
    const homeResult =
      game.homePoints! > game.awayPoints!
        ? 1
        : game.homePoints! < game.awayPoints!
          ? 0
          : 0.5;
    const homeGames = allResults.get(game.homeTeam) ?? [];
    homeGames.push({ opponent: game.awayTeam, result: homeResult });
    allResults.set(game.homeTeam, homeGames);
    const awayGames = allResults.get(game.awayTeam) ?? [];
    awayGames.push({ opponent: game.homeTeam, result: 1 - homeResult });
    allResults.set(game.awayTeam, awayGames);
    schedules.get(game.homeTeam)?.push({
      opponent: game.awayTeam,
      result: homeResult,
    });
    schedules.get(game.awayTeam)?.push({
      opponent: game.homeTeam,
      result: 1 - homeResult,
    });
  }

  const scheduleScores = [...fbsTeams].map((team) => {
    const opponents = schedules.get(team) ?? [];
    const opponentWinPercentages = opponents.map(({ opponent }) => {
      const independentGames = (allResults.get(opponent) ?? []).filter(
        (game) => game.opponent !== team,
      );
      return independentGames.length === 0
        ? 0
        : independentGames.reduce(
            (total, game) => total + game.result,
            0,
          ) / independentGames.length;
    });
    return {
      team,
      score:
        opponentWinPercentages.length === 0
          ? 0
          : opponentWinPercentages.reduce(
              (total, value) => total + value,
              0,
            ) / opponentWinPercentages.length,
    };
  });
  scheduleScores.sort(
    (left, right) =>
      right.score - left.score || left.team.localeCompare(right.team),
  );

  const ranks = new Map<string, number>();
  let rank = 0;
  let previousScore: number | null = null;
  scheduleScores.forEach(({ team, score }, index) => {
    if (score !== previousScore) {
      rank = index + 1;
      previousScore = score;
    }
    ranks.set(team, rank);
  });
  return ranks;
}

export function spearmanRankCorrelation(
  left: Map<string, number>,
  right: Map<string, number>,
) {
  const teams = [...left.keys()].filter((team) => right.has(team));
  if (teams.length < 2) return null;
  const squaredDifference = teams.reduce((total, team) => {
    const difference = left.get(team)! - right.get(team)!;
    return total + difference ** 2;
  }, 0);
  const count = teams.length;
  return (
    1 - (6 * squaredDifference) / (count * (count ** 2 - 1))
  );
}

function rankingsByTeam(rankings: TeamRanking[]) {
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

function summarizeMetrics(accumulator: MetricAccumulator) {
  return {
    weakScheduleTop25PerSnapshot: average(
      accumulator.weakScheduleTop25Counts,
    ),
    weeklyMovement: average(accumulator.movements),
    pollMae: average(accumulator.pollErrors),
  };
}

function sourceHistory(
  sources: CfbdSourceCache[],
  season: number,
) {
  return sources.filter((source) => source.season < season);
}

export function benchmarkEngines(sources: CfbdSourceCache[]) {
  const orderedSources = sources.toSorted(
    (left, right) => left.season - right.season,
  );
  const engineAccumulators = new Map<BenchmarkEngineId, EngineAccumulator>(
    BENCHMARK_ENGINE_IDS.map((rankingSystemId) => [
      rankingSystemId,
      createEngineAccumulator(),
    ]),
  );
  const pairAccumulators = new Map<string, PairAccumulator>();
  const previousRanks = new Map<
    BenchmarkEngineId,
    { season: number; ranks: Map<string, number> }
  >();

  const dataCoverage = orderedSources.map((source) => {
    const completed = source.games.filter(
      (game) =>
        game.completed &&
        game.seasonType !== "postseason" &&
        game.week <= source.throughWeek,
    );
    return {
      season: source.season,
      throughWeek: source.throughWeek,
      games: source.games.length,
      completedGames: completed.length,
      completedGamesWithStats: completed.filter(hasUsableBoxScore).length,
    };
  });

  for (const source of orderedSources) {
    const history = sourceHistory(orderedSources, source.season);
    const curvePrior = createChainedStartingPrior(
      source,
      history,
      "Curve.5.0",
    ).prior;

    for (let week = 1; week <= source.throughWeek; week += 1) {
      const stage = seasonStage(week);
      const commonScheduleRanks =
        createOpponentWinPercentageScheduleRanks(source.games, week);
      const teamCount = commonScheduleRanks.size;
      const weakScheduleMinimumRank = Math.floor(teamCount * 0.75) + 1;
      const polls = selectBlendPolls(source, week).polls;
      const pollRanks = polls.flatMap((poll) =>
        poll.ranks.map(({ school, rank }) => ({
          poll: poll.poll,
          team: school,
          rank,
        })),
      );
      const snapshotRankings = new Map<
        BenchmarkEngineId,
        TeamRanking[]
      >();

      for (const rankingSystemId of BENCHMARK_ENGINE_IDS) {
        const rankings = calculateRankings(
          source.games,
          week,
          rankingSystemId === "Curve.5.0" ? curvePrior : {},
          rankingSystemId,
        );
        snapshotRankings.set(rankingSystemId, rankings);
        const ranks = rankingsByTeam(rankings);
        const accumulator = engineAccumulators.get(rankingSystemId)!;
        accumulator.snapshotCount += 1;
        const weakScheduleCount = rankings.filter(
          ({ team, rank }) =>
            rank <= 25 &&
            (commonScheduleRanks.get(team) ?? 0) >=
              weakScheduleMinimumRank,
        ).length;
        accumulator.weakScheduleTop25Counts.push(weakScheduleCount);
        accumulator.stages[stage].weakScheduleTop25Counts.push(
          weakScheduleCount,
        );

        for (const pollRank of pollRanks) {
          const engineRank = ranks.get(pollRank.team);
          if (engineRank === undefined) continue;
          const error = Math.abs(engineRank - pollRank.rank);
          accumulator.pollErrors.push(error);
          accumulator.stages[stage].pollErrors.push(error);
        }

        const previous = previousRanks.get(rankingSystemId);
        if (previous?.season === source.season) {
          for (const [team, rank] of ranks) {
            const priorRank = previous.ranks.get(team);
            if (priorRank === undefined) continue;
            const movement = Math.abs(rank - priorRank);
            accumulator.movements.push(movement);
            accumulator.stages[stage].movements.push(movement);
          }
        }
        previousRanks.set(rankingSystemId, {
          season: source.season,
          ranks,
        });
        if (
          source === orderedSources.at(-1) &&
          week === source.throughWeek
        ) {
          accumulator.currentTop25 = rankings
            .slice(0, 25)
            .map(({ rank, team }) => ({ rank, team }));
        }
      }

      for (
        let leftIndex = 0;
        leftIndex < BENCHMARK_ENGINE_IDS.length;
        leftIndex += 1
      ) {
        for (
          let rightIndex = leftIndex + 1;
          rightIndex < BENCHMARK_ENGINE_IDS.length;
          rightIndex += 1
        ) {
          const leftId = BENCHMARK_ENGINE_IDS[leftIndex];
          const rightId = BENCHMARK_ENGINE_IDS[rightIndex];
          const leftRanks = rankingsByTeam(snapshotRankings.get(leftId)!);
          const rightRanks = rankingsByTeam(snapshotRankings.get(rightId)!);
          const correlation = spearmanRankCorrelation(leftRanks, rightRanks);
          const pairKey = `${leftId}|${rightId}`;
          const pair = pairAccumulators.get(pairKey) ?? {
            correlations: [],
            top25Overlaps: [],
          };
          if (correlation !== null) {
            pair.correlations.push(correlation);
          }
          pair.top25Overlaps.push(top25Overlap(leftRanks, rightRanks));
          pairAccumulators.set(pairKey, pair);
        }
      }
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    seasons: orderedSources.length,
    snapshots:
      orderedSources.reduce(
        (total, source) => total + source.throughWeek,
        0,
      ),
    commonScheduleDefinition:
      "Average opponent win percentage excluding games against the ranked team; weak schedule means the bottom quartile within the snapshot.",
    dataCoverage,
    engines: Object.fromEntries(
      BENCHMARK_ENGINE_IDS.map((rankingSystemId) => {
        const accumulator = engineAccumulators.get(rankingSystemId)!;
        return [
          rankingSystemId,
          {
            snapshots: accumulator.snapshotCount,
            ...summarizeMetrics(accumulator),
            stages: Object.fromEntries(
              (
                ["early", "middle", "late"] as const
              ).map((stage) => [
                stage,
                summarizeMetrics(accumulator.stages[stage]),
              ]),
            ),
            currentTop25: accumulator.currentTop25,
          },
        ];
      }),
    ),
    pairs: [...pairAccumulators]
      .map(([key, accumulator]) => {
        const [left, right] = key.split("|");
        return {
          left,
          right,
          averageSpearman: average(accumulator.correlations),
          averageTop25Overlap: average(accumulator.top25Overlaps),
        };
      })
      .sort(
        (left, right) =>
          (right.averageSpearman ?? -1) -
            (left.averageSpearman ?? -1) ||
          left.left.localeCompare(right.left) ||
          left.right.localeCompare(right.right),
      ),
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
    process.argv[2] ?? "shawn/engine-benchmark-results.json",
  );
  const report = benchmarkEngines(loadSources());
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    JSON.stringify(
      {
        outputPath,
        seasons: report.seasons,
        snapshots: report.snapshots,
        engines: Object.fromEntries(
          Object.entries(report.engines).map(([id, metrics]) => [
            id,
            {
              weakScheduleTop25PerSnapshot:
                metrics.weakScheduleTop25PerSnapshot,
              weeklyMovement: metrics.weeklyMovement,
              pollMae: metrics.pollMae,
            },
          ]),
        ),
        mostCorrelatedPairs: report.pairs.slice(0, 10),
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
