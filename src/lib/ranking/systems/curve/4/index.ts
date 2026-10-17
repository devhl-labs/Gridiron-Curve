import * as engine from "./engine";
import { curveModel0 } from "./models/0";
import type {
  RankingSystemDefinition,
  RankingSystemId,
} from "../../../types";

export const curve4Systems = {
  "Curve.4.0": {
    id: "Curve.4.0",
    categoryId: "ranking",
    kind: "curve",
    engineId: "Curve.4",
    engineName: "Curve",
    engineVersion: 4,
    modelVersion: 0,
    engine,
    model: curveModel0,
    priorMode: "historical",
  },
} satisfies Partial<Record<RankingSystemId, RankingSystemDefinition>>;
