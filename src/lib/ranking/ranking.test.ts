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
    const updated = calculateRankings([lateGame], 7, prior, "Curve.0.9");
    const fadedExpectation = calculateRankings(
      [lateGame],
      7,
      prior,
      "Curve.0.8",
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

  it("reproduces the persistent prior used by Curve.0.7", () => {
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
      "Curve.0.7",
    );

    expect(rankings.find(({ team }) => team === "Alpha")?.networkRating).toBe(
      1700,
    );
    expect(rankings.find(({ team }) => team === "Bravo")?.networkRating).toBe(
      1300,
    );
  });

  it("uses rating magnitude for the Curve.0.10 network component", () => {
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
      "Curve.0.9",
    );
    const magnitude = calculateRankings(
      [inactiveGame],
      6,
      prior,
      "Curve.0.10",
    );

    expect(
      percentile.find(({ team }) => team === "Alpha")?.networkScore,
    ).toBe(100);
    expect(
      magnitude.find(({ team }) => team === "Alpha")?.networkScore,
    ).toBe(62.5);
  });

  it("blends percentile and magnitude in the Curve.0.11 network component", () => {
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
      "Curve.0.11",
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
    const qualityGames = [
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
      ];
    const prior = {
      "Southern Miss": 0.75,
      Auburn: 0.5,
      Other: 0.25,
      Fourth: 0.25,
    };
    const ranked = calculateRankings(
      qualityGames,
      2,
      prior,
      "Curve.3.0",
    );
    const previousEngine = calculateRankings(
      qualityGames,
      2,
      prior,
      "Curve.0.11",
    );

    expect(ranked.find(({ team }) => team === "Auburn")?.qualityOfWins).toBe(
      50,
    );
    expect(
      previousEngine.find(({ team }) => team === "Auburn")?.qualityOfWins,
    ).toBe(
      100,
    );
  });

  it("does not reduce Curve.1 win quality when another weaker win is added", () => {
    const strongWin = {
      ...games[0],
      homeClassification: "fbs",
      awayClassification: "fbs",
    };
    const weakWin = {
      ...games[1],
      id: 99,
      week: 2,
      homeTeam: "Alpha",
      awayTeam: "Echo",
      homeClassification: "fbs",
      awayClassification: "fbs",
    };
    const prior = {
      Alpha: 0.5,
      Bravo: 0.75,
      Charlie: 0.25,
      Delta: 0.25,
      Echo: 0.25,
    };
    const oneWin = calculateRankings([strongWin, weakWin], 1, prior);
    const twoWins = calculateRankings([strongWin, weakWin], 2, prior);
    const previousEngineOneWin = calculateRankings(
      [strongWin, weakWin],
      1,
      prior,
      "Curve.0.11",
    );
    const previousEngineTwoWins = calculateRankings(
      [strongWin, weakWin],
      2,
      prior,
      "Curve.0.11",
    );
    const quality = (
      rankings: ReturnType<typeof calculateRankings>,
    ) => rankings.find(({ team }) => team === "Alpha")!.qualityOfWins;

    expect(quality(twoWins)).toBeGreaterThanOrEqual(quality(oneWin));
    expect(quality(previousEngineTwoWins)).toBeLessThan(
      quality(previousEngineOneWin),
    );
  });

  it("revalues Curve.2 wins when a defeated opponent declines", () => {
    const laterOpponents = ["Echo", "Fourth", "Golf", "Hotel", "India"];
    const reevaluationGames = [
      {
        ...games[0],
        homeClassification: "fbs",
        awayClassification: "fbs",
      },
      ...laterOpponents.map((opponent, index) => ({
        ...games[2],
        id: 100 + index,
        week: index + 2,
        homeTeam: "Bravo",
        awayTeam: opponent,
        homePoints: 7,
        awayPoints: 42,
        homeClassification: "fbs",
        awayClassification: "fbs",
      })),
    ];
    const prior = {
      Alpha: 0.5,
      Bravo: 0.75,
      ...Object.fromEntries(laterOpponents.map((team) => [team, 0.5])),
    };
    const pregameValue = calculateRankings(
      reevaluationGames,
      6,
      prior,
      "Curve.1.0",
    ).find(({ team }) => team === "Alpha")!.qualityOfWins;
    const currentValue = calculateRankings(
      reevaluationGames,
      6,
      prior,
      "Curve.2.0",
    ).find(({ team }) => team === "Alpha")!.qualityOfWins;

    expect(currentValue).toBeLessThan(pregameValue);
  });

  it("penalizes Curve.3 close wins over weaker opponents", () => {
    const closeWin = {
      ...games[0],
      homePoints: 24,
      awayPoints: 21,
    };
    const prior = { Alpha: 0.75, Bravo: 0.25 };

    expect(
      calculateAchievementPoints(
        [closeWin],
        1,
        prior,
        "Curve.2.0",
      ).get("Alpha"),
    ).toBe(0.5);
    expect(
      calculateAchievementPoints(
        [closeWin],
        1,
        prior,
        "Curve.3.0",
      ).get("Alpha"),
    ).toBe(-1);

    const ranking = calculateRankings(
      [closeWin],
      1,
      prior,
      "Curve.3.0",
    ).find(({ team }) => team === "Alpha")!;
    expect(ranking.rating).toBe(
      Number(
        (
          0.4 * ranking.networkScore +
          0.3 * ranking.qualityOfWins +
          0.3 * ranking.achievementScore
        ).toFixed(1),
      ),
    );
  });

  it("averages Curve.4's four strongest defeated FBS opponents", () => {
    const opponents = ["Bravo", "Charlie", "Delta", "Echo", "Foxtrot"];
    const curve4Games = opponents.map((opponent, index) => ({
      ...games[0],
      id: 200 + index,
      week: 1,
      homeTeam: "Alpha",
      awayTeam: opponent,
      homeClassification: "fbs",
      awayClassification: "fbs",
    }));
    const prior = {
      Alpha: 0.5,
      Bravo: 1,
      Charlie: 0.8,
      Delta: 0.6,
      Echo: 0.4,
      Foxtrot: 0.2,
    };
    const rankings = calculateRankings(
      curve4Games,
      1,
      prior,
      "Curve.4.0",
    );
    const orderedRatings = rankings
      .toSorted((left, right) => left.networkRating - right.networkRating);
    const percentiles = new Map(
      orderedRatings.map(({ team }, index) => [
        team,
        (index / (orderedRatings.length - 1)) * 100,
      ]),
    );
    const strongestFour = opponents
      .map((opponent) => percentiles.get(opponent)!)
      .toSorted((left, right) => right - left)
      .slice(0, 4);
    const expectedQuality =
      strongestFour.reduce((sum, value) => sum + value, 0) / 4;

    expect(
      rankings.find(({ team }) => team === "Alpha")!.qualityOfWins,
    ).toBe(Number(expectedQuality.toFixed(1)));
    const alpha = rankings.find(({ team }) => team === "Alpha")!;
    expect(alpha.rating).toBe(
      Number(
        (
          (alpha.networkScore +
            alpha.qualityOfWins +
            alpha.achievementScore) /
          3
        ).toFixed(1),
      ),
    );
  });

  it("values Curve.5 wins with the current provisional résumé ranking", () => {
    const curve5Games = [
      {
        ...games[0],
        week: 1,
        homeClassification: "fbs",
        awayClassification: "fbs",
      },
      {
        ...games[1],
        week: 2,
        homeTeam: "Alpha",
        awayTeam: "Charlie",
        homeClassification: "fbs",
        awayClassification: "fbs",
      },
    ];
    const prior = {
      Alpha: 0.5,
      Bravo: 0.75,
      Charlie: 0.25,
      Delta: 0.1,
    };
    const provisionalRankings = calculateRankings(
      curve5Games,
      2,
      prior,
      "Curve.4.0",
    );
    const provisionalPercentiles = new Map(
      provisionalRankings.map(({ team, rank }) => [
        team,
        ((provisionalRankings.length - rank) /
          (provisionalRankings.length - 1)) *
          100,
      ]),
    );
    const rankings = calculateRankings(
      curve5Games,
      2,
      prior,
      "Curve.5.0",
    );
    const alpha = rankings.find(({ team }) => team === "Alpha")!;
    const expectedQuality =
      ((provisionalPercentiles.get("Bravo") ?? 0) +
        (provisionalPercentiles.get("Charlie") ?? 0)) /
      4;

    expect(alpha.qualityOfWins).toBe(Number(expectedQuality.toFixed(1)));
    expect(alpha.rating).toBe(
      Number(
        Math.min(
          100,
          Math.max(
            0,
            0.6 * alpha.networkScore +
              0.4 * alpha.qualityOfWins +
              (alpha.achievementScore - 50) / 10,
          ),
        ).toFixed(1),
      ),
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
