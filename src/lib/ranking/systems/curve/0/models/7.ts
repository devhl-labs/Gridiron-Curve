import type { RankingModel } from "../../../../types";

export const curveModel7 = {
  minimumPriorWeight: 1,
  expectationPrior: "faded",
  networkPercentileWeight: 1,
  networkMagnitudeWeight: 0,
} satisfies RankingModel;
