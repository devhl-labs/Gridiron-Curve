import {
  DEFAULT_RANKING_SYSTEM_ID,
  RANKING_SYSTEMS,
} from "./registry";
import { combinePollBlendRankings } from "./systems/blend/engine";
import {
  combineEvidenceCompositeRankings,
  CONSENSUS_V7_COMPONENT_SYSTEM_IDS,
  CONSENSUS_V7_COMPONENT_WEIGHTS,
} from "./systems/consensus/7/engine";
import {
  buildFullPreseasonPrior as buildCurvePreseasonPrior,
  buildPollPrior as buildCurvePollPrior,
} from "./systems/curve/5/engine";
import type {
  Game,
  Poll,
  RankingSystemId,
  RatingPrior,
  TeamRanking,
} from "./types";

export type {
  Game,
  Poll,
  RankingEngineId,
  RankingCategoryId,
  RankingSystemKind,
  RankingSystemId,
  RatingPrior,
  TeamBoxScore,
  TeamRanking,
} from "./types";
export {
  DEFAULT_RANKING_ENGINE_ID,
  DEFAULT_RANKING_SYSTEM_ID,
  RANKING_CATEGORY_IDS,
  RANKING_ENGINE_SELECT_GROUPS,
  RANKING_ENGINE_IDS,
  RANKING_SYSTEM_SELECT_GROUPS,
  RANKING_SYSTEM_IDS,
  SELECTABLE_RANKING_ENGINE_IDS,
  SELECTABLE_RANKING_SYSTEM_IDS,
  compareRankingSystems,
  isRankingEngineId,
  isRankingSystemId,
  isSelectableRankingEngineId,
  isSelectableRankingSystemId,
  parseRankingEngineId,
  parseRankingSystemId,
  rankingCategoryDisplayName,
  rankingEngineDisplayName,
  rankingEngineName,
  rankingEngineSelectDescription,
  rankingEngineSelectDisplayName,
  rankingSystemCategory,
  rankingSystemDisplayName,
  rankingSystemIdsForCategory,
  rankingSystemKind,
  rankingSystemPriorMode,
  rankingSystemSelectDescription,
  rankingSystemSelectDisplayName,
  selectableRankingSystemIdsForCategory,
} from "./registry";
export {
  CONSENSUS_V7_COMPONENT_SYSTEM_IDS,
  CONSENSUS_V7_COMPONENT_WEIGHTS,
} from "./systems/consensus/7/engine";
export { hasUsableBoxScore } from "./systems/curve/engine";

export type RankingPriorMap = Partial<
  Record<RankingSystemId, RatingPrior>
>;

function systemFor(rankingSystemId: RankingSystemId) {
  return RANKING_SYSTEMS[rankingSystemId];
}

export function buildPollPrior(polls: Poll[]) {
  return buildCurvePollPrior(polls);
}

export function buildFullPreseasonPrior(
  polls: Poll[],
  currentTeams: string[],
  previousSeasonOrder: string[],
) {
  return buildCurvePreseasonPrior(
    polls,
    currentTeams,
    previousSeasonOrder,
  );
}

export function calculateRankings(
  games: Game[],
  throughWeek: number,
  prior: RatingPrior = {},
  rankingSystemId: RankingSystemId = DEFAULT_RANKING_SYSTEM_ID,
  componentPriors: RankingPriorMap = {},
  polls: Poll[] = [],
): TeamRanking[] {
  if (rankingSystemId === "Blend.7.0") {
    return combinePollBlendRankings(
      calculateRankings(
        games,
        throughWeek,
        {},
        "Consensus.7.0",
        componentPriors,
      ),
      polls,
      games,
      throughWeek,
    );
  }
  if (rankingSystemId === "Consensus.7.0") {
    return combineEvidenceCompositeRankings(
      CONSENSUS_V7_COMPONENT_SYSTEM_IDS.map((componentSystemId) => ({
        rankingSystemId: componentSystemId,
        rankings: calculateRankings(
          games,
          throughWeek,
          componentPriors[componentSystemId] ?? {},
          componentSystemId,
        ),
        weight: CONSENSUS_V7_COMPONENT_WEIGHTS[componentSystemId],
      })),
      games,
      throughWeek,
    );
  }
  const system = systemFor(rankingSystemId);
  return system.engine.calculateRankings(
    games,
    throughWeek,
    prior,
    system.model,
  );
}
