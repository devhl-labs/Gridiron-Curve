import * as engine from "./engine";
import { curveModel0 } from "./models/0";
import type {
  RankingSystemDefinition,
  RankingSystemId,
} from "../../../types";

export const curve5Systems = {
  "Curve.5.0": {
    id: "Curve.5.0",
    categoryId: "ranking",
    kind: "curve",
    engineId: "Curve.5",
    engineName: "Curve",
    engineVersion: 5,
    modelVersion: 0,
    engine,
    model: curveModel0,
    priorMode: "historical",
  },
} satisfies Partial<Record<RankingSystemId, RankingSystemDefinition>>;
