import type { RankingModel } from "../../../../types";

export const curveModel10 = {
  minimumPriorWeight: 0.25,
  expectationPrior: "full",
  networkPercentileWeight: 0,
  networkMagnitudeWeight: 1,
} satisfies RankingModel;
