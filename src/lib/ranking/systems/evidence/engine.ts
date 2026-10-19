import type { Game, RatingPrior } from "../../types";

export type CandidateEngineFamily =
  | "result-network"
  | "performance"
  | "accomplishment"
  | "record-value"
  | "temporal";

export type CandidateRanking = {
  team: string;
  rank: number;
  score: number;
  wins: number;
  losses: number;
  ties: number;
  gamesPlayed: number;
};

export type CandidateCalculationOptions = {
  prior?: Readonly<Record<string, number>>;
  priorWeight?: number;
};

export type CandidateEngine = {
  id: string;
  family: CandidateEngineFamily;
  purpose: string;
  inputs: string[];
  calculate(
    games: Game[],
    throughWeek: number,
    options?: CandidateCalculationOptions,
  ): CandidateRanking[];
};

export const EVIDENCE_PRIOR_FADE_WEEKS = 6;

type PreparedGame = {
  id: number;
  week: number;
  startDate: string;
  homeTeam: string;
  awayTeam: string;
  homeResult: number;
  homeMargin: number;
  homeIsFbs: boolean;
  awayIsFbs: boolean;
};

type TeamRecord = {
  wins: number;
  losses: number;
  ties: number;
  fbsWins: number;
  fbsLosses: number;
  games: Array<{
    opponent: string;
    opponentIsFbs: boolean;
    result: number;
  }>;
};

type PreparedSnapshot = {
  fbsTeams: string[];
  completed: PreparedGame[];
  fbsGames: PreparedGame[];
  records: Map<string, TeamRecord>;
};

function effectivePriorProbability(
  team: string,
  options?: CandidateCalculationOptions,
) {
  const weight = options?.prior
    ? Math.max(0, Math.min(1, options.priorWeight ?? 1))
    : 0;
  const probability = options?.prior?.[team] ?? 0.5;
  return 0.5 + weight * (probability - 0.5);
}

function effectivePriorOffset(
  team: string,
  options?: CandidateCalculationOptions,
) {
  return 2 * (effectivePriorProbability(team, options) - 0.5);
}

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

function prepareSnapshot(
  games: Game[],
  throughWeek: number,
): PreparedSnapshot {
  const fbsTeamSet = getFbsTeams(games);
  const fbsTeams = [...fbsTeamSet].sort((left, right) =>
    left.localeCompare(right)
  );
  const records = new Map<string, TeamRecord>(
    fbsTeams.map((team) => [
      team,
      {
        wins: 0,
        losses: 0,
        ties: 0,
        fbsWins: 0,
        fbsLosses: 0,
        games: [],
      },
    ]),
  );
  const completed: PreparedGame[] = [];

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
    const homeIsFbs = fbsTeamSet.has(game.homeTeam);
    const awayIsFbs = fbsTeamSet.has(game.awayTeam);
    if (!homeIsFbs && !awayIsFbs) continue;
    const homeResult =
      game.homePoints > game.awayPoints
        ? 1
        : game.homePoints < game.awayPoints
          ? 0
          : 0.5;
    const prepared = {
      id: game.id,
      week: game.week,
      startDate: game.startDate ?? "",
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      homeResult,
      homeMargin: game.homePoints - game.awayPoints,
      homeIsFbs,
      awayIsFbs,
    };
    completed.push(prepared);

    if (homeIsFbs) {
      const record = records.get(game.homeTeam)!;
      record.games.push({
        opponent: game.awayTeam,
        opponentIsFbs: awayIsFbs,
        result: homeResult,
      });
      if (homeResult === 1) {
        record.wins += 1;
        if (awayIsFbs) record.fbsWins += 1;
      } else if (homeResult === 0) {
        record.losses += 1;
        if (awayIsFbs) record.fbsLosses += 1;
      } else {
        record.ties += 1;
      }
    }
    if (awayIsFbs) {
      const result = 1 - homeResult;
      const record = records.get(game.awayTeam)!;
      record.games.push({
        opponent: game.homeTeam,
        opponentIsFbs: homeIsFbs,
        result,
      });
      if (result === 1) {
        record.wins += 1;
        if (homeIsFbs) record.fbsWins += 1;
      } else if (result === 0) {
        record.losses += 1;
        if (homeIsFbs) record.fbsLosses += 1;
      } else {
        record.ties += 1;
      }
    }
  }

  return {
    fbsTeams,
    completed,
    fbsGames: completed.filter(
      ({ homeIsFbs, awayIsFbs }) => homeIsFbs && awayIsFbs,
    ),
    records,
  };
}

