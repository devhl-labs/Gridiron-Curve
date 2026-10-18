import { recordValueProductionEngine } from "../../evidence/production";
import { neutralComputerModel } from "../../computer/model";
import type {
  RankingSystemDefinition,
  RankingSystemId,
} from "../../../types";

export const recordValueSystems = {
  "RecordValue.1.0": {
    id: "RecordValue.1.0",
    categoryId: "ranking",
    kind: "computer",
    engineId: "RecordValue.1",
    engineName: "Record Value",
    engineVersion: 1,
    modelVersion: 0,
    engine: recordValueProductionEngine,
    model: neutralComputerModel,
    priorMode: "historical",
  },
} satisfies Partial<Record<RankingSystemId, RankingSystemDefinition>>;
