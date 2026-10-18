import type {
  RankingEngine,
  RankingSystemId,
  TeamRanking,
} from "../../../types";

type ConsensusComponent = {
  rankingSystemId: RankingSystemId;
  rankings: TeamRanking[];
};

export const CONSENSUS_V4_COMPONENT_WEIGHTS = {
  "ResultNetwork.1.0": 0.25,
  "RecordValue.1.0": 0.25,
  "CappedMarginPerformance.1.0": 0.5,
} as const satisfies Partial<Record<RankingSystemId, number>>;

export const CONSENSUS_V4_COMPONENT_SYSTEM_IDS = Object.keys(
  CONSENSUS_V4_COMPONENT_WEIGHTS,
) as Array<keyof typeof CONSENSUS_V4_COMPONENT_WEIGHTS>;

function requiresComponents(): never {
  throw new Error(
    "Computer Composite 4 requires all registered evidence-family rankings.",
  );
}

export const consensusEngine: RankingEngine = {
  buildPollPrior: () => ({}),
  buildFullPreseasonPrior: () => ({}),
  calculateExpectedStrengthRatings: requiresComponents,
  calculateAchievementPoints: requiresComponents,
  calculateRankings: requiresComponents,
};

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

export function combineEvidenceCompositeRankings(
  components: Array<ConsensusComponent & { weight: number }>,
): TeamRanking[] {
  const componentsById = new Map(
    components.map((component) => [
      component.rankingSystemId,
      component,
    ]),
  );
  const requiredComponents = CONSENSUS_V4_COMPONENT_SYSTEM_IDS.map(
    (rankingSystemId) => componentsById.get(rankingSystemId),
  );
  if (
    components.length !== CONSENSUS_V4_COMPONENT_SYSTEM_IDS.length ||
    requiredComponents.some((component) => !component)
  ) {
    throw new Error("Computer Composite 4 requires component rankings.");
  }
  const [resultNetwork, recordValue, performance] =
    requiredComponents as Array<
      ConsensusComponent & { weight: number }
    >;
  if (
    [resultNetwork, recordValue, performance].some(
      (component) =>
        component.weight !==
        CONSENSUS_V4_COMPONENT_WEIGHTS[
          component.rankingSystemId as keyof typeof CONSENSUS_V4_COMPONENT_WEIGHTS
        ],
    )
  ) {
    throw new Error(
      "Computer Composite 4 requires its registered component weights.",
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
        `${rankingSystemId} does not rank the same team field as Computer Composite 4.`,
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
  const fieldDenominator = resultNetwork.rankings.length + 1;
  const combined = resultNetwork.rankings.map((base) => {
    const consensusRanks = components.map(
      ({ rankingSystemId, weight }) => {
        const ranking = componentMaps.get(rankingSystemId)?.get(base.team);
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
          weight,
        };
      },
    );
    const resultNetworkPosition =
      consensusRanks[0].tieSafeRank / fieldDenominator;
    const recordValuePosition =
      consensusRanks[1].tieSafeRank / fieldDenominator;
    const performancePosition =
      consensusRanks[2].tieSafeRank / fieldDenominator;
    const outcomePosition =
      (resultNetworkPosition + recordValuePosition) / 2;
    const compositePosition =
      0.5 * outcomePosition + 0.5 * performancePosition;
    return { base, compositePosition, consensusRanks };
  });

  combined.sort(
    (left, right) =>
      left.compositePosition - right.compositePosition ||
      left.base.team.localeCompare(right.base.team),
  );
  const lastIndex = Math.max(1, combined.length - 1);

  return combined.map(
    ({ base, compositePosition, consensusRanks }, index) => {
      const percentile =
        ((combined.length - 1 - index) / lastIndex) * 100;
      return {
        ...base,
        rank: index + 1,
        rating: Number(percentile.toFixed(1)),
        networkRating: -compositePosition,
        networkPercentile: Number(percentile.toFixed(1)),
        networkScore: Number(percentile.toFixed(1)),
        consensusAverageRank: Number(
          (compositePosition * fieldDenominator).toFixed(3),
        ),
        consensusRanks: consensusRanks.map(
          ({ rankingSystemId, rank, included, weight }) => ({
            rankingSystemId,
            rank,
            included,
            weight,
          }),
        ),
      };
    },
  );
}
