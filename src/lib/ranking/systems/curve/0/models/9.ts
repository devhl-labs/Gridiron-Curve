import type { RankingModel } from "../../../../types";

export const curveModel9 = {
  minimumPriorWeight: 0.25,
  expectationPrior: "full",
  networkPercentileWeight: 1,
  networkMagnitudeWeight: 0,
} satisfies RankingModel;
