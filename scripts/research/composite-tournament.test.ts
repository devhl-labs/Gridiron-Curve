import { describe, expect, it } from "vitest";
import type { CandidateRanking } from "./candidate-engines";
import {
  COMPOSITE_CANDIDATES,
  combineFamilyRankings,
} from "./composite-tournament";

function rankings(order: string[]): CandidateRanking[] {
  return order.map((team, index) => ({
    team,
    rank: index + 1,
    score: order.length - index,
    wins: 0,
    losses: 0,
    ties: 0,
    gamesPlayed: 0,
  }));
}

describe("composite tournament", () => {
  it("pre-registers a constrained candidate field", () => {
    expect(COMPOSITE_CANDIDATES).toHaveLength(13);
    expect(
      new Set(
        COMPOSITE_CANDIDATES.flatMap(({ outcomeWeight }) =>
          outcomeWeight === null ? [] : [outcomeWeight]
        ),
      ),
    ).toEqual(new Set([0.75, 2 / 3, 0.6, 0.5]));
  });

  it.each(COMPOSITE_CANDIDATES)(
    "$id preserves a unanimous family order",
    (candidate) => {
      const order = ["Alpha", "Bravo", "Charlie", "Delta"];
      expect(
        combineFamilyRankings(
          candidate,
          rankings(order),
          rankings(order),
          rankings(order),
        ).map(({ team }) => team),
      ).toEqual(order);
    },
  );

  it("balances exactly opposing blocks at equal weight", () => {
    const candidate = COMPOSITE_CANDIDATES.find(
      ({ id }) => id === "block-arithmetic.O50-P50",
    );
    if (!candidate) throw new Error("Missing arithmetic candidate.");

    const combined = combineFamilyRankings(
      candidate,
      rankings(["Alpha", "Bravo", "Charlie"]),
      rankings(["Alpha", "Bravo", "Charlie"]),
      rankings(["Charlie", "Bravo", "Alpha"]),
    );

    expect(combined.map(({ team }) => team)).toEqual([
      "Alpha",
      "Bravo",
      "Charlie",
    ]);
    expect(new Set(combined.map(({ score }) => score)).size).toBe(1);
  });

  it("rejects mismatched family fields", () => {
    expect(() =>
      combineFamilyRankings(
        COMPOSITE_CANDIDATES[0],
        rankings(["Alpha", "Bravo"]),
        rankings(["Alpha"]),
        rankings(["Alpha", "Bravo"]),
      )
    ).toThrow("same team field");
  });
});
