import { describe, expect, it } from "vitest";
import type { RankingSystemId, TeamRanking } from "../../../types";
import {
  CONSENSUS_V4_COMPONENT_SYSTEM_IDS,
  CONSENSUS_V4_COMPONENT_WEIGHTS,
  combineEvidenceCompositeRankings,
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
    strengthOfSchedule: 50,
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
    weight: CONSENSUS_V4_COMPONENT_WEIGHTS[
      rankingSystemId as keyof typeof CONSENSUS_V4_COMPONENT_WEIGHTS
    ],
  };
}

function orderWithRanks(
  teams: string[],
  requestedRanks: Record<string, number>,
) {
  const ordered = Array<string>(teams.length);
  for (const [team, rank] of Object.entries(requestedRanks)) {
    ordered[rank - 1] = team;
  }
  const remaining = teams.filter(
    (team) => requestedRanks[team] === undefined,
  );
  let remainingIndex = 0;
  for (let index = 0; index < ordered.length; index += 1) {
    ordered[index] ??= remaining[remainingIndex++];
  }
  return ordered;
}

describe("Consensus.4.0", () => {
  it("uses the selected 25/25/50 family weights", () => {
    expect(CONSENSUS_V4_COMPONENT_SYSTEM_IDS).toEqual([
      "ResultNetwork.1.0",
      "RecordValue.1.0",
      "CappedMarginPerformance.1.0",
    ]);
    expect(CONSENSUS_V4_COMPONENT_WEIGHTS).toEqual({
      "ResultNetwork.1.0": 0.25,
      "RecordValue.1.0": 0.25,
      "CappedMarginPerformance.1.0": 0.5,
    });
  });

  it("uses tie-safe component ranks", () => {
    const combined = combineEvidenceCompositeRankings([
      component(
        "ResultNetwork.1.0",
        ["Alpha", "Bravo", "Charlie"],
        [1, 1, 0],
      ),
      component(
        "RecordValue.1.0",
        ["Bravo", "Alpha", "Charlie"],
        [1, 1, 0],
      ),
      component(
        "CappedMarginPerformance.1.0",
        ["Charlie", "Alpha", "Bravo"],
      ),
    ]);

    expect(combined.map(({ team }) => team)).toEqual([
      "Alpha",
      "Charlie",
      "Bravo",
    ]);
    expect(combined[0].consensusRanks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rankingSystemId: "CappedMarginPerformance.1.0",
          weight: 0.5,
        }),
      ]),
    );
  });

  it("reproduces the selected research block arithmetic", () => {
    const teams = [
      "James Madison",
      "Northwestern",
      ...Array.from({ length: 136 }, (_, index) => `Team ${index}`),
    ];
    const combined = combineEvidenceCompositeRankings([
      component(
        "ResultNetwork.1.0",
        orderWithRanks(teams, {
          "James Madison": 15,
          Northwestern: 33,
        }),
      ),
      component(
        "RecordValue.1.0",
        orderWithRanks(teams, {
          "James Madison": 29,
          Northwestern: 37,
        }),
      ),
      component(
        "CappedMarginPerformance.1.0",
        orderWithRanks(teams, {
          "James Madison": 29,
          Northwestern: 16,
        }),
      ),
    ]);

    expect(
      combined
        .filter(({ team }) =>
          ["James Madison", "Northwestern"].includes(team),
        )
        .map(({ team }) => team),
    ).toEqual(["Northwestern", "James Madison"]);
  });
});
