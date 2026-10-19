import type { CfbdSourceCache } from "../../src/lib/cfbd/cache";
import type { CandidateRanking } from "./candidate-engines";

type CompositeV6Evidence = {
  scheduleRanks: Map<string, number>;
  bestWinRanks: Map<string, number>;
  topTwoWinAverageRanks: Map<string, number>;
  fbsGamesPlayed: Map<string, number>;
};

function tieSafeRankPositions(rankings: CandidateRanking[]) {
  const ordered = rankings.toSorted(
    (left, right) =>
      right.score - left.score ||
      left.team.localeCompare(right.team),
  );
  const positions = new Map<string, number>();
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
    const position = averageRank / (ordered.length + 1);
    for (let index = groupStart; index < groupEnd; index += 1) {
      positions.set(ordered[index].team, position);
    }
    groupStart = groupEnd;
  }
  return positions;
}

export function resumeMaturity(fbsGamesPlayed: number) {
  return Math.max(0, Math.min(1, (fbsGamesPlayed - 2) / 6));
}

export function combineCompositeV6Rankings(
  resultNetwork: CandidateRanking[],
  recordValue: CandidateRanking[],
  performance: CandidateRanking[],
  evidence: CompositeV6Evidence,
) {
  if (
    resultNetwork.length !== recordValue.length ||
    resultNetwork.length !== performance.length
  ) {
    throw new Error("Composite families must rank the same team field.");
  }
  const recordPositions = tieSafeRankPositions(recordValue);
  const performancePositions = tieSafeRankPositions(performance);
  const fieldDenominator = resultNetwork.length + 1;
  const combined = resultNetwork.map((base) => {
    const recordPosition = recordPositions.get(base.team);
    const performancePosition = performancePositions.get(base.team);
    if (
      recordPosition === undefined ||
      performancePosition === undefined
    ) {
      throw new Error(
        `Composite family rankings do not all contain ${base.team}.`,
      );
    }
    const basePosition =
      0.4 * recordPosition + 0.6 * performancePosition;
    return { base, basePosition, position: basePosition };
  });
  const basePositions = new Map(
    combined.map(({ base, basePosition }) => [
      base.team,
      basePosition,
    ]),
  );
  const provisionalRanks = new Map(
    combined
      .toSorted(
        (left, right) =>
          left.basePosition - right.basePosition ||
          left.base.team.localeCompare(right.base.team),
      )
      .map(({ base }, index) => [base.team, index + 1]),
  );
  const orderedTop25 = () =>
    combined
      .toSorted(
        (left, right) =>
          left.position - right.position ||
          left.base.team.localeCompare(right.base.team),
      )
      .slice(0, 25)
      .map(({ base }) => base.team);
  const certifiedTeams = new Set(orderedTop25());

  while (true) {
    const medianScheduleRank = (resultNetwork.length + 1) / 2;
    for (const row of combined) {
      const basePosition = basePositions.get(row.base.team);
      const scheduleRank = evidence.scheduleRanks.get(row.base.team);
      const topTwoWinAverageRank =
        evidence.topTwoWinAverageRanks.get(row.base.team);
      const fbsGamesPlayed =
        evidence.fbsGamesPlayed.get(row.base.team);
      if (
        basePosition === undefined ||
        scheduleRank === undefined ||
        topTwoWinAverageRank === undefined ||
        fbsGamesPlayed === undefined
      ) {
        throw new Error(
          `Missing Composite 6 résumé evidence for ${row.base.team}.`,
        );
      }
      const scheduleWeakness = Math.max(
        0,
        (scheduleRank - medianScheduleRank) /
          (resultNetwork.length - medianScheduleRank),
      );
      const winWeakness = Math.max(
        0,
        Math.min(1, (topTwoWinAverageRank - 1) / 50),
      );
      const pressure = certifiedTeams.has(row.base.team)
        ? 14 *
          scheduleWeakness *
          winWeakness *
          resumeMaturity(fbsGamesPlayed)
        : 0;
      const losses = row.base.losses;
      const lossUnits =
        losses <= 0
          ? 0
          : losses === 1
            ? 1
            : 5 + Math.max(0, losses - 2) * 2;
      const provisionalRank =
        provisionalRanks.get(row.base.team) ?? resultNetwork.length;
      const rankPercentile =
        resultNetwork.length <= 1
          ? 1
          : (resultNetwork.length - provisionalRank) /
            (resultNetwork.length - 1);
      const lossPressure =
        lossUnits *
        rankPercentile ** 12 *
        resumeMaturity(fbsGamesPlayed);
      row.position =
        basePosition +
        (pressure + lossPressure) / fieldDenominator;
    }
    const entrants = orderedTop25().filter(
      (team) => !certifiedTeams.has(team),
    );
    if (entrants.length === 0) break;
    entrants.forEach((team) => certifiedTeams.add(team));
  }

  return combined
    .toSorted(
      (left, right) =>
        left.position - right.position ||
        left.base.team.localeCompare(right.base.team),
    )
    .map(({ base, position }, index) => ({
      ...base,
      rank: index + 1,
      score: -position,
    }));
}

