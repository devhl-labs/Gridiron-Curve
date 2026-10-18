import { describe, expect, it } from "vitest";
import { calculateRankings, type Game } from "../../..";

function game(
  id: number,
  homeTeam: string,
  awayTeam: string,
  homeWins = true,
): Game {
  return {
    id,
    week: 1,
    completed: true,
    neutralSite: true,
    homeTeam,
    homePoints: homeWins ? 24 : 17,
    awayTeam,
    awayPoints: homeWins ? 17 : 24,
    homeClassification: "fbs",
    awayClassification: "fbs",
  };
}

describe("ScheduleRecord.1.0", () => {
  it("values wins over stronger opponents above an empty perfect record", () => {
    const games = [
      game(1, "Strong Candidate", "Good A"),
      game(2, "Strong Candidate", "Good B"),
      game(3, "Elite", "Strong Candidate"),
      game(4, "Weak Perfect", "Bottom A"),
      game(5, "Weak Perfect", "Bottom B"),
      game(6, "Weak Perfect", "Bottom C"),
      game(7, "Elite", "Good A"),
      game(8, "Elite", "Good B"),
      game(9, "Good A", "Bottom A"),
      game(10, "Good A", "Bottom B"),
      game(11, "Good B", "Bottom B"),
      game(12, "Good B", "Bottom C"),
    ];
    const rankings = calculateRankings(
      games,
      1,
      {},
      "ScheduleRecord.1.0",
    );
    const strong = rankings.find(
      ({ team }) => team === "Strong Candidate",
    );
    const weak = rankings.find(({ team }) => team === "Weak Perfect");

    expect(strong?.rank).toBeLessThan(weak?.rank ?? Number.MAX_SAFE_INTEGER);
    expect(strong?.networkRating).toBeGreaterThan(
      weak?.networkRating ?? Number.MAX_SAFE_INTEGER,
    );
  });

  it("gives a lower-division win no opponent-quality credit", () => {
    const rankings = calculateRankings(
      [
        {
          ...game(1, "FBS Team", "FCS Team"),
          awayClassification: "fcs",
        },
      ],
      1,
      {},
      "ScheduleRecord.1.0",
    );

    expect(rankings).toHaveLength(1);
    expect(rankings[0].networkRating).toBe(0);
  });
});
