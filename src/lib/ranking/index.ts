import * as engineV1 from "./engines/v1/ranking";
import {
  DEFAULT_MODEL_VERSION,
  RANKING_MODELS,
  type ModelVersion,
} from "./models";
import type {
  Game,
  Poll,
  RatingPrior,
  TeamRanking,
} from "./engines/v1/ranking";

export type {
  Game,
  Poll,
  RatingPrior,
  TeamBoxScore,
  TeamRanking,
} from "./engines/v1/ranking";
export {
  DEFAULT_MODEL_VERSION,
  MODEL_VERSIONS,
  isModelVersion,
  parseModelVersion,
  type ModelVersion,
} from "./models";
export { hasUsableBoxScore } from "./engines/v1/ranking";

const RANKING_ENGINES = {
  v1: engineV1,
};

function engineFor(modelVersion: ModelVersion) {
  return RANKING_ENGINES[RANKING_MODELS[modelVersion].engine];
}

export function buildPollPrior(
  polls: Poll[],
  modelVersion: ModelVersion = DEFAULT_MODEL_VERSION,
) {
  return engineFor(modelVersion).buildPollPrior(polls);
}

export function buildFullPreseasonPrior(
  polls: Poll[],
  currentTeams: string[],
  previousSeasonOrder: string[],
  modelVersion: ModelVersion = DEFAULT_MODEL_VERSION,
) {
  return engineFor(modelVersion).buildFullPreseasonPrior(
    polls,
    currentTeams,
    previousSeasonOrder,
  );
}

export function calculateExpectedStrengthRatings(
  games: Game[],
  throughWeek: number,
  prior: RatingPrior = {},
  modelVersion: ModelVersion = DEFAULT_MODEL_VERSION,
) {
  return engineFor(modelVersion).calculateExpectedStrengthRatings(
    games,
    throughWeek,
    prior,
    modelVersion,
  );
}

export function calculateAchievementPoints(
  games: Game[],
  throughWeek: number,
  prior: RatingPrior = {},
  modelVersion: ModelVersion = DEFAULT_MODEL_VERSION,
) {
  return engineFor(modelVersion).calculateAchievementPoints(
    games,
    throughWeek,
    prior,
    modelVersion,
  );
}

export function calculateRankings(
  games: Game[],
  throughWeek: number,
  prior: RatingPrior = {},
  modelVersion: ModelVersion = DEFAULT_MODEL_VERSION,
): TeamRanking[] {
  return engineFor(modelVersion).calculateRankings(
    games,
    throughWeek,
    prior,
    modelVersion,
  );
}
