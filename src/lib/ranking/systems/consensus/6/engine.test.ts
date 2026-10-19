import { describe, expect, it } from "vitest";
import type {
  Game,
  RankingSystemId,
  TeamRanking,
} from "../../../types";
import {
  CONSENSUS_V6_COMPONENT_SYSTEM_IDS,
  CONSENSUS_V6_COMPONENT_WEIGHTS,
  combineEvidenceCompositeRankings,
  lossPressureUnits,
  rankScaledLossPressure,
  resumeMaturity,
} from "./engine";

function rankings(
  order: string[],
  scores = order.map((_, index) => order.length - index),
): TeamRanking[] {
  return order.map((team, index) => ({
    team,
    rank: index + 1,
    rating: 100 - index,
    record: "0-0",
    wins: 0,
    losses: 0,
    gamesPlayed: 0,
    strengthOfSchedule: team === "Alpha" ? 0 : 100 - index,
    bestWin: null,
    networkRating: scores[index],
    networkPercentile: 100 - index,
    networkScore: 100 - index,
    achievementPoints: 0,
    achievementAverage: 0,
    achievementScore: 50,
    qualityOfWins: 0,
  }));
}

function component(
  rankingSystemId: RankingSystemId,
  order: string[],
  scores?: number[],
) {
  return {
    rankingSystemId,
    rankings: rankings(order, scores),
    weight:
      CONSENSUS_V6_COMPONENT_WEIGHTS[
        rankingSystemId as keyof typeof CONSENSUS_V6_COMPONENT_WEIGHTS
      ],
  };
}

function components(order: string[]) {
  return [
    component("ResultNetwork.1.0", order),
    component("RecordValue.2.0", order),
    component("CappedMarginPerformance.1.0", order),
  ];
}

function repeatedGames(opponent: string, count: number): Game[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    week: index + 1,
    completed: true,
    neutralSite: true,
    homeTeam: "Alpha",
    homePoints: 21,
    awayTeam: opponent,
    awayPoints: 14,
    homeClassification: "fbs",
    awayClassification: opponent === "FCS" ? "fcs" : "fbs",
  }));
}

describe("Consensus.6.0", () => {
  it("uses Result Network as evidence and weights the base 40/60", () => {
    expect(CONSENSUS_V6_COMPONENT_SYSTEM_IDS).toEqual([
      "ResultNetwork.1.0",
      "RecordValue.2.0",
      "CappedMarginPerformance.1.0",
    ]);
    expect(CONSENSUS_V6_COMPONENT_WEIGHTS).toEqual({
      "ResultNetwork.1.0": 0,
      "RecordValue.2.0": 0.4,
      "CappedMarginPerformance.1.0": 0.6,
    });
  });

  it("uses tie-safe Record Value and Performance positions", () => {
    const combined = combineEvidenceCompositeRankings(
      [
        component(
          "ResultNetwork.1.0",
          ["Alpha", "Bravo", "Charlie"],
          [1, 1, 0],
        ),
        component(
          "RecordValue.2.0",
          ["Bravo", "Alpha", "Charlie"],
          [1, 1, 0],
        ),
        component(
          "CappedMarginPerformance.1.0",
          ["Charlie", "Alpha", "Bravo"],
        ),
      ],
      [],
      0,
    );

    expect(combined.map(({ team }) => team)).toEqual([
      "Alpha",
      "Charlie",
      "Bravo",
    ]);
    expect(combined[0].consensusRanks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rankingSystemId: "ResultNetwork.1.0",
          weight: 0,
        }),
        expect.objectContaining({
          rankingSystemId: "RecordValue.2.0",
          weight: 0.4,
        }),
        expect.objectContaining({
          rankingSystemId: "CappedMarginPerformance.1.0",
          weight: 0.6,
        }),
      ]),
    );
  });

  it("ramps weak-résumé pressure through eight FBS games", () => {
    const order = [
      "Alpha",
      ...Array.from({ length: 29 }, (_, index) => `Team ${index + 2}`),
    ];
    const games = repeatedGames("Team 30", 8);
    const pressure = (throughWeek: number) =>
      combineEvidenceCompositeRankings(
        components(order),
        games,
        throughWeek,
      ).find(({ team }) => team === "Alpha")?.resumePressure;

    expect(pressure(2)).toBe(0);
    expect(pressure(5)).toBeGreaterThan(0);
    expect(pressure(8)).toBeGreaterThan(pressure(5) ?? Infinity);
    expect(resumeMaturity(5)).toBe(0.5);
    expect(resumeMaturity(8)).toBe(1);
  });

  it("does not count FCS games toward résumé maturity", () => {
    const order = [
      "Alpha",
      ...Array.from({ length: 29 }, (_, index) => `Team ${index + 2}`),
    ];
    const alpha = combineEvidenceCompositeRankings(
      components(order),
      repeatedGames("FCS", 8),
      8,
    ).find(({ team }) => team === "Alpha");

    expect(alpha?.resumeMaturity).toBe(0);
    expect(alpha?.resumePressure).toBe(0);
    expect(alpha?.lossPressure).toBe(0);
  });

  it("uses one, four, and two incremental units for later losses", () => {
    expect(
      [0, 1, 2, 3, 4].map((losses) => lossPressureUnits(losses)),
    ).toEqual([0, 1, 5, 7, 9]);
  });

  it("scales loss pressure smoothly by provisional rank and maturity", () => {
    expect(rankScaledLossPressure(2, 1, 100, 1)).toBe(5);
    expect(rankScaledLossPressure(2, 10, 100, 1)).toBeCloseTo(
      5 * ((100 - 10) / 99) ** 12,
    );
    expect(rankScaledLossPressure(2, 25, 100, 1)).toBeGreaterThan(0);
    expect(rankScaledLossPressure(2, 50, 100, 1)).toBeLessThan(0.01);
    expect(rankScaledLossPressure(2, 1, 100, 0.5)).toBe(2.5);
    expect(rankScaledLossPressure(2, 100, 100, 1)).toBe(0);
  });

  it("publishes loss pressure from the pre-pressure provisional rank", () => {
    const order = [
      "Alpha",
      ...Array.from({ length: 29 }, (_, index) => `Team ${index + 2}`),
    ];
    const inputs = components(order);
    inputs[0].rankings[0].losses = 2;
    const alpha = combineEvidenceCompositeRankings(
      inputs,
      repeatedGames("Team 30", 8),
      8,
    ).find(({ team }) => team === "Alpha");

    expect(alpha?.lossPressure).toBe(5);
  });
});
