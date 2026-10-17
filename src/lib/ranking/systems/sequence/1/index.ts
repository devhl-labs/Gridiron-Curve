import * as engine from "./engine";
import { neutralComputerModel } from "../../computer/model";
import type {
  RankingSystemDefinition,
  RankingSystemId,
} from "../../../types";

export const sequenceSystems = {
  "Sequence.1.0": {
    id: "Sequence.1.0",
    categoryId: "ranking",
    kind: "computer",
    engineId: "Sequence.1",
    engineName: "Result Sequence",
    engineVersion: 1,
    modelVersion: 0,
    engine,
    model: neutralComputerModel,
    priorMode: "neutral",
  },
} satisfies Partial<Record<RankingSystemId, RankingSystemDefinition>>;
