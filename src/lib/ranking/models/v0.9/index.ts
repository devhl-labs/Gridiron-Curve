import type { RankingModel } from "../types";

export const model = {
  version: "v0.9",
  engine: "v1",
  minimumPriorWeight: 0.25,
  expectationPrior: "full",
  networkPercentileWeight: 1,
  networkMagnitudeWeight: 0,
} satisfies RankingModel;
