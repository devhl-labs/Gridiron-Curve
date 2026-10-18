import { describe, expect, it } from "vitest";
import type { CandidateRanking } from "./candidate-engines";
import {
  PRIOR_FADE_POLICIES,
  createPriorRanks,
  priorWeight,
  stabilizeOutputRankings,
} from "./prior-aware-engine-benchmark";

function ranking(team: string, rank: number): CandidateRanking {
  return {
    team,
    rank,
    score: 4 - rank,
    wins: 0,
    losses: 0,
    ties: 0,
    gamesPlayed: 0,
  };
}

describe("prior-aware engine benchmark", () => {
  it("reproduces the Curve fade schedule", () => {
    const policy = PRIOR_FADE_POLICIES[0];
    expect(priorWeight(0, policy)).toBe(1);
    expect(priorWeight(1, policy)).toBe(0.875);
    expect(priorWeight(4, policy)).toBe(0.5);
    expect(priorWeight(6, policy)).toBe(0.25);
    expect(priorWeight(12, policy)).toBe(0.25);
  });

  it("supports zero-floor fade schedules", () => {
    const sixWeek = PRIOR_FADE_POLICIES[1];
    const fourWeek = PRIOR_FADE_POLICIES[2];
    expect(priorWeight(3, sixWeek)).toBe(0.5);
    expect(priorWeight(6, sixWeek)).toBe(0);
    expect(priorWeight(2, fourWeek)).toBe(0.5);
    expect(priorWeight(4, fourWeek)).toBe(0);
  });

  it("uses average ranks for teams tied in the preseason prior", () => {
    const ranks = createPriorRanks(
      ["Alpha", "Bravo", "Charlie"],
      { Alpha: 0.75 },
    );
    expect(ranks.get("Alpha")).toBe(1);
    expect(ranks.get("Bravo")).toBe(2.5);
    expect(ranks.get("Charlie")).toBe(2.5);
  });

  it("can move between neutral and prior output orders", () => {
    const neutral = [
      ranking("Alpha", 1),
      ranking("Bravo", 2),
      ranking("Charlie", 3),
    ];
    const prior = {
      Alpha: 0.25,
      Bravo: 0.5,
      Charlie: 0.75,
    };

    expect(
      stabilizeOutputRankings(neutral, prior, 0).map(({ team }) => team),
    ).toEqual(["Alpha", "Bravo", "Charlie"]);
    expect(
      stabilizeOutputRankings(neutral, prior, 1).map(({ team }) => team),
    ).toEqual(["Charlie", "Bravo", "Alpha"]);
  });
});
