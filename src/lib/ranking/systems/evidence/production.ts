import type {
  Game,
  RankingEngine,
  RatingPrior,
  TeamRanking,
} from "../../types";
import {
  buildFullPreseasonPrior,
  buildPollPrior,
} from "../curve/engine";
import {
  calculatePublishedEvidenceRankings,
  cappedMarginPerformanceFamilyEngine,
  recordValueFamilyEngine,
  resultNetworkFamilyEngine,
  type CandidateEngine,
  type CandidateRanking,
} from "./engine";

function completedGames(games: Game[], throughWeek: number) {
  return games.filter(
    (game) =>
      game.completed &&
      game.seasonType !== "postseason" &&
      game.week <= throughWeek &&
      game.homePoints !== null &&
      game.awayPoints !== null,
  );
}

function toTeamRankings(
  rankings: CandidateRanking[],
  games: Game[],
  throughWeek: number,
): TeamRanking[] {
  const lastIndex = Math.max(1, rankings.length - 1);
  const percentiles = new Map(
    rankings.map(({ team, rank }) => [
      team,
      ((rankings.length - rank) / lastIndex) * 100,
    ]),
  );
  const schedules = new Map<
    string,
    Array<{ opponent: string; result: number }>
  >(rankings.map(({ team }) => [team, []]));

  for (const game of completedGames(games, throughWeek)) {
    const homeResult =
      game.homePoints! > game.awayPoints!
        ? 1
        : game.homePoints! < game.awayPoints!
          ? 0
          : 0.5;
    schedules.get(game.homeTeam)?.push({
      opponent: game.awayTeam,
      result: homeResult,
    });
    schedules.get(game.awayTeam)?.push({
      opponent: game.homeTeam,
      result: 1 - homeResult,
    });
  }

  return rankings.map((ranking) => {
    const schedule = schedules.get(ranking.team) ?? [];
    const opponentValues = schedule.map(
      ({ opponent }) => percentiles.get(opponent) ?? 0,
    );
    const wins = schedule
      .filter(({ result }) => result === 1)
      .toSorted(
        (left, right) =>
          (percentiles.get(right.opponent) ?? 0) -
            (percentiles.get(left.opponent) ?? 0) ||
          left.opponent.localeCompare(right.opponent),
      );
    const strongestWins = wins
      .slice(0, 4)
      .map(({ opponent }) => percentiles.get(opponent) ?? 0);
    const percentile = percentiles.get(ranking.team) ?? 50;

    return {
      team: ranking.team,
      rank: ranking.rank,
      rating: Number(percentile.toFixed(1)),
      record: `${ranking.wins}-${ranking.losses}`,
      wins: ranking.wins,
      losses: ranking.losses,
      gamesPlayed: ranking.gamesPlayed,
      strengthOfSchedule:
        opponentValues.length === 0
          ? 50
          : Number(
              (
                opponentValues.reduce(
                  (total, value) => total + value,
                  0,
                ) / opponentValues.length
              ).toFixed(1),
            ),
      bestWin: wins[0]?.opponent ?? null,
      networkRating: ranking.score,
      networkPercentile: Number(percentile.toFixed(1)),
      networkScore: Number(percentile.toFixed(1)),
      achievementPoints: 0,
      achievementAverage: 0,
      achievementScore: 50,
      qualityOfWins: Number(
        (
          strongestWins.reduce((total, value) => total + value, 0) / 4
        ).toFixed(1),
      ),
    };
  });
}

export function calculateEvidenceFamilyRankings(
  engine: CandidateEngine,
  games: Game[],
  throughWeek: number,
  prior: RatingPrior,
) {
  return toTeamRankings(
    calculatePublishedEvidenceRankings(
      engine,
      games,
      throughWeek,
      prior,
    ),
    games,
    throughWeek,
  );
}

function createEvidenceFamilyEngine(
  engine: CandidateEngine,
): RankingEngine {
  return {
    buildPollPrior,
    buildFullPreseasonPrior,
    calculateExpectedStrengthRatings: (
      games,
      throughWeek,
      prior,
    ) =>
      new Map(
        calculateEvidenceFamilyRankings(
          engine,
          games,
          throughWeek,
          prior,
        ).map(({ team, networkRating }) => [team, networkRating]),
      ),
    calculateAchievementPoints: () => new Map(),
    calculateRankings: (
      games,
      throughWeek,
      prior,
    ) =>
      calculateEvidenceFamilyRankings(
        engine,
        games,
        throughWeek,
        prior,
      ),
  };
}

export const resultNetworkProductionEngine =
  createEvidenceFamilyEngine(resultNetworkFamilyEngine);

export const recordValueProductionEngine =
  createEvidenceFamilyEngine(recordValueFamilyEngine);

export const cappedMarginPerformanceProductionEngine =
  createEvidenceFamilyEngine(cappedMarginPerformanceFamilyEngine);
