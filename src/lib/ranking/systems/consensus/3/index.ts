import { consensusEngine } from "./engine";
import { neutralComputerModel } from "../../computer/model";
import type {
  RankingSystemDefinition,
  RankingSystemId,
} from "../../../types";

export const consensusSystems = {
  "Consensus.3.0": {
    id: "Consensus.3.0",
    categoryId: "ranking",
    kind: "consensus",
    engineId: "Consensus.3",
    engineName: "Gridiron Consensus",
    engineVersion: 3,
    modelVersion: 0,
    engine: consensusEngine,
    model: neutralComputerModel,
    priorMode: "component",
  },
} satisfies Partial<Record<RankingSystemId, RankingSystemDefinition>>;
