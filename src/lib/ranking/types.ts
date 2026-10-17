export type RankingSystemId =
  | "Curve.0.7"
  | "Curve.0.8"
  | "Curve.0.9"
  | "Curve.0.10"
  | "Curve.0.11"
  | "Curve.1.0"
  | "Curve.2.0"
  | "Curve.3.0"
  | "Curve.4.0"
  | "Curve.5.0"
  | "RecordMatrix.1.0"
  | "Pairwise.1.0"
  | "Sequence.1.0"
  | "LeastSquares.1.0"
  | "VictoryPaths.1.0"
  | "Consensus.1.0"
  | "Blend.1.0";

export type RankingCategoryId =
  | "ranking"
  | "power-ranking"
  | "strength-of-schedule";
export type RankingSystemKind =
  | "curve"
  | "computer"
  | "consensus"
  | "blend";
export type RankingEngineId =
  | "Curve.0"
  | "Curve.1"
  | "Curve.2"
  | "Curve.3"
  | "Curve.4"
  | "Curve.5"
  | "RecordMatrix.1"
  | "Pairwise.1"
  | "Sequence.1"
  | "LeastSquares.1"
  | "VictoryPaths.1"
  | "Consensus.1"
  | "Blend.1";

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
  consensusAverageRank?: number;
  consensusRanks?: Array<{
    rankingSystemId: RankingSystemId;
    rank: number;
    included: boolean;
  }>;
  blendScore?: number;
  blendComponents?: Array<{
    source: "Gridiron Consensus" | "AP Poll" | "Coaches Poll";
    rank: number | null;
    points: number;
    weight: number;
  }>;
  blendHeadToHeadRecord?: string | null;
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
  kind: RankingSystemKind;
  engineId: RankingEngineId;
  engineName: string;
  engineVersion: number;
  modelVersion: number;
  engine: RankingEngine;
  model: RankingModel;
  priorMode: "historical" | "neutral" | "component";
};
