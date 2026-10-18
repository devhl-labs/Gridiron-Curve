import { neutralFamilyEngine } from "./engine";
import { neutralComputerModel } from "../../computer/model";
import type {
  RankingSystemDefinition,
  RankingSystemId,
} from "../../../types";

export const neutralFamilySystems = {
  "NeutralFamily.1.0": {
    id: "NeutralFamily.1.0",
    categoryId: "ranking",
    kind: "computer",
    engineId: "NeutralFamily.1",
    engineName: "Neutral Computer Family",
    engineVersion: 1,
    modelVersion: 0,
    engine: neutralFamilyEngine,
    model: neutralComputerModel,
    priorMode: "component",
  },
} satisfies Partial<Record<RankingSystemId, RankingSystemDefinition>>;