function solveLinearSystem(matrix: number[][], values: number[]) {
  const size = values.length;
  const augmented = matrix.map((row, index) => [...row, values[index]]);

  for (let column = 0; column < size; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < size; row += 1) {
      if (
        Math.abs(augmented[row][column]) >
        Math.abs(augmented[pivot][column])
      ) {
        pivot = row;
      }
    }
    if (Math.abs(augmented[pivot][column]) < 1e-12) {
      throw new Error("Candidate engine matrix is singular.");
    }
    [augmented[column], augmented[pivot]] = [
      augmented[pivot],
      augmented[column],
    ];
    const pivotValue = augmented[column][column];
    for (let entry = column; entry <= size; entry += 1) {
      augmented[column][entry] /= pivotValue;
    }
    for (let row = 0; row < size; row += 1) {
      if (row === column) continue;
      const factor = augmented[row][column];
      if (factor === 0) continue;
      for (let entry = column; entry <= size; entry += 1) {
        augmented[row][entry] -= factor * augmented[column][entry];
      }
    }
  }

  return augmented.map((row) => row[size]);
}

function createIndex(teams: string[]) {
  return new Map(teams.map((team, index) => [team, index]));
}

function colleyRatings(
  snapshot: PreparedSnapshot,
  options?: CandidateCalculationOptions,
) {
  const { fbsTeams, fbsGames } = snapshot;
  const index = createIndex(fbsTeams);
  const matrix = fbsTeams.map((_, row) =>
    fbsTeams.map((__, column) => (row === column ? 2 : 0))
  );
  const values = fbsTeams.map(
    (team) => 2 * effectivePriorProbability(team, options),
  );

  for (const game of fbsGames) {
    const home = index.get(game.homeTeam)!;
    const away = index.get(game.awayTeam)!;
    matrix[home][home] += 1;
    matrix[away][away] += 1;
    matrix[home][away] -= 1;
    matrix[away][home] -= 1;
    const signedResult =
      game.homeResult === 1 ? 1 : game.homeResult === 0 ? -1 : 0;
    values[home] += signedResult / 2;
    values[away] -= signedResult / 2;
  }

  const ratings = solveLinearSystem(matrix, values);
  return new Map(fbsTeams.map((team, teamIndex) => [team, ratings[teamIndex]]));
}

function bradleyTerryRatings(
  snapshot: PreparedSnapshot,
  regularization = 0.5,
  options?: CandidateCalculationOptions,
) {
  const { fbsTeams, fbsGames } = snapshot;
  const index = createIndex(fbsTeams);
  const wins = Array<number>(fbsTeams.length).fill(0);
  const meetings = fbsTeams.map(() =>
    Array<number>(fbsTeams.length).fill(0)
  );

  for (const game of fbsGames) {
    const home = index.get(game.homeTeam)!;
    const away = index.get(game.awayTeam)!;
    meetings[home][away] += 1;
    meetings[away][home] += 1;
    wins[home] += game.homeResult;
    wins[away] += 1 - game.homeResult;
  }

  let strengths = fbsTeams.map((team) => {
    const probability = effectivePriorProbability(team, options);
    return probability / (1 - probability);
  });
  for (let iteration = 0; iteration < 500; iteration += 1) {
    const next = strengths.map((_, teamIndex) => {
      let denominator =
        regularization / (strengths[teamIndex] + 1);
      for (
        let opponentIndex = 0;
        opponentIndex < fbsTeams.length;
        opponentIndex += 1
      ) {
        if (teamIndex === opponentIndex) continue;
        denominator +=
          meetings[teamIndex][opponentIndex] /
          (strengths[teamIndex] + strengths[opponentIndex]);
      }
      const priorProbability = effectivePriorProbability(
        fbsTeams[teamIndex],
        options,
      );
      return (wins[teamIndex] + regularization * priorProbability) /
        Math.max(1e-12, denominator);
    });
    const geometricMean = Math.exp(
      next.reduce((total, value) => total + Math.log(value), 0) /
        Math.max(1, next.length),
    );
    const normalized = next.map((value) => value / geometricMean);
    const difference = Math.max(
      ...normalized.map((value, teamIndex) =>
        Math.abs(Math.log(value) - Math.log(strengths[teamIndex]))
      ),
    );
    strengths = normalized;
    if (difference < 1e-10) break;
  }

  return new Map(
    fbsTeams.map((team, teamIndex) => [
      team,
      Math.log(strengths[teamIndex]),
    ]),
  );
}

