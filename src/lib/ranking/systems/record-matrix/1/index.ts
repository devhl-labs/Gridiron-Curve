import * as engine from "./engine";
import { neutralComputerModel } from "../../computer/model";
import type {
  RankingSystemDefinition,
  RankingSystemId,
} from "../../../types";

export const recordMatrixSystems = {
  "RecordMatrix.1.0": {
    id: "RecordMatrix.1.0",
    categoryId: "ranking",
    kind: "computer",
    engineId: "RecordMatrix.1",
    engineName: "Record Matrix",
    engineVersion: 1,
    modelVersion: 0,
    engine,
    model: neutralComputerModel,
    priorMode: "neutral",
  },
} satisfies Partial<Record<RankingSystemId, RankingSystemDefinition>>;
