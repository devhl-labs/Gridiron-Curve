import * as engine from "./engine";
import { neutralComputerModel } from "../../computer/model";
import type {
  RankingSystemDefinition,
  RankingSystemId,
} from "../../../types";

export const victoryPathsSystems = {
  "VictoryPaths.1.0": {
    id: "VictoryPaths.1.0",
    categoryId: "ranking",
    kind: "computer",
    engineId: "VictoryPaths.1",
    engineName: "Victory Paths",
    engineVersion: 1,
    modelVersion: 0,
    engine,
    model: neutralComputerModel,
    priorMode: "neutral",
  },
} satisfies Partial<Record<RankingSystemId, RankingSystemDefinition>>;
