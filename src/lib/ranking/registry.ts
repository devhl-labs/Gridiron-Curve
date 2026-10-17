import { blendSystems } from "./systems/blend/1";
import { curve0Systems } from "./systems/curve/0";
import { curve1Systems } from "./systems/curve/1";
import { curve2Systems } from "./systems/curve/2";
import { curve3Systems } from "./systems/curve/3";
import { curve4Systems } from "./systems/curve/4";
import { curve5Systems } from "./systems/curve/5";
import { consensusSystems } from "./systems/consensus/1";
import { leastSquaresSystems } from "./systems/least-squares/1";
import { pairwiseSystems } from "./systems/pairwise/1";
import { recordMatrixSystems } from "./systems/record-matrix/1";
import { sequenceSystems } from "./systems/sequence/1";
import { victoryPathsSystems } from "./systems/victory-paths/1";
import type {
  RankingCategoryId,
  RankingEngineId,
  RankingSystemDefinition,
  RankingSystemId,
} from "./types";

export const RANKING_SYSTEMS = {
  ...blendSystems,
  ...curve0Systems,
  ...curve1Systems,
  ...curve2Systems,
  ...curve3Systems,
  ...curve4Systems,
  ...curve5Systems,
  ...recordMatrixSystems,
  ...pairwiseSystems,
  ...sequenceSystems,
  ...leastSquaresSystems,
  ...victoryPathsSystems,
  ...consensusSystems,
} satisfies Record<RankingSystemId, RankingSystemDefinition>;

export const RANKING_SYSTEM_IDS = [
  "Curve.0.7",
  "Curve.0.8",
  "Curve.0.9",
  "Curve.0.10",
  "Curve.0.11",
  "Curve.1.0",
  "Curve.2.0",
  "Curve.3.0",
  "Curve.4.0",
  "Curve.5.0",
  "RecordMatrix.1.0",
  "Pairwise.1.0",
  "Sequence.1.0",
  "LeastSquares.1.0",
  "VictoryPaths.1.0",
  "Consensus.1.0",
  "Blend.1.0",
] as const satisfies readonly RankingSystemId[];

export const SELECTABLE_RANKING_SYSTEM_IDS = [
  "Curve.5.0",
  "RecordMatrix.1.0",
  "Pairwise.1.0",
  "Sequence.1.0",
  "LeastSquares.1.0",
  "VictoryPaths.1.0",
  "Consensus.1.0",
  "Blend.1.0",
] as const satisfies readonly RankingSystemId[];

