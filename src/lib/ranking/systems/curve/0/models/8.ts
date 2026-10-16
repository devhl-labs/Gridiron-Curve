import type { RankingModel } from "../../../../types";

export const curveModel8 = {
  minimumPriorWeight: 0.25,
  expectationPrior: "faded",
  networkPercentileWeight: 1,
  networkMagnitudeWeight: 0,
} satisfies RankingModel;
