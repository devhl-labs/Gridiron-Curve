import { describe, expect, it } from "vitest";
import type { TeamRanking } from "../../../types";
import { combineConsensusRankings } from "../1/engine";
import { CONSENSUS_V2_COMPONENT_SYSTEM_IDS } from "./engine";

function ranking(team: string, rank: number): TeamRanking {
  return {
    team,
    rank,
    rating: 50,
    record: "1-0",
    wins: 1,
    losses: 0,
    gamesPlayed: 1,
    strengthOfSchedule: 50,
    bestWin: null,
    networkRating: 50,
    networkPercentile: 50,
    networkScore: 50,
    achievementPoints: 0,
    achievementAverage: 0,
    achievementScore: 50,
    qualityOfWins: 0,
  };
}

describe("Consensus.2.0", () => {
  it("trims five components without a Pairwise Odds vote", () => {
    expect(CONSENSUS_V2_COMPONENT_SYSTEM_IDS).toEqual([
      "Curve.5.0",
      "RecordMatrix.1.0",
      "Sequence.1.0",
      "LeastSquares.1.0",
      "VictoryPaths.1.0",
    ]);

    const alphaRanks = [28, 11, 4, 13, 38];
    const bravoRanks = [12, 14, 16, 18, 20];
    const combined = combineConsensusRankings(
      CONSENSUS_V2_COMPONENT_SYSTEM_IDS.map(
        (rankingSystemId, index) => ({
          rankingSystemId,
          rankings: [
            ranking("Alpha", alphaRanks[index]),
            ranking("Bravo", bravoRanks[index]),
          ],
        }),
      ),
    );
    const alpha = combined.find(({ team }) => team === "Alpha")!;

    expect(alpha.consensusAverageRank).toBe(17.33);
    expect(
      alpha.consensusRanks?.filter(({ included }) => included).map(
        ({ rank }) => rank,
      ),
    ).toEqual([11, 13, 28]);
  });
});
