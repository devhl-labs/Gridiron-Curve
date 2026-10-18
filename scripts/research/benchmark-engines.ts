import type {
  Game,
  RatingPrior,
  TeamRanking,
} from "../../src/lib/ranking";
import {
  createComputerEngine,
  type ComputerMethod,
} from "../../src/lib/ranking/systems/computer/engine";
import { neutralComputerModel } from "../../src/lib/ranking/systems/computer/model";
import {
  calculateRankings as calculateCurveRankings,
} from "../../src/lib/ranking/systems/curve/5/engine";
import { curveModel0 } from "../../src/lib/ranking/systems/curve/5/models/0";

export const BENCHMARK_ENGINE_IDS = [
  "Curve.5.0",
  "RecordMatrix.1.0",
  "Pairwise.1.0",
  "Sequence.1.0",
  "LeastSquares.1.0",
  "VictoryPaths.1.0",
  "ScheduleRecord.1.0",
] as const;

export type BenchmarkEngineId = (typeof BENCHMARK_ENGINE_IDS)[number];

const COMPUTER_METHODS = {
  "RecordMatrix.1.0": "record-matrix",
  "Pairwise.1.0": "pairwise",
  "Sequence.1.0": "sequence",
  "LeastSquares.1.0": "least-squares",
  "VictoryPaths.1.0": "victory-paths",
  "ScheduleRecord.1.0": "schedule-record",
} as const satisfies Record<
  Exclude<BenchmarkEngineId, "Curve.5.0">,
  ComputerMethod
>;

const computerEngines = new Map(
  Object.entries(COMPUTER_METHODS).map(([id, method]) => [
    id,
    createComputerEngine(method),
  ]),
);

export function calculateBenchmarkRankings(
  rankingSystemId: BenchmarkEngineId,
  games: Game[],
  throughWeek: number,
  curvePrior: RatingPrior = {},
): TeamRanking[] {
  if (rankingSystemId === "Curve.5.0") {
    return calculateCurveRankings(
      games,
      throughWeek,
      curvePrior,
      curveModel0,
    );
  }
  const engine = computerEngines.get(rankingSystemId);
  if (!engine) {
    throw new Error(`Unknown benchmark engine: ${rankingSystemId}`);
  }
  return engine.calculateRankings(
    games,
    throughWeek,
    {},
    neutralComputerModel,
  );
}
