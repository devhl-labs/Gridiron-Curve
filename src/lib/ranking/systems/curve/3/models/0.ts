import type { RankingModel } from "../../../../types";

export const curveModel0 = {
  minimumPriorWeight: 0.25,
  expectationPrior: "full",
  networkPercentileWeight: 0.25,
  networkMagnitudeWeight: 0.75,
} satisfies RankingModel;
