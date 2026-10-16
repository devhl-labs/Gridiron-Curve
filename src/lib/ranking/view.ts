import type { CfbdSourceCache } from "../cfbd/cache";
import {
  buildFullPreseasonPrior,
  buildPollPrior,
  calculateRankings,
  DEFAULT_RANKING_SYSTEM_ID,
  hasUsableBoxScore,
  type RankingSystemId,
  type RatingPrior,
  type TeamRanking,
} from ".";

export type RankingView = {
  season: number;
  week: number;
  rankingSystemId: RankingSystemId;
  source: "cfbd" | "sample";
  generatedAt: string | null;
  gamesIncluded: number;
  gamesWithStats: number;
  priorDescription: string;
  rankings: Array<
    TeamRanking & {
      logo: string | null;
      color: string | null;
      movement: number | null;
      lastResult: string | null;
      scheduleRank: number;
      upcomingScheduleRank: number | null;
    }
  >;
};

export function createScheduleRankMap(rankings: TeamRanking[]) {
  const sorted = [...rankings].sort(
    (a, b) =>
      b.strengthOfSchedule - a.strengthOfSchedule ||
      a.team.localeCompare(b.team),
  );
  const ranks = new Map<string, number>();
  let rank = 0;
  let previousScore: number | null = null;

  sorted.forEach((team, index) => {
    if (team.strengthOfSchedule !== previousScore) {
      rank = index + 1;
      previousScore = team.strengthOfSchedule;
    }
    ranks.set(team.team, rank);
  });
  return ranks;
}

export function createUpcomingScheduleRankMap(
  source: CfbdSourceCache,
  rankings: TeamRanking[],
) {
  const ratings = new Map(
    rankings.map(({ team, networkPercentile }) => [team, networkPercentile]),
  );
  const scores = rankings.flatMap(({ team }) => {
    const opponents = source.games
      .filter(
        (game) =>
          game.seasonType !== "postseason" &&
          game.week > source.throughWeek &&
          (game.homeTeam === team || game.awayTeam === team),
      )
      .map((game) =>
        game.homeTeam === team ? game.awayTeam : game.homeTeam,
      );
    if (opponents.length === 0) return [];

    return [
      {
        team,
        score:
          opponents.reduce(
            (total, opponent) => total + (ratings.get(opponent) ?? 0),
            0,
          ) / opponents.length,
      },
    ];
  });
  scores.sort(
    (a, b) => b.score - a.score || a.team.localeCompare(b.team),
  );

  const ranks = new Map<string, number>();
  let rank = 0;
  let previousScore: number | null = null;
  scores.forEach(({ team, score }, index) => {
    if (score !== previousScore) {
      rank = index + 1;
      previousScore = score;
    }
    ranks.set(team, rank);
  });
  return ranks;
}

function selectPreseasonPoll(source: CfbdSourceCache) {
  return [...source.pollWeeks]
    .sort((a, b) => a.week - b.week)[0];
}

const finalOrderCache = new Map<string, string[]>();

function buildSeasonPrior(
  source: CfbdSourceCache,
  previousSeason: number | null,
  previousOrder: string[] | null,
  rankingSystemId: RankingSystemId,
): { prior: RatingPrior; description: string } {
  const preseason = selectPreseasonPoll(source);
  if (previousOrder && previousSeason === source.season - 1) {
    const currentTeams = calculateRankings(
      source.games,
      0,
      {},
      rankingSystemId,
    ).map(
      ({ team }) => team,
    );
    return {
      prior: buildFullPreseasonPrior(
        preseason?.polls ?? [],
        currentTeams,
        previousOrder,
        rankingSystemId,
      ),
      description: `${source.season} preseason polls plus ${previousSeason} final Gridiron Curve ranking`,
    };
  }
  const pollNames = (preseason?.polls ?? [])
    .map(({ poll }) => poll)
    .filter((poll) => poll === "AP Top 25" || poll === "Coaches Poll");
  return {
    prior: buildPollPrior(preseason?.polls ?? [], rankingSystemId),
    description: pollNames.length > 0
      ? `${source.season} preseason ${pollNames.join(" and ")}`
      : "Neutral starting ratings",
  };
}

