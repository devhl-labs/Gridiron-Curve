import type { RankingSystemId } from "../../../types";
import { consensusEngine } from "../1/engine";

export const CONSENSUS_V2_COMPONENT_SYSTEM_IDS = [
  "Curve.5.0",
  "RecordMatrix.1.0",
  "Sequence.1.0",
  "LeastSquares.1.0",
  "VictoryPaths.1.0",
] as const satisfies readonly RankingSystemId[];

export { consensusEngine };
