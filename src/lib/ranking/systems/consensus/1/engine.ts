import type {
  RankingEngine,
  RankingSystemId,
  TeamRanking,
} from "../../../types";

export const CONSENSUS_COMPONENT_SYSTEM_IDS = [
  "Curve.5.0",
  "RecordMatrix.1.0",
  "Pairwise.1.0",
  "Sequence.1.0",
  "LeastSquares.1.0",
  "VictoryPaths.1.0",
] as const satisfies readonly RankingSystemId[];

export type ConsensusComponent = {
  rankingSystemId: RankingSystemId;
  rankings: TeamRanking[];
};

function requiresComponents(): never {
  throw new Error(
    "Consensus rankings require all registered component rankings.",
  );
}

export const consensusEngine: RankingEngine = {
  buildPollPrior: () => ({}),
  buildFullPreseasonPrior: () => ({}),
  calculateExpectedStrengthRatings: requiresComponents,
  calculateAchievementPoints: requiresComponents,
  calculateRankings: requiresComponents,
};

export function combineConsensusRankings(
  components: ConsensusComponent[],
): TeamRanking[] {
  if (components.length < 5) {
    throw new Error("Consensus requires at least five component rankings.");
  }
  const [foundation, ...remaining] = components;
  if (!foundation) {
    throw new Error("Consensus requires component rankings.");
  }
  const componentMaps = new Map(
    components.map(({ rankingSystemId, rankings }) => [
      rankingSystemId,
      new Map(rankings.map((ranking) => [ranking.team, ranking])),
    ]),
  );
  const expectedTeams = new Set(
    foundation.rankings.map(({ team }) => team),
  );

  for (const { rankingSystemId, rankings } of remaining) {
    const actualTeams = new Set(rankings.map(({ team }) => team));
    const missing = [...expectedTeams].filter((team) => !actualTeams.has(team));
    const unexpected = [...actualTeams].filter(
      (team) => !expectedTeams.has(team),
    );
    if (missing.length > 0 || unexpected.length > 0) {
      throw new Error(
        `${rankingSystemId} does not rank the same team field as consensus.`,
      );
    }
  }

  const combined = foundation.rankings.map((base) => {
    const ordered = components
      .map(({ rankingSystemId }) => {
        const ranking = componentMaps.get(rankingSystemId)?.get(base.team);
        if (!ranking) {
          throw new Error(
            `${rankingSystemId} does not rank ${base.team}.`,
          );
        }
        return { rankingSystemId, rank: ranking.rank };
      })
      .sort(
        (left, right) =>
          left.rank - right.rank ||
          left.rankingSystemId.localeCompare(right.rankingSystemId),
      );
    const included = ordered.slice(1, -1);
    const consensusAverageRank =
      included.reduce((total, component) => total + component.rank, 0) /
      included.length;
    const untrimmedAverage =
      ordered.reduce((total, component) => total + component.rank, 0) /
      ordered.length;
    const includedIds = new Set(
      included.map(({ rankingSystemId }) => rankingSystemId),
    );

    return {
      base,
      consensusAverageRank,
      untrimmedAverage,
      consensusRanks: ordered.map((component) => ({
        ...component,
        included: includedIds.has(component.rankingSystemId),
      })),
    };
  });

  combined.sort(
    (left, right) =>
      left.consensusAverageRank - right.consensusAverageRank ||
      left.untrimmedAverage - right.untrimmedAverage ||
      right.base.strengthOfSchedule - left.base.strengthOfSchedule ||
      left.base.team.localeCompare(right.base.team),
  );
  const lastIndex = Math.max(1, combined.length - 1);

  return combined.map(
    ({ base, consensusAverageRank, consensusRanks }, index) => {
      const rating = ((combined.length - 1 - index) / lastIndex) * 100;
      return {
        ...base,
        rank: index + 1,
        rating: Number(rating.toFixed(1)),
        networkRating: Number(consensusAverageRank.toFixed(3)),
        networkPercentile: Number(rating.toFixed(1)),
        networkScore: Number(rating.toFixed(1)),
        achievementPoints: 0,
        achievementAverage: 0,
        achievementScore: 50,
        qualityOfWins: 0,
        consensusAverageRank: Number(consensusAverageRank.toFixed(2)),
        consensusRanks,
      };
    },
  );
}
