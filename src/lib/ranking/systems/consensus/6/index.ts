import { consensusEngine } from "./engine";
import { neutralComputerModel } from "../../computer/model";
import type {
  RankingSystemDefinition,
  RankingSystemId,
} from "../../../types";

export const consensusSystems = {
  "Consensus.6.0": {
    id: "Consensus.6.0",
    categoryId: "ranking",
    kind: "consensus",
    engineId: "Consensus.6",
    engineName: "Gridiron Consensus",
    engineVersion: 6,
    modelVersion: 0,
    engine: consensusEngine,
    model: neutralComputerModel,
    priorMode: "component",
  },
} satisfies Partial<Record<RankingSystemId, RankingSystemDefinition>>;
