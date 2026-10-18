import {
  DEFAULT_RANKING_SYSTEM_ID,
  RANKING_SYSTEMS,
} from "./registry";
import { combinePollBlendRankings } from "./systems/blend/1/engine";
import {
  combineConsensusRankings,
  CONSENSUS_COMPONENT_SYSTEM_IDS,
} from "./systems/consensus/1/engine";
import {
  CONSENSUS_V2_COMPONENT_SYSTEM_IDS,
} from "./systems/consensus/2/engine";
import {
  combineWeightedConsensusRankings,
  CONSENSUS_V3_COMPONENT_SYSTEM_IDS,
  CONSENSUS_V3_COMPONENT_WEIGHTS,
} from "./systems/consensus/3/engine";
import {
  combineEvidenceCompositeRankings,
  CONSENSUS_V4_COMPONENT_SYSTEM_IDS,
  CONSENSUS_V4_COMPONENT_WEIGHTS,
} from "./systems/consensus/4/engine";
import {
  combineNeutralFamilyRankings,
  NEUTRAL_FAMILY_COMPONENT_SYSTEM_IDS,
} from "./systems/neutral-family/1/engine";
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
export {
  CONSENSUS_V2_COMPONENT_SYSTEM_IDS,
} from "./systems/consensus/2/engine";
export {
  CONSENSUS_V3_COMPONENT_SYSTEM_IDS,
  CONSENSUS_V3_COMPONENT_WEIGHTS,
} from "./systems/consensus/3/engine";
export {
  CONSENSUS_V4_COMPONENT_SYSTEM_IDS,
  CONSENSUS_V4_COMPONENT_WEIGHTS,
} from "./systems/consensus/4/engine";
export {
  NEUTRAL_FAMILY_COMPONENT_SYSTEM_IDS,
} from "./systems/neutral-family/1/engine";
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
  const blendConsensusSystemId =
    rankingSystemId === "Blend.1.0"
      ? "Consensus.1.0"
      : rankingSystemId === "Blend.2.0"
        ? "Consensus.2.0"
        : rankingSystemId === "Blend.3.0"
          ? "Consensus.3.0"
        : null;
  if (blendConsensusSystemId) {
    return combinePollBlendRankings(
      calculateRankings(
        games,
        throughWeek,
        {},
        blendConsensusSystemId,
        componentPriors,
      ),
      polls,
      games,
      throughWeek,
    );
  }
  if (rankingSystemId === "Consensus.3.0") {
    return combineWeightedConsensusRankings(
      CONSENSUS_V3_COMPONENT_SYSTEM_IDS.map((componentSystemId) => ({
        rankingSystemId: componentSystemId,
        rankings: calculateRankings(
          games,
          throughWeek,
          componentPriors[componentSystemId] ??
            (componentSystemId === "Curve.5.0" ? prior : {}),
          componentSystemId,
        ),
        weight: CONSENSUS_V3_COMPONENT_WEIGHTS[componentSystemId],
      })),
    );
  }
  if (rankingSystemId === "Consensus.4.0") {
    return combineEvidenceCompositeRankings(
      CONSENSUS_V4_COMPONENT_SYSTEM_IDS.map((componentSystemId) => ({
        rankingSystemId: componentSystemId,
        rankings: calculateRankings(
          games,
          throughWeek,
          componentPriors[componentSystemId] ?? {},
          componentSystemId,
        ),
        weight: CONSENSUS_V4_COMPONENT_WEIGHTS[componentSystemId],
      })),
    );
  }
  if (rankingSystemId === "NeutralFamily.1.0") {
    return combineNeutralFamilyRankings(
      NEUTRAL_FAMILY_COMPONENT_SYSTEM_IDS.map((componentSystemId) => ({
        rankingSystemId: componentSystemId,
        rankings: calculateRankings(
          games,
          throughWeek,
          {},
          componentSystemId,
        ),
      })),
    );
  }
  const consensusComponentSystemIds =
    rankingSystemId === "Consensus.1.0"
      ? CONSENSUS_COMPONENT_SYSTEM_IDS
      : rankingSystemId === "Consensus.2.0"
        ? CONSENSUS_V2_COMPONENT_SYSTEM_IDS
        : null;
  if (consensusComponentSystemIds) {
    return combineConsensusRankings(
      consensusComponentSystemIds.map((componentSystemId) => ({
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