export function createChainedStartingPrior(
  source: CfbdSourceCache,
  historicalSources: CfbdSourceCache[] = [],
  rankingSystemId: RankingSystemId = DEFAULT_RANKING_SYSTEM_ID,
) {
  const sourcesBySeason = new Map(
    historicalSources
      .filter((candidate) => candidate.season < source.season)
      .map((candidate) => [candidate.season, candidate]),
  );
  const orderedHistory = [...sourcesBySeason.values()].sort(
    (a, b) => a.season - b.season,
  );
  let previousSeason: number | null = null;
  let previousOrder: string[] | null = null;
  let chainKey: string = rankingSystemId;

  for (const historicalSource of orderedHistory) {
    if (
      previousSeason !== null &&
      historicalSource.season !== previousSeason + 1
    ) {
      previousSeason = null;
      previousOrder = null;
      chainKey = rankingSystemId;
    }
    const starting = buildSeasonPrior(
      historicalSource,
      previousSeason,
      previousOrder,
      rankingSystemId,
    );
    chainKey = `${chainKey}|${historicalSource.season}:${historicalSource.fetchedAt}`;
    const cachedOrder = finalOrderCache.get(chainKey);
    previousOrder =
      cachedOrder ??
      calculateRankings(
        historicalSource.games,
        historicalSource.throughWeek,
        starting.prior,
        rankingSystemId,
      ).map(({ team }) => team);
    if (!cachedOrder) finalOrderCache.set(chainKey, previousOrder);
    previousSeason = historicalSource.season;
  }

  return buildSeasonPrior(
    source,
    previousSeason,
    previousOrder,
    rankingSystemId,
  );
}

function createPriorRankMap(prior: RatingPrior) {
  const sorted = Object.entries(prior).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
  const ranks = new Map<string, number>();
  let rank = 0;
  let previousRating: number | null = null;
  sorted.forEach(([team, rating], index) => {
    if (rating !== previousRating) {
      rank = index + 1;
      previousRating = rating;
    }
    ranks.set(team, rank);
  });
  return ranks;
}

function getLastResult(
  source: CfbdSourceCache,
  team: string,
): string | null {
  const game = source.games
    .filter(
      ({ completed, week, seasonType, homeTeam, awayTeam }) =>
        completed &&
        seasonType !== "postseason" &&
        week <= source.throughWeek &&
        (homeTeam === team || awayTeam === team),
    )
    .sort(
      (a, b) =>
        b.week - a.week ||
        (b.startDate ?? "").localeCompare(a.startDate ?? ""),
    )[0];
  if (
    !game ||
    game.homePoints === null ||
    game.awayPoints === null
  ) {
    return null;
  }

  const isHome = game.homeTeam === team;
  const teamScore = isHome ? game.homePoints : game.awayPoints;
  const opponentScore = isHome ? game.awayPoints : game.homePoints;
  const opponent = isHome ? game.awayTeam : game.homeTeam;
  const outcome =
    teamScore > opponentScore ? "W" : teamScore < opponentScore ? "L" : "T";
  const location = game.neutralSite ? "vs" : isHome ? "vs" : "@";
  return `${outcome} ${teamScore}–${opponentScore} ${location} ${opponent}`;
}

export function createRankingView(
  source: CfbdSourceCache,
  historicalSources: CfbdSourceCache[] = [],
  rankingSystemId: RankingSystemId = DEFAULT_RANKING_SYSTEM_ID,
): RankingView {
  const startingPrior = createChainedStartingPrior(
    source,
    historicalSources,
    rankingSystemId,
  );
  const completedGames = source.games.filter(
    ({ completed, week, seasonType }) =>
      completed &&
      seasonType !== "postseason" &&
      week <= source.throughWeek,
  );
  const teamsBySchool = new Map(
    source.teams.map((team) => [team.school, team]),
  );
  const previousWeek = source.throughWeek - 1;
  const previousRanks =
    previousWeek > 0
      ? new Map(
          calculateRankings(
            source.games,
            previousWeek,
            startingPrior.prior,
            rankingSystemId,
          ).map(({ team, rank }) => [team, rank]),
        )
      : createPriorRankMap(startingPrior.prior);
  const currentRankings = calculateRankings(
    source.games,
    source.throughWeek,
    startingPrior.prior,
    rankingSystemId,
  );
  const scheduleRanks = createScheduleRankMap(currentRankings);
  const upcomingScheduleRanks = createUpcomingScheduleRankMap(
    source,
    currentRankings,
  );

  return {
    season: source.season,
    week: source.throughWeek,
    rankingSystemId,
    source: "cfbd",
    generatedAt: source.fetchedAt,
    gamesIncluded: completedGames.length,
    gamesWithStats: completedGames.filter(hasUsableBoxScore).length,
    priorDescription: startingPrior.description,
    rankings: currentRankings.map((ranking) => {
      const team = teamsBySchool.get(ranking.team);
      const previousRank = previousRanks.get(ranking.team);
      return {
        ...ranking,
        logo:
          team?.logos.find((logo) => logo.includes("/logos/96/")) ??
          team?.logos[0] ??
          null,
        color: team?.color ?? null,
        movement:
          previousRank === undefined ? null : previousRank - ranking.rank,
        lastResult: getLastResult(source, ranking.team),
        scheduleRank: scheduleRanks.get(ranking.team) ?? currentRankings.length,
        upcomingScheduleRank:
          upcomingScheduleRanks.get(ranking.team) ?? null,
      };
    }),
  };
}
