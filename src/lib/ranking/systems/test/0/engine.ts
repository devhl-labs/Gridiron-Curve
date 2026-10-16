import type {
  Game,
  Poll,
  RankingModel,
  RatingPrior,
  TeamBoxScore,
  TeamRanking,
} from "../../../types";

type TeamRecord = {
  wins: number;
  losses: number;
  games: Array<{ opponent: string; won: boolean }>;
};

const NEUTRAL_PRIOR_RATING = 0.5;
const BASE_NETWORK_RATING = 1500;
const PRIOR_RATING_SCALE = 800;
const NETWORK_SCORE_MINIMUM_RATING = 1300;
const NETWORK_SCORE_RANGE = 400;
const EXPECTATION_SCALE = 400;
const WEEKLY_UPDATE_FACTOR = 20;
const PRIOR_FADE_WEEKS = 6;
const FCS_RATING_GAP = 100;
const NETWORK_WEIGHT = 0.5;
const QUALITY_WINS_WEIGHT = 0.3;
const ACHIEVEMENT_WEIGHT = 0.2;

export function hasUsableBoxScore(
  game: Game,
): game is Game & { homeStats: TeamBoxScore; awayStats: TeamBoxScore } {
  return Boolean(
    game.homeStats &&
      game.awayStats &&
      game.homeStats.rushingAttempts + game.homeStats.passingAttempts > 0 &&
      game.awayStats.rushingAttempts + game.awayStats.passingAttempts > 0,
  );
}

function getFbsTeams(games: Game[]) {
  const fbsTeams = new Set<string>();
  let hasClassifications = false;

  for (const game of games) {
    if (game.seasonType === "postseason") continue;
    if (game.homeClassification !== undefined) hasClassifications = true;
    if (game.awayClassification !== undefined) hasClassifications = true;
    if (game.homeClassification === "fbs") fbsTeams.add(game.homeTeam);
    if (game.awayClassification === "fbs") fbsTeams.add(game.awayTeam);
  }

  if (!hasClassifications) {
    for (const game of games) {
      if (game.seasonType === "postseason") continue;
      fbsTeams.add(game.homeTeam);
      fbsTeams.add(game.awayTeam);
    }
  }

  return fbsTeams;
}

function expectedResult(teamRating: number, opponentRating: number) {
  return 1 / (1 + 10 ** ((opponentRating - teamRating) / EXPECTATION_SCALE));
}

function priorWeight(completedWeeks: number, model: RankingModel) {
  return Math.max(
    model.minimumPriorWeight,
    1 -
      ((1 - model.minimumPriorWeight) * completedWeeks) /
        PRIOR_FADE_WEEKS,
  );
}

