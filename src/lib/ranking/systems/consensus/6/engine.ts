import type {
  Game,
  RankingEngine,
  RankingSystemId,
  TeamRanking,
} from "../../../types";

type ConsensusComponent = {
  rankingSystemId: RankingSystemId;
  rankings: TeamRanking[];
};

export const CONSENSUS_V6_COMPONENT_WEIGHTS = {
  "ResultNetwork.1.0": 0,
  "RecordValue.2.0": 0.4,
  "CappedMarginPerformance.1.0": 0.6,
} as const satisfies Partial<Record<RankingSystemId, number>>;

export const CONSENSUS_V6_COMPONENT_SYSTEM_IDS = Object.keys(
  CONSENSUS_V6_COMPONENT_WEIGHTS,
) as Array<keyof typeof CONSENSUS_V6_COMPONENT_WEIGHTS>;

export const CONSENSUS_V6_MAX_RESUME_PRESSURE = 14;
export const CONSENSUS_V6_LOSS_RANK_EXPONENT = 12;

function requiresComponents(): never {
  throw new Error(
    "Computer Composite 6 requires all registered evidence-family rankings.",
  );
}

export const consensusEngine: RankingEngine = {
  buildPollPrior: () => ({}),
  buildFullPreseasonPrior: () => ({}),
  calculateExpectedStrengthRatings: requiresComponents,
  calculateAchievementPoints: requiresComponents,
  calculateRankings: requiresComponents,
};

export function resumeMaturity(fbsGamesPlayed: number) {
  return Math.max(0, Math.min(1, (fbsGamesPlayed - 2) / 6));
}

export function lossPressureUnits(losses: number) {
  if (losses <= 0) return 0;
  if (losses === 1) return 1;
  return 5 + Math.max(0, losses - 2) * 2;
}

export function rankScaledLossPressure(
  losses: number,
  provisionalRank: number,
  fieldSize: number,
  maturity: number,
) {
  const rankPercentile =
    fieldSize <= 1
      ? 1
      : Math.max(
          0,
          Math.min(
            1,
            (fieldSize - provisionalRank) / (fieldSize - 1),
          ),
        );
  return (
    lossPressureUnits(losses) *
    rankPercentile ** CONSENSUS_V6_LOSS_RANK_EXPONENT *
    maturity
  );
}

function tieSafeRanks(rankings: TeamRanking[]) {
  const ordered = rankings.toSorted(
    (left, right) =>
      right.networkRating - left.networkRating ||
      left.team.localeCompare(right.team),
  );
  const ranks = new Map<string, number>();
  let groupStart = 0;
  while (groupStart < ordered.length) {
    let groupEnd = groupStart + 1;
    while (
      groupEnd < ordered.length &&
      ordered[groupEnd].networkRating ===
        ordered[groupStart].networkRating
    ) {
      groupEnd += 1;
    }
    const averageRank = (groupStart + 1 + groupEnd) / 2;
    for (let index = groupStart; index < groupEnd; index += 1) {
      ranks.set(ordered[index].team, averageRank);
    }
    groupStart = groupEnd;
  }
  return ranks;
}

function scheduleRanks(rankings: TeamRanking[]) {
  const ordered = rankings.toSorted(
    (left, right) =>
      right.strengthOfSchedule - left.strengthOfSchedule ||
      left.team.localeCompare(right.team),
  );
  const ranks = new Map<string, number>();
  let rank = 0;
  let previousScore: number | null = null;
  ordered.forEach(({ team, strengthOfSchedule }, index) => {
    if (strengthOfSchedule !== previousScore) {
      rank = index + 1;
      previousScore = strengthOfSchedule;
    }
    ranks.set(team, rank);
  });
  return ranks;
}

function resumeEvidence(
  games: Game[],
  throughWeek: number,
  resultNetwork: TeamRanking[],
) {
  const fieldSize = resultNetwork.length;
  const teams = new Set(resultNetwork.map(({ team }) => team));
  const resultRanks = new Map(
    resultNetwork.map(({ team, rank }) => [team, rank]),
  );
  const defeatedOpponentRanks = new Map<string, number[]>(
    resultNetwork.map(({ team }) => [team, []]),
  );
  const fbsGamesPlayed = new Map(
    resultNetwork.map(({ team }) => [team, 0]),
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
    fbsGamesPlayed,
    scheduleRanks: scheduleRanks(resultNetwork),
    topTwoWinAverageRanks,
  };
}

