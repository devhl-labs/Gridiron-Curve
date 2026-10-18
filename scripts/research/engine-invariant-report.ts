import { writeFileSync } from "node:fs";
import path from "node:path";
import {
  type Game,
} from "../../src/lib/ranking";
import {
  CANDIDATE_ENGINES,
  cappedMarginPerformanceFamilyEngine,
  recordValueFamilyEngine,
  resultNetworkFamilyEngine,
} from "./candidate-engines";
import {
  COMPOSITE_CANDIDATES,
  combineFamilyRankings,
} from "./composite-tournament";
import {
  BENCHMARK_ENGINE_IDS,
  calculateBenchmarkRankings,
} from "./benchmark-engines";

type EngineAdapter = {
  id: string;
  score(games: Game[], throughWeek: number): Map<string, number>;
};

function game(
  id: number,
  week: number,
  homeTeam: string,
  awayTeam: string,
  homePoints: number,
  awayPoints: number,
  awayClassification: "fbs" | "fcs" = "fbs",
): Game {
  return {
    id,
    week,
    startDate: `2026-09-${String(id).padStart(2, "0")}T12:00:00Z`,
    seasonType: "regular",
    completed: true,
    neutralSite: true,
    homeTeam,
    homePoints,
    awayTeam,
    awayPoints,
    homeClassification: "fbs",
    awayClassification,
  };
}

const incumbentAdapters: EngineAdapter[] = BENCHMARK_ENGINE_IDS.map(
  (rankingSystemId) => ({
    id: rankingSystemId,
    score(games, throughWeek) {
      return new Map(
        calculateBenchmarkRankings(
          rankingSystemId,
          games,
          throughWeek,
        ).map(({ team, rating, networkRating }) => [
          team,
          rankingSystemId === "Curve.5.0" ? rating : networkRating,
        ]),
      );
    },
  }),
);

const candidateAdapters: EngineAdapter[] = CANDIDATE_ENGINES.map(
  (engine) => ({
    id: engine.id,
    score(games, throughWeek) {
      return new Map(
        engine
          .calculate(games, throughWeek)
          .map(({ team, score }) => [team, score]),
      );
    },
  }),
);

const selectedComposite = COMPOSITE_CANDIDATES.find(
  ({ id }) => id === "block-arithmetic.O50-P50",
);
if (!selectedComposite) {
  throw new Error("Missing selected composite candidate.");
}

const compositeAdapter: EngineAdapter = {
  id: "CompositeTournament.Selected.O50-P50",
  score(games, throughWeek) {
    return new Map(
      combineFamilyRankings(
        selectedComposite,
        resultNetworkFamilyEngine.calculate(games, throughWeek),
        recordValueFamilyEngine.calculate(games, throughWeek),
        cappedMarginPerformanceFamilyEngine.calculate(
          games,
          throughWeek,
        ),
      ).map(({ team, score }) => [team, score]),
    );
  },
};

const adapters = [
  ...incumbentAdapters,
  ...candidateAdapters,
  compositeAdapter,
];
const epsilon = 1e-9;

function score(
  adapter: EngineAdapter,
  games: Game[],
  team = "Alpha",
) {
  const value = adapter.score(games, 3).get(team);
  if (value === undefined) {
    throw new Error(`${adapter.id} did not score ${team}.`);
  }
  return value;
}

function compareDirection(
  adapter: EngineAdapter,
  baseline: Game[],
  changed: Game[],
  direction: "higher" | "lower",
) {
  const before = score(adapter, baseline);
  const after = score(adapter, changed);
  return {
    before,
    after,
    delta: after - before,
    pass:
      direction === "higher"
        ? after >= before - epsilon
        : after <= before + epsilon,
  };
}

const outcomeBaseline = [
  game(1, 1, "Bravo", "Charlie", 24, 14),
  game(2, 1, "Charlie", "Delta", 21, 10),
  game(3, 2, "Bravo", "Alpha", 20, 13),
  game(4, 2, "Alpha", "Delta", 27, 17),
];
const outcomeWin = outcomeBaseline.map((item) =>
  item.id === 3
    ? { ...item, homePoints: 13, awayPoints: 20 }
    : item
);
const addedLoss = [
  ...outcomeBaseline,
  game(5, 3, "Bravo", "Alpha", 17, 14),
];