function calculateNetworkRatings(
  games: Game[],
  throughWeek: number,
  prior: RatingPrior,
  model: RankingModel,
): {
  teams: string[];
  records: Map<string, TeamRecord>;
  ratings: Map<string, number>;
  expectationRatings: Map<string, number>;
} {
  const fbsTeams = getFbsTeams(games);
  if (fbsTeams.size === 0) {
    return {
      teams: [],
      records: new Map(),
      ratings: new Map(),
      expectationRatings: new Map(),
    };
  }

  const teams = [...fbsTeams].sort((a, b) => a.localeCompare(b));
  const priorOffsets = new Map(
    teams.map((team) => [
      team,
      PRIOR_RATING_SCALE *
        ((prior[team] ?? NEUTRAL_PRIOR_RATING) - NEUTRAL_PRIOR_RATING),
    ]),
  );
  const performanceOffsets = new Map(teams.map((team) => [team, 0]));
  const createResumeRatings = (completedWeeks: number) =>
    new Map(
      teams.map((team) => [
        team,
        BASE_NETWORK_RATING +
        priorWeight(completedWeeks, model) * priorOffsets.get(team)! +
          performanceOffsets.get(team)!,
      ]),
    );
  const createExpectationRatings = (completedWeeks: number) =>
    new Map(
      teams.map((team) => [
        team,
        BASE_NETWORK_RATING +
          (model.expectationPrior === "full"
            ? priorOffsets.get(team)!
            : priorWeight(completedWeeks, model) * priorOffsets.get(team)!) +
          performanceOffsets.get(team)!,
      ]),
    );
  let ratings = createResumeRatings(0);
  const records = new Map<string, TeamRecord>(
    teams.map((team) => [
      team,
      { wins: 0, losses: 0, games: [] },
    ]),
  );

  for (let week = 1; week <= throughWeek; week += 1) {
    const updates = new Map(teams.map((team) => [team, 0]));
    const expectationRatings = createExpectationRatings(week - 1);
    const fcsRating =
      Math.min(...expectationRatings.values()) - FCS_RATING_GAP;
    for (const game of games) {
      if (
        !game.completed ||
        game.seasonType === "postseason" ||
        game.week !== week ||
        game.homePoints === null ||
        game.awayPoints === null
      ) {
        continue;
      }

      const homeIsFbs = fbsTeams.has(game.homeTeam);
      const awayIsFbs = fbsTeams.has(game.awayTeam);
      if (!homeIsFbs && !awayIsFbs) continue;

      const homeRating = homeIsFbs
        ? expectationRatings.get(game.homeTeam)!
        : fcsRating;
      const awayRating = awayIsFbs
        ? expectationRatings.get(game.awayTeam)!
        : fcsRating;
      const homeExpected = expectedResult(homeRating, awayRating);
      const homeActual =
        game.homePoints > game.awayPoints
          ? 1
          : game.homePoints < game.awayPoints
            ? 0
            : 0.5;

      if (homeIsFbs) {
        updates.set(
          game.homeTeam,
          updates.get(game.homeTeam)! +
            WEEKLY_UPDATE_FACTOR * (homeActual - homeExpected),
        );
        const record = records.get(game.homeTeam)!;
        if (homeActual === 1) record.wins += 1;
        if (homeActual === 0) record.losses += 1;
        record.games.push({
          opponent: game.awayTeam,
          won: homeActual === 1,
        });
      }
      if (awayIsFbs) {
        updates.set(
          game.awayTeam,
          updates.get(game.awayTeam)! +
            WEEKLY_UPDATE_FACTOR * (homeExpected - homeActual),
        );
        const record = records.get(game.awayTeam)!;
        if (homeActual === 0) record.wins += 1;
        if (homeActual === 1) record.losses += 1;
        record.games.push({
          opponent: game.homeTeam,
          won: homeActual === 0,
        });
      }
    }
    for (const team of teams) {
      performanceOffsets.set(
        team,
        performanceOffsets.get(team)! + updates.get(team)!,
      );
    }
    ratings = createResumeRatings(week);
  }

  return {
    teams,
    records,
    ratings,
    expectationRatings: createExpectationRatings(throughWeek),
  };
}

export function calculateExpectedStrengthRatings(
  games: Game[],
  throughWeek: number,
  prior: RatingPrior,
  model: RankingModel,
) {
  return calculateNetworkRatings(
    games,
    throughWeek,
    prior,
    model,
  ).expectationRatings;
}

function marginCategory(margin: number) {
  const absoluteMargin = Math.abs(margin);
  if (absoluteMargin >= 17) return "dominant";
  if (absoluteMargin >= 7) return "clear";
  return "close";
}

function achievementValue(
  margin: number,
  opponentDifference: number,
  isFcsOpponent: boolean,
) {
  if (margin === 0) return 0;
  const category = marginCategory(margin);
  const tier = isFcsOpponent
    ? "weaker"
    : opponentDifference >= 5
      ? "stronger"
      : opponentDifference <= -5
        ? "weaker"
        : "peer";

  if (margin > 0) {
    if (isFcsOpponent) {
      return category === "dominant" ? 0.25 : category === "clear" ? 0.1 : 0;
    }
    const points = {
      dominant: { stronger: 4, peer: 3, weaker: 1 },
      clear: { stronger: 3, peer: 2, weaker: 0.75 },
      close: { stronger: 2, peer: 1, weaker: 0.5 },
    };
    return points[category][tier];
  }

  const penalties = {
    dominant: { stronger: -1, peer: -2, weaker: -4 },
    clear: { stronger: -0.5, peer: -1, weaker: -2 },
    close: { stronger: 0, peer: -0.5, weaker: -1 },
  };
  return penalties[category][tier];
}

