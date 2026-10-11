import { describe, expect, it } from "vitest";
import {
  buildFullPreseasonPrior,
  buildPollPrior,
  calculateAchievementPoints,
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
  },
  {
    id: 2,
    week: 1,
    completed: true,
    neutralSite: true,
    homeTeam: "Charlie",
    homePoints: 28,
    awayTeam: "Delta",
    awayPoints: 21,
  },
  {
    id: 3,
    week: 2,
    completed: true,
    neutralSite: true,
    homeTeam: "Bravo",
    homePoints: 42,
    awayTeam: "Echo",
    awayPoints: 7,
  },
  {
    id: 4,
    week: 2,
    completed: true,
    neutralSite: true,
    homeTeam: "Delta",
    homePoints: 10,
    awayTeam: "Foxtrot",
    awayPoints: 17,
  },
];

describe("calculateRankings", () => {
  it("rewards the same margin more against a stronger pregame opponent", () => {
    const rankings = calculateRankings(
      games,
      2,
      { Bravo: 0.75, Delta: 0.25 },
    );
    const alpha = rankings.find(({ team }) => team === "Alpha");
    const charlie = rankings.find(({ team }) => team === "Charlie");

    expect(alpha?.rating).toBeGreaterThan(charlie?.rating ?? 100);
    expect(alpha?.strengthOfSchedule).toBeGreaterThan(
      charlie?.strengthOfSchedule ?? 100,
    );
  });

  it("ignores incomplete and future games", () => {
    const rankings = calculateRankings(
      [
        ...games,
        { ...games[0], id: 5, week: 3, homePoints: 100, awayPoints: 0 },
        { ...games[0], id: 6, completed: false },
      ],
      2,
    );

    expect(rankings.find(({ team }) => team === "Alpha")?.gamesPlayed).toBe(1);
  });

  it("does not use box-score statistics", () => {
    const baseline = calculateRankings(
      [games[0], games[1]],
      1,
    );
    const changed = calculateRankings(
      [
        {
          ...games[0],
          homeStats: {
            totalYards: 500,
            rushingAttempts: 35,
            passingAttempts: 30,
            turnovers: 0,
          },
          awayStats: {
            totalYards: 250,
            rushingAttempts: 35,
            passingAttempts: 30,
            turnovers: 2,
          },
        },
        {
          ...games[1],
          homeStats: {
            totalYards: 350,
            rushingAttempts: 35,
            passingAttempts: 30,
            turnovers: 1,
          },
          awayStats: {
            totalYards: 350,
            rushingAttempts: 35,
            passingAttempts: 30,
            turnovers: 1,
          },
        },
      ],
      1,
    );

    expect(changed.map(({ team, rating }) => ({ team, rating }))).toEqual(
      baseline.map(({ team, rating }) => ({ team, rating })),
    );
  });

  it("awards more achievement points for a dominant peer win", () => {
    const achievementGames = [
      { ...games[0], homePoints: 45, awayPoints: 21 },
      games[1],
    ];
    const points = calculateAchievementPoints(achievementGames, 1);
    const rankings = calculateRankings(achievementGames, 1);

    expect(points.get("Alpha")).toBe(3);
    expect(points.get("Charlie")).toBe(2);
    expect(
      rankings.find(({ team }) => team === "Alpha")?.achievementAverage,
    ).toBe(3);
  });

  it("uses previous-week ratings to reward wins over stronger teams", () => {
    const points = calculateAchievementPoints(
      [
        games[0],
        games[1],
        {
          ...games[0],
          id: 5,
          week: 2,
          homeTeam: "Charlie",
          awayTeam: "Alpha",
          homePoints: 21,
          awayPoints: 28,
        },
      ],
      2,
      { Charlie: 0.75 },
    );

    expect(points.get("Alpha")).toBeGreaterThan(points.get("Charlie") ?? 100);
  });

  it("awards a larger network gain for an upset than an expected win", () => {
    const mirroredGames = [games[0], games[1]];
    const prior = { Alpha: 0.75, Charlie: 0.25 };
    const starting = calculateRankings(mirroredGames, 0, prior);
    const updated = calculateRankings(mirroredGames, 1, prior);
    const networkGain = (team: string) =>
      updated.find((ranking) => ranking.team === team)!.networkRating -
      starting.find((ranking) => ranking.team === team)!.networkRating;

    expect(networkGain("Charlie")).toBeGreaterThan(networkGain("Alpha"));
  });

  it("reduces inherited prior influence to its stability floor", () => {
    const inactiveGame = {
      ...games[0],
      week: 13,
      completed: false,
      homePoints: null,
      awayPoints: null,
    };
    const rankings = calculateRankings(
      [inactiveGame],
      12,
      { Alpha: 0.75, Bravo: 0.25 },
    );

    expect(rankings.find(({ team }) => team === "Alpha")?.networkRating).toBe(
      1550,
    );
    expect(rankings.find(({ team }) => team === "Bravo")?.networkRating).toBe(
      1450,
    );
  });

  it("preserves current-season performance as the prior fades", () => {
    const rankings = calculateRankings(
      [
        games[0],
        {
          ...games[1],
          id: 99,
          week: 13,
          completed: false,
          homePoints: null,
          awayPoints: null,
        },
      ],
      12,
      { Alpha: 0.25, Bravo: 0.75 },
    );

    expect(
      rankings.find(({ team }) => team === "Alpha")?.networkRating,
    ).toBeGreaterThan(1450);
    expect(
      rankings.find(({ team }) => team === "Bravo")?.networkRating,
    ).toBeLessThan(1550);
  });

  it("uses full inherited strength for expectations after the prior fades", () => {
    const lateGame = {
      ...games[0],
      week: 7,
    };
    const prior = { Alpha: 0.75, Bravo: 0.25 };
    const baseline = calculateRankings(
      [{ ...lateGame, completed: false }],
      6,
      prior,
    );
    const updated = calculateRankings([lateGame], 7, prior, "v0.9");
    const fadedExpectation = calculateRankings(
      [lateGame],
      7,
      prior,
      "v0.8",
    );
    const rating = (
      rankings: ReturnType<typeof calculateRankings>,
      team: string,
    ) => rankings.find((ranking) => ranking.team === team)!.networkRating;

    expect(
      rating(updated, "Alpha") - rating(baseline, "Alpha"),
    ).toBeCloseTo(1.8, 1);
    expect(
      rating(fadedExpectation, "Alpha") - rating(baseline, "Alpha"),
    ).toBeGreaterThan(7);
  });

  it("reproduces the persistent prior used by v0.7", () => {
    const inactiveGame = {
      ...games[0],
      week: 13,
      completed: false,
      homePoints: null,
      awayPoints: null,
    };
    const rankings = calculateRankings(
      [inactiveGame],
      12,
      { Alpha: 0.75, Bravo: 0.25 },
      "v0.7",
    );

    expect(rankings.find(({ team }) => team === "Alpha")?.networkRating).toBe(
      1700,
    );
    expect(rankings.find(({ team }) => team === "Bravo")?.networkRating).toBe(
      1300,
    );
  });

  it("uses rating magnitude for the v0.10 network component", () => {
    const inactiveGame = {
      ...games[0],
      week: 7,
      completed: false,
      homePoints: null,
      awayPoints: null,
    };
    const prior = { Alpha: 0.75, Bravo: 0.25 };
    const percentile = calculateRankings(
      [inactiveGame],
      6,
      prior,
      "v0.9",
    );
    const magnitude = calculateRankings(
      [inactiveGame],
      6,
      prior,
      "v0.10",
    );

    expect(
      percentile.find(({ team }) => team === "Alpha")?.networkScore,
    ).toBe(100);
    expect(
      magnitude.find(({ team }) => team === "Alpha")?.networkScore,
    ).toBe(62.5);
  });

  it("blends percentile and magnitude in the v0.11 network component", () => {
    const inactiveGame = {
      ...games[0],
      week: 7,
      completed: false,
      homePoints: null,
      awayPoints: null,
    };
    const rankings = calculateRankings(
      [inactiveGame],
      6,
      { Alpha: 0.75, Bravo: 0.25 },
      "v0.11",
    );

    expect(
      rankings.find(({ team }) => team === "Alpha")?.networkScore,
    ).toBe(71.9);
  });

  it("updates all games in a week from the same starting ratings", () => {
    const reversed = calculateRankings([...games].reverse(), 2);
    const ordered = calculateRankings(games, 2);

    expect(
      reversed.map(({ team, networkRating }) => ({ team, networkRating })),
    ).toEqual(
      ordered.map(({ team, networkRating }) => ({ team, networkRating })),
    );
  });

  it("uses lower-division opponents in games but publishes only FBS teams", () => {
    const fcsGame = {
      ...games[0],
      homeClassification: "fbs",
      awayClassification: "fcs",
    };
    const fadedBaseline = calculateRankings(
      [{ ...fcsGame, completed: false }],
      1,
      { Alpha: 0.25 },
    );
    const ranked = calculateRankings([fcsGame], 1, { Alpha: 0.25 });
    const networkGain =
      ranked[0].networkRating - fadedBaseline[0].networkRating;

    expect(ranked.map(({ team }) => team)).toEqual(["Alpha"]);
    expect(ranked[0].qualityOfWins).toBe(0);
    expect(networkGain).toBeGreaterThan(0);
    expect(networkGain).toBeLessThan(10);
  });

  it("preserves preseason win quality until an opponent plays an FBS game", () => {
    const ranked = calculateRankings(
      [
        {
          ...games[0],
          homeTeam: "Southern Miss",
          awayTeam: "Alcorn State",
          homePoints: 49,
          awayPoints: 3,
          homeClassification: "fbs",
          awayClassification: "fcs",
        },
        {
          ...games[1],
          week: 2,
          homeTeam: "Auburn",
          awayTeam: "Southern Miss",
          homePoints: 43,
          awayPoints: 8,
          homeClassification: "fbs",
          awayClassification: "fbs",
        },
        {
          ...games[0],
          id: 99,
          completed: false,
          homeTeam: "Other",
          awayTeam: "Fourth",
          homePoints: null,
          awayPoints: null,
          homeClassification: "fbs",
          awayClassification: "fbs",
        },
      ],
      2,
      {
        "Southern Miss": 0.75,
        Auburn: 0.5,
        Other: 0.25,
        Fourth: 0.25,
      },
    );

    expect(ranked.find(({ team }) => team === "Auburn")?.qualityOfWins).toBe(
      100,
    );
  });
});

describe("buildPollPrior", () => {
  it("averages AP and Coaches scores and ignores unrelated polls", () => {
    const prior = buildPollPrior([
      { poll: "AP Top 25", ranks: [{ rank: 1, school: "Alpha" }] },
      { poll: "Coaches Poll", ranks: [{ rank: 3, school: "Alpha" }] },
      { poll: "Playoff Committee Rankings", ranks: [{ rank: 9, school: "X" }] },
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
