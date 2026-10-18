import * as engine from "./engine";
import { neutralComputerModel } from "../../computer/model";
import type {
  RankingSystemDefinition,
  RankingSystemId,
} from "../../../types";

export const scheduleRecordSystems = {
  "ScheduleRecord.1.0": {
    id: "ScheduleRecord.1.0",
    categoryId: "ranking",
    kind: "computer",
    engineId: "ScheduleRecord.1",
    engineName: "Schedule-Adjusted Record",
    engineVersion: 1,
    modelVersion: 0,
    engine,
    model: neutralComputerModel,
    priorMode: "neutral",
  },
} satisfies Partial<Record<RankingSystemId, RankingSystemDefinition>>;
