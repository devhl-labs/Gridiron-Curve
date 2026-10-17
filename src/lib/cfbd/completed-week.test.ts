import { describe, expect, it } from "vitest";
import type { Game } from "../ranking";
import { latestCompletedWeek } from "./completed-week";

function game(id: number, week: number, completed: boolean): Game {
  return {
    id,
    week,
    completed,
    neutralSite: false,
    homeTeam: `Home ${id}`,
    homePoints: completed ? 21 : null,
    awayTeam: `Away ${id}`,
    awayPoints: completed ? 14 : null,
  };
}

describe("latestCompletedWeek", () => {
  it("ignores a partially completed current week", () => {
    expect(
      latestCompletedWeek([
        game(1, 6, true),
        game(2, 6, true),
        game(3, 7, true),
        game(4, 7, false),
        game(5, 8, false),
      ]),
    ).toBe(6);
  });

  it("returns null when no week is complete", () => {
    expect(latestCompletedWeek([game(1, 1, false)])).toBeNull();
  });
});
