import * as engine from "./engine";
import { curveModel0 } from "./models/0";
import type {
  RankingSystemDefinition,
  RankingSystemId,
} from "../../../types";

export const curve3Systems = {
  "Curve.3.0": {
    id: "Curve.3.0",
    categoryId: "ranking",
    kind: "curve",
    engineId: "Curve.3",
    engineName: "Curve",
    engineVersion: 3,
    modelVersion: 0,
    engine,
    model: curveModel0,
    priorMode: "historical",
  },
} satisfies Partial<Record<RankingSystemId, RankingSystemDefinition>>;
