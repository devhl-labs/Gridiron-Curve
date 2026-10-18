import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  listCfbdCacheManifests,
  readCfbdSourceCache,
} from "../../src/lib/cfbd/cache";
import {
} from "../../src/lib/ranking";
import {
  createChainedStartingPrior,
} from "../../src/lib/ranking/view";
import { CANDIDATE_ENGINES } from "./candidate-engines";
import {
  BENCHMARK_ENGINE_IDS,
  calculateBenchmarkRankings,
} from "./benchmark-engines";

type TeamRange = {
  team: string;
  minimumRank: number;
  maximumRank: number;
  reviewStatus: string;
};

type RankingRow = {
  team: string;
  rank: number;
};

const labelsPath = path.resolve(
  process.argv[2] ??
    "shawn/engine-calibration-ranges-2026-week-06.json",
);
const outputPath = path.resolve(
  process.argv[3] ??
    "shawn/candidate-engine-calibration-results.json",
);
const labels = JSON.parse(readFileSync(labelsPath, "utf8")) as {
  season: number;
  week: number;
  ranges: TeamRange[];
};
const source = readCfbdSourceCache(labels.season);
if (!source) {
  throw new Error(`Missing source cache for ${labels.season}.`);
}
const history = listCfbdCacheManifests()
  .filter(({ season }) => season < labels.season)
  .toSorted((left, right) => left.season - right.season)
  .map(({ season }) => {
    const historicalSource = readCfbdSourceCache(season);
    if (!historicalSource) {
      throw new Error(`Missing source cache for ${season}.`);
    }
    return historicalSource;
  });
const curvePrior = createChainedStartingPrior(
  source,
  history,
).prior;
const rangeMap = new Map(
  labels.ranges.map((range) => [range.team, range]),
);

function evaluate(rankings: RankingRow[]) {
  const misses = rankings.flatMap(({ team, rank }) => {
    const range = rangeMap.get(team);
    if (!range) throw new Error(`Missing calibration range for ${team}.`);
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
  const rankMap = new Map(
    rankings.map(({ team, rank }) => [team, rank]),
  );
  return {
    coverage: (rankings.length - misses.length) / rankings.length,
    missMae:
      misses.reduce((total, miss) => total + miss.distance, 0) /
      rankings.length,
    misses,
    keyTeams: Object.fromEntries(
      [
        "Georgia",
        "Alabama",
        "Notre Dame",
        "Texas",
        "Ohio State",
        "Tennessee",
        "Utah",
        "James Madison",
        "SMU",
      ].map((team) => [team, rankMap.get(team) ?? null]),
    ),
    top25: rankings.slice(0, 25),
  };
}

const incumbentResults = Object.fromEntries(
  BENCHMARK_ENGINE_IDS.map((rankingSystemId) => {
    const rankings = calculateBenchmarkRankings(
      rankingSystemId,
      source.games,
      labels.week,
      curvePrior,
    );
    return [rankingSystemId, evaluate(rankings)];
  }),
);
const candidateResults = Object.fromEntries(
  CANDIDATE_ENGINES.map((engine) => [
    engine.id,
    {
      family: engine.family,
      purpose: engine.purpose,
      ...evaluate(engine.calculate(source.games, labels.week)),
    },
  ]),
);

const report = {
  generatedAt: new Date().toISOString(),
  labelsPath,
  season: labels.season,
  week: labels.week,
  caveat:
    "Current-snapshot ranges are provisional and partly derived from earlier computer-family evidence; they are not an independent historical training set.",
  incumbents: incumbentResults,
  candidates: candidateResults,
};
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      outputPath,
      candidates: Object.fromEntries(
        Object.entries(candidateResults).map(([id, result]) => [
          id,
          {
            coverage: result.coverage,
            missMae: result.missMae,
            keyTeams: result.keyTeams,
            misses: result.misses.map(
              ({ team, rank, range }) => ({ team, rank, range }),
            ),
          },
        ]),
      ),
    },
    null,
    2,
  ),
);
