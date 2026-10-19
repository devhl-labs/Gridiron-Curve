import { describe, expect, it } from "vitest";
import type {
  Game,
  RankingSystemId,
  TeamRanking,
} from "../../../types";
import {
  CONSENSUS_V7_ADJUDICATION_MAX_GAP,
  CONSENSUS_V7_COMPONENT_SYSTEM_IDS,
  CONSENSUS_V7_COMPONENT_WEIGHTS,
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
      CONSENSUS_V7_COMPONENT_WEIGHTS[
        rankingSystemId as keyof typeof CONSENSUS_V7_COMPONENT_WEIGHTS
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

function completedGame(
  id: number,
  winner: string,
  loser: string,
  tied = false,
): Game {
  return {
    id,
    week: 1,
    completed: true,
    neutralSite: true,
    homeTeam: winner,
    homePoints: tied ? 21 : 28,
    awayTeam: loser,
    awayPoints: 21,
    homeClassification: "fbs",
    awayClassification: "fbs",
  };
}

function setRecord(
  inputs: ReturnType<typeof components>,
  team: string,
  wins: number,
  losses: number,
) {
  for (const input of inputs) {
    const ranking = input.rankings.find((row) => row.team === team)!;
    ranking.wins = wins;
    ranking.losses = losses;
    ranking.gamesPlayed = wins + losses;
    ranking.record = `${wins}-${losses}`;
  }
}

describe("Consensus.7.0", () => {
  it("uses Result Network as evidence and weights the base 40/60", () => {
    expect(CONSENSUS_V7_COMPONENT_SYSTEM_IDS).toEqual([
      "ResultNetwork.1.0",
      "RecordValue.2.0",
      "CappedMarginPerformance.1.0",
    ]);
    expect(CONSENSUS_V7_COMPONENT_WEIGHTS).toEqual({
      "ResultNetwork.1.0": 0,
      "RecordValue.2.0": 0.4,
      "CappedMarginPerformance.1.0": 0.6,
    });
  });

  it("uses tie-safe Record Value and Performance positions", () => {
    const inputs = [
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
    ];
    setRecord(inputs, "Bravo", 1, 0);
    setRecord(inputs, "Charlie", 0, 1);
    const combined = combineEvidenceCompositeRankings(
      inputs,
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

  it("adjudicates an exact 1.0-position gap by strongest defeated opponent", () => {
    const inputs = [
      component("ResultNetwork.1.0", ["Alpha", "Bravo", "Charlie", "Delta"]),
      component("RecordValue.2.0", ["Alpha", "Bravo", "Charlie", "Delta"]),
      component(
        "CappedMarginPerformance.1.0",
        ["Alpha", "Bravo", "Charlie", "Delta"],
      ),
    ];
    setRecord(inputs, "Charlie", 1, 0);
    setRecord(inputs, "Delta", 0, 1);
    const combined = combineEvidenceCompositeRankings(
      inputs,
      [
        completedGame(1, "Alpha", "Delta"),
        completedGame(2, "Bravo", "Charlie"),
      ],
      1,
    );

    expect(CONSENSUS_V7_ADJUDICATION_MAX_GAP).toBe(1);
    expect(combined.slice(0, 2).map(({ team }) => team)).toEqual([
      "Bravo",
      "Alpha",
    ]);
    expect(combined[0].consensusPreliminaryRank).toBe(2);
    expect(combined[0].consensusAdjudication).toMatchObject({
      maximumAdjacentGap: 1,
      decidingCriteria: ["strongest-defeated-opponent"],
      members: [
        {
          team: "Bravo",
          preliminaryRank: 2,
          finalRank: 1,
          strongestDefeatedOpponentRank: 3,
        },
        {
          team: "Alpha",
          preliminaryRank: 1,
          finalRank: 2,
          strongestDefeatedOpponentRank: 4,
        },
      ],
    });
  });

  it("gives head-to-head precedence over résumé fallback criteria", () => {
    const inputs = components(["Alpha", "Bravo", "Charlie", "Delta"]);
    setRecord(inputs, "Charlie", 1, 0);
    setRecord(inputs, "Delta", 0, 1);
    const combined = combineEvidenceCompositeRankings(
      inputs,
      [
        completedGame(1, "Bravo", "Alpha"),
        completedGame(2, "Alpha", "Charlie"),
      ],
      1,
    );

    expect(combined.slice(0, 2).map(({ team }) => team)).toEqual([
      "Bravo",
      "Alpha",
    ]);
    expect(combined[0].consensusAdjudication).toMatchObject({
      headToHeadResults: [{ winner: "Bravo", loser: "Alpha" }],
      decidingCriteria: ["head-to-head"],
    });
  });

  it("uses schedule strength after equal strongest wins", () => {
    const inputs = components(["Alpha", "Bravo", "Charlie", "Delta"]);
    setRecord(inputs, "Charlie", 1, 0);
    setRecord(inputs, "Delta", 0, 1);
    const combined = combineEvidenceCompositeRankings(
      inputs,
      [
        completedGame(1, "Alpha", "Charlie"),
        completedGame(2, "Bravo", "Charlie"),
        completedGame(3, "Alpha", "Bravo", true),
      ],
      1,
    );

    expect(combined.slice(0, 2).map(({ team }) => team)).toEqual([
      "Bravo",
      "Alpha",
    ]);
    expect(combined[0].consensusAdjudication?.decidingCriteria).toEqual([
      "strength-of-schedule",
    ]);
  });

  it("does not adjudicate different records or wider gaps", () => {
    const differentRecord = components([
      "Alpha",
      "Bravo",
      "Charlie",
      "Delta",
    ]);
    setRecord(differentRecord, "Bravo", 0, 1);
    const recordResult = combineEvidenceCompositeRankings(
      differentRecord,
      [
        completedGame(1, "Alpha", "Delta"),
        completedGame(2, "Bravo", "Charlie"),
      ],
      1,
    );
    const widerGap = combineEvidenceCompositeRankings(
      [
        component("ResultNetwork.1.0", [
          "Alpha",
          "Bravo",
          "Charlie",
          "Delta",
        ]),
        component("RecordValue.2.0", [
          "Alpha",
          "Charlie",
          "Bravo",
          "Delta",
        ]),
        component("CappedMarginPerformance.1.0", [
          "Alpha",
          "Bravo",
          "Charlie",
          "Delta",
        ]),
      ],
      [
        completedGame(1, "Alpha", "Delta"),
        completedGame(2, "Bravo", "Charlie"),
      ],
      1,
    );

    expect(recordResult.slice(0, 2).map(({ team }) => team)).toEqual([
      "Alpha",
      "Bravo",
    ]);
    expect(recordResult[0].consensusAdjudication).toBeUndefined();
    expect(widerGap.slice(0, 2).map(({ team }) => team)).toEqual([
      "Alpha",
      "Bravo",
    ]);
    expect(widerGap[0].consensusAdjudication).toBeUndefined();
  });

  it("orders complete three-team groups and breaks head-to-head cycles deterministically", () => {
    const result = combineEvidenceCompositeRankings(
      [
        component("ResultNetwork.1.0", [
          "Alpha",
          "Bravo",
          "Charlie",
          "Delta",
        ]),
        component("RecordValue.2.0", [
          "Charlie",
          "Bravo",
          "Alpha",
          "Delta",
        ]),
        component("CappedMarginPerformance.1.0", [
          "Alpha",
          "Bravo",
          "Charlie",
          "Delta",
        ]),
      ],
      [
        completedGame(1, "Alpha", "Bravo"),
        completedGame(2, "Bravo", "Charlie"),
        completedGame(3, "Charlie", "Alpha"),
      ],
      1,
    );

    expect(result.slice(0, 3).map(({ team }) => team)).toEqual([
      "Charlie",
      "Alpha",
      "Bravo",
    ]);
    expect(result[0].consensusAdjudication?.members).toHaveLength(3);
    expect(
      result[0].consensusAdjudication?.headToHeadResults,
    ).toHaveLength(3);
    expect(result[0].consensusAdjudication?.decidingCriteria).toEqual([
      "head-to-head",
    ]);
  });
});