export function strongestDefeatedOpponentEvidence(
  source: CfbdSourceCache,
  week: number,
  resultNetwork: CandidateRanking[],
) {
  const fieldSize = resultNetwork.length;
  const teams = new Set(resultNetwork.map(({ team }) => team));
  const resultRanks = new Map(
    resultNetwork.map(({ team, rank }) => [team, rank]),
  );
  const bestWinRanks = new Map(
    resultNetwork.map(({ team }) => [team, fieldSize + 1]),
  );
  const defeatedOpponentRanks = new Map<string, number[]>(
    resultNetwork.map(({ team }) => [team, []]),
  );
  const fbsGamesPlayed = new Map(
    resultNetwork.map(({ team }) => [team, 0]),
  );

  for (const game of source.games) {
    if (
      !game.completed ||
      game.seasonType === "postseason" ||
      game.week > week ||
      game.homePoints === null ||
      game.awayPoints === null
    ) {
      continue;
    }
    if (teams.has(game.homeTeam) && teams.has(game.awayTeam)) {
      fbsGamesPlayed.set(
        game.homeTeam,
        (fbsGamesPlayed.get(game.homeTeam) ?? 0) + 1,
      );
      fbsGamesPlayed.set(
        game.awayTeam,
        (fbsGamesPlayed.get(game.awayTeam) ?? 0) + 1,
      );
    }
    if (game.homePoints === game.awayPoints) continue;
    const winner =
      game.homePoints > game.awayPoints
        ? game.homeTeam
        : game.awayTeam;
    const opponent =
      game.homePoints > game.awayPoints
        ? game.awayTeam
        : game.homeTeam;
    const opponentRank = resultRanks.get(opponent);
    if (!teams.has(winner) || opponentRank === undefined) continue;
    defeatedOpponentRanks.get(winner)?.push(opponentRank);
    bestWinRanks.set(
      winner,
      Math.min(bestWinRanks.get(winner) ?? fieldSize + 1, opponentRank),
    );
  }

  const topTwoWinAverageRanks = new Map(
    resultNetwork.map(({ team }) => {
      const ranks = (defeatedOpponentRanks.get(team) ?? [])
        .toSorted((left, right) => left - right)
        .slice(0, 2);
      while (ranks.length < 2) ranks.push(fieldSize + 1);
      return [team, (ranks[0] + ranks[1]) / 2];
    }),
  );

  return {
    bestWinRanks,
    topTwoWinAverageRanks,
    fbsGamesPlayed,
  };
}

export function resultNetworkScheduleRanks(
  source: CfbdSourceCache,
  week: number,
  resultNetwork: CandidateRanking[],
) {
  const teams = new Set(resultNetwork.map(({ team }) => team));
  const lastIndex = Math.max(1, resultNetwork.length - 1);
  const percentiles = new Map(
    resultNetwork.map(({ team, rank }) => [
      team,
      (resultNetwork.length - rank) / lastIndex,
    ]),
  );
  const opponentValues = new Map<string, number[]>(
    [...teams].map((team) => [team, []]),
  );
  for (const game of source.games) {
    if (
      !game.completed ||
      game.seasonType === "postseason" ||
      game.week > week ||
      game.homePoints === null ||
      game.awayPoints === null
    ) {
      continue;
    }
    opponentValues.get(game.homeTeam)?.push(
      teams.has(game.awayTeam)
        ? percentiles.get(game.awayTeam) ?? 0
        : 0,
    );
    opponentValues.get(game.awayTeam)?.push(
      teams.has(game.homeTeam)
        ? percentiles.get(game.homeTeam) ?? 0
        : 0,
    );
  }
  const ordered = [...opponentValues]
    .map(([team, values]) => ({
      team,
      score:
        values.length === 0
          ? 0.5
          : Number(
              (
                values.reduce((total, value) => total + value, 0) /
                values.length
              ).toFixed(3),
            ),
    }))
    .toSorted(
      (left, right) =>
        right.score - left.score ||
        left.team.localeCompare(right.team),
    );
  const ranks = new Map<string, number>();
  let rank = 0;
  let previousScore: number | null = null;
  ordered.forEach(({ team, score }, index) => {
    if (score !== previousScore) {
      rank = index + 1;
      previousScore = score;
    }
    ranks.set(team, rank);
  });
  return ranks;
}
