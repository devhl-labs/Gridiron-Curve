import { describe, expect, it } from "vitest";
import type { Game } from ".";
import { createTeamSchedule } from "./team-view";

const games: Game[] = [
  {
    id: 1,
    week: 1,
    seasonType: "regular",
    completed: true,
    neutralSite: false,
    homeTeam: "Alpha",
    homePoints: 31,
    awayTeam: "Bravo",
    awayPoints: 14,
  },
  {
    id: 2,
    week: 2,
    seasonType: "regular",
    completed: true,
    neutralSite: true,
    homeTeam: "Charlie",
    homePoints: 24,
    awayTeam: "Alpha",
    awayPoints: 27,
  },
  {
    id: 3,
    week: 3,
    seasonType: "regular",
    completed: true,
    neutralSite: false,
    homeTeam: "Alpha",
    homePoints: 10,
    awayTeam: "Delta",
    awayPoints: 20,
  },
  {
    id: 4,
    week: 5,
    startDate: "2026-10-24T19:30:00.000Z",
    seasonType: "regular",
    completed: false,
    neutralSite: false,
    homeTeam: "Alpha",
    homePoints: null,
    awayTeam: "Echo",
    awayPoints: null,
  },
  {
    id: 5,
    week: 5,
    seasonType: "postseason",
    completed: true,
    neutralSite: false,
    homeTeam: "Alpha",
    homePoints: 40,
    awayTeam: "Foxtrot",
    awayPoints: 0,
  },
];

describe("createTeamSchedule", () => {
  it("returns the full regular-season schedule", () => {
    expect(createTeamSchedule(games, "Alpha")).toEqual([
      {
        kind: "game",
        id: 1,
        week: 1,
        startDate: null,
        opponent: "Bravo",
        location: "Home",
        result: "W",
        teamScore: 31,
        opponentScore: 14,
      },
      {
        kind: "game",
        id: 2,
        week: 2,
        startDate: null,
        opponent: "Charlie",
        location: "Neutral",
        result: "W",
        teamScore: 27,
        opponentScore: 24,
      },
      {
        kind: "game",
        id: 3,
        week: 3,
        startDate: null,
        opponent: "Delta",
        location: "Home",
        result: "L",
        teamScore: 10,
        opponentScore: 20,
      },
      {
        kind: "idle",
        id: "idle-4",
        week: 4,
      },
      {
        kind: "game",
        id: 4,
        week: 5,
        startDate: "2026-10-24T19:30:00.000Z",
        opponent: "Echo",
        location: "Home",
        result: null,
        teamScore: null,
        opponentScore: null,
      },
    ]);
  });
});
