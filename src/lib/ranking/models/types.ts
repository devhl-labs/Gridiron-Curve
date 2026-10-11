export type ModelVersion =
  | "v0.7"
  | "v0.8"
  | "v0.9"
  | "v0.10"
  | "v0.11";

export type RankingEngineVersion = "v1";

export type RankingModel = {
  version: ModelVersion;
  engine: RankingEngineVersion;
  minimumPriorWeight: number;
  expectationPrior: "faded" | "full";
  networkPercentileWeight: number;
  networkMagnitudeWeight: number;
};
