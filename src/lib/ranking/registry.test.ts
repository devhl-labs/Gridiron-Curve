import { describe, expect, it } from "vitest";
import {
  RANKING_SYSTEM_IDS,
  RANKING_ENGINE_SELECT_GROUPS,
  RANKING_SYSTEM_SELECT_GROUPS,
  SELECTABLE_RANKING_ENGINE_IDS,
  SELECTABLE_RANKING_SYSTEM_IDS,
  compareRankingSystems,
  parseRankingEngineId,
  rankingCategoryDisplayName,
  rankingEngineName,
  rankingEngineSelectDescription,
  rankingEngineSelectDisplayName,
  rankingSystemIdsForCategory,
  rankingSystemSelectDescription,
  rankingSystemSelectDisplayName,
  rankingSystemDisplayName,
} from "./registry";

describe("ranking system registry", () => {
  it("formats engine and model versions as separate numeric components", () => {
    expect(rankingSystemDisplayName("Curve.0.11")).toBe("Curve.0.11");
    expect(rankingSystemDisplayName("Consensus.1.0")).toBe(
      "Gridiron Consensus.1.0",
    );
    expect(rankingSystemDisplayName("Blend.1.0")).toBe(
      "Gridiron Blend.1.0",
    );
    expect(rankingSystemSelectDisplayName("Blend.1.0")).toBe(
      "Computer + AP/Coaches",
    );
    expect(rankingSystemSelectDisplayName("Consensus.1.0")).toBe(
      "Computer Composite",
    );
    expect(rankingSystemSelectDisplayName("Curve.5.0")).toBe(
      "Résumé Ranking",
    );
    expect(rankingSystemSelectDisplayName("Curve.4.0")).toBe(
      "Curve.4.0",
    );
    expect(rankingSystemSelectDescription("Blend.1.0")).toContain(
      "50% Computer Composite · 25% AP Poll · 25% Coaches Poll",
    );
  });

  it("sorts model versions numerically rather than lexicographically", () => {
    const systems = RANKING_SYSTEM_IDS
      .filter((rankingSystemId) => rankingSystemId.startsWith("Curve."))
      .toSorted((left, right) => compareRankingSystems(right, left));

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
    expect(rankingCategoryDisplayName("ranking")).toBe("Rankings");
    expect(rankingCategoryDisplayName("power-ranking")).toBe(
      "Power Rankings",
    );
    expect(rankingCategoryDisplayName("strength-of-schedule")).toBe(
      "Strength of Schedule",
    );
    expect(rankingSystemIdsForCategory("ranking")).toEqual(
      RANKING_SYSTEM_IDS,
    );
    expect(rankingSystemIdsForCategory("power-ranking")).toEqual([]);
    expect(rankingSystemIdsForCategory("strength-of-schedule")).toEqual([]);
    expect(SELECTABLE_RANKING_SYSTEM_IDS).toEqual([
      "Curve.5.0",
      "RecordMatrix.1.0",
      "Pairwise.1.0",
      "Sequence.1.0",
      "LeastSquares.1.0",
      "VictoryPaths.1.0",
      "Consensus.1.0",
      "Blend.1.0",
    ]);
    expect(SELECTABLE_RANKING_ENGINE_IDS).not.toContain("Curve.4");
    expect(RANKING_SYSTEM_SELECT_GROUPS.map(({ label }) => label)).toEqual([
      "Composite Rankings",
      "Individual Models",
    ]);
    expect(
      RANKING_SYSTEM_SELECT_GROUPS.flatMap(
        ({ rankingSystemIds }) => rankingSystemIds,
      ),
    ).toEqual([
      "Blend.1.0",
      "Consensus.1.0",
      "Curve.5.0",
      "VictoryPaths.1.0",
      "Sequence.1.0",
      "RecordMatrix.1.0",
      "Pairwise.1.0",
      "LeastSquares.1.0",
    ]);
    expect(
      RANKING_ENGINE_SELECT_GROUPS.flatMap(
        ({ rankingEngineIds }) => rankingEngineIds,
      ),
    ).toHaveLength(SELECTABLE_RANKING_ENGINE_IDS.length);
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
    expect(parseRankingEngineId("RecordMatrix.1")).toBe("RecordMatrix.1");
    expect(parseRankingEngineId("Consensus.1")).toBe("Consensus.1");
    expect(parseRankingEngineId("Blend.1")).toBe("Blend.1");
    expect(rankingEngineName("RecordMatrix.1")).toBe("Record Matrix");
    expect(rankingEngineName("Consensus.1")).toBe("Gridiron Consensus");
    expect(rankingEngineName("Blend.1")).toBe("Gridiron Blend");
    expect(rankingEngineSelectDisplayName("Blend.1")).toBe(
      "Computer + AP/Coaches",
    );
    expect(rankingEngineSelectDisplayName("Consensus.1")).toBe(
      "Computer Composite",
    );
    expect(rankingEngineSelectDisplayName("Curve.5")).toBe(
      "Résumé Ranking",
    );
    expect(rankingEngineSelectDisplayName("Curve.4")).toBe("Curve.4");
    expect(rankingEngineSelectDescription("Consensus.1")).toContain(
      "six independent computer methods",
    );
  });
});
