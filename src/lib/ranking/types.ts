export type RankingSystemId =
  | "Curve.0.7"
  | "Curve.0.8"
  | "Curve.0.9"
  | "Curve.0.10"
  | "Curve.0.11";

export type RankingCategoryId = "resume";
export type RankingEngineId = "Curve.0";

export type TeamBoxScore = {
  totalYards: number;
  rushingAttempts: number;
  passingAttempts: number;
  turnovers: number;
};

export type Game = {
  id: number;
  week: number;
  startDate?: string | null;
  seasonType?: string;
  completed: boolean;
  neutralSite: boolean;
  homeTeam: string;
  homePoints: number | null;
  awayTeam: string;
  awayPoints: number | null;
  homeClassification?: string | null;
  awayClassification?: string | null;
  homeStats?: TeamBoxScore | null;
  awayStats?: TeamBoxScore | null;
};

export type RatingPrior = Record<string, number>;

export type Poll = {
  poll: string;
  ranks: Array<{ rank: number; school: string }>;
};

export type TeamRanking = {
  team: string;
  rank: number;
  rating: number;
  record: string;
  wins: number;
  losses: number;
  gamesPlayed: number;
  strengthOfSchedule: number;
  bestWin: string | null;
  networkRating: number;
  networkPercentile: number;
  networkScore: number;
  achievementPoints: number;
  achievementAverage: number;
  achievementScore: number;
  qualityOfWins: number;
};

export type RankingModel = {
  minimumPriorWeight: number;
  expectationPrior: "faded" | "full";
  networkPercentileWeight: number;
  networkMagnitudeWeight: number;
};

export type RankingEngine = {
  buildPollPrior(polls: Poll[]): RatingPrior;
  buildFullPreseasonPrior(
    polls: Poll[],
    currentTeams: string[],
    previousSeasonOrder: string[],
  ): RatingPrior;
  calculateExpectedStrengthRatings(
    games: Game[],
    throughWeek: number,
    prior: RatingPrior,
    model: RankingModel,
  ): Map<string, number>;
  calculateAchievementPoints(
    games: Game[],
    throughWeek: number,
    prior: RatingPrior,
    model: RankingModel,
  ): Map<string, number>;
  calculateRankings(
    games: Game[],
    throughWeek: number,
    prior: RatingPrior,
    model: RankingModel,
  ): TeamRanking[];
};

export type RankingSystemDefinition = {
  id: RankingSystemId;
  categoryId: RankingCategoryId;
  engineId: RankingEngineId;
  engineName: string;
  engineVersion: number;
  modelVersion: number;
  engine: RankingEngine;
  model: RankingModel;
};
