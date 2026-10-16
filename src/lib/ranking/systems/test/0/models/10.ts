import type { RankingModel } from "../../../../types";

export const model = {
  minimumPriorWeight: 0.25,
  expectationPrior: "full",
  networkPercentileWeight: 0,
  networkMagnitudeWeight: 1,
} satisfies RankingModel;
