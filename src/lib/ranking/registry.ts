import { test0Systems } from "./systems/test/0";
import type {
  RankingSystemDefinition,
  RankingSystemId,
} from "./types";

export const RANKING_SYSTEMS = {
  ...test0Systems,
} satisfies Record<RankingSystemId, RankingSystemDefinition>;

export const RANKING_SYSTEM_IDS = [
  "Test.0.7",
  "Test.0.8",
  "Test.0.9",
  "Test.0.10",
  "Test.0.11",
] as const satisfies readonly RankingSystemId[];

export const DEFAULT_RANKING_SYSTEM_ID: RankingSystemId = "Test.0.11";

export function isRankingSystemId(
  value: string | null | undefined,
): value is RankingSystemId {
  return RANKING_SYSTEM_IDS.some((id) => id === value);
}

export function parseRankingSystemId(value: string | null | undefined) {
  return isRankingSystemId(value) ? value : DEFAULT_RANKING_SYSTEM_ID;
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