export function combineEvidenceCompositeRankings(
  components: Array<ConsensusComponent & { weight: number }>,
  games: Game[],
  throughWeek: number,
): TeamRanking[] {
  const componentsById = new Map(
    components.map((component) => [
      component.rankingSystemId,
      component,
    ]),
  );
  const requiredComponents = CONSENSUS_V6_COMPONENT_SYSTEM_IDS.map(
    (rankingSystemId) => componentsById.get(rankingSystemId),
  );
  if (
    components.length !== CONSENSUS_V6_COMPONENT_SYSTEM_IDS.length ||
    requiredComponents.some((component) => !component)
  ) {
    throw new Error("Computer Composite 6 requires component rankings.");
  }
  const [resultNetwork, recordValue, performance] =
    requiredComponents as Array<
      ConsensusComponent & { weight: number }
    >;
  if (
    [resultNetwork, recordValue, performance].some(
      (component) =>
        component.weight !==
        CONSENSUS_V6_COMPONENT_WEIGHTS[
          component.rankingSystemId as keyof typeof CONSENSUS_V6_COMPONENT_WEIGHTS
        ],
    )
  ) {
    throw new Error(
      "Computer Composite 6 requires its registered component weights.",
    );
  }

  const expectedTeams = new Set(
    resultNetwork.rankings.map(({ team }) => team),
  );
  for (const { rankingSystemId, rankings } of [
    recordValue,
    performance,
  ]) {
    const actualTeams = new Set(rankings.map(({ team }) => team));
    const missing = [...expectedTeams].filter(
      (team) => !actualTeams.has(team),
    );
    const unexpected = [...actualTeams].filter(
      (team) => !expectedTeams.has(team),
    );
    if (missing.length > 0 || unexpected.length > 0) {
      throw new Error(
        `${rankingSystemId} does not rank the same team field as Computer Composite 6.`,
      );
    }
  }

  const componentMaps = new Map(
    components.map(({ rankingSystemId, rankings }) => [
      rankingSystemId,
      new Map(rankings.map((ranking) => [ranking.team, ranking])),
    ]),
  );
  const tieSafeRankMaps = new Map(
    components.map(({ rankingSystemId, rankings }) => [
      rankingSystemId,
      tieSafeRanks(rankings),
    ]),
  );
  const evidence = resumeEvidence(
    games,
    throughWeek,
    resultNetwork.rankings,
  );
  const fieldDenominator = resultNetwork.rankings.length + 1;
  const combined = resultNetwork.rankings.map((base) => {
    const consensusRanks = CONSENSUS_V6_COMPONENT_SYSTEM_IDS.map(
      (rankingSystemId) => {
        const ranking = componentMaps
          .get(rankingSystemId)
          ?.get(base.team);
        const tieSafeRank = tieSafeRankMaps
          .get(rankingSystemId)
          ?.get(base.team);
        if (!ranking || tieSafeRank === undefined) {
          throw new Error(
            `${rankingSystemId} does not rank ${base.team}.`,
          );
        }
        return {
          rankingSystemId,
          rank: ranking.rank,
          tieSafeRank,
          included: true,
          weight: CONSENSUS_V6_COMPONENT_WEIGHTS[rankingSystemId],
        };
      },
    );
    const recordValuePosition =
      consensusRanks[1].tieSafeRank / fieldDenominator;
    const performancePosition =
      consensusRanks[2].tieSafeRank / fieldDenominator;
    const basePosition =
      0.4 * recordValuePosition + 0.6 * performancePosition;
    return {
      base,
      basePosition,
      position: basePosition,
      resumePressure: 0,
      lossPressure: 0,
      consensusRanks,
    };
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
    const medianScheduleRank =
      (resultNetwork.rankings.length + 1) / 2;
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
          (resultNetwork.rankings.length - medianScheduleRank),
      );
      const winWeakness = Math.max(
        0,
        Math.min(1, (topTwoWinAverageRank - 1) / 50),
      );
      const pressure = certifiedTeams.has(row.base.team)
        ? CONSENSUS_V6_MAX_RESUME_PRESSURE *
          scheduleWeakness *
          winWeakness *
          resumeMaturity(fbsGamesPlayed)
        : 0;
      const lossPressure = rankScaledLossPressure(
        row.base.losses,
        provisionalRanks.get(row.base.team) ??
          resultNetwork.rankings.length,
        resultNetwork.rankings.length,
        resumeMaturity(fbsGamesPlayed),
      );
      row.resumePressure = pressure;
      row.lossPressure = lossPressure;
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

  combined.sort(
    (left, right) =>
      left.position - right.position ||
      left.base.team.localeCompare(right.base.team),
  );
  const lastIndex = Math.max(1, combined.length - 1);

  return combined.map(
    (
      {
        base,
        basePosition,
        position,
        resumePressure,
        lossPressure,
        consensusRanks,
      },
      index,
    ) => {
      const percentile =
        ((combined.length - 1 - index) / lastIndex) * 100;
      const fbsGamesPlayed =
        evidence.fbsGamesPlayed.get(base.team) ?? 0;
      return {
        ...base,
        rank: index + 1,
        rating: Number(percentile.toFixed(1)),
        networkRating: -position,
        networkPercentile: Number(percentile.toFixed(1)),
        networkScore: Number(percentile.toFixed(1)),
        consensusAverageRank: Number(
          (basePosition * fieldDenominator).toFixed(3),
        ),
        consensusRanks: consensusRanks.map(
          ({ rankingSystemId, rank, included, weight }) => ({
            rankingSystemId,
            rank,
            included,
            weight,
          }),
        ),
        resumePressure: Number(resumePressure.toFixed(3)),
        lossPressure: Number(lossPressure.toFixed(3)),
        resumeMaturity: Number(
          resumeMaturity(fbsGamesPlayed).toFixed(3),
        ),
        resumeScheduleRank:
          evidence.scheduleRanks.get(base.team) ?? null,
        resumeBestTwoWinAverageRank: Number(
          (
            evidence.topTwoWinAverageRanks.get(base.team) ??
            resultNetwork.rankings.length + 1
          ).toFixed(3),
        ),
      };
    },
  );
}
