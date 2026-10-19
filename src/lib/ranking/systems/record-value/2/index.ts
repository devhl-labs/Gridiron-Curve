import { recordValueProductionEngine } from "../../evidence/production";
import { neutralComputerModel } from "../../computer/model";
import type {
  RankingSystemDefinition,
  RankingSystemId,
} from "../../../types";

export const recordValueSystems = {
  "RecordValue.2.0": {
    id: "RecordValue.2.0",
    categoryId: "ranking",
    kind: "computer",
    engineId: "RecordValue.2",
    engineName: "Record Value",
    engineVersion: 2,
    modelVersion: 0,
    engine: recordValueProductionEngine,
    model: neutralComputerModel,
    priorMode: "historical",
  },
} satisfies Partial<Record<RankingSystemId, RankingSystemDefinition>>;
