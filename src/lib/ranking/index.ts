import {
  DEFAULT_RANKING_SYSTEM_ID,
  RANKING_SYSTEMS,
} from "./registry";
import { combinePollBlendRankings } from "./systems/blend/1/engine";
import {
  combineConsensusRankings,
  CONSENSUS_COMPONENT_SYSTEM_IDS,
} from "./systems/consensus/1/engine";
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
export { CONSENSUS_COMPONENT_SYSTEM_IDS } from "./systems/consensus/1/engine";
export { hasUsableBoxScore } from "./systems/curve/engine";

export type RankingPriorMap = Partial<
  Record<RankingSystemId, RatingPrior>
>;

function systemFor(rankingSystemId: RankingSystemId) {
  return RANKING_SYSTEMS[rankingSystemId];
}

export function buildPollPrior(
  polls: Poll[],
  rankingSystemId: RankingSystemId = DEFAULT_RANKING_SYSTEM_ID,
) {
  return systemFor(rankingSystemId).engine.buildPollPrior(polls);
}

export function buildFullPreseasonPrior(
  polls: Poll[],
  currentTeams: string[],
  previousSeasonOrder: string[],
  rankingSystemId: RankingSystemId = DEFAULT_RANKING_SYSTEM_ID,
) {
  return systemFor(rankingSystemId).engine.buildFullPreseasonPrior(
    polls,
    currentTeams,
    previousSeasonOrder,
  );
}

export function calculateExpectedStrengthRatings(
  games: Game[],
  throughWeek: number,
  prior: RatingPrior = {},
  rankingSystemId: RankingSystemId = DEFAULT_RANKING_SYSTEM_ID,
) {
  const system = systemFor(rankingSystemId);
  return system.engine.calculateExpectedStrengthRatings(
    games,
    throughWeek,
    prior,
    system.model,
  );
}

export function calculateAchievementPoints(
  games: Game[],
  throughWeek: number,
  prior: RatingPrior = {},
  rankingSystemId: RankingSystemId = DEFAULT_RANKING_SYSTEM_ID,
) {
  const system = systemFor(rankingSystemId);
  return system.engine.calculateAchievementPoints(
    games,
    throughWeek,
    prior,
    system.model,
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
  if (rankingSystemId === "Blend.1.0") {
    return combinePollBlendRankings(
      calculateRankings(
        games,
        throughWeek,
        {},
        "Consensus.1.0",
        componentPriors,
      ),
      polls,
      games,
      throughWeek,
    );
  }
  if (rankingSystemId === "Consensus.1.0") {
    return combineConsensusRankings(
      CONSENSUS_COMPONENT_SYSTEM_IDS.map((componentSystemId) => ({
        rankingSystemId: componentSystemId,
        rankings: calculateRankings(
          games,
          throughWeek,
          componentPriors[componentSystemId] ??
            (componentSystemId === "Curve.5.0" ? prior : {}),
          componentSystemId,
        ),
      })),
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
