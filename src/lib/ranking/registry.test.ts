import { describe, expect, it } from "vitest";
import {
  RANKING_SYSTEM_IDS,
  compareRankingSystems,
  rankingSystemDisplayName,
} from "./registry";

describe("ranking system registry", () => {
  it("formats engine and model versions as separate numeric components", () => {
    expect(rankingSystemDisplayName("Test.0.11")).toBe("Test.0.11");
  });

  it("sorts model versions numerically rather than lexicographically", () => {
    const systems = RANKING_SYSTEM_IDS.toSorted((left, right) =>
      compareRankingSystems(right, left),
    );

    expect(systems).toEqual([
      "Test.0.11",
      "Test.0.10",
      "Test.0.9",
      "Test.0.8",
      "Test.0.7",
    ]);
  });
});
