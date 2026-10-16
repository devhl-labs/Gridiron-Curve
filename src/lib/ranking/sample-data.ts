import { calculateRankings, type Game } from ".";
import {
  createScheduleRankMap,
  type RankingView,
} from "./view";

const sampleGames: Game[] = [
  { id: 1, week: 1, completed: true, neutralSite: true, homeTeam: "Texas", homePoints: 31, awayTeam: "Michigan", awayPoints: 12 },
  { id: 2, week: 1, completed: true, neutralSite: false, homeTeam: "Georgia", homePoints: 34, awayTeam: "Clemson", awayPoints: 3 },
  { id: 3, week: 1, completed: true, neutralSite: false, homeTeam: "Ohio State", homePoints: 52, awayTeam: "Akron", awayPoints: 6 },
  { id: 4, week: 1, completed: true, neutralSite: false, homeTeam: "Oregon", homePoints: 24, awayTeam: "Boise State", awayPoints: 14 },
  { id: 5, week: 2, completed: true, neutralSite: false, homeTeam: "Alabama", homePoints: 27, awayTeam: "Georgia", awayPoints: 24 },
  { id: 6, week: 2, completed: true, neutralSite: false, homeTeam: "Michigan", homePoints: 24, awayTeam: "USC", awayPoints: 21 },
  { id: 7, week: 2, completed: true, neutralSite: false, homeTeam: "Clemson", homePoints: 28, awayTeam: "NC State", awayPoints: 20 },
  { id: 8, week: 2, completed: true, neutralSite: false, homeTeam: "Boise State", homePoints: 35, awayTeam: "Washington State", awayPoints: 24 },
  { id: 9, week: 3, completed: true, neutralSite: false, homeTeam: "Texas", homePoints: 27, awayTeam: "Oklahoma", awayPoints: 20 },
  { id: 10, week: 3, completed: true, neutralSite: false, homeTeam: "Oregon", homePoints: 32, awayTeam: "Ohio State", awayPoints: 31 },
  { id: 11, week: 3, completed: true, neutralSite: false, homeTeam: "USC", homePoints: 30, awayTeam: "Wisconsin", awayPoints: 21 },
  { id: 12, week: 3, completed: true, neutralSite: true, homeTeam: "Alabama", homePoints: 26, awayTeam: "Clemson", awayPoints: 17 },
];

const sampleRankings = calculateRankings(sampleGames.map((game, index) => ({
  ...game,
  homeStats: {
    totalYards: 280 + (game.homePoints ?? 0) * 4,
    rushingAttempts: 34,
    passingAttempts: 29,
    turnovers: index % 3 === 0 ? 1 : 0,
  },
  awayStats: {
    totalYards: 280 + (game.awayPoints ?? 0) * 4,
    rushingAttempts: 33,
    passingAttempts: 31,
    turnovers: index % 2,
  },
})), 3, {
  Georgia: 0.75,
  "Ohio State": 0.73,
  Texas: 0.71,
  Oregon: 0.69,
  Alabama: 0.67,
  Michigan: 0.63,
});
const sampleScheduleRanks = createScheduleRankMap(sampleRankings);

export const sampleView: RankingView = {
  season: 0,
  week: 3,
  rankingSystemId: "Test.0.11",
  source: "sample",
  generatedAt: null,
  gamesIncluded: sampleGames.length,
  gamesWithStats: sampleGames.length,
  priorDescription: "Illustrative starting ratings",
  rankings: sampleRankings.map((ranking) => ({
    ...ranking,
    logo: null,
    color: null,
    movement: 0,
    lastResult: null,
    scheduleRank:
      sampleScheduleRanks.get(ranking.team) ?? sampleRankings.length,
    upcomingScheduleRank: null,
  })),
};
