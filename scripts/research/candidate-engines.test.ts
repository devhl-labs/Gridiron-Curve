import { describe, expect, it } from "vitest";
import type { Game } from "../../src/lib/ranking";
import {
  binaryMasseyEngine,
  bradleyTerryEngine,
  CANDIDATE_ENGINES,
  cappedMarginPerformanceFamilyEngine,
  cappedMarginMasseyEngine,
  colleyEngine,
  eloEngine,
  recordValueFamilyEngine,
  resultNetworkFamilyEngine,
} from "./candidate-engines";

function game(
  id: number,
  week: number,
  homeTeam: string,
  awayTeam: string,
  homePoints: number,
  awayPoints: number,
  completed = true,
): Game {
  return {
    id,
    week,
    startDate: `2026-09-${String(id).padStart(2, "0")}T12:00:00Z`,
    seasonType: "regular",
    completed,
    neutralSite: true,
    homeTeam,
    homePoints,
    awayTeam,
    awayPoints,
    homeClassification: "fbs",
    awayClassification: "fbs",
  };
}

const schedule = [
  game(1, 1, "Alpha", "Bravo", 24, 17),
  game(2, 1, "Bravo", "Charlie", 21, 14),
  game(3, 2, "Alpha", "Charlie", 28, 7),
  game(4, 3, "Charlie", "Alpha", 0, 0, false),
];

describe("candidate research engines", () => {
  it.each([
    colleyEngine,
    bradleyTerryEngine,
    binaryMasseyEngine,
    cappedMarginMasseyEngine,
    eloEngine,
  ])("$id ranks a transitive result chain", (engine) => {
    const rankings = engine.calculate(schedule, 2);
    expect(rankings.map(({ team }) => team)).toEqual([
      "Alpha",
      "Bravo",
      "Charlie",
    ]);
  });

  it.each(CANDIDATE_ENGINES)(
    "$id is deterministic and ignores future games",
    (engine) => {
      expect(engine.calculate(schedule, 2)).toEqual(
        engine.calculate(schedule, 2),
      );
      expect(engine.calculate(schedule, 2)).toEqual(
        engine.calculate(
          [
            ...schedule,
            game(5, 4, "Charlie", "Alpha", 100, 0),
          ],
          2,
        ),
      );
    },
  );

  it("uses scoring margin only in the performance candidate", () => {
    const close = [
      game(1, 1, "Alpha", "Bravo", 21, 20),
      game(2, 1, "Charlie", "Delta", 21, 20),
      game(3, 2, "Alpha", "Charlie", 21, 20),
      game(4, 2, "Bravo", "Delta", 21, 20),
    ];
    const blowout = close.map((item) =>
      item.id === 3
        ? { ...item, homePoints: 49, awayPoints: 0 }
        : item
    );

    expect(colleyEngine.calculate(close, 2)).toEqual(
      colleyEngine.calculate(blowout, 2),
    );
    expect(cappedMarginMasseyEngine.calculate(close, 2)).not.toEqual(
      cappedMarginMasseyEngine.calculate(blowout, 2),
    );
  });

  it.each([
    resultNetworkFamilyEngine,
    recordValueFamilyEngine,
    cappedMarginPerformanceFamilyEngine,
  ])("$id starts from a shared prior before games are played", (engine) => {
    const rankings = engine.calculate(schedule, 0, {
      prior: {
        Alpha: 0.75,
        Bravo: 0.5,
        Charlie: 0.25,
      },
      priorWeight: 1,
    });

    expect(rankings.map(({ team }) => team)).toEqual([
      "Alpha",
      "Bravo",
      "Charlie",
    ]);
  });

  it.each(CANDIDATE_ENGINES)(
    "$id reproduces neutral output when prior weight is zero",
    (engine) => {
      expect(
        engine.calculate(schedule, 2, {
          prior: {
            Alpha: 0.25,
            Bravo: 0.75,
            Charlie: 0.5,
          },
          priorWeight: 0,
        }),
      ).toEqual(engine.calculate(schedule, 2));
    },
  );
});