export function calculateAchievementPoints(
  games: Game[],
  throughWeek: number,
  prior: RatingPrior,
  model: RankingModel,
) {
  const fbsTeams = getFbsTeams(games);
  const points = new Map([...fbsTeams].map((team) => [team, 0]));
  const weeklyRatings = createWeeklyRatings(
    games,
    throughWeek,
    prior,
    model,
  );

  for (const game of games) {
    if (
      !game.completed ||
      game.seasonType === "postseason" ||
      game.week > throughWeek ||
      game.homePoints === null ||
      game.awayPoints === null
    ) {
      continue;
    }
    const ratings = weeklyRatings.get(game.week - 1);
    if (!ratings) {
      throw new Error(`Missing network ratings before Week ${game.week}.`);
    }
    const percentiles = createPercentiles(ratings);
    const homeIsFbs = fbsTeams.has(game.homeTeam);
    const awayIsFbs = fbsTeams.has(game.awayTeam);
    const homeMargin = game.homePoints - game.awayPoints;

    if (homeIsFbs) {
      const difference =
        (percentiles.get(game.awayTeam) ?? 50) -
        (percentiles.get(game.homeTeam) ?? 50);
      points.set(
        game.homeTeam,
        (points.get(game.homeTeam) ?? 0) +
          achievementValue(homeMargin, difference, !awayIsFbs),
      );
    }
    if (awayIsFbs) {
      const difference =
        (percentiles.get(game.homeTeam) ?? 50) -
        (percentiles.get(game.awayTeam) ?? 50);
      points.set(
        game.awayTeam,
        (points.get(game.awayTeam) ?? 0) +
          achievementValue(-homeMargin, difference, !homeIsFbs),
      );
    }
  }
  return points;
}

function createWeeklyRatings(
  games: Game[],
  throughWeek: number,
  prior: RatingPrior,
  model: RankingModel,
) {
  const ratings = new Map<number, Map<string, number>>();
  for (let week = 0; week < throughWeek; week += 1) {
    ratings.set(
      week,
      calculateNetworkRatings(games, week, prior, model).ratings,
    );
  }
  return ratings;
}

function createPercentiles(values: Map<string, number>) {
  const sorted = [...values.entries()].sort(
    (a, b) => a[1] - b[1] || a[0].localeCompare(b[0]),
  );
  if (sorted.length === 1) return new Map([[sorted[0][0], 50]]);

  const percentiles = new Map<string, number>();
  let start = 0;
  while (start < sorted.length) {
    let end = start;
    while (end + 1 < sorted.length && sorted[end + 1][1] === sorted[start][1]) {
      end += 1;
    }
    const midpoint = (start + end) / 2;
    const percentile = (midpoint / (sorted.length - 1)) * 100;
    for (let index = start; index <= end; index += 1) {
      percentiles.set(sorted[index][0], percentile);
    }
    start = end + 1;
  }
  return percentiles;
}

