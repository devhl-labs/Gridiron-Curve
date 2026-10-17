import type { RankingModel } from "../../types";

export const neutralComputerModel = {
  minimumPriorWeight: 0,
  expectationPrior: "faded",
  networkPercentileWeight: 1,
  networkMagnitudeWeight: 0,
} satisfies RankingModel;
