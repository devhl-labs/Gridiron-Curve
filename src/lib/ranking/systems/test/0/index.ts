import * as engine from "./engine";
import { model as model7 } from "./models/7";
import { model as model8 } from "./models/8";
import { model as model9 } from "./models/9";
import { model as model10 } from "./models/10";
import { model as model11 } from "./models/11";
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
    engineName: "Test",
    engineVersion: 0,
    modelVersion,
    engine,
    model,
  };
}

export const test0Systems = {
  "Test.0.7": defineSystem("Test.0.7", 7, model7),
  "Test.0.8": defineSystem("Test.0.8", 8, model8),
  "Test.0.9": defineSystem("Test.0.9", 9, model9),
  "Test.0.10": defineSystem("Test.0.10", 10, model10),
  "Test.0.11": defineSystem("Test.0.11", 11, model11),
} satisfies Partial<Record<RankingSystemId, RankingSystemDefinition>>;
