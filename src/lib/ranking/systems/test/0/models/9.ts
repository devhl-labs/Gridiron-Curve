import type { RankingModel } from "../../../../types";

export const model = {
  minimumPriorWeight: 0.25,
  expectationPrior: "full",
  networkPercentileWeight: 1,
  networkMagnitudeWeight: 0,
} satisfies RankingModel;
