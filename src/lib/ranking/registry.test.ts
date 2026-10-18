import { describe, expect, it } from "vitest";
import {
  DEFAULT_RANKING_ENGINE_ID,
  DEFAULT_RANKING_SYSTEM_ID,
  RANKING_ENGINE_IDS,
  RANKING_ENGINE_SELECT_GROUPS,
  RANKING_SYSTEM_IDS,
  RANKING_SYSTEM_SELECT_GROUPS,
  SELECTABLE_RANKING_ENGINE_IDS,
  SELECTABLE_RANKING_SYSTEM_IDS,
  isRankingEngineId,
  isRankingSystemId,
  parseRankingEngineId,
  parseRankingSystemId,
  rankingCategoryDisplayName,
  rankingEngineName,
  rankingEngineSelectDescription,
  rankingEngineSelectDisplayName,
  rankingSystemIdsForCategory,
  rankingSystemSelectDescription,
  rankingSystemSelectDisplayName,
  rankingSystemDisplayName,
} from "./registry";

const expectedSystemIds = [
  "ResultNetwork.1.0",
  "RecordValue.1.0",
  "CappedMarginPerformance.1.0",
  "Consensus.5.0",
  "Blend.5.0",
] as const;

const expectedEngineIds = [
  "ResultNetwork.1",
  "RecordValue.1",
  "CappedMarginPerformance.1",
  "Consensus.5",
  "Blend.5",
] as const;

describe("ranking system registry", () => {
  it("publishes only the live ranking dependency closure", () => {
    expect(RANKING_SYSTEM_IDS).toEqual(expectedSystemIds);
    expect(RANKING_ENGINE_IDS).toEqual(expectedEngineIds);
    expect(SELECTABLE_RANKING_SYSTEM_IDS).toEqual(expectedSystemIds);
    expect(SELECTABLE_RANKING_ENGINE_IDS).toEqual(expectedEngineIds);
    expect(isRankingSystemId("Consensus.3.0")).toBe(false);
    expect(isRankingEngineId("Blend.3")).toBe(false);
  });

  it("uses Computer Composite 5 as the default", () => {
    expect(DEFAULT_RANKING_SYSTEM_ID).toBe("Consensus.5.0");
    expect(DEFAULT_RANKING_ENGINE_ID).toBe("Consensus.5");
    expect(parseRankingSystemId(null)).toBe("Consensus.5.0");
    expect(parseRankingEngineId(null)).toBe("Consensus.5");
    expect(parseRankingSystemId("Consensus.3.0")).toBe(
      "Consensus.5.0",
    );
  });

  it("groups and labels every live ranking", () => {
    expect(rankingCategoryDisplayName("ranking")).toBe("Rankings");
    expect(rankingSystemIdsForCategory("ranking")).toEqual(
      expectedSystemIds,
    );
    expect(RANKING_SYSTEM_SELECT_GROUPS.map(({ label }) => label)).toEqual([
      "Composite Rankings",
      "Composite Components",
    ]);
    expect(
      RANKING_SYSTEM_SELECT_GROUPS.flatMap(
        ({ rankingSystemIds }) => rankingSystemIds,
      ),
    ).toEqual([
      "Blend.5.0",
      "Consensus.5.0",
      "ResultNetwork.1.0",
      "RecordValue.1.0",
      "CappedMarginPerformance.1.0",
    ]);
    expect(
      RANKING_ENGINE_SELECT_GROUPS.flatMap(
        ({ rankingEngineIds }) => rankingEngineIds,
      ),
    ).toHaveLength(expectedEngineIds.length);

    expect(rankingSystemDisplayName("Blend.5.0")).toBe(
      "Gridiron Blend.5.0",
    );
    expect(rankingSystemSelectDisplayName("Blend.5.0")).toBe(
      "Computer + AP/Coaches",
    );
    expect(rankingSystemSelectDisplayName("Consensus.5.0")).toBe(
      "Computer Composite",
    );
    expect(rankingEngineName("Blend.5")).toBe("Gridiron Blend");
    expect(rankingEngineSelectDisplayName("Blend.5")).toBe(
      "Computer + AP/Coaches",
    );
    expect(rankingEngineSelectDescription("Consensus.5")).toContain(
      "60% Performance",
    );
    expect(rankingSystemSelectDescription("Blend.5.0")).toContain(
      "50% Computer Composite",
    );
  });
});
