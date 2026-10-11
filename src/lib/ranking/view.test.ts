import { describe, expect, it } from "vitest";
import type { CfbdSourceCache } from "../cfbd/cache";
import {
  createChainedStartingPrior,
  createRankingView,
} from "./view";

const source: CfbdSourceCache = {
  season: 2026,
  throughWeek: 2,
  fetchedAt: "2026-10-10T20:00:00.000Z",
  pollWeeks: [],
  teams: ["Alpha", "Bravo", "Charlie", "Delta"].map((school, index) => ({
    id: index + 1,
    school,
    mascot: null,
    abbreviation: null,
    color: null,
    alternateColor: null,
    logos: [],
  })),
  games: [
    {
      id: 1,
      week: 1,
      startDate: "2026-09-01T16:00:00.000Z",
      completed: true,
      neutralSite: true,
      homeTeam: "Alpha",
      homePoints: 24,
      awayTeam: "Bravo",
      awayPoints: 21,
      homeClassification: "fbs",
      awayClassification: "fbs",
    },
    {
      id: 2,
      week: 1,
      startDate: "2026-09-01T20:00:00.000Z",
      completed: true,
      neutralSite: true,
      homeTeam: "Delta",
      homePoints: 24,
      awayTeam: "Charlie",
      awayPoints: 21,
      homeClassification: "fbs",
      awayClassification: "fbs",
    },
    {
      id: 3,
      week: 2,
      startDate: "2026-09-08T20:00:00.000Z",
      completed: true,
      neutralSite: false,
      homeTeam: "Charlie",
      homePoints: 40,
      awayTeam: "Alpha",
      awayPoints: 10,
      homeClassification: "fbs",
      awayClassification: "fbs",
    },
  ],
};

describe("createRankingView", () => {
  it("carries final ranking order through every consecutive season", () => {
    const historicalSource = (
      season: number,
      completed: boolean,
    ): CfbdSourceCache => ({
      ...source,
      season,
      throughWeek: 1,
      fetchedAt: `${season}-12-31T20:00:00.000Z`,
      pollWeeks: [],
      games: [
        {
          ...source.games[0],
          completed,
          homeTeam: "Bravo",
          awayTeam: "Alpha",
          homePoints: completed ? 28 : null,
          awayPoints: completed ? 21 : null,
        },
      ],
    });
    const season2024 = historicalSource(2024, true);
    const season2025 = historicalSource(2025, false);
    const season2026 = historicalSource(2026, false);

    const chained = createChainedStartingPrior(
      season2026,
      [season2024, season2025],
    ).prior;
    const oneSeason = createChainedStartingPrior(
      season2026,
      [season2025],
    ).prior;

    expect(chained.Bravo).toBeGreaterThan(chained.Alpha);
    expect(oneSeason.Alpha).toBeGreaterThan(oneSeason.Bravo);
  });

  it("calculates prior-week movement without future games", () => {
    const view = createRankingView(source);
    const charlie = view.rankings.find(({ team }) => team === "Charlie");

    expect(charlie?.movement).toBeGreaterThan(0);
  });

  it("uses preseason poll consensus for Week 1 movement", () => {
    const view = createRankingView({
      ...source,
      throughWeek: 1,
      pollWeeks: [
        {
          season: 2026,
          week: 1,
          polls: [
            {
              poll: "AP Top 25",
              ranks: [{ rank: 2, school: "Alpha" }],
            },
            {
              poll: "Coaches Poll",
              ranks: [{ rank: 4, school: "Alpha" }],
            },
          ],
        },
      ],
    });

    expect(
      view.rankings.find(({ team }) => team === "Alpha")?.movement,
    ).not.toBeNull();
    expect(
      view.rankings.find(({ team }) => team === "Bravo")?.movement,
    ).toBeNull();
  });

  it("shows the most recently played result", () => {
    const view = createRankingView(source);
    const charlie = view.rankings.find(({ team }) => team === "Charlie");
    const alpha = view.rankings.find(({ team }) => team === "Alpha");

    expect(charlie?.lastResult).toBe("W 40–10 vs Alpha");
    expect(alpha?.lastResult).toBe("L 10–40 @ Charlie");
  });

  it("ranks schedules from hardest to easiest", () => {
    const view = createRankingView(source);
    const scheduleRanks = view.rankings.map(
      ({ scheduleRank }) => scheduleRank,
    );

    expect(Math.min(...scheduleRanks)).toBe(1);
    expect(new Set(scheduleRanks).size).toBeGreaterThan(1);
  });

  it("ranks remaining schedules using current opponent ratings", () => {
    const view = createRankingView({
      ...source,
      games: [
        ...source.games,
        {
          ...source.games[0],
          id: 4,
          week: 3,
          completed: false,
          homePoints: null,
          awayPoints: null,
          homeTeam: "Alpha",
          awayTeam: "Delta",
        },
        {
          ...source.games[0],
          id: 5,
          week: 3,
          completed: false,
          homePoints: null,
          awayPoints: null,
          homeTeam: "Bravo",
          awayTeam: "Charlie",
        },
      ],
    });
    const ranks = view.rankings.map(
      ({ upcomingScheduleRank }) => upcomingScheduleRank,
    );

    expect(ranks).not.toContain(null);
    expect(Math.min(...(ranks as number[]))).toBe(1);
    expect(new Set(ranks).size).toBeGreaterThan(1);
  });

  it("ranks an upcoming FCS opponent below every FBS opponent", () => {
    const view = createRankingView({
      ...source,
      games: [
        ...source.games,
        {
          ...source.games[0],
          id: 4,
          week: 3,
          completed: false,
          homePoints: null,
          awayPoints: null,
          homeTeam: "Alpha",
          awayTeam: "FCS Opponent",
          awayClassification: "fcs",
        },
        {
          ...source.games[0],
          id: 5,
          week: 3,
          completed: false,
          homePoints: null,
          awayPoints: null,
          homeTeam: "Bravo",
          awayTeam: "Charlie",
        },
      ],
    });
    const alpha = view.rankings.find(({ team }) => team === "Alpha");
    const bravo = view.rankings.find(({ team }) => team === "Bravo");

    expect(alpha?.upcomingScheduleRank).toBeGreaterThan(
      bravo?.upcomingScheduleRank ?? Number.MAX_SAFE_INTEGER,
    );
  });

  it("excludes postseason games from regular weekly views", () => {
    const view = createRankingView({
      ...source,
      games: [
        ...source.games,
        {
          ...source.games[0],
          id: 4,
          seasonType: "postseason",
          homePoints: 100,
          awayPoints: 0,
        },
      ],
    });

    expect(view.gamesIncluded).toBe(3);
    expect(
      view.rankings.find(({ team }) => team === "Alpha")?.lastResult,
    ).toBe("L 10–40 @ Charlie");
  });
});
