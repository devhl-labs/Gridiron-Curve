import { describe, expect, it } from "vitest";
import type { Game } from "../../types";
import {
  createComputerEngine,
  type ComputerMethod,
} from "./engine";
import { neutralComputerModel } from "./model";

const systems = [
  "record-matrix",
  "pairwise",
  "sequence",
  "least-squares",
  "victory-paths",
  "schedule-record",
] as const satisfies readonly ComputerMethod[];

function calculateRankings(
  method: ComputerMethod,
  inputGames: Game[],
  throughWeek: number,
) {
  return createComputerEngine(method).calculateRankings(
    inputGames,
    throughWeek,
    {},
    neutralComputerModel,
  );
}

const games: Game[] = [
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
    homeTeam: "Alpha",
    homePoints: 28,
    awayTeam: "Charlie",
    awayPoints: 20,
    homeClassification: "fbs",
    awayClassification: "fbs",
  },
  {
    id: 3,
    week: 2,
    startDate: "2026-09-08T16:00:00.000Z",
    completed: true,
    neutralSite: true,
    homeTeam: "Delta",
    homePoints: 14,
    awayTeam: "Alpha",
    awayPoints: 21,
    homeClassification: "fbs",
    awayClassification: "fbs",
  },
  {
    id: 4,
    week: 2,
    startDate: "2026-09-08T20:00:00.000Z",
    completed: true,
    neutralSite: true,
    homeTeam: "Bravo",
    homePoints: 24,
    awayTeam: "Charlie",
    awayPoints: 17,
    homeClassification: "fbs",
    awayClassification: "fbs",
  },
  {
    id: 5,
    week: 3,
    startDate: "2026-09-15T16:00:00.000Z",
    completed: true,
    neutralSite: true,
    homeTeam: "Charlie",
    homePoints: 27,
    awayTeam: "Delta",
    awayPoints: 20,
    homeClassification: "fbs",
    awayClassification: "fbs",
  },
];

describe("computer ranking engines", () => {
  it.each(systems)("%s ranks the undefeated team first", (rankingSystemId) => {
    const rankings = calculateRankings(rankingSystemId, games, 3);

    expect(rankings).toHaveLength(4);
    expect(rankings[0].team).toBe("Alpha");
    expect(rankings.map(({ rank }) => rank)).toEqual([1, 2, 3, 4]);
  });

  it.each(systems)("%s uses outcomes rather than scoring margin", (
    rankingSystemId,
  ) => {
    const baseline = calculateRankings(rankingSystemId, games, 3);
    const changed = calculateRankings(
      rankingSystemId,
      games.map((game) => ({
        ...game,
        homePoints:
          game.homePoints! > game.awayPoints! ? 70 : game.homePoints === game.awayPoints ? 10 : 3,
        awayPoints:
          game.homePoints! > game.awayPoints! ? 3 : game.homePoints === game.awayPoints ? 10 : 70,
      })),
      3,
    );

    expect(
      changed.map(({ team, rank, rating }) => ({ team, rank, rating })),
    ).toEqual(
      baseline.map(({ team, rank, rating }) => ({ team, rank, rating })),
    );
  });

  it.each(systems)("%s ignores future and incomplete games", (
    rankingSystemId,
  ) => {
    const baseline = calculateRankings(rankingSystemId, games, 3);
    const changed = calculateRankings(
      rankingSystemId,
      [
        ...games,
        {
          ...games[0],
          id: 99,
          week: 4,
          homeTeam: "Bravo",
          awayTeam: "Alpha",
          homePoints: 100,
          awayPoints: 0,
        },
        {
          ...games[0],
          id: 100,
          completed: false,
          homeTeam: "Bravo",
          awayTeam: "Alpha",
        },
      ],
      3,
    );

    expect(
      changed.map(({ team, rank, rating }) => ({ team, rank, rating })),
    ).toEqual(
      baseline.map(({ team, rank, rating }) => ({ team, rank, rating })),
    );
  });
});
