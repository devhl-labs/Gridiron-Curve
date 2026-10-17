import {
  DEFAULT_RANKING_SYSTEM_ID,
  RANKING_SYSTEMS,
} from "./registry";
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
  RankingSystemId,
  RatingPrior,
  TeamBoxScore,
  TeamRanking,
} from "./types";
export {
  DEFAULT_RANKING_ENGINE_ID,
  DEFAULT_RANKING_SYSTEM_ID,
  RANKING_CATEGORY_IDS,
  RANKING_ENGINE_IDS,
  RANKING_SYSTEM_IDS,
  compareRankingSystems,
  isRankingEngineId,
  isRankingSystemId,
  parseRankingEngineId,
  parseRankingSystemId,
  rankingCategoryDisplayName,
  rankingEngineDisplayName,
  rankingEngineName,
  rankingSystemDisplayName,
  rankingSystemIdsForCategory,
} from "./registry";
export { hasUsableBoxScore } from "./systems/curve/0/engine";

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
): TeamRanking[] {
  const system = systemFor(rankingSystemId);
  return system.engine.calculateRankings(
    games,
    throughWeek,
    prior,
    system.model,
  );
}
