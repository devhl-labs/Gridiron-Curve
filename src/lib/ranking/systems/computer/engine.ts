import type {
  Game,
  RankingEngine,
  RatingPrior,
  TeamRanking,
} from "../../types";

export type ComputerMethod =
  | "record-matrix"
  | "pairwise"
  | "sequence"
  | "least-squares"
  | "victory-paths"
  | "schedule-record";

type ResultGame = {
  id: number;
  week: number;
  startDate: string;
  homeTeam: string;
  awayTeam: string;
  homeResult: number;
};

type TeamRecord = {
  wins: number;
  losses: number;
  games: Array<{ opponent: string; result: number }>;
};

function getFbsTeams(games: Game[]) {
  const teams = new Set<string>();
  let hasClassifications = false;

  for (const game of games) {
    if (game.seasonType === "postseason") continue;
    if (game.homeClassification !== undefined) hasClassifications = true;
    if (game.awayClassification !== undefined) hasClassifications = true;
    if (game.homeClassification === "fbs") teams.add(game.homeTeam);
    if (game.awayClassification === "fbs") teams.add(game.awayTeam);
  }

  if (!hasClassifications) {
    for (const game of games) {
      if (game.seasonType === "postseason") continue;
      teams.add(game.homeTeam);
      teams.add(game.awayTeam);
    }
  }

  return teams;
}

function prepareGames(games: Game[], throughWeek: number) {
  const fbsTeams = getFbsTeams(games);
  const completed: ResultGame[] = [];
  const graphTeams = new Set(fbsTeams);

  for (const game of games) {
    if (
      !game.completed ||
      game.seasonType === "postseason" ||
      game.week > throughWeek ||
      game.homePoints === null ||
      game.awayPoints === null ||
      (!fbsTeams.has(game.homeTeam) && !fbsTeams.has(game.awayTeam))
    ) {
      continue;
    }
    graphTeams.add(game.homeTeam);
    graphTeams.add(game.awayTeam);
    completed.push({
      id: game.id,
      week: game.week,
      startDate: game.startDate ?? "",
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      homeResult:
        game.homePoints > game.awayPoints
          ? 1
          : game.homePoints < game.awayPoints
            ? 0
            : 0.5,
    });
  }

  return {
    completed,
    fbsTeams: [...fbsTeams].sort((a, b) => a.localeCompare(b)),
    graphTeams: [...graphTeams].sort((a, b) => a.localeCompare(b)),
  };
}

function createAdjacency(
  teams: string[],
  games: ResultGame[],
) {
  const index = new Map(teams.map((team, teamIndex) => [team, teamIndex]));
  const neighbors = teams.map(() => new Map<number, number>());
  const gamesPlayed = Array<number>(teams.length).fill(0);
  const wins = Array<number>(teams.length).fill(0);
  const losses = Array<number>(teams.length).fill(0);

  for (const game of games) {
    const home = index.get(game.homeTeam);
    const away = index.get(game.awayTeam);
    if (home === undefined || away === undefined) continue;
    gamesPlayed[home] += 1;
    gamesPlayed[away] += 1;
    neighbors[home].set(away, (neighbors[home].get(away) ?? 0) + 1);
    neighbors[away].set(home, (neighbors[away].get(home) ?? 0) + 1);
    if (game.homeResult === 1) {
      wins[home] += 1;
      losses[away] += 1;
    } else if (game.homeResult === 0) {
      wins[away] += 1;
      losses[home] += 1;
    }
  }

  return { gamesPlayed, index, losses, neighbors, wins };
}

