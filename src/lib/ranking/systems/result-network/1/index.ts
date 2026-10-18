import { resultNetworkProductionEngine } from "../../evidence/production";
import { neutralComputerModel } from "../../computer/model";
import type {
  RankingSystemDefinition,
  RankingSystemId,
} from "../../../types";

export const resultNetworkSystems = {
  "ResultNetwork.1.0": {
    id: "ResultNetwork.1.0",
    categoryId: "ranking",
    kind: "computer",
    engineId: "ResultNetwork.1",
    engineName: "Canonical Result Network",
    engineVersion: 1,
    modelVersion: 0,
    engine: resultNetworkProductionEngine,
    model: neutralComputerModel,
    priorMode: "historical",
  },
} satisfies Partial<Record<RankingSystemId, RankingSystemDefinition>>;