function calculateQualityOfWins(
  games: Game[],
  throughWeek: number,
  prior: RatingPrior,
  model: RankingModel,
) {
  const fbsTeams = getFbsTeams(games);
  const defeatedOpponents = new Map(
    [...fbsTeams].map((team) => [team, [] as number[]]),
  );
  const weeklyRatings = createWeeklyRatings(
    games,
    throughWeek,
    prior,
    model,
  );
  const weeklyPercentiles = new Map(
    [...weeklyRatings].map(([week, ratings]) => [
      week,
      createPercentiles(ratings),
    ]),
  );
  const preseasonPercentiles = createPercentiles(
    calculateNetworkRatings(games, 0, prior, model).ratings,
  );
  const priorFbsGames = new Map<number, Map<string, number>>();
  for (let week = 0; week < throughWeek; week += 1) {
    const counts = new Map([...fbsTeams].map((team) => [team, 0]));
    for (const game of games) {
      if (
        !game.completed ||
        game.seasonType === "postseason" ||
        game.week > week ||
        !fbsTeams.has(game.homeTeam) ||
        !fbsTeams.has(game.awayTeam)
      ) {
        continue;
      }
      counts.set(game.homeTeam, (counts.get(game.homeTeam) ?? 0) + 1);
      counts.set(game.awayTeam, (counts.get(game.awayTeam) ?? 0) + 1);
    }
    priorFbsGames.set(week, counts);
  }

  for (const game of games) {
    if (
      !game.completed ||
      game.seasonType === "postseason" ||
      game.week > throughWeek ||
      game.homePoints === null ||
      game.awayPoints === null ||
      game.homePoints === game.awayPoints
    ) {
      continue;
    }
    const winner =
      game.homePoints > game.awayPoints ? game.homeTeam : game.awayTeam;
    const opponent =
      game.homePoints > game.awayPoints ? game.awayTeam : game.homeTeam;
    if (!fbsTeams.has(winner)) continue;
    defeatedOpponents
      .get(winner)
      ?.push(
        fbsTeams.has(opponent)
          ? (priorFbsGames.get(game.week - 1)?.get(opponent) ?? 0) === 0
            ? (preseasonPercentiles.get(opponent) ?? 50)
            : (weeklyPercentiles.get(game.week - 1)?.get(opponent) ?? 50)
          : 0,
      );
  }

  return new Map(
    [...defeatedOpponents].map(([team, opponents]) => [
      team,
      opponents.length === 0
        ? 0
        : opponents.reduce((sum, rating) => sum + rating, 0) /
          opponents.length,
    ]),
  );
}

export function calculateRankings(
  games: Game[],
  throughWeek: number,
  prior: RatingPrior,
  model: RankingModel,
): TeamRanking[] {
  const { teams, records, ratings } = calculateNetworkRatings(
    games,
    throughWeek,
    prior,
    model,
  );
  if (teams.length === 0) return [];
  const achievementPoints = calculateAchievementPoints(
    games,
    throughWeek,
    prior,
    model,
  );
  const achievementAverages = new Map(
    teams.map((team) => {
      const gamesPlayed = records.get(team)?.games.length ?? 0;
      return [
        team,
        gamesPlayed === 0
          ? 0
          : (achievementPoints.get(team) ?? 0) / gamesPlayed,
      ];
    }),
  );
  const achievementScores = new Map(
    [...achievementAverages].map(([team, average]) => [
      team,
      Math.min(100, Math.max(0, 50 + 15 * average)),
    ]),
  );
  const qualityOfWins = calculateQualityOfWins(
    games,
    throughWeek,
    prior,
    model,
  );
  const networkPercentiles = createPercentiles(ratings);
  const networkScores = new Map(
    teams.map((team) => {
      const percentile = networkPercentiles.get(team) ?? 50;
      const magnitude =
        (((ratings.get(team) ?? BASE_NETWORK_RATING) -
          NETWORK_SCORE_MINIMUM_RATING) /
          NETWORK_SCORE_RANGE) *
        100;
      return [
        team,
        model.networkPercentileWeight * percentile +
          model.networkMagnitudeWeight *
            Math.min(100, Math.max(0, magnitude)),
      ];
    }),
  );

  return teams
    .map((team) => {
      const record = records.get(team)!;
      const opponentRatings = record.games.map(
        ({ opponent }) => networkPercentiles.get(opponent) ?? 0,
      );
      const wins = record.games
        .filter(({ won }) => won)
        .sort(
          (a, b) =>
            (networkPercentiles.get(b.opponent) ?? 0) -
            (networkPercentiles.get(a.opponent) ?? 0),
        );

      return {
        team,
        rank: 0,
        rating: Number(
          (
            NETWORK_WEIGHT * (networkScores.get(team) ?? 50) +
            QUALITY_WINS_WEIGHT * (qualityOfWins.get(team) ?? 0) +
            ACHIEVEMENT_WEIGHT * (achievementScores.get(team) ?? 50)
          ).toFixed(1),
        ),
        record: `${record.wins}-${record.losses}`,
        wins: record.wins,
        losses: record.losses,
        gamesPlayed: record.games.length,
        strengthOfSchedule:
          opponentRatings.length === 0
            ? 50
            : Number(
                (
                  opponentRatings.reduce((sum, rating) => sum + rating, 0) /
                  opponentRatings.length
                ).toFixed(1),
              ),
        bestWin: wins[0]?.opponent ?? null,
        networkRating: Number(
          (ratings.get(team) ?? BASE_NETWORK_RATING).toFixed(1),
        ),
        networkPercentile: Number(
          (networkPercentiles.get(team) ?? 50).toFixed(1),
        ),
        networkScore: Number((networkScores.get(team) ?? 50).toFixed(1)),
        achievementPoints: Number(
          (achievementPoints.get(team) ?? 0).toFixed(2),
        ),
        achievementAverage: Number(
          (achievementAverages.get(team) ?? 0).toFixed(2),
        ),
        achievementScore: Number(
          (achievementScores.get(team) ?? 50).toFixed(1),
        ),
        qualityOfWins: Number((qualityOfWins.get(team) ?? 0).toFixed(1)),
      };
    })
    .sort(
      (a, b) =>
        b.rating - a.rating ||
        b.strengthOfSchedule - a.strengthOfSchedule ||
        a.team.localeCompare(b.team),
    )
    .map((team, index) => ({ ...team, rank: index + 1 }));
}

