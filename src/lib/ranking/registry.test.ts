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
  "RecordValue.2.0",
  "CappedMarginPerformance.1.0",
  "Consensus.7.0",
  "Blend.7.0",
] as const;

const expectedEngineIds = [
  "ResultNetwork.1",
  "RecordValue.2",
  "CappedMarginPerformance.1",
  "Consensus.7",
  "Blend.7",
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

  it("uses Computer Composite 7 as the default", () => {
    expect(DEFAULT_RANKING_SYSTEM_ID).toBe("Consensus.7.0");
    expect(DEFAULT_RANKING_ENGINE_ID).toBe("Consensus.7");
    expect(parseRankingSystemId(null)).toBe("Consensus.7.0");
    expect(parseRankingEngineId(null)).toBe("Consensus.7");
    expect(parseRankingSystemId("Consensus.3.0")).toBe(
      "Consensus.7.0",
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
      "Blend.7.0",
      "Consensus.7.0",
      "ResultNetwork.1.0",
      "RecordValue.2.0",
      "CappedMarginPerformance.1.0",
    ]);
    expect(
      RANKING_ENGINE_SELECT_GROUPS.flatMap(
        ({ rankingEngineIds }) => rankingEngineIds,
      ),
    ).toHaveLength(expectedEngineIds.length);

    expect(rankingSystemDisplayName("Blend.7.0")).toBe(
      "Gridiron Blend.7.0",
    );
    expect(rankingSystemSelectDisplayName("Blend.7.0")).toBe(
      "Computer + AP/Coaches",
    );
    expect(rankingSystemSelectDisplayName("Consensus.7.0")).toBe(
      "Computer Composite",
    );
    expect(rankingEngineName("Blend.7")).toBe("Gridiron Blend");
    expect(rankingEngineSelectDisplayName("Blend.7")).toBe(
      "Computer + AP/Coaches",
    );
    expect(rankingEngineSelectDescription("Consensus.7")).toContain(
      "60% Performance",
    );
    expect(rankingSystemSelectDescription("Blend.7.0")).toContain(
      "50% Computer Composite",
    );
  });
});
