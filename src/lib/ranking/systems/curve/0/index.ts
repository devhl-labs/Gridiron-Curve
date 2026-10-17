import * as engine from "./engine";
import { curveModel7 } from "./models/7";
import { curveModel8 } from "./models/8";
import { curveModel9 } from "./models/9";
import { curveModel10 } from "./models/10";
import { curveModel11 } from "./models/11";
import type {
  RankingSystemDefinition,
  RankingSystemId,
} from "../../../types";

function defineSystem(
  id: RankingSystemId,
  modelVersion: number,
  model: RankingSystemDefinition["model"],
): RankingSystemDefinition {
  return {
    id,
    categoryId: "ranking",
    kind: "curve",
    engineId: "Curve.0",
    engineName: "Curve",
    engineVersion: 0,
    modelVersion,
    engine,
    model,
    priorMode: "historical",
  };
}

export const curve0Systems = {
  "Curve.0.7": defineSystem("Curve.0.7", 7, curveModel7),
  "Curve.0.8": defineSystem("Curve.0.8", 8, curveModel8),
  "Curve.0.9": defineSystem("Curve.0.9", 9, curveModel9),
  "Curve.0.10": defineSystem("Curve.0.10", 10, curveModel10),
  "Curve.0.11": defineSystem("Curve.0.11", 11, curveModel11),
} satisfies Partial<Record<RankingSystemId, RankingSystemDefinition>>;