function masseyRatings(
  snapshot: PreparedSnapshot,
  gameValue: (game: PreparedGame) => number,
  ridge = 1,
  options?: CandidateCalculationOptions,
) {
  const { fbsTeams, fbsGames } = snapshot;
  const index = createIndex(fbsTeams);
  const matrix = fbsTeams.map((_, row) =>
    fbsTeams.map((__, column) => (row === column ? ridge : 0))
  );
  const values = fbsTeams.map(
    (team) => ridge * effectivePriorOffset(team, options),
  );

  for (const game of fbsGames) {
    const home = index.get(game.homeTeam)!;
    const away = index.get(game.awayTeam)!;
    matrix[home][home] += 1;
    matrix[away][away] += 1;
    matrix[home][away] -= 1;
    matrix[away][home] -= 1;
    const value = gameValue(game);
    values[home] += value;
    values[away] -= value;
  }

  const ratings = solveLinearSystem(matrix, values);
  const mean = ratings.reduce((total, rating) => total + rating, 0) /
    Math.max(1, ratings.length);
  return new Map(
    fbsTeams.map((team, teamIndex) => [
      team,
      ratings[teamIndex] - mean,
    ]),
  );
}

function eloRatings(
  snapshot: PreparedSnapshot,
  updateFactor = 20,
  scale = 400,
  options?: CandidateCalculationOptions,
) {
  const ratings = new Map(
    snapshot.fbsTeams.map((team) => [
      team,
      1500 + 400 * effectivePriorOffset(team, options),
    ]),
  );
  const ordered = snapshot.fbsGames.toSorted(
    (left, right) =>
      left.week - right.week ||
      left.startDate.localeCompare(right.startDate) ||
      left.id - right.id,
  );

  for (const game of ordered) {
    const homeRating = ratings.get(game.homeTeam)!;
    const awayRating = ratings.get(game.awayTeam)!;
    const expectation =
      1 / (1 + 10 ** ((awayRating - homeRating) / scale));
    const update = updateFactor * (game.homeResult - expectation);
    ratings.set(game.homeTeam, homeRating + update);
    ratings.set(game.awayTeam, awayRating - update);
  }
  return ratings;
}

function percentileMap(
  teams: string[],
  ratings: Map<string, number>,
) {
  const ordered = teams
    .map((team) => ({ team, rating: ratings.get(team) ?? 0 }))
    .toSorted(
      (left, right) =>
        right.rating - left.rating ||
        left.team.localeCompare(right.team),
    );
  const lastIndex = Math.max(1, ordered.length - 1);
  return new Map(
    ordered.map(({ team }, index) => [
      team,
      (ordered.length - 1 - index) / lastIndex,
    ]),
  );
}

function completeRankings(
  snapshot: PreparedSnapshot,
  scores: Map<string, number>,
  tieBreakUsesAllGames: boolean,
) {
  return snapshot.fbsTeams
    .map((team) => ({
      team,
      score: scores.get(team) ?? 0,
      record: snapshot.records.get(team)!,
    }))
    .toSorted(
      (left, right) =>
        right.score - left.score ||
        (tieBreakUsesAllGames
          ? right.record.wins - left.record.wins ||
            left.record.losses - right.record.losses
          : right.record.fbsWins - left.record.fbsWins ||
            left.record.fbsLosses - right.record.fbsLosses) ||
        left.team.localeCompare(right.team),
    )
    .map(({ team, score, record }, index) => ({
      team,
      rank: index + 1,
      score,
      wins: record.wins,
      losses: record.losses,
      ties: record.ties,
      gamesPlayed: record.games.length,
    }));
}

function ratingEngine(
  definition: Omit<CandidateEngine, "calculate">,
  calculateRatings: (
    snapshot: PreparedSnapshot,
    options?: CandidateCalculationOptions,
  ) => Map<string, number>,
  tieBreakUsesAllGames = false,
): CandidateEngine {
  return {
    ...definition,
    calculate(games, throughWeek, options) {
      const snapshot = prepareSnapshot(games, throughWeek);
      return completeRankings(
        snapshot,
        calculateRatings(snapshot, options),
        tieBreakUsesAllGames,
      );
    },
  };
}