function solveRecordMatrix(teams: string[], games: ResultGame[]) {
  const { gamesPlayed, losses, neighbors, wins } = createAdjacency(
    teams,
    games,
  );
  let ratings = Array<number>(teams.length).fill(0.5);

  for (let iteration = 0; iteration < 200; iteration += 1) {
    const next = ratings.map((_, teamIndex) => {
      const opponentTotal = [...neighbors[teamIndex]].reduce(
        (total, [opponent, meetings]) =>
          total + meetings * ratings[opponent],
        0,
      );
      return (
        1 +
        (wins[teamIndex] - losses[teamIndex]) / 2 +
        opponentTotal
      ) / (2 + gamesPlayed[teamIndex]);
    });
    const difference = Math.max(
      ...next.map((rating, index) => Math.abs(rating - ratings[index])),
    );
    ratings = next;
    if (difference < 1e-12) break;
  }

  return new Map(teams.map((team, index) => [team, ratings[index]]));
}

function solvePairwiseOdds(teams: string[], games: ResultGame[]) {
  const index = new Map(teams.map((team, teamIndex) => [team, teamIndex]));
  const gamesPlayed = Array<number>(teams.length).fill(0);
  let ratings = Array<number>(teams.length).fill(0);

  for (const game of games) {
    gamesPlayed[index.get(game.homeTeam)!] += 1;
    gamesPlayed[index.get(game.awayTeam)!] += 1;
  }

  for (let iteration = 0; iteration < 160; iteration += 1) {
    const gradient = ratings.map((rating) => -0.35 * rating);
    for (const game of games) {
      const home = index.get(game.homeTeam)!;
      const away = index.get(game.awayTeam)!;
      const probability = 1 / (1 + Math.exp(ratings[away] - ratings[home]));
      const error = game.homeResult - probability;
      gradient[home] += error;
      gradient[away] -= error;
    }
    const step = 0.45 / Math.sqrt(1 + iteration / 20);
    const next = ratings.map(
      (rating, teamIndex) =>
        rating + (step * gradient[teamIndex]) / (1 + gamesPlayed[teamIndex]),
    );
    const average = next.reduce((total, rating) => total + rating, 0) /
      Math.max(1, next.length);
    ratings = next.map((rating) => rating - average);
  }

  return new Map(teams.map((team, index) => [team, ratings[index]]));
}

function solveSequence(teams: string[], games: ResultGame[]) {
  const ratings = new Map(teams.map((team) => [team, 1500]));
  const orderedGames = [...games].sort(
    (left, right) =>
      left.week - right.week ||
      left.startDate.localeCompare(right.startDate) ||
      left.id - right.id,
  );

  for (const game of orderedGames) {
    const homeRating = ratings.get(game.homeTeam)!;
    const awayRating = ratings.get(game.awayTeam)!;
    const expectation =
      1 / (1 + 10 ** ((awayRating - homeRating) / 400));
    const update = 24 * (game.homeResult - expectation);
    ratings.set(game.homeTeam, homeRating + update);
    ratings.set(game.awayTeam, awayRating - update);
  }

  return ratings;
}

function solveLeastSquares(teams: string[], games: ResultGame[]) {
  const { gamesPlayed, neighbors } = createAdjacency(teams, games);
  const index = new Map(teams.map((team, teamIndex) => [team, teamIndex]));
  const resultTotals = Array<number>(teams.length).fill(0);

  for (const game of games) {
    const home = index.get(game.homeTeam)!;
    const away = index.get(game.awayTeam)!;
    const result = game.homeResult === 0.5 ? 0 : game.homeResult === 1 ? 1 : -1;
    resultTotals[home] += result;
    resultTotals[away] -= result;
  }

  let ratings = Array<number>(teams.length).fill(0);
  for (let iteration = 0; iteration < 240; iteration += 1) {
    const next = ratings.map((_, teamIndex) => {
      const opponentTotal = [...neighbors[teamIndex]].reduce(
        (total, [opponent, meetings]) =>
          total + meetings * ratings[opponent],
        0,
      );
      return (resultTotals[teamIndex] + opponentTotal) /
        (1 + gamesPlayed[teamIndex]);
    });
    const average = next.reduce((total, rating) => total + rating, 0) /
      Math.max(1, next.length);
    const centered = next.map((rating) => rating - average);
    const difference = Math.max(
      ...centered.map((rating, index) => Math.abs(rating - ratings[index])),
    );
    ratings = centered;
    if (difference < 1e-12) break;
  }

  return new Map(teams.map((team, index) => [team, ratings[index]]));
}

