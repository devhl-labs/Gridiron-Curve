import type { RankingModel } from "../types";

export const model = {
  version: "v0.10",
  engine: "v1",
  minimumPriorWeight: 0.25,
  expectationPrior: "full",
  networkPercentileWeight: 0,
  networkMagnitudeWeight: 1,
} satisfies RankingModel;
