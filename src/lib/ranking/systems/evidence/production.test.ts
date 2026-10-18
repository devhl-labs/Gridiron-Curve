import { describe, expect, it } from "vitest";
import type { Game } from "../../types";
import {
  calculateEvidenceFamilyRankings,
  resultNetworkProductionEngine,
} from "./production";
import {
  calculatePublishedEvidenceRankings,
  resultNetworkFamilyEngine,
} from "./engine";
import { neutralComputerModel } from "../computer/model";

function game(
  id: number,
  week: number,
  homeTeam: string,
  awayTeam: string,
  homePoints: number,
  awayPoints: number,
): Game {
  return {
    id,
    week,
    seasonType: "regular",
    completed: true,
    neutralSite: true,
    homeTeam,
    homePoints,
    awayTeam,
    awayPoints,
    homeClassification: "fbs",
    awayClassification: "fbs",
  };
}

const games = [
  game(1, 1, "Alpha", "Bravo", 21, 14),
  game(2, 1, "Charlie", "Delta", 24, 10),
  game(3, 2, "Alpha", "Charlie", 17, 14),
  game(4, 2, "Delta", "Bravo", 28, 7),
];

describe("production evidence families", () => {
  it("starts from the shared prior and fades fully after Week 6", () => {
    const inactiveGames = games.map((item) => ({
      ...item,
      completed: false,
      homePoints: null,
      awayPoints: null,
    }));
    const prior = {
      Alpha: 0.25,
      Bravo: 0.75,
      Charlie: 0.5,
      Delta: 0.4,
    };
    const preseason = resultNetworkProductionEngine.calculateRankings(
      inactiveGames,
      0,
      prior,
      neutralComputerModel,
    );
    const faded = resultNetworkProductionEngine.calculateRankings(
      inactiveGames,
      6,
      prior,
      neutralComputerModel,
    );

    expect(preseason[0].team).toBe("Bravo");
    expect(faded.map(({ team }) => team)).toEqual([
      "Alpha",
      "Bravo",
      "Charlie",
      "Delta",
    ]);
  });

  it("matches the shared research calculation exactly", () => {
    const prior = {
      Alpha: 0.75,
      Bravo: 0.25,
      Charlie: 0.6,
      Delta: 0.4,
    };
    const research = calculatePublishedEvidenceRankings(
      resultNetworkFamilyEngine,
      games,
      2,
      prior,
    );
    const production = calculateEvidenceFamilyRankings(
      resultNetworkFamilyEngine,
      games,
      2,
      prior,
    );

    expect(
      production.map(({ team, rank, networkRating }) => ({
        team,
        rank,
        score: networkRating,
      })),
    ).toEqual(
      research.map(({ team, rank, score }) => ({ team, rank, score })),
    );
  });
});
