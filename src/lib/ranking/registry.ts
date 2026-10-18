import { blendSystems as blend1Systems } from "./systems/blend/1";
import { blendSystems as blend2Systems } from "./systems/blend/2";
import { blendSystems as blend3Systems } from "./systems/blend/3";
import { cappedMarginPerformanceSystems } from "./systems/capped-margin-performance/1";
import { curve0Systems } from "./systems/curve/0";
import { curve1Systems } from "./systems/curve/1";
import { curve2Systems } from "./systems/curve/2";
import { curve3Systems } from "./systems/curve/3";
import { curve4Systems } from "./systems/curve/4";
import { curve5Systems } from "./systems/curve/5";
import { consensusSystems as consensus1Systems } from "./systems/consensus/1";
import { consensusSystems as consensus2Systems } from "./systems/consensus/2";
import { consensusSystems as consensus3Systems } from "./systems/consensus/3";
import { consensusSystems as consensus4Systems } from "./systems/consensus/4";
import { leastSquaresSystems } from "./systems/least-squares/1";
import { neutralFamilySystems } from "./systems/neutral-family/1";
import { pairwiseSystems } from "./systems/pairwise/1";
import { recordMatrixSystems } from "./systems/record-matrix/1";
import { recordValueSystems } from "./systems/record-value/1";
import { resultNetworkSystems } from "./systems/result-network/1";
import { scheduleRecordSystems } from "./systems/schedule-record/1";
import { sequenceSystems } from "./systems/sequence/1";
import { victoryPathsSystems } from "./systems/victory-paths/1";
import type {
  RankingCategoryId,
  RankingEngineId,
  RankingSystemDefinition,
  RankingSystemId,
} from "./types";

export const RANKING_SYSTEMS = {
  ...blend1Systems,
  ...blend2Systems,
  ...blend3Systems,
  ...curve0Systems,
  ...curve1Systems,
  ...curve2Systems,
  ...curve3Systems,
  ...curve4Systems,
  ...curve5Systems,
  ...recordMatrixSystems,
  ...scheduleRecordSystems,
  ...neutralFamilySystems,
  ...resultNetworkSystems,
  ...recordValueSystems,
  ...cappedMarginPerformanceSystems,
  ...pairwiseSystems,
  ...sequenceSystems,
  ...leastSquaresSystems,
  ...victoryPathsSystems,
  ...consensus1Systems,
  ...consensus2Systems,
  ...consensus3Systems,
  ...consensus4Systems,
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
  "ScheduleRecord.1.0",
  "NeutralFamily.1.0",
  "ResultNetwork.1.0",
  "RecordValue.1.0",
  "CappedMarginPerformance.1.0",
  "Consensus.1.0",
  "Consensus.2.0",
  "Consensus.3.0",
  "Consensus.4.0",
  "Blend.1.0",
  "Blend.2.0",
  "Blend.3.0",
] as const satisfies readonly RankingSystemId[];

export const SELECTABLE_RANKING_SYSTEM_IDS = [
  "Curve.5.0",
  "RecordMatrix.1.0",
  "Pairwise.1.0",
  "Sequence.1.0",
  "LeastSquares.1.0",
  "VictoryPaths.1.0",
  "ScheduleRecord.1.0",
  "ResultNetwork.1.0",
  "RecordValue.1.0",
  "CappedMarginPerformance.1.0",
  "Consensus.4.0",
  "Consensus.3.0",
  "Blend.3.0",
] as const satisfies readonly RankingSystemId[];

