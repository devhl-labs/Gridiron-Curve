import * as engine from "./engine";
import { neutralComputerModel } from "../../computer/model";
import type {
  RankingSystemDefinition,
  RankingSystemId,
} from "../../../types";

export const pairwiseSystems = {
  "Pairwise.1.0": {
    id: "Pairwise.1.0",
    categoryId: "ranking",
    kind: "computer",
    engineId: "Pairwise.1",
    engineName: "Pairwise Odds",
    engineVersion: 1,
    modelVersion: 0,
    engine,
    model: neutralComputerModel,
    priorMode: "neutral",
  },
} satisfies Partial<Record<RankingSystemId, RankingSystemDefinition>>;