export const RANKING_SYSTEM_SELECT_GROUPS = [
  {
    label: "Composite Rankings",
    rankingSystemIds: [
      "Blend.1.0",
      "Consensus.1.0",
    ],
  },
  {
    label: "Individual Models",
    rankingSystemIds: [
      "Curve.5.0",
      "VictoryPaths.1.0",
      "Sequence.1.0",
      "RecordMatrix.1.0",
      "Pairwise.1.0",
      "LeastSquares.1.0",
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
  "Curve.0": "Curve",
  "Curve.1": "Curve",
  "Curve.2": "Curve",
  "Curve.3": "Curve",
  "Curve.4": "Curve",
  "Curve.5": "Curve",
  "RecordMatrix.1": "Record Matrix",
  "Pairwise.1": "Pairwise Odds",
  "Sequence.1": "Result Sequence",
  "LeastSquares.1": "Least Squares",
  "VictoryPaths.1": "Victory Paths",
  "Consensus.1": "Gridiron Consensus",
  "Blend.1": "Gridiron Blend",
};

const RANKING_ENGINE_LABELS: Record<RankingEngineId, string> = {
  "Curve.0": "Curve.0",
  "Curve.1": "Curve.1",
  "Curve.2": "Curve.2",
  "Curve.3": "Curve.3",
  "Curve.4": "Curve.4",
  "Curve.5": "Curve.5",
  "RecordMatrix.1": "Record Matrix.1",
  "Pairwise.1": "Pairwise Odds.1",
  "Sequence.1": "Result Sequence.1",
  "LeastSquares.1": "Least Squares.1",
  "VictoryPaths.1": "Victory Paths.1",
  "Consensus.1": "Gridiron Consensus.1",
  "Blend.1": "Gridiron Blend.1",
};

export const RANKING_ENGINE_IDS = [
  "Curve.0",
  "Curve.1",
  "Curve.2",
  "Curve.3",
  "Curve.4",
  "Curve.5",
  "RecordMatrix.1",
  "Pairwise.1",
  "Sequence.1",
  "LeastSquares.1",
  "VictoryPaths.1",
  "Consensus.1",
  "Blend.1",
] as const satisfies readonly RankingEngineId[];

export const SELECTABLE_RANKING_ENGINE_IDS = [
  "Curve.5",
  "RecordMatrix.1",
  "Pairwise.1",
  "Sequence.1",
  "LeastSquares.1",
  "VictoryPaths.1",
  "Consensus.1",
  "Blend.1",
] as const satisfies readonly RankingEngineId[];

export const RANKING_ENGINE_SELECT_GROUPS = [
  {
    label: "Composite Rankings",
    rankingEngineIds: ["Blend.1", "Consensus.1"],
  },
  {
    label: "Individual Models",
    rankingEngineIds: [
      "Curve.5",
      "VictoryPaths.1",
      "Sequence.1",
      "RecordMatrix.1",
      "Pairwise.1",
      "LeastSquares.1",
    ],
  },
] as const satisfies readonly {
  label: string;
  rankingEngineIds: readonly RankingEngineId[];
}[];

const RANKING_SYSTEM_LABELS: Record<RankingSystemId, string> = {
  "Curve.0.7": "Curve.0.7",
  "Curve.0.8": "Curve.0.8",
  "Curve.0.9": "Curve.0.9",
  "Curve.0.10": "Curve.0.10",
  "Curve.0.11": "Curve.0.11",
  "Curve.1.0": "Curve.1.0",
  "Curve.2.0": "Curve.2.0",
  "Curve.3.0": "Curve.3.0",
  "Curve.4.0": "Curve.4.0",
  "Curve.5.0": "Curve.5.0",
  "RecordMatrix.1.0": "Record Matrix.1.0",
  "Pairwise.1.0": "Pairwise Odds.1.0",
  "Sequence.1.0": "Result Sequence.1.0",
  "LeastSquares.1.0": "Least Squares.1.0",
  "VictoryPaths.1.0": "Victory Paths.1.0",
  "Consensus.1.0": "Gridiron Consensus.1.0",
  "Blend.1.0": "Gridiron Blend.1.0",
};

const RANKING_SYSTEM_SELECT_NAMES: Partial<
  Record<RankingSystemId, string>
> = {
  "Curve.5.0": "Résumé Ranking",
  "RecordMatrix.1.0": "Record Matrix",
  "Pairwise.1.0": "Pairwise Odds",
  "Sequence.1.0": "Result Sequence",
  "LeastSquares.1.0": "Least Squares",
  "VictoryPaths.1.0": "Victory Paths",
  "Consensus.1.0": "Computer Composite",
  "Blend.1.0": "Computer + AP/Coaches",
};

const RANKING_ENGINE_SELECT_NAMES: Partial<
  Record<RankingEngineId, string>
> = {
  "Curve.5": "Résumé Ranking",
  "RecordMatrix.1": "Record Matrix",
  "Pairwise.1": "Pairwise Odds",
  "Sequence.1": "Result Sequence",
  "LeastSquares.1": "Least Squares",
  "VictoryPaths.1": "Victory Paths",
  "Consensus.1": "Computer Composite",
  "Blend.1": "Computer + AP/Coaches",
};

export const DEFAULT_RANKING_SYSTEM_ID: RankingSystemId = "Curve.5.0";
export const DEFAULT_RANKING_ENGINE_ID: RankingEngineId = "Curve.5";

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
    curve: 1,
    consensus: 2,
    blend: 3,
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
  if (id.startsWith("Curve.")) {
    return "Grades each team's results by opponent quality and how much the team accomplished.";
  }
  if (id.startsWith("Blend.")) {
    return "50% Computer Composite · 25% AP Poll · 25% Coaches Poll";
  }
  if (id.startsWith("Consensus.")) {
    return "Combines six independent computer methods after removing each team's highest and lowest positions.";
  }
  if (id.startsWith("VictoryPaths.")) {
    return "Uses the network of who beat whom to trace the strongest paths through the season.";
  }
  if (id.startsWith("Sequence.")) {
    return "Updates team ratings game by game, so each result is judged in sequence.";
  }
  if (id.startsWith("RecordMatrix.")) {
    return "Rates win-loss records in the context of every opponent's record.";
  }
  if (id.startsWith("Pairwise.")) {
    return "Estimates team strength from head-to-head win and loss probabilities.";
  }
  return "Finds the opponent-adjusted ratings that best fit every game's winner and loser.";
}
