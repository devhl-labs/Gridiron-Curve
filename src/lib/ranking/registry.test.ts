import { describe, expect, it } from "vitest";
import {
  RANKING_SYSTEM_IDS,
  compareRankingSystems,
  parseRankingEngineId,
  rankingCategoryDisplayName,
  rankingEngineName,
  rankingSystemIdsForCategory,
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
      "Curve.5.0",
      "Curve.4.0",
      "Curve.3.0",
      "Curve.2.0",
      "Curve.1.0",
      "Curve.0.11",
      "Curve.0.10",
      "Curve.0.9",
      "Curve.0.8",
      "Curve.0.7",
    ]);
  });

  it("groups systems by category and exposes selectable engines", () => {
    expect(rankingCategoryDisplayName("resume")).toBe("Resume rankings");
    expect(rankingSystemIdsForCategory("resume")).toEqual(RANKING_SYSTEM_IDS);
    expect(parseRankingEngineId("Curve.0")).toBe("Curve.0");
    expect(parseRankingEngineId("Curve.1")).toBe("Curve.1");
    expect(parseRankingEngineId("Curve.2")).toBe("Curve.2");
    expect(parseRankingEngineId("Curve.3")).toBe("Curve.3");
    expect(parseRankingEngineId("Curve.4")).toBe("Curve.4");
    expect(parseRankingEngineId("Curve.5")).toBe("Curve.5");
    expect(rankingEngineName("Curve.0")).toBe("Curve");
    expect(rankingEngineName("Curve.1")).toBe("Curve");
    expect(rankingEngineName("Curve.2")).toBe("Curve");
    expect(rankingEngineName("Curve.3")).toBe("Curve");
    expect(rankingEngineName("Curve.4")).toBe("Curve");
    expect(rankingEngineName("Curve.5")).toBe("Curve");
  });
});
