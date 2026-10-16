import { describe, expect, it } from "vitest";
import {
  RANKING_SYSTEM_IDS,
  compareRankingSystems,
  rankingSystemDisplayName,
} from "./registry";

describe("ranking system registry", () => {
  it("formats engine and model versions as separate numeric components", () => {
    expect(rankingSystemDisplayName("Curve.0.11")).toBe("Curve.0.11");
  });

  it("sorts model versions numerically rather than lexicographically", () => {
    const systems = RANKING_SYSTEM_IDS.toSorted((left, right) =>
      compareRankingSystems(right, left),
    );

    expect(systems).toEqual([
      "Curve.0.11",
      "Curve.0.10",
      "Curve.0.9",
      "Curve.0.8",
      "Curve.0.7",
    ]);
  });
});
