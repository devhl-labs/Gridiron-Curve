import { cappedMarginPerformanceProductionEngine } from "../../evidence/production";
import { neutralComputerModel } from "../../computer/model";
import type {
  RankingSystemDefinition,
  RankingSystemId,
} from "../../../types";

export const cappedMarginPerformanceSystems = {
  "CappedMarginPerformance.1.0": {
    id: "CappedMarginPerformance.1.0",
    categoryId: "ranking",
    kind: "computer",
    engineId: "CappedMarginPerformance.1",
    engineName: "Capped-Margin Performance",
    engineVersion: 1,
    modelVersion: 0,
    engine: cappedMarginPerformanceProductionEngine,
    model: neutralComputerModel,
    priorMode: "historical",
  },
} satisfies Partial<Record<RankingSystemId, RankingSystemDefinition>>;
