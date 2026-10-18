import {
  calculateRankings,
  CONSENSUS_V5_COMPONENT_SYSTEM_IDS,
  DEFAULT_RANKING_SYSTEM_ID,
  type Game,
  type Poll,
  type RankingSystemId,
} from ".";
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

const preparedSampleGames = sampleGames.map((game, index) => ({
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
}));
const samplePrior = {
  Georgia: 0.75,
  "Ohio State": 0.73,
  Texas: 0.71,
  Oregon: 0.69,
  Alabama: 0.67,
  Michigan: 0.63,
};
const samplePolls: Poll[] = [
  {
    poll: "AP Top 25",
    ranks: [
      "Texas",
      "Oregon",
      "Alabama",
      "Ohio State",
      "Georgia",
      "Michigan",
      "USC",
      "Clemson",
      "Boise State",
      "Washington State",
    ].map((school, index) => ({ rank: index + 1, school })),
  },
  {
    poll: "Coaches Poll",
    ranks: [
      "Oregon",
      "Texas",
      "Ohio State",
      "Alabama",
      "Georgia",
      "Michigan",
      "Clemson",
      "USC",
      "Boise State",
      "Washington State",
    ].map((school, index) => ({ rank: index + 1, school })),
  },
];

export function createSampleView(
  rankingSystemId: RankingSystemId = DEFAULT_RANKING_SYSTEM_ID,
): RankingView {
  const componentPriors =
    rankingSystemId === "Consensus.5.0" ||
    rankingSystemId === "Blend.5.0"
      ? Object.fromEntries(
          CONSENSUS_V5_COMPONENT_SYSTEM_IDS.map((componentSystemId) => [
            componentSystemId,
            samplePrior,
          ]),
        )
      : {};
  const sampleRankings = calculateRankings(
    preparedSampleGames,
    3,
    samplePrior,
    rankingSystemId,
    componentPriors,
    samplePolls,
  );
  const sampleScheduleRanks = createScheduleRankMap(sampleRankings);

  return {
    season: 0,
    week: 3,
    rankingSystemId,
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
}

export const sampleView = createSampleView();
