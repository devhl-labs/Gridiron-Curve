import { blendSystems as blend7Systems } from "./systems/blend/7";
import { cappedMarginPerformanceSystems } from "./systems/capped-margin-performance/1";
import { consensusSystems as consensus7Systems } from "./systems/consensus/7";
import { recordValueSystems } from "./systems/record-value/2";
import { resultNetworkSystems } from "./systems/result-network/1";
import type {
  RankingCategoryId,
  RankingEngineId,
  RankingSystemDefinition,
  RankingSystemId,
} from "./types";

export const RANKING_SYSTEMS = {
  ...blend7Systems,
  ...resultNetworkSystems,
  ...recordValueSystems,
  ...cappedMarginPerformanceSystems,
  ...consensus7Systems,
} satisfies Record<RankingSystemId, RankingSystemDefinition>;

export const RANKING_SYSTEM_IDS = [
  "ResultNetwork.1.0",
  "RecordValue.2.0",
  "CappedMarginPerformance.1.0",
  "Consensus.7.0",
  "Blend.7.0",
] as const satisfies readonly RankingSystemId[];

export const SELECTABLE_RANKING_SYSTEM_IDS = [
  "ResultNetwork.1.0",
  "RecordValue.2.0",
  "CappedMarginPerformance.1.0",
  "Consensus.7.0",
  "Blend.7.0",
] as const satisfies readonly RankingSystemId[];

export const RANKING_SYSTEM_SELECT_GROUPS = [
  {
    label: "Composite Rankings",
    rankingSystemIds: [
      "Blend.7.0",
      "Consensus.7.0",
    ],
  },
  {
    label: "Composite Components",
    rankingSystemIds: [
      "ResultNetwork.1.0",
      "RecordValue.2.0",
      "CappedMarginPerformance.1.0",
    ],
  },
] as const satisfies readonly {
  label: string;
  rankingSystemIds: readonly RankingSystemId[];
}[];

export const RANKING_CATEGORY_IDS = [
  "ranking",
] as const satisfies readonly RankingCategoryId[];

const RANKING_CATEGORY_LABELS: Record<RankingCategoryId, string> = {
  ranking: "Rankings",
  "power-ranking": "Power Rankings",
  "strength-of-schedule": "Strength of Schedule",
};

const RANKING_ENGINE_NAMES: Record<RankingEngineId, string> = {
  "ResultNetwork.1": "Canonical Result Network",
  "RecordValue.2": "Record Value",
  "CappedMarginPerformance.1": "Capped-Margin Performance",
  "Consensus.7": "Gridiron Consensus",
  "Blend.7": "Gridiron Blend",
};

const RANKING_ENGINE_LABELS: Record<RankingEngineId, string> = {
  "ResultNetwork.1": "Canonical Result Network.1",
  "RecordValue.2": "Record Value.2",
  "CappedMarginPerformance.1": "Capped-Margin Performance.1",
  "Consensus.7": "Gridiron Consensus.7",
  "Blend.7": "Gridiron Blend.7",
};

export const RANKING_ENGINE_IDS = [
  "ResultNetwork.1",
  "RecordValue.2",
  "CappedMarginPerformance.1",
  "Consensus.7",
  "Blend.7",
] as const satisfies readonly RankingEngineId[];

export const SELECTABLE_RANKING_ENGINE_IDS = [
  "ResultNetwork.1",
  "RecordValue.2",
  "CappedMarginPerformance.1",
  "Consensus.7",
  "Blend.7",
] as const satisfies readonly RankingEngineId[];

export const RANKING_ENGINE_SELECT_GROUPS = [
  {
    label: "Composite Rankings",
    rankingEngineIds: ["Blend.7", "Consensus.7"],
  },
  {
    label: "Composite Components",
    rankingEngineIds: [
      "ResultNetwork.1",
      "RecordValue.2",
      "CappedMarginPerformance.1",
    ],
  },
] as const satisfies readonly {
  label: string;
  rankingEngineIds: readonly RankingEngineId[];
}[];

const RANKING_SYSTEM_LABELS: Record<RankingSystemId, string> = {
  "ResultNetwork.1.0": "Canonical Result Network.1.0",
  "RecordValue.2.0": "Record Value.2.0",
  "CappedMarginPerformance.1.0": "Capped-Margin Performance.1.0",
  "Consensus.7.0": "Gridiron Consensus.7.0",
  "Blend.7.0": "Gridiron Blend.7.0",
};

const RANKING_SYSTEM_SELECT_NAMES: Partial<
  Record<RankingSystemId, string>
> = {
  "ResultNetwork.1.0": "Result Network",
  "RecordValue.2.0": "Record Value",
  "CappedMarginPerformance.1.0": "Performance",
  "Consensus.7.0": "Computer Composite",
  "Blend.7.0": "Computer + AP/Coaches",
};

const RANKING_ENGINE_SELECT_NAMES: Partial<
  Record<RankingEngineId, string>
> = {
  "ResultNetwork.1": "Result Network",
  "RecordValue.2": "Record Value",
  "CappedMarginPerformance.1": "Performance",
  "Consensus.7": "Computer Composite",
  "Blend.7": "Computer + AP/Coaches",
};