export const colleyEngine = ratingEngine(
  {
    id: "CanonicalColley.1",
    family: "result-network",
    purpose:
      "Estimate outcome strength through the canonical Colley linear system.",
    inputs: ["FBS win/loss/tie results"],
  },
  (snapshot, options) => colleyRatings(snapshot, options),
);

export const bradleyTerryEngine = ratingEngine(
  {
    id: "CanonicalBradleyTerry.1",
    family: "result-network",
    purpose:
      "Estimate latent strength from regularized paired-comparison win probabilities.",
    inputs: ["FBS win/loss/tie results"],
  },
  (snapshot, options) =>
    bradleyTerryRatings(snapshot, 0.5, options),
);

export const binaryMasseyEngine = ratingEngine(
  {
    id: "BinaryMassey.1",
    family: "result-network",
    purpose:
      "Fit signed FBS results through a ridge-regularized Massey system.",
    inputs: ["FBS win/loss/tie results"],
  },
  (snapshot, options) =>
    masseyRatings(
      snapshot,
      (game) =>
        game.homeResult === 1 ? 1 : game.homeResult === 0 ? -1 : 0,
      1,
      options,
    ),
);

function createCappedMarginMasseyEngine(cap: number): CandidateEngine {
  return ratingEngine(
    {
      id: `CappedMarginMassey${cap}.1`,
      family: "performance",
      purpose:
        `Fit opponent-adjusted scoring performance with each margin capped at ${cap} points.`,
      inputs: [`FBS scoring margins capped at ${cap} points`],
    },
    (snapshot, options) =>
      masseyRatings(
        snapshot,
        (game) =>
          Math.max(-cap, Math.min(cap, game.homeMargin)) / cap,
        1,
        options,
      ),
  );
}

export const cappedMarginMassey14Engine =
  createCappedMarginMasseyEngine(14);
export const cappedMarginMasseyEngine =
  createCappedMarginMasseyEngine(21);
export const cappedMarginMassey28Engine =
  createCappedMarginMasseyEngine(28);

export const eloEngine = ratingEngine(
  {
    id: "CanonicalElo.1",
    family: "temporal",
    purpose:
      "Estimate time-ordered FBS result strength through a canonical Elo update.",
    inputs: ["Chronological FBS win/loss/tie results"],
  },
  (snapshot, options) => eloRatings(snapshot, 20, 400, options),
);

function opponentModelScores(
  snapshot: PreparedSnapshot,
  strategy: "opponent-value" | "wins-above-expectation",
  options?: CandidateCalculationOptions,
) {
  const ratings = bradleyTerryRatings(snapshot, 0.5, options);
  const percentiles = percentileMap(snapshot.fbsTeams, ratings);
  const orderedRatings = snapshot.fbsTeams
    .map((team) => ratings.get(team) ?? 0)
    .toSorted((left, right) => left - right);
  const referenceRating =
    orderedRatings[Math.floor(orderedRatings.length / 2)] ?? 0;
  const fcsRating = (orderedRatings[0] ?? 0) - 1.5;

  return new Map(
    snapshot.fbsTeams.map((team) => {
      const record = snapshot.records.get(team)!;
      const priorOffset = effectivePriorOffset(team, options);
      if (record.games.length === 0) return [team, priorOffset];
      if (strategy === "opponent-value") {
        const value = record.games.reduce((total, game) => {
          const quality = game.opponentIsFbs
            ? percentiles.get(game.opponent) ?? 0
            : 0;
          return total +
            game.result * quality -
            (1 - game.result) * (1 - quality);
        }, 0);
        return [team, value / record.games.length + priorOffset];
      }
      const probabilities = record.games.map((game) => {
        const opponentRating = game.opponentIsFbs
          ? ratings.get(game.opponent) ?? 0
          : fcsRating;
        return (
          1 /
          (1 + Math.exp(opponentRating - referenceRating))
        );
      });
      const actual = record.wins + record.ties * 0.5;
      const expected = probabilities.reduce(
        (total, probability) => total + probability,
        0,
      );
      return [
        team,
        (actual - expected) / record.games.length + priorOffset,
      ];
    }),
  );
}

export const opponentValueEngine = ratingEngine(
  {
    id: "OpponentValue.1",
    family: "accomplishment",
    purpose:
      "Reward wins by opponent percentile and penalize losses by opponent weakness.",
    inputs: [
      "All results",
      "Bradley-Terry opponent percentile",
      "FCS opponents fixed to zero quality",
    ],
  },
  (snapshot, options) =>
    opponentModelScores(snapshot, "opponent-value", options),
  true,
);