export function buildPollPrior(
  polls: Poll[],
): RatingPrior {
  const supportedPolls = polls.filter(
    ({ poll }) => poll === "AP Top 25" || poll === "Coaches Poll",
  );
  const scores = new Map<string, number[]>();

  for (const { ranks } of supportedPolls) {
    for (const { rank, school } of ranks) {
      const values = scores.get(school) ?? [];
      values.push(0.5 + 0.25 * ((26 - rank) / 25));
      scores.set(school, values);
    }
  }

  return Object.fromEntries(
    [...scores.entries()].map(([team, teamScores]) => [
      team,
      teamScores.reduce((sum, score) => sum + score, 0) /
        teamScores.length,
    ]),
  );
}

export function buildFullPreseasonPrior(
  polls: Poll[],
  currentTeams: string[],
  previousSeasonOrder: string[],
): RatingPrior {
  const supportedPolls = polls.filter(
    ({ poll }) => poll === "AP Top 25" || poll === "Coaches Poll",
  );
  const pollTeams = new Set(
    supportedPolls.flatMap(({ ranks }) => ranks.map(({ school }) => school)),
  );
  const currentTeamSet = new Set(currentTeams);
  const consensusTop25 = [...pollTeams]
    .filter((team) => currentTeamSet.has(team))
    .map((team) => ({
      team,
      averageRank:
        supportedPolls.reduce(
          (sum, { ranks }) =>
            sum + (ranks.find(({ school }) => school === team)?.rank ?? 26),
          0,
        ) / supportedPolls.length,
    }))
    .sort(
      (a, b) =>
        a.averageRank - b.averageRank || a.team.localeCompare(b.team),
    )
    .slice(0, 25)
    .map(({ team }) => team);
  const included = new Set(consensusTop25);
  const remainingTeams = [
    ...previousSeasonOrder.filter(
      (team) => currentTeamSet.has(team) && !included.has(team),
    ),
    ...currentTeams
      .filter(
        (team) =>
          !included.has(team) && !previousSeasonOrder.includes(team),
      )
      .sort((a, b) => a.localeCompare(b)),
  ];
  const orderedTeams = [...consensusTop25, ...remainingTeams];
  const pollFieldSize = consensusTop25.length;
  const lowerFieldSize = Math.max(1, orderedTeams.length - pollFieldSize);

  return Object.fromEntries(
    orderedTeams.map((team, index) => {
      if (index < pollFieldSize) {
        return [team, 0.5 + 0.25 * ((25 - index) / 25)];
      }
      const lowerFieldIndex = index - pollFieldSize;
      const rating =
        lowerFieldSize === 1
          ? 0.49
          : 0.49 - 0.24 * (lowerFieldIndex / (lowerFieldSize - 1));
      return [team, rating];
    }),
  );
}
