import { curve0Systems } from "./systems/curve/0";
import { curve1Systems } from "./systems/curve/1";
import type {
  RankingCategoryId,
  RankingEngineId,
  RankingSystemDefinition,
  RankingSystemId,
} from "./types";

export const RANKING_SYSTEMS = {
  ...curve0Systems,
  ...curve1Systems,
} satisfies Record<RankingSystemId, RankingSystemDefinition>;

export const RANKING_SYSTEM_IDS = [
  "Curve.0.7",
  "Curve.0.8",
  "Curve.0.9",
  "Curve.0.10",
  "Curve.0.11",
  "Curve.1.0",
] as const satisfies readonly RankingSystemId[];

export const RANKING_CATEGORY_IDS = [
  "resume",
] as const satisfies readonly RankingCategoryId[];

const RANKING_CATEGORY_LABELS: Record<RankingCategoryId, string> = {
  resume: "Resume rankings",
};

const RANKING_ENGINE_NAMES: Record<RankingEngineId, string> = {
  "Curve.0": "Curve",
  "Curve.1": "Curve",
};

export const RANKING_ENGINE_IDS = [
  "Curve.0",
  "Curve.1",
] as const satisfies readonly RankingEngineId[];

export const DEFAULT_RANKING_SYSTEM_ID: RankingSystemId = "Curve.1.0";
export const DEFAULT_RANKING_ENGINE_ID: RankingEngineId = "Curve.1";

export function isRankingSystemId(
  value: string | null | undefined,
): value is RankingSystemId {
  return RANKING_SYSTEM_IDS.some((id) => id === value);
}

export function parseRankingSystemId(value: string | null | undefined) {
  return isRankingSystemId(value) ? value : DEFAULT_RANKING_SYSTEM_ID;
}

export function isRankingEngineId(
  value: string | null | undefined,
): value is RankingEngineId {
  return RANKING_ENGINE_IDS.some((id) => id === value);
}

export function parseRankingEngineId(value: string | null | undefined) {
  return isRankingEngineId(value) ? value : DEFAULT_RANKING_ENGINE_ID;
}

export function compareRankingSystems(
  leftId: RankingSystemId,
  rightId: RankingSystemId,
) {
  const left = RANKING_SYSTEMS[leftId];
  const right = RANKING_SYSTEMS[rightId];

  return (
    left.engineName.localeCompare(right.engineName) ||
    left.engineVersion - right.engineVersion ||
    left.modelVersion - right.modelVersion
  );
}

export function rankingSystemDisplayName(id: RankingSystemId) {
  return id;
}

export function rankingCategoryDisplayName(id: RankingCategoryId) {
  return RANKING_CATEGORY_LABELS[id];
}

export function rankingEngineDisplayName(id: RankingEngineId) {
  return id;
}

export function rankingEngineName(id: RankingEngineId) {
  return RANKING_ENGINE_NAMES[id];
}

export function rankingSystemIdsForCategory(id: RankingCategoryId) {
  return RANKING_SYSTEM_IDS.filter(
    (rankingSystemId) => RANKING_SYSTEMS[rankingSystemId].categoryId === id,
  );
}
