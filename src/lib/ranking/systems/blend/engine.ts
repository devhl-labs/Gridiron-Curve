import type {
  Game,
  Poll,
  RankingEngine,
  TeamRanking,
} from "../../types";

type PollName = "AP Top 25" | "Coaches Poll";

const SOURCE_WEIGHTS = {
  consensus: 0.5,
  "AP Top 25": 0.25,
  "Coaches Poll": 0.25,
} as const;

function requiresPolls(): never {
  throw new Error(
    "Gridiron Blend requires consensus rankings and aligned AP and Coaches polls.",
  );
}

export const blendEngine: RankingEngine = {
  buildPollPrior: () => ({}),
  buildFullPreseasonPrior: () => ({}),
  calculateExpectedStrengthRatings: requiresPolls,
  calculateAchievementPoints: requiresPolls,
  calculateRankings: requiresPolls,
};

function top25Points(rank: number | null) {
  return rank !== null && rank >= 1 && rank <= 25 ? 26 - rank : 0;
}

function consensusPoints(rank: number, fieldSize: number) {
  if (rank <= 25) return top25Points(rank);
  if (fieldSize <= 25) return 0;
  return (fieldSize - rank) / (fieldSize - 25);
}

function pollRankMap(polls: Poll[], pollName: PollName) {
  const poll = polls.find(({ poll }) => poll === pollName);
  return poll
    ? new Map(poll.ranks.map(({ school, rank }) => [school, rank]))
    : null;
}

function headToHeadRecords(
  teams: Set<string>,
  games: Game[],
  throughWeek: number,
) {
  const records = new Map(
    [...teams].map((team) => [
      team,
      { wins: 0, losses: 0, ties: 0, games: 0 },
    ]),
  );

  for (const game of games) {
    if (
      !game.completed ||
      game.seasonType === "postseason" ||
      game.week > throughWeek ||
      game.homePoints === null ||
      game.awayPoints === null ||
      !teams.has(game.homeTeam) ||
      !teams.has(game.awayTeam)
    ) {
      continue;
    }
    const home = records.get(game.homeTeam)!;
    const away = records.get(game.awayTeam)!;
    home.games += 1;
    away.games += 1;
    if (game.homePoints > game.awayPoints) {
      home.wins += 1;
      away.losses += 1;
    } else if (game.homePoints < game.awayPoints) {
      away.wins += 1;
      home.losses += 1;
    } else {
      home.ties += 1;
      away.ties += 1;
    }
  }

  return records;
}

export function combinePollBlendRankings(
  consensusRankings: TeamRanking[],
  polls: Poll[],
  games: Game[],
  throughWeek: number,
): TeamRanking[] {
  const apRanks = pollRankMap(polls, "AP Top 25");
  const coachesRanks = pollRankMap(polls, "Coaches Poll");
  const availableWeight =
    SOURCE_WEIGHTS.consensus +
    (apRanks ? SOURCE_WEIGHTS["AP Top 25"] : 0) +
    (coachesRanks ? SOURCE_WEIGHTS["Coaches Poll"] : 0);
  const weights = {
    consensus: SOURCE_WEIGHTS.consensus / availableWeight,
    ap: apRanks ? SOURCE_WEIGHTS["AP Top 25"] / availableWeight : 0,
    coaches: coachesRanks
      ? SOURCE_WEIGHTS["Coaches Poll"] / availableWeight
      : 0,
  };
  const blended = consensusRankings.map((base) => {
    const apRank = apRanks?.get(base.team) ?? null;
    const coachesRank = coachesRanks?.get(base.team) ?? null;
    const computerPoints = consensusPoints(
      base.rank,
      consensusRankings.length,
    );
    const apPoints = top25Points(apRank);
    const coachesPoints = top25Points(coachesRank);
    const blendScore = Number(
      (
        weights.consensus * computerPoints +
        weights.ap * apPoints +
        weights.coaches * coachesPoints
      ).toFixed(6),
    );
    return {
      base,
      blendScore,
      components: [
        {
          source: "Gridiron Consensus" as const,
          rank: base.rank,
          points: computerPoints,
          weight: weights.consensus,
        },
        {
          source: "AP Poll" as const,
          rank: apRank,
          points: apPoints,
          weight: weights.ap,
        },
        {
          source: "Coaches Poll" as const,
          rank: coachesRank,
          points: coachesPoints,
          weight: weights.coaches,
        },
      ],
    };
  });
  const scoreGroups = Map.groupBy(
    blended,
    ({ blendScore }) => blendScore,
  );

  const ordered = [...scoreGroups.entries()]
    .sort(([left], [right]) => right - left)
    .flatMap(([, group]) => {
      const records = headToHeadRecords(
        new Set(group.map(({ base }) => base.team)),
        games,
        throughWeek,
      );
      return group
        .map((entry) => {
          const record = records.get(entry.base.team)!;
          return {
            ...entry,
            headToHeadPercentage:
              record.games === 0
                ? 0.5
                : (record.wins + 0.5 * record.ties) / record.games,
            headToHeadRecord:
              record.games === 0
                ? null
                : `${record.wins}-${record.losses}${
                    record.ties > 0 ? `-${record.ties}` : ""
                  }`,
          };
        })
        .sort(
          (left, right) =>
            right.headToHeadPercentage - left.headToHeadPercentage ||
            left.base.rank - right.base.rank ||
            left.base.team.localeCompare(right.base.team),
        );
    });

  return ordered.map(
    (
      {
        base,
        blendScore,
        components,
        headToHeadRecord,
      },
      index,
    ) => ({
      ...base,
      rank: index + 1,
      rating: Number((blendScore * 4).toFixed(1)),
      networkRating: blendScore,
      networkPercentile: Number((blendScore * 4).toFixed(1)),
      networkScore: Number((blendScore * 4).toFixed(1)),
      achievementPoints: 0,
      achievementAverage: 0,
      achievementScore: 50,
      qualityOfWins: 0,
      consensusAverageRank: undefined,
      consensusRanks: undefined,
      blendScore,
      blendComponents: components.map((component) => ({
        ...component,
        weight: Number(component.weight.toFixed(6)),
      })),
      blendHeadToHeadRecord: headToHeadRecord,
    }),
  );
}
