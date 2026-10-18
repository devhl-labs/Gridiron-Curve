import { describe, expect, it } from "vitest";
import type { Game } from "../../src/lib/ranking";
import {
  createOpponentWinPercentageScheduleRanks,
  seasonStage,
  spearmanRankCorrelation,
} from "./engine-benchmark";

function game(
  id: number,
  homeTeam: string,
  awayTeam: string,
  homePoints: number,
  awayPoints: number,
): Game {
  return {
    id,
    week: 1,
    seasonType: "regular",
    completed: true,
    neutralSite: true,
    homeTeam,
    homePoints,
    awayTeam,
    awayPoints,
    homeClassification: "fbs",
    awayClassification: "fbs",
  };
}

describe("engine research benchmark", () => {
  it("classifies season stages consistently", () => {
    expect(seasonStage(1)).toBe("early");
    expect(seasonStage(4)).toBe("early");
    expect(seasonStage(5)).toBe("middle");
    expect(seasonStage(9)).toBe("middle");
    expect(seasonStage(10)).toBe("late");
  });

  it("calculates Spearman rank correlation", () => {
    const first = new Map([
      ["Alpha", 1],
      ["Beta", 2],
      ["Gamma", 3],
    ]);
    expect(spearmanRankCorrelation(first, first)).toBe(1);
    expect(
      spearmanRankCorrelation(
        first,
        new Map([
          ["Alpha", 3],
          ["Beta", 2],
          ["Gamma", 1],
        ]),
      ),
    ).toBe(-1);
  });

  it("ranks schedules by independent opponent winning percentage", () => {
    const ranks = createOpponentWinPercentageScheduleRanks(
      [
        game(1, "Alpha", "Bravo", 21, 14),
        game(2, "Bravo", "Charlie", 28, 7),
        game(3, "Delta", "Echo", 24, 10),
        game(4, "Delta", "Foxtrot", 27, 13),
      ],
      1,
    );

    expect(ranks.get("Alpha")).toBeLessThan(ranks.get("Charlie")!);
  });
});
