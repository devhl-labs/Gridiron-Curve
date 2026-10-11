import type { RankingModel } from "../types";

export const model = {
  version: "v0.11",
  engine: "v1",
  minimumPriorWeight: 0.25,
  expectationPrior: "full",
  networkPercentileWeight: 0.25,
  networkMagnitudeWeight: 0.75,
} satisfies RankingModel;
