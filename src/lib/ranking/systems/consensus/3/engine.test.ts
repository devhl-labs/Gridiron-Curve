import { describe, expect, it } from "vitest";
import type { TeamRanking } from "../../../types";
import {
  combineWeightedConsensusRankings,
  CONSENSUS_V3_COMPONENT_SYSTEM_IDS,
  CONSENSUS_V3_COMPONENT_WEIGHTS,
} from "./engine";

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

describe("Consensus.3.0", () => {
  it("weights the three evidence families 20/60/20", () => {
    expect(CONSENSUS_V3_COMPONENT_SYSTEM_IDS).toEqual([
      "Curve.5.0",
      "ScheduleRecord.1.0",
      "NeutralFamily.1.0",
    ]);
    expect(CONSENSUS_V3_COMPONENT_WEIGHTS).toEqual({
      "Curve.5.0": 0.2,
      "ScheduleRecord.1.0": 0.6,
      "NeutralFamily.1.0": 0.2,
    });

    const alphaRanks = [28, 30, 15];
    const bravoRanks = [20, 20, 20];
    const combined = combineWeightedConsensusRankings(
      CONSENSUS_V3_COMPONENT_SYSTEM_IDS.map(
        (rankingSystemId, index) => ({
          rankingSystemId,
          rankings: [
            ranking("Alpha", alphaRanks[index]),
            ranking("Bravo", bravoRanks[index]),
          ],
          weight: CONSENSUS_V3_COMPONENT_WEIGHTS[rankingSystemId],
        }),
      ),
    );
    const alpha = combined.find(({ team }) => team === "Alpha");

    expect(alpha?.consensusAverageRank).toBe(26.6);
    expect(alpha?.consensusRanks?.map(({ weight }) => weight)).toEqual([
      0.2,
      0.6,
      0.2,
    ]);
  });
});
