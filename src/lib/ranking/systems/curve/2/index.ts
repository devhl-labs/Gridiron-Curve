import * as engine from "./engine";
import { curveModel0 } from "./models/0";
import type {
  RankingSystemDefinition,
  RankingSystemId,
} from "../../../types";

export const curve2Systems = {
  "Curve.2.0": {
    id: "Curve.2.0",
    categoryId: "ranking",
    kind: "curve",
    engineId: "Curve.2",
    engineName: "Curve",
    engineVersion: 2,
    modelVersion: 0,
    engine,
    model: curveModel0,
    priorMode: "historical",
  },
} satisfies Partial<Record<RankingSystemId, RankingSystemDefinition>>;
