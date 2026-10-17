import * as engine from "./engine";
import { neutralComputerModel } from "../../computer/model";
import type {
  RankingSystemDefinition,
  RankingSystemId,
} from "../../../types";

export const leastSquaresSystems = {
  "LeastSquares.1.0": {
    id: "LeastSquares.1.0",
    categoryId: "ranking",
    kind: "computer",
    engineId: "LeastSquares.1",
    engineName: "Least Squares",
    engineVersion: 1,
    modelVersion: 0,
    engine,
    model: neutralComputerModel,
    priorMode: "neutral",
  },
} satisfies Partial<Record<RankingSystemId, RankingSystemDefinition>>;
