import { describe, expect, it } from "vitest";
import type {
  Game,
  Poll,
  TeamRanking,
} from "../../../types";
import { combinePollBlendRankings } from "./engine";

function ranking(team: string, rank: number): TeamRanking {
  return {
    team,
    rank,
    rating: 50,
    record: "1-0",
    wins: 1,
    losses: 0,
    gamesPlayed: 1,
    strengthOfSchedule: 50,
    bestWin: null,
    networkRating: 50,
    networkPercentile: 50,
    networkScore: 50,
    achievementPoints: 0,
    achievementAverage: 0,
    achievementScore: 50,
    qualityOfWins: 0,
  };
}

const polls: Poll[] = [
  {
    poll: "AP Top 25",
    ranks: [
      { rank: 1, school: "Alpha" },
      { rank: 2, school: "Charlie" },
      { rank: 3, school: "Bravo" },
    ],
  },
  {
    poll: "Coaches Poll",
    ranks: [
      { rank: 1, school: "Alpha" },
      { rank: 2, school: "Charlie" },
      { rank: 3, school: "Bravo" },
    ],
  },
];

const headToHead: Game = {
  id: 1,
  week: 2,
  completed: true,
  neutralSite: true,
  homeTeam: "Alpha",
  homePoints: 21,
  awayTeam: "Bravo",
  awayPoints: 17,
  homeClassification: "fbs",
  awayClassification: "fbs",
};

describe("combinePollBlendRankings", () => {
  it("uses head-to-head before consensus rank for exact score ties", () => {
    const blended = combinePollBlendRankings(
      [
        ranking("Bravo", 1),
        ranking("Charlie", 2),
        ranking("Alpha", 3),
      ],
      polls,
      [headToHead],
      2,
    );

    expect(blended.map(({ team }) => team)).toEqual([
      "Alpha",
      "Charlie",
      "Bravo",
    ]);
    expect(blended.map(({ blendScore }) => blendScore)).toEqual([
      24,
      24,
      24,
    ]);
    expect(blended[0].blendHeadToHeadRecord).toBe("1-0");
    expect(blended[2].blendHeadToHeadRecord).toBe("0-1");
  });

  it("uses consensus rank when tied teams did not play", () => {
    const blended = combinePollBlendRankings(
      [
        ranking("Bravo", 1),
        ranking("Charlie", 2),
        ranking("Alpha", 3),
      ],
      polls,
      [],
      2,
    );

    expect(blended.map(({ team }) => team)).toEqual([
      "Bravo",
      "Charlie",
      "Alpha",
    ]);
  });

  it("renormalizes visible weights when a historical poll is unavailable", () => {
    const blended = combinePollBlendRankings(
      [ranking("Alpha", 1)],
      polls.filter(({ poll }) => poll === "AP Top 25"),
      [],
      1,
    );
    const components = blended[0].blendComponents!;

    expect(components.map(({ weight }) => weight)).toEqual([
      0.666667,
      0.333333,
      0,
    ]);
    expect(components[2].rank).toBeNull();
  });

  it("preserves consensus order below the Top 25 point cutoff", () => {
    const consensus = Array.from({ length: 30 }, (_, index) =>
      ranking(`Team ${index + 1}`, index + 1),
    );
    const blended = combinePollBlendRankings(consensus, [], [], 1);

    expect(blended[25].team).toBe("Team 26");
    expect(blended[26].team).toBe("Team 27");
    expect(blended[25].blendScore).toBeGreaterThan(
      blended[26].blendScore ?? Number.POSITIVE_INFINITY,
    );
  });
});