export const winsAboveExpectationEngine = ratingEngine(
  {
    id: "WinsAboveExpectation.1",
    family: "accomplishment",
    purpose:
      "Measure actual result value above the expectation for a median FBS team.",
    inputs: [
      "All results",
      "Bradley-Terry opponent strength",
      "Median-FBS reference team",
    ],
  },
  (snapshot, options) =>
    opponentModelScores(
      snapshot,
      "wins-above-expectation",
      options,
    ),
  true,
);

function averageRankEngine(
  definition: Omit<CandidateEngine, "calculate">,
  components: readonly CandidateEngine[],
): CandidateEngine {
  return {
    ...definition,
    calculate(games, throughWeek, options) {
      const componentRankings = components.map((engine) =>
        engine.calculate(games, throughWeek, options)
      );
      const [foundation] = componentRankings;
      if (!foundation) {
        throw new Error(`${definition.id} requires component engines.`);
      }
      const rankMaps = componentRankings.map(
        (rankings) => {
          const ordered = rankings.toSorted(
            (left, right) =>
              right.score - left.score ||
              left.team.localeCompare(right.team),
          );
          const tieSafeRanks = new Map<string, number>();
          let groupStart = 0;
          while (groupStart < ordered.length) {
            let groupEnd = groupStart + 1;
            while (
              groupEnd < ordered.length &&
              ordered[groupEnd].score === ordered[groupStart].score
            ) {
              groupEnd += 1;
            }
            const averageRank = (groupStart + 1 + groupEnd) / 2;
            for (let index = groupStart; index < groupEnd; index += 1) {
              tieSafeRanks.set(ordered[index].team, averageRank);
            }
            groupStart = groupEnd;
          }
          return tieSafeRanks;
        },
      );
      return foundation
        .map((base) => ({
          base,
          averageRank:
            rankMaps.reduce(
              (total, ranks) => total + (ranks.get(base.team) ?? 0),
              0,
            ) / rankMaps.length,
        }))
        .toSorted(
          (left, right) =>
            left.averageRank - right.averageRank ||
            left.base.team.localeCompare(right.base.team),
        )
        .map(({ base, averageRank }, index) => ({
          ...base,
          rank: index + 1,
          score: -averageRank,
        }));
    },
  };
}

export const resultNetworkFamilyEngine = averageRankEngine(
  {
    id: "CanonicalResultNetworkFamily.1",
    family: "result-network",
    purpose:
      "Represent binary result-network evidence through an equal average of canonical Colley, Bradley-Terry, and binary Massey ranks.",
    inputs: [
      "Canonical Colley rank",
      "Canonical Bradley-Terry rank",
      "Binary Massey rank",
    ],
  },
  [colleyEngine, bradleyTerryEngine, binaryMasseyEngine],
);

export const EARNED_OPPONENT_LOSS_DEBIT = 0.75;

export function earnedOpponentResultValue(
  result: "win" | "loss" | "tie",
  opponentQuality: number,
) {
  if (result === "win") return opponentQuality;
  if (result === "loss") return -EARNED_OPPONENT_LOSS_DEBIT;
  return (opponentQuality - EARNED_OPPONENT_LOSS_DEBIT) / 2;
}

function tieSafeRankMap(rankings: CandidateRanking[]) {
  const ranks = new Map<string, number>();
  for (let index = 0; index < rankings.length; ) {
    let end = index + 1;
    while (
      end < rankings.length &&
      rankings[end].score === rankings[index].score
    ) {
      end += 1;
    }
    const averageRank = (index + 1 + end) / 2;
    for (let tiedIndex = index; tiedIndex < end; tiedIndex += 1) {
      ranks.set(rankings[tiedIndex].team, averageRank);
    }
    index = end;
  }
  return ranks;
}

