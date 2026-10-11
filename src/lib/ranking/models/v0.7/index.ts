import type { RankingModel } from "../types";

export const model = {
  version: "v0.7",
  engine: "v1",
  minimumPriorWeight: 1,
  expectationPrior: "faded",
  networkPercentileWeight: 1,
  networkMagnitudeWeight: 0,
} satisfies RankingModel;
