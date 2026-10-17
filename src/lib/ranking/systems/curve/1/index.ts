import * as engine from "./engine";
import { curveModel0 } from "./models/0";
import type {
  RankingSystemDefinition,
  RankingSystemId,
} from "../../../types";

export const curve1Systems = {
  "Curve.1.0": {
    id: "Curve.1.0",
    categoryId: "ranking",
    kind: "curve",
    engineId: "Curve.1",
    engineName: "Curve",
    engineVersion: 1,
    modelVersion: 0,
    engine,
    model: curveModel0,
    priorMode: "historical",
  },
} satisfies Partial<Record<RankingSystemId, RankingSystemDefinition>>;
