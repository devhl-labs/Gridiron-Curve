import type {
  RankingEngine,
  RankingSystemId,
  TeamRanking,
} from "../../../types";
import type { ConsensusComponent } from "../1/engine";

export const CONSENSUS_V3_COMPONENT_WEIGHTS = {
  "Curve.5.0": 0.2,
  "ScheduleRecord.1.0": 0.6,
  "NeutralFamily.1.0": 0.2,
} as const satisfies Partial<Record<RankingSystemId, number>>;

export const CONSENSUS_V3_COMPONENT_SYSTEM_IDS = Object.keys(
  CONSENSUS_V3_COMPONENT_WEIGHTS,
) as Array<keyof typeof CONSENSUS_V3_COMPONENT_WEIGHTS>;

function requiresComponents(): never {
  throw new Error(
    "Weighted consensus rankings require all registered component rankings.",
  );
}

export const consensusEngine: RankingEngine = {
  buildPollPrior: () => ({}),
  buildFullPreseasonPrior: () => ({}),
  calculateExpectedStrengthRatings: requiresComponents,
  calculateAchievementPoints: requiresComponents,
  calculateRankings: requiresComponents,
};

export function combineWeightedConsensusRankings(
  components: Array<ConsensusComponent & { weight: number }>,
): TeamRanking[] {
  const [foundation, ...remaining] = components;
  if (!foundation) {
    throw new Error("Weighted consensus requires component rankings.");
  }
  const weightTotal = components.reduce(
    (total, { weight }) => total + weight,
    0,
  );
  if (
    components.some(({ weight }) => weight <= 0) ||
    Math.abs(weightTotal - 1) > 0.000001
  ) {
    throw new Error("Weighted consensus component weights must sum to one.");
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
        `${rankingSystemId} does not rank the same team field as weighted consensus.`,
      );
    }
  }

  const combined = foundation.rankings.map((base) => {
    const consensusRanks = components.map(
      ({ rankingSystemId, weight }) => {
        const ranking = componentMaps.get(rankingSystemId)?.get(base.team);
        if (!ranking) {
          throw new Error(
            `${rankingSystemId} does not rank ${base.team}.`,
          );
        }
        return {
          rankingSystemId,
          rank: ranking.rank,
          included: true,
          weight,
        };
      },
    );
    const consensusAverageRank = consensusRanks.reduce(
      (total, { rank, weight }) => total + rank * weight,
      0,
    );
    const unweightedAverage = consensusRanks.reduce(
      (total, { rank }) => total + rank,
      0,
    ) / consensusRanks.length;
    return {
      base,
      consensusAverageRank,
      unweightedAverage,
      consensusRanks,
    };
  });

  combined.sort(
    (left, right) =>
      left.consensusAverageRank - right.consensusAverageRank ||
      left.unweightedAverage - right.unweightedAverage ||
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
