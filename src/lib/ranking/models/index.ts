import { model as modelV07 } from "./v0.7";
import { model as modelV08 } from "./v0.8";
import { model as modelV09 } from "./v0.9";
import { model as modelV010 } from "./v0.10";
import { model as modelV011 } from "./v0.11";
import type { ModelVersion, RankingModel } from "./types";

export type { ModelVersion, RankingModel } from "./types";

export const MODEL_VERSIONS: readonly ModelVersion[] = [
  modelV07.version,
  modelV08.version,
  modelV09.version,
  modelV010.version,
  modelV011.version,
];

export const DEFAULT_MODEL_VERSION: ModelVersion = modelV011.version;

export const RANKING_MODELS: Record<ModelVersion, RankingModel> = {
  [modelV07.version]: modelV07,
  [modelV08.version]: modelV08,
  [modelV09.version]: modelV09,
  [modelV010.version]: modelV010,
  [modelV011.version]: modelV011,
};

export function isModelVersion(
  value: string | null | undefined,
): value is ModelVersion {
  return MODEL_VERSIONS.some((version) => version === value);
}

export function parseModelVersion(value: string | null | undefined) {
  return isModelVersion(value) ? value : DEFAULT_MODEL_VERSION;
}
