import type { CfbdSourceCache } from "../../src/lib/cfbd/cache";
import type { CandidateRanking } from "./candidate-engines";

type CompositeV7Evidence = {
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

type CompositeRow = {
  base: CandidateRanking;
  basePosition: number;
  position: number;
};

type Adjudication = {
  maximumAdjacentGap: number;
  members: Array<{
    team: string;
    preliminaryRank: number;
    finalRank: number;
    strongestDefeatedOpponentRank: number | null;
    scheduleRank: number;
  }>;
  headToHeadResults: Array<{ winner: string; loser: string }>;
  decidingCriteria: Array<
    | "head-to-head"
    | "strongest-defeated-opponent"
    | "strength-of-schedule"
  >;
};

export type CompositeV7Ranking = CandidateRanking & {
  preliminaryRank: number;
  adjudication?: Adjudication;
};

function groupHeadToHeadResults(
  source: CfbdSourceCache,
  week: number,
  group: CompositeRow[],
) {
  const teams = new Set(group.map(({ base }) => base.team));
  const pairWins = new Map<string, Map<string, number>>();
  for (const game of source.games) {
    if (
      !game.completed ||
      game.seasonType === "postseason" ||
      game.week > week ||
      game.homePoints === null ||
      game.awayPoints === null ||
      game.homePoints === game.awayPoints ||
      !teams.has(game.homeTeam) ||
      !teams.has(game.awayTeam)
    ) {
      continue;
    }
    const winner =
      game.homePoints > game.awayPoints
        ? game.homeTeam
        : game.awayTeam;
    const loser =
      game.homePoints > game.awayPoints
        ? game.awayTeam
        : game.homeTeam;
    const wins = pairWins.get(winner) ?? new Map<string, number>();
    wins.set(loser, (wins.get(loser) ?? 0) + 1);
    pairWins.set(winner, wins);
  }

  const results: Array<{ winner: string; loser: string }> = [];
  for (let left = 0; left < group.length; left += 1) {
    for (let right = left + 1; right < group.length; right += 1) {
      const leftTeam = group[left].base.team;
      const rightTeam = group[right].base.team;
      const leftWins = pairWins.get(leftTeam)?.get(rightTeam) ?? 0;
      const rightWins = pairWins.get(rightTeam)?.get(leftTeam) ?? 0;
      if (leftWins === rightWins) continue;
      results.push(
        leftWins > rightWins
          ? { winner: leftTeam, loser: rightTeam }
          : { winner: rightTeam, loser: leftTeam },
      );
    }
  }
  return results;
}

function orderResearchGroup(
  group: CompositeRow[],
  headToHeadResults: Array<{ winner: string; loser: string }>,
  evidence: CompositeV7Evidence,
) {
  const startingIndex = new Map(
    group.map(({ base }, index) => [base.team, index]),
  );
  const rows = new Map(group.map((row) => [row.base.team, row]));
  const remaining = new Set(rows.keys());
  const ordered: CompositeRow[] = [];
  const fallback = (left: CompositeRow, right: CompositeRow) =>
    (evidence.bestWinRanks.get(left.base.team) ??
      Number.POSITIVE_INFINITY) -
      (evidence.bestWinRanks.get(right.base.team) ??
        Number.POSITIVE_INFINITY) ||
    (evidence.scheduleRanks.get(left.base.team) ??
      Number.POSITIVE_INFINITY) -
      (evidence.scheduleRanks.get(right.base.team) ??
        Number.POSITIVE_INFINITY) ||
    startingIndex.get(left.base.team)! -
      startingIndex.get(right.base.team)!;

  while (remaining.size > 0) {
    let zeroInDegree = [...remaining].filter(
      (team) =>
        !headToHeadResults.some(
          ({ winner, loser }) =>
            loser === team && remaining.has(winner),
        ),
    );
    if (zeroInDegree.length === 0) zeroInDegree = [...remaining];
    const next = zeroInDegree
      .map((team) => rows.get(team)!)
      .toSorted(fallback)[0];
    ordered.push(next);
    remaining.delete(next.base.team);
  }
  return ordered;
}

function reachableByHeadToHead(
  winner: string,
  loser: string,
  results: Array<{ winner: string; loser: string }>,
) {
  const pending = [winner];
  const visited = new Set<string>();
  while (pending.length > 0) {
    const team = pending.pop()!;
    if (team === loser) return true;
    if (visited.has(team)) continue;
    visited.add(team);
    pending.push(
      ...results
        .filter(({ winner: resultWinner }) => resultWinner === team)
        .map(({ loser: resultLoser }) => resultLoser),
    );
  }
  return false;
}

function researchDecidingCriteria(
  preliminary: CompositeRow[],
  final: CompositeRow[],
  results: Array<{ winner: string; loser: string }>,
  evidence: CompositeV7Evidence,
): Adjudication["decidingCriteria"] {
  const preliminaryIndexes = new Map(
    preliminary.map(({ base }, index) => [base.team, index]),
  );
  const finalIndexes = new Map(
    final.map(({ base }, index) => [base.team, index]),
  );
  const criteria = new Set<Adjudication["decidingCriteria"][number]>();
  for (const promoted of final) {
    for (const demoted of preliminary) {
      if (
        preliminaryIndexes.get(promoted.base.team)! <=
          preliminaryIndexes.get(demoted.base.team)! ||
        finalIndexes.get(promoted.base.team)! >=
          finalIndexes.get(demoted.base.team)!
      ) {
        continue;
      }
      if (
        reachableByHeadToHead(
          promoted.base.team,
          demoted.base.team,
          results,
        )
      ) {
        criteria.add("head-to-head");
      } else if (
        evidence.bestWinRanks.get(promoted.base.team)! <
        evidence.bestWinRanks.get(demoted.base.team)!
      ) {
        criteria.add("strongest-defeated-opponent");
      } else if (
        evidence.scheduleRanks.get(promoted.base.team)! <
        evidence.scheduleRanks.get(demoted.base.team)!
      ) {
        criteria.add("strength-of-schedule");
      }
    }
  }
  return [...criteria];
}

function adjudicateResearchRanking(
  source: CfbdSourceCache,
  week: number,
  preliminary: CompositeRow[],
  evidence: CompositeV7Evidence,
) {
  const fieldDenominator = preliminary.length + 1;
  const ordered: CompositeRow[] = [];
  const changedGroups: Array<{
    preliminary: CompositeRow[];
    final: CompositeRow[];
    maximumAdjacentGap: number;
    headToHeadResults: Array<{ winner: string; loser: string }>;
  }> = [];

  for (let start = 0; start < preliminary.length; ) {
    let end = start + 1;
    let maximumAdjacentGap = 0;
    while (end < preliminary.length) {
      const previous = preliminary[end - 1];
      const next = preliminary[end];
      const gap =
        (next.position - previous.position) * fieldDenominator;
      if (
        previous.base.wins !== next.base.wins ||
        previous.base.losses !== next.base.losses ||
        previous.base.ties !== next.base.ties ||
        gap > 1 + 1e-9
      ) {
        break;
      }
      maximumAdjacentGap = Math.max(maximumAdjacentGap, gap);
      end += 1;
    }
    const group = preliminary.slice(start, end);
    if (group.length === 1) {
      ordered.push(group[0]);
      start = end;
      continue;
    }
    const headToHeadResults = groupHeadToHeadResults(
      source,
      week,
      group,
    );
    const adjudicated = orderResearchGroup(
      group,
      headToHeadResults,
      evidence,
    );
    ordered.push(...adjudicated);
    if (
      group.some(
        ({ base }, index) => base.team !== adjudicated[index].base.team,
      )
    ) {
      changedGroups.push({
        preliminary: group,
        final: adjudicated,
        maximumAdjacentGap,
        headToHeadResults,
      });
    }
    start = end;
  }

  const preliminaryRanks = new Map(
    preliminary.map(({ base }, index) => [base.team, index + 1]),
  );
  const finalRanks = new Map(
    ordered.map(({ base }, index) => [base.team, index + 1]),
  );
  const adjudications = new Map<string, Adjudication>();
  for (const group of changedGroups) {
    const adjudication: Adjudication = {
      maximumAdjacentGap: Number(
        group.maximumAdjacentGap.toFixed(3),
      ),
      members: group.final.map(({ base }) => ({
        team: base.team,
        preliminaryRank: preliminaryRanks.get(base.team)!,
        finalRank: finalRanks.get(base.team)!,
        strongestDefeatedOpponentRank:
          evidence.bestWinRanks.get(base.team)! <= preliminary.length
            ? evidence.bestWinRanks.get(base.team)!
            : null,
        scheduleRank: evidence.scheduleRanks.get(base.team)!,
      })),
      headToHeadResults: group.headToHeadResults,
      decidingCriteria: researchDecidingCriteria(
        group.preliminary,
        group.final,
        group.headToHeadResults,
        evidence,
      ),
    };
    for (const { base } of group.preliminary) {
      adjudications.set(base.team, adjudication);
    }
  }
  return { ordered, preliminaryRanks, adjudications };
}

export function combineCompositeV7Rankings(
  source: CfbdSourceCache,
  week: number,
  resultNetwork: CandidateRanking[],
  recordValue: CandidateRanking[],
  performance: CandidateRanking[],
  evidence: CompositeV7Evidence,
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
          `Missing Composite 7 résumé evidence for ${row.base.team}.`,
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

  const preliminary = combined.toSorted(
    (left, right) =>
      left.position - right.position ||
      left.base.team.localeCompare(right.base.team),
  );
  const { ordered, preliminaryRanks, adjudications } =
    adjudicateResearchRanking(source, week, preliminary, evidence);

  return ordered.map(({ base, position }, index) => ({
      ...base,
      rank: index + 1,
      score: -position,
      preliminaryRank: preliminaryRanks.get(base.team)!,
      adjudication: adjudications.get(base.team),
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
