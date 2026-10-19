import { blendEngine } from "../engine";
import { neutralComputerModel } from "../../computer/model";
import type {
  RankingSystemDefinition,
  RankingSystemId,
} from "../../../types";

export const blendSystems = {
  "Blend.7.0": {
    id: "Blend.7.0",
    categoryId: "ranking",
    kind: "blend",
    engineId: "Blend.7",
    engineName: "Gridiron Blend",
    engineVersion: 7,
    modelVersion: 0,
    engine: blendEngine,
    model: neutralComputerModel,
    priorMode: "component",
  },
} satisfies Partial<Record<RankingSystemId, RankingSystemDefinition>>;