export const earnedOpponentValueEngine: CandidateEngine = {
  id: "EarnedOpponentValue.1",
  family: "record-value",
  purpose:
    "Reward the quality of defeated opponents while assigning every loss the same debit.",
  inputs: [
    "All results",
    "Canonical Result Network opponent percentile",
    "Fixed 0.75 loss debit",
  ],
  calculate(snapshot, throughWeek, options) {
    const resultNetwork = resultNetworkFamilyEngine.calculate(
      snapshot,
      throughWeek,
      options,
    );
    const ranks = tieSafeRankMap(resultNetwork);
    const lastIndex = Math.max(1, resultNetwork.length - 1);
    const quality = new Map(
      resultNetwork.map(({ team }) => [
        team,
        (resultNetwork.length - (ranks.get(team) ?? resultNetwork.length)) /
          lastIndex,
      ]),
    );
    const prepared = prepareSnapshot(snapshot, throughWeek);
    return resultNetwork
      .map((base) => {
        const teamGames = prepared.records.get(base.team)?.games ?? [];
        const score =
          teamGames.length === 0
            ? 0
            : teamGames.reduce(
                (total, game) =>
                  total +
                  earnedOpponentResultValue(
                    game.result === 1
                      ? "win"
                      : game.result === 0
                        ? "loss"
                        : "tie",
                    quality.get(game.opponent) ?? 0,
                  ),
                0,
              ) / teamGames.length;
        return {
          ...base,
          score: score + effectivePriorOffset(base.team, options),
        };
      })
      .toSorted(
        (left, right) =>
          right.score - left.score || left.team.localeCompare(right.team),
      )
      .map((ranking, index) => ({ ...ranking, rank: index + 1 }));
  },
};

export const recordValueFamilyEngine = averageRankEngine(
  {
    id: "RecordValueFamily.2",
    family: "record-value",
    purpose:
      "Represent schedule-sensitive record value through an equal average of opponent value, wins above expectation, and earned-opponent-value ranks.",
    inputs: [
      "Opponent Value rank",
      "Wins Above Expectation rank",
      "Earned Opponent Value rank",
    ],
  },
  [
    opponentValueEngine,
    winsAboveExpectationEngine,
    earnedOpponentValueEngine,
  ],
);

export const cappedMarginPerformanceFamilyEngine = averageRankEngine(
  {
    id: "CappedMarginPerformanceFamily.1",
    family: "performance",
    purpose:
      "Represent opponent-adjusted scoring performance through an equal average of 14-, 21-, and 28-point capped Massey ranks.",
    inputs: [
      "14-point capped Massey rank",
      "21-point capped Massey rank",
      "28-point capped Massey rank",
    ],
  },
  [
    cappedMarginMassey14Engine,
    cappedMarginMasseyEngine,
    cappedMarginMassey28Engine,
  ],
);

export const BASE_CANDIDATE_ENGINES = [
  colleyEngine,
  bradleyTerryEngine,
  binaryMasseyEngine,
  cappedMarginMassey14Engine,
  cappedMarginMasseyEngine,
  cappedMarginMassey28Engine,
  eloEngine,
  opponentValueEngine,
  winsAboveExpectationEngine,
  earnedOpponentValueEngine,
] as const satisfies readonly CandidateEngine[];

export const CANDIDATE_ENGINES = [
  ...BASE_CANDIDATE_ENGINES,
  resultNetworkFamilyEngine,
  recordValueFamilyEngine,
  cappedMarginPerformanceFamilyEngine,
] as const satisfies readonly CandidateEngine[];

export function evidencePriorWeight(completedWeeks: number) {
  return Math.max(
    0,
    1 - completedWeeks / EVIDENCE_PRIOR_FADE_WEEKS,
  );
}

export function stabilizeOutputRankings(
  rankings: CandidateRanking[],
  prior: RatingPrior,
  weight: number,
) {
  const lastIndex = Math.max(1, rankings.length - 1);
  return rankings
    .map((ranking) => {
      const currentRating =
        0.25 + 0.5 * ((rankings.length - ranking.rank) / lastIndex);
      const score =
        weight * (prior[ranking.team] ?? 0.5) +
        (1 - weight) * currentRating;
      return { ranking, score };
    })
    .toSorted(
      (left, right) =>
        right.score - left.score ||
        left.ranking.team.localeCompare(right.ranking.team),
    )
    .map(({ ranking, score }, index) => ({
      ...ranking,
      rank: index + 1,
      score,
    }));
}

export function calculatePublishedEvidenceRankings(
  engine: CandidateEngine,
  games: Game[],
  throughWeek: number,
  prior: RatingPrior,
) {
  const weight = evidencePriorWeight(throughWeek);
  return stabilizeOutputRankings(
    engine.calculate(games, throughWeek, {
      prior,
      priorWeight: weight,
    }),
    prior,
    weight,
  );
}
