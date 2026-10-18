import type { RankingEngine, RankingSystemId } from "../../../types";
import {
  combineWeightedConsensusRankings,
} from "../../consensus/3/engine";
import type { ConsensusComponent } from "../../consensus/1/engine";

export const NEUTRAL_FAMILY_COMPONENT_SYSTEM_IDS = [
  "RecordMatrix.1.0",
  "Sequence.1.0",
  "LeastSquares.1.0",
  "VictoryPaths.1.0",
] as const satisfies readonly RankingSystemId[];

function requiresComponents(): never {
  throw new Error(
    "Neutral Computer Family requires all registered component rankings.",
  );
}

export const neutralFamilyEngine: RankingEngine = {
  buildPollPrior: () => ({}),
  buildFullPreseasonPrior: () => ({}),
  calculateExpectedStrengthRatings: requiresComponents,
  calculateAchievementPoints: requiresComponents,
  calculateRankings: requiresComponents,
};

export function combineNeutralFamilyRankings(
  components: ConsensusComponent[],
) {
  const weight = 1 / NEUTRAL_FAMILY_COMPONENT_SYSTEM_IDS.length;
  return combineWeightedConsensusRankings(
    components.map((component) => ({ ...component, weight })),
  );
}
