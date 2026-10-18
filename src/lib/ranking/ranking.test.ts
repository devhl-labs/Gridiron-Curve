import { describe, expect, it } from "vitest";
import {
  buildFullPreseasonPrior,
  buildPollPrior,
  calculateRankings,
  type Game,
} from ".";

const games: Game[] = [
  {
    id: 1,
    week: 1,
    completed: true,
    neutralSite: true,
    homeTeam: "Alpha",
    homePoints: 28,
    awayTeam: "Bravo",
    awayPoints: 21,
    homeClassification: "fbs",
    awayClassification: "fbs",
  },
  {
    id: 2,
    week: 2,
    completed: true,
    neutralSite: true,
    homeTeam: "Bravo",
    homePoints: 24,
    awayTeam: "Charlie",
    awayPoints: 17,
    homeClassification: "fbs",
    awayClassification: "fbs",
  },
];

describe("calculateRankings", () => {
  it("calculates a published composite component directly", () => {
    const rankings = calculateRankings(
      games,
      2,
      { Alpha: 0.75, Bravo: 0.5, Charlie: 0.25 },
      "ResultNetwork.1.0",
    );

    expect(rankings.map(({ team }) => team)).toEqual([
      "Alpha",
      "Bravo",
      "Charlie",
    ]);
    expect(rankings.every(({ gamesPlayed }) => gamesPlayed > 0)).toBe(
      true,
    );
  });

  it("ignores incomplete and future games", () => {
    const baseline = calculateRankings(
      games,
      1,
      {},
      "ResultNetwork.1.0",
    );
    const withIgnoredGames = calculateRankings(
      [
        ...games,
        {
          ...games[0],
          id: 3,
          week: 1,
          completed: false,
          homePoints: null,
          awayPoints: null,
        },
      ],
      1,
      {},
      "ResultNetwork.1.0",
    );

    expect(withIgnoredGames).toEqual(baseline);
  });
});

describe("buildPollPrior", () => {
  it("averages AP and Coaches scores and ignores unrelated polls", () => {
    const prior = buildPollPrior([
      { poll: "AP Top 25", ranks: [{ rank: 1, school: "Alpha" }] },
      { poll: "Coaches Poll", ranks: [{ rank: 3, school: "Alpha" }] },
      {
        poll: "Playoff Committee Rankings",
        ranks: [{ rank: 9, school: "X" }],
      },
    ]);

    expect(prior.Alpha).toBeCloseTo(0.74);
    expect(prior.X).toBeUndefined();
  });
});

describe("buildFullPreseasonPrior", () => {
  it("places the poll consensus first and fills the field from last season", () => {
    const prior = buildFullPreseasonPrior(
      [
        {
          poll: "AP Top 25",
          ranks: [
            { rank: 1, school: "Alpha" },
            { rank: 2, school: "Bravo" },
          ],
        },
        {
          poll: "Coaches Poll",
          ranks: [
            { rank: 1, school: "Bravo" },
            { rank: 2, school: "Alpha" },
          ],
        },
      ],
      ["Alpha", "Bravo", "Charlie", "Delta"],
      ["Delta", "Charlie", "Bravo", "Alpha"],
    );

    expect(Object.keys(prior)).toEqual([
      "Alpha",
      "Bravo",
      "Delta",
      "Charlie",
    ]);
    expect(prior.Alpha).toBeGreaterThan(prior.Bravo);
    expect(prior.Bravo).toBeGreaterThan(prior.Delta);
    expect(prior.Delta).toBeGreaterThan(prior.Charlie);
  });
});