function solveVictoryPaths(teams: string[], games: ResultGame[]) {
  const index = new Map(teams.map((team, teamIndex) => [team, teamIndex]));
  const incoming = teams.map(() => new Map<number, number>());
  const outgoing = Array<number>(teams.length).fill(0);

  function addPath(source: number, target: number, weight: number) {
    outgoing[source] += weight;
    incoming[target].set(
      source,
      (incoming[target].get(source) ?? 0) + weight,
    );
  }

  for (const game of games) {
    const home = index.get(game.homeTeam)!;
    const away = index.get(game.awayTeam)!;
    if (game.homeResult === 1) {
      addPath(away, home, 1);
    } else if (game.homeResult === 0) {
      addPath(home, away, 1);
    } else {
      addPath(home, away, 0.5);
      addPath(away, home, 0.5);
    }
  }

  const count = Math.max(1, teams.length);
  const damping = 0.85;
  let ratings = Array<number>(teams.length).fill(1 / count);

  for (let iteration = 0; iteration < 200; iteration += 1) {
    const dangling = ratings.reduce(
      (total, rating, teamIndex) =>
        outgoing[teamIndex] === 0 ? total + rating : total,
      0,
    );
    const next = ratings.map((_, teamIndex) => {
      const transferred = [...incoming[teamIndex]].reduce(
        (total, [source, weight]) =>
          total + (ratings[source] * weight) / outgoing[source],
        0,
      );
      return (1 - damping) / count +
        damping * (transferred + dangling / count);
    });
    const difference = Math.max(
      ...next.map((rating, index) => Math.abs(rating - ratings[index])),
    );
    ratings = next;
    if (difference < 1e-12) break;
  }

  return new Map(teams.map((team, index) => [team, ratings[index]]));
}

function solveScheduleRecord(
  teams: string[],
  fbsTeams: string[],
  games: ResultGame[],
) {
  const opponentRatings = solvePairwiseOdds(teams, games);
  const fbsRatings = fbsTeams
    .map((team) => ({
      team,
      rating: opponentRatings.get(team) ?? 0,
    }))
    .toSorted(
      (left, right) =>
        right.rating - left.rating ||
        left.team.localeCompare(right.team),
    );
  const lastIndex = Math.max(1, fbsRatings.length - 1);
  const opponentPercentiles = new Map<string, number>();
  let groupStart = 0;
  while (groupStart < fbsRatings.length) {
    let groupEnd = groupStart + 1;
    while (
      groupEnd < fbsRatings.length &&
      fbsRatings[groupEnd].rating === fbsRatings[groupStart].rating
    ) {
      groupEnd += 1;
    }
    const averageIndex = (groupStart + groupEnd - 1) / 2;
    const percentile = (fbsRatings.length - 1 - averageIndex) / lastIndex;
    for (let index = groupStart; index < groupEnd; index += 1) {
      opponentPercentiles.set(fbsRatings[index].team, percentile);
    }
    groupStart = groupEnd;
  }
  const schedules = new Map(
    teams.map((team) => [
      team,
      [] as Array<{ opponent: string; result: number }>,
    ]),
  );

  for (const game of games) {
    schedules.get(game.homeTeam)?.push({
      opponent: game.awayTeam,
      result: game.homeResult,
    });
    schedules.get(game.awayTeam)?.push({
      opponent: game.homeTeam,
      result: 1 - game.homeResult,
    });
  }

  return new Map(
    teams.map((team) => {
      const schedule = schedules.get(team) ?? [];
      const scheduleAdjustedRecord = schedule.reduce(
        (total, { opponent, result }) => {
          const opponentPercentile = opponentPercentiles.get(opponent) ?? 0;
          return total + result * opponentPercentile;
        },
        0,
      );
      return [
        team,
        schedule.length === 0 ? 0 : scheduleAdjustedRecord / schedule.length,
      ];
    }),
  );
}

