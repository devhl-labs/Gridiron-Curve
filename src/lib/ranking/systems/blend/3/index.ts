import { blendEngine } from "./engine";
import { neutralComputerModel } from "../../computer/model";
import type {
  RankingSystemDefinition,
  RankingSystemId,
} from "../../../types";

export const blendSystems = {
  "Blend.3.0": {
    id: "Blend.3.0",
    categoryId: "ranking",
    kind: "blend",
    engineId: "Blend.3",
    engineName: "Gridiron Blend",
    engineVersion: 3,
    modelVersion: 0,
    engine: blendEngine,
    model: neutralComputerModel,
    priorMode: "component",
  },
} satisfies Partial<Record<RankingSystemId, RankingSystemDefinition>>;