export const DEFAULT_RANKING_SYSTEM_ID: RankingSystemId = "Consensus.7.0";
export const DEFAULT_RANKING_ENGINE_ID: RankingEngineId = "Consensus.7";

export function isRankingSystemId(
  value: string | null | undefined,
): value is RankingSystemId {
  return RANKING_SYSTEM_IDS.some((id) => id === value);
}

export function isSelectableRankingSystemId(
  value: RankingSystemId,
) {
  return SELECTABLE_RANKING_SYSTEM_IDS.some((id) => id === value);
}

export function parseRankingSystemId(value: string | null | undefined) {
  return isRankingSystemId(value) ? value : DEFAULT_RANKING_SYSTEM_ID;
}

export function isRankingEngineId(
  value: string | null | undefined,
): value is RankingEngineId {
  return RANKING_ENGINE_IDS.some((id) => id === value);
}

export function isSelectableRankingEngineId(
  value: RankingEngineId,
) {
  return SELECTABLE_RANKING_ENGINE_IDS.some((id) => id === value);
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
  const kindOrder = {
    computer: 0,
    consensus: 1,
    blend: 2,
  } as const;

  return (
    kindOrder[left.kind] - kindOrder[right.kind] ||
    left.engineName.localeCompare(right.engineName) ||
    left.engineVersion - right.engineVersion ||
    left.modelVersion - right.modelVersion
  );
}

export function rankingSystemDisplayName(id: RankingSystemId) {
  return RANKING_SYSTEM_LABELS[id];
}

export function rankingSystemSelectDisplayName(id: RankingSystemId) {
  if (!isSelectableRankingSystemId(id)) {
    return rankingSystemDisplayName(id);
  }
  const system = RANKING_SYSTEMS[id];
  const selectableVersions = SELECTABLE_RANKING_SYSTEM_IDS.filter(
    (rankingSystemId) =>
      RANKING_SYSTEMS[rankingSystemId].engineName === system.engineName,
  );
  const selectName = RANKING_SYSTEM_SELECT_NAMES[id] ?? system.engineName;
  return selectableVersions.length === 1
    ? selectName
    : `${selectName}.${system.engineVersion}.${system.modelVersion}`;
}

export function rankingSystemSelectDescription(id: RankingSystemId) {
  return rankingSelectDescription(id);
}

export function rankingCategoryDisplayName(id: RankingCategoryId) {
  return RANKING_CATEGORY_LABELS[id];
}

export function rankingEngineDisplayName(id: RankingEngineId) {
  return RANKING_ENGINE_LABELS[id];
}

export function rankingEngineSelectDisplayName(id: RankingEngineId) {
  if (!isSelectableRankingEngineId(id)) {
    return rankingEngineDisplayName(id);
  }
  const engineName = rankingEngineName(id);
  const selectableVersions = SELECTABLE_RANKING_ENGINE_IDS.filter(
    (engineId) => rankingEngineName(engineId) === engineName,
  );
  const selectName = RANKING_ENGINE_SELECT_NAMES[id] ?? engineName;
  const engineVersion = id.split(".").at(-1);
  return selectableVersions.length === 1
    ? selectName
    : `${selectName}.${engineVersion}`;
}

export function rankingEngineSelectDescription(id: RankingEngineId) {
  return rankingSelectDescription(id);
}

export function rankingEngineName(id: RankingEngineId) {
  return RANKING_ENGINE_NAMES[id];
}

export function rankingSystemCategory(id: RankingSystemId) {
  return RANKING_SYSTEMS[id].categoryId;
}

export function rankingSystemKind(id: RankingSystemId) {
  return RANKING_SYSTEMS[id].kind;
}

export function rankingSystemPriorMode(id: RankingSystemId) {
  return RANKING_SYSTEMS[id].priorMode;
}

export function rankingSystemIdsForCategory(id: RankingCategoryId) {
  return RANKING_SYSTEM_IDS.filter(
    (rankingSystemId) => RANKING_SYSTEMS[rankingSystemId].categoryId === id,
  );
}

export function selectableRankingSystemIdsForCategory(
  id: RankingCategoryId,
) {
  return SELECTABLE_RANKING_SYSTEM_IDS.filter(
    (rankingSystemId) => RANKING_SYSTEMS[rankingSystemId].categoryId === id,
  );
}

function rankingSelectDescription(
  id: RankingSystemId | RankingEngineId,
) {
  if (id.startsWith("Blend.")) {
    return "50% Computer Composite · 25% AP Poll · 25% Coaches Poll";
  }
  if (id.startsWith("Consensus.")) {
    return "40% Record Value · 60% Performance · résumé/loss pressure · close-group adjudication";
  }
  if (id.startsWith("ResultNetwork.")) {
    return "Averages canonical Colley, Bradley–Terry, and binary Massey result networks.";
  }
  if (id.startsWith("RecordValue.")) {
    return "Averages Opponent Value, Wins Above Expectation, and Earned Opponent Value.";
  }
  if (id.startsWith("CappedMarginPerformance.")) {
    return "Averages opponent-adjusted 14-, 21-, and 28-point capped scoring margins.";
  }
  return "Averages opponent-adjusted 14-, 21-, and 28-point capped scoring margins.";
}