function calculateRawRatings(
  method: ComputerMethod,
  teams: string[],
  fbsTeams: string[],
  games: ResultGame[],
) {
  switch (method) {
    case "record-matrix":
      return solveRecordMatrix(teams, games);
    case "pairwise":
      return solvePairwiseOdds(teams, games);
    case "sequence":
      return solveSequence(teams, games);
    case "least-squares":
      return solveLeastSquares(teams, games);
    case "victory-paths":
      return solveVictoryPaths(teams, games);
    case "schedule-record":
      return solveScheduleRecord(teams, fbsTeams, games);
  }
}

function calculateRankings(
  method: ComputerMethod,
  games: Game[],
  throughWeek: number,
): TeamRanking[] {
  const prepared = prepareGames(games, throughWeek);
  if (prepared.fbsTeams.length === 0) return [];
  const rawRatings = calculateRawRatings(
    method,
    prepared.graphTeams,
    prepared.fbsTeams,
    prepared.completed,
  );
  const records = new Map<string, TeamRecord>(
    prepared.fbsTeams.map((team) => [
      team,
      { wins: 0, losses: 0, games: [] },
    ]),
  );

  for (const game of prepared.completed) {
    const homeRecord = records.get(game.homeTeam);
    const awayRecord = records.get(game.awayTeam);
    if (homeRecord) {
      homeRecord.games.push({
        opponent: game.awayTeam,
        result: game.homeResult,
      });
      if (game.homeResult === 1) homeRecord.wins += 1;
      if (game.homeResult === 0) homeRecord.losses += 1;
    }
    if (awayRecord) {
      awayRecord.games.push({
        opponent: game.homeTeam,
        result: 1 - game.homeResult,
      });
      if (game.homeResult === 0) awayRecord.wins += 1;
      if (game.homeResult === 1) awayRecord.losses += 1;
    }
  }

  const ordered = prepared.fbsTeams
    .map((team) => ({
      team,
      rawRating: rawRatings.get(team) ?? 0,
      record: records.get(team)!,
    }))
    .sort(
      (left, right) =>
        right.rawRating - left.rawRating ||
        right.record.wins - left.record.wins ||
        left.record.losses - right.record.losses ||
        left.team.localeCompare(right.team),
    );
  const lastIndex = Math.max(1, ordered.length - 1);
  const percentiles = new Map(
    ordered.map(({ team }, index) => [
      team,
      ((ordered.length - 1 - index) / lastIndex) * 100,
    ]),
  );

  return ordered.map(({ team, rawRating, record }, index) => {
    const opponentValues = record.games.map(
      ({ opponent }) => percentiles.get(opponent) ?? 0,
    );
    const wins = record.games
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
    const percentile = percentiles.get(team) ?? 50;

    return {
      team,
      rank: index + 1,
      rating: Number(percentile.toFixed(1)),
      record: `${record.wins}-${record.losses}`,
      wins: record.wins,
      losses: record.losses,
      gamesPlayed: record.games.length,
      strengthOfSchedule:
        opponentValues.length === 0
          ? 50
          : Number(
              (
                opponentValues.reduce((total, value) => total + value, 0) /
                opponentValues.length
              ).toFixed(1),
            ),
      bestWin: wins[0]?.opponent ?? null,
      networkRating: Number(rawRating.toFixed(6)),
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

const neutralPrior = (): RatingPrior => ({});

export function createComputerEngine(method: ComputerMethod): RankingEngine {
  return {
    buildPollPrior: neutralPrior,
    buildFullPreseasonPrior: neutralPrior,
    calculateExpectedStrengthRatings: (
      games: Game[],
      throughWeek: number,
    ) =>
      new Map(
        calculateRankings(method, games, throughWeek).map(({ team, rating }) => [
          team,
          rating,
        ]),
      ),
    calculateAchievementPoints: () => new Map(),
    calculateRankings: (
      games: Game[],
      throughWeek: number,
    ) => calculateRankings(method, games, throughWeek),
  };
}