export const RANKING_SYSTEM_SELECT_GROUPS = [
  {
    label: "Composite Rankings",
    rankingSystemIds: [
      "Blend.3.0",
      "Consensus.4.0",
      "Consensus.3.0",
    ],
  },
  {
    label: "Individual Models",
    rankingSystemIds: [
      "Curve.5.0",
      "ResultNetwork.1.0",
      "RecordValue.1.0",
      "CappedMarginPerformance.1.0",
      "ScheduleRecord.1.0",
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
  "ScheduleRecord.1": "Schedule-Adjusted Record",
  "NeutralFamily.1": "Neutral Computer Family",
  "ResultNetwork.1": "Canonical Result Network",
  "RecordValue.1": "Record Value",
  "CappedMarginPerformance.1": "Capped-Margin Performance",
  "Consensus.1": "Gridiron Consensus",
  "Consensus.2": "Gridiron Consensus",
  "Consensus.3": "Gridiron Consensus",
  "Consensus.4": "Gridiron Consensus",
  "Blend.1": "Gridiron Blend",
  "Blend.2": "Gridiron Blend",
  "Blend.3": "Gridiron Blend",
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
  "ScheduleRecord.1": "Schedule-Adjusted Record.1",
  "NeutralFamily.1": "Neutral Computer Family.1",
  "ResultNetwork.1": "Canonical Result Network.1",
  "RecordValue.1": "Record Value.1",
  "CappedMarginPerformance.1": "Capped-Margin Performance.1",
  "Consensus.1": "Gridiron Consensus.1",
  "Consensus.2": "Gridiron Consensus.2",
  "Consensus.3": "Gridiron Consensus.3",
  "Consensus.4": "Gridiron Consensus.4",
  "Blend.1": "Gridiron Blend.1",
  "Blend.2": "Gridiron Blend.2",
  "Blend.3": "Gridiron Blend.3",
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
  "ScheduleRecord.1",
  "NeutralFamily.1",
  "ResultNetwork.1",
  "RecordValue.1",
  "CappedMarginPerformance.1",
  "Consensus.1",
  "Consensus.2",
  "Consensus.3",
  "Consensus.4",
  "Blend.1",
  "Blend.2",
  "Blend.3",
] as const satisfies readonly RankingEngineId[];

export const SELECTABLE_RANKING_ENGINE_IDS = [
  "Curve.5",
  "RecordMatrix.1",
  "Pairwise.1",
  "Sequence.1",
  "LeastSquares.1",
  "VictoryPaths.1",
  "ScheduleRecord.1",
  "ResultNetwork.1",
  "RecordValue.1",
  "CappedMarginPerformance.1",
  "Consensus.4",
  "Consensus.3",
  "Blend.3",
] as const satisfies readonly RankingEngineId[];

export const RANKING_ENGINE_SELECT_GROUPS = [
  {
    label: "Composite Rankings",
    rankingEngineIds: ["Blend.3", "Consensus.4", "Consensus.3"],
  },
  {
    label: "Individual Models",
    rankingEngineIds: [
      "Curve.5",
      "ResultNetwork.1",
      "RecordValue.1",
      "CappedMarginPerformance.1",
      "ScheduleRecord.1",
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
  "ScheduleRecord.1.0": "Schedule-Adjusted Record.1.0",
  "NeutralFamily.1.0": "Neutral Computer Family.1.0",
  "ResultNetwork.1.0": "Canonical Result Network.1.0",
  "RecordValue.1.0": "Record Value.1.0",
  "CappedMarginPerformance.1.0": "Capped-Margin Performance.1.0",
  "Consensus.1.0": "Gridiron Consensus.1.0",
  "Consensus.2.0": "Gridiron Consensus.2.0",
  "Consensus.3.0": "Gridiron Consensus.3.0",
  "Consensus.4.0": "Gridiron Consensus.4.0",
  "Blend.1.0": "Gridiron Blend.1.0",
  "Blend.2.0": "Gridiron Blend.2.0",
  "Blend.3.0": "Gridiron Blend.3.0",
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
  "ScheduleRecord.1.0": "Schedule-Adjusted Record",
  "ResultNetwork.1.0": "Result Network",
  "RecordValue.1.0": "Record Value",
  "CappedMarginPerformance.1.0": "Performance",
  "Consensus.1.0": "Computer Composite",
  "Consensus.2.0": "Computer Composite",
  "Consensus.3.0": "Computer Composite",
  "Consensus.4.0": "Computer Composite",
  "Blend.1.0": "Computer + AP/Coaches",
  "Blend.2.0": "Computer + AP/Coaches",
  "Blend.3.0": "Computer + AP/Coaches",
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
  "ScheduleRecord.1": "Schedule-Adjusted Record",
  "ResultNetwork.1": "Result Network",
  "RecordValue.1": "Record Value",
  "CappedMarginPerformance.1": "Performance",
  "Consensus.1": "Computer Composite",
  "Consensus.2": "Computer Composite",
  "Consensus.3": "Computer Composite",
  "Consensus.4": "Computer Composite",
  "Blend.1": "Computer + AP/Coaches",
  "Blend.2": "Computer + AP/Coaches",
  "Blend.3": "Computer + AP/Coaches",
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
    if (id.startsWith("Consensus.4")) {
      return "25% Result Network · 25% Record Value · 50% Performance";
    }
    if (id.startsWith("Consensus.3")) {
      return "20% Résumé · 60% Schedule-Adjusted Record · 20% Neutral Computer Family";
    }
    return id.startsWith("Consensus.2")
      ? "Combines five computer methods after removing each team's highest and lowest positions."
      : "Combines six computer methods after removing each team's highest and lowest positions.";
  }
  if (id.startsWith("ScheduleRecord.")) {
    return "Weights every win or tie by the neutral strength of the opponent.";
  }
  if (id.startsWith("ResultNetwork.")) {
    return "Averages canonical Colley, Bradley–Terry, and binary Massey result networks.";
  }
  if (id.startsWith("RecordValue.")) {
    return "Averages Opponent Value, Wins Above Expectation, and Strength of Record.";
  }
  if (id.startsWith("CappedMarginPerformance.")) {
    return "Averages opponent-adjusted 14-, 21-, and 28-point capped scoring margins.";
  }
  if (id.startsWith("NeutralFamily.")) {
    return "Combines four neutral-start result algorithms into one family ranking.";
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