const opponentFoundation = [
  game(10, 1, "Strong", "Xray", 28, 10),
  game(11, 1, "Strong", "Yankee", 24, 7),
  game(12, 1, "Xray", "Weak", 21, 10),
  game(13, 1, "Yankee", "Weak", 20, 6),
  game(14, 2, "Zulu", "Alpha", 14, 7),
];
const strongWin = [
  ...opponentFoundation,
  game(15, 2, "Alpha", "Strong", 21, 17),
];
const weakWin = [
  ...opponentFoundation,
  game(15, 2, "Alpha", "Weak", 21, 17),
];

const fbsFoundation = [
  game(20, 1, "Bravo", "Weak", 24, 10),
  game(21, 1, "Charlie", "Bravo", 21, 17),
  game(22, 2, "Delta", "Alpha", 14, 7),
];
const fbsWin = [
  ...fbsFoundation,
  game(23, 2, "Alpha", "Weak", 28, 7),
];
const fcsWin = [
  ...fbsFoundation,
  game(23, 2, "Alpha", "Lower Division", 28, 7, "fcs"),
];

const renameMap = new Map([
  ["Alpha", "Team 4"],
  ["Bravo", "Team 3"],
  ["Charlie", "Team 2"],
  ["Delta", "Team 1"],
]);
const renamed = outcomeBaseline.map((item) => ({
  ...item,
  homeTeam: renameMap.get(item.homeTeam) ?? item.homeTeam,
  awayTeam: renameMap.get(item.awayTeam) ?? item.awayTeam,
}));

const report = {
  generatedAt: new Date().toISOString(),
  tests: {
    winImprovement:
      "Changing Alpha's loss to Bravo into a win cannot reduce Alpha's score.",
    addedLoss:
      "Adding another Alpha loss to Bravo cannot increase Alpha's score.",
    strongerWin:
      "Beating established Strong cannot score below beating established Weak.",
    fbsWin:
      "Beating an FBS opponent cannot score below beating an incompletely observed FCS opponent.",
    rename:
      "Consistently renaming teams cannot change corresponding raw scores.",
    future:
      "A game after the through-week cannot change scores.",
  },
  engines: Object.fromEntries(
    adapters.map((adapter) => {
      const baselineScores = adapter.score(outcomeBaseline, 3);
      const renamedScores = adapter.score(renamed, 3);
      const renameDifferences = [...renameMap].map(([before, after]) =>
        Math.abs(
          (baselineScores.get(before) ?? 0) -
            (renamedScores.get(after) ?? 0),
        )
      );
      const futureScores = adapter.score(
        [
          ...outcomeBaseline,
          game(99, 4, "Delta", "Alpha", 100, 0),
        ],
        3,
      );
      const futureDifferences = [...baselineScores].map(
        ([team, value]) => Math.abs(value - (futureScores.get(team) ?? 0)),
      );
      const results = {
        winImprovement: compareDirection(
          adapter,
          outcomeBaseline,
          outcomeWin,
          "higher",
        ),
        addedLoss: compareDirection(
          adapter,
          outcomeBaseline,
          addedLoss,
          "lower",
        ),
        strongerWin: compareDirection(
          adapter,
          weakWin,
          strongWin,
          "higher",
        ),
        fbsWin: compareDirection(
          adapter,
          fcsWin,
          fbsWin,
          "higher",
        ),
        rename: {
          maximumDifference: Math.max(...renameDifferences),
          pass: renameDifferences.every(
            (difference) => difference <= epsilon,
          ),
        },
        future: {
          maximumDifference: Math.max(...futureDifferences),
          pass: futureDifferences.every(
            (difference) => difference <= epsilon,
          ),
        },
      };
      return [
        adapter.id,
        {
          ...results,
          passed: Object.values(results).filter(({ pass }) => pass).length,
          failed: Object.entries(results)
            .filter(([, { pass }]) => !pass)
            .map(([name]) => name),
        },
      ];
    }),
  ),
};

const outputPath = path.resolve(
  process.argv[2] ?? "shawn/engine-invariant-results.json",
);
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      outputPath,
      results: Object.fromEntries(
        Object.entries(report.engines).map(([id, result]) => [
          id,
          { passed: result.passed, failed: result.failed },
        ]),
      ),
    },
    null,
    2,
  ),
);
