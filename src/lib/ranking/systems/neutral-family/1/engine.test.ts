import { describe, expect, it } from "vitest";
import type { TeamRanking } from "../../../types";
import {
  combineNeutralFamilyRankings,
  NEUTRAL_FAMILY_COMPONENT_SYSTEM_IDS,
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

describe("NeutralFamily.1.0", () => {
  it("turns four neutral algorithms into one equally weighted family rank", () => {
    const alphaRanks = [1, 3, 5, 7];
    const bravoRanks = [2, 4, 6, 8];
    const combined = combineNeutralFamilyRankings(
      NEUTRAL_FAMILY_COMPONENT_SYSTEM_IDS.map(
        (rankingSystemId, index) => ({
          rankingSystemId,
          rankings: [
            ranking("Alpha", alphaRanks[index]),
            ranking("Bravo", bravoRanks[index]),
          ],
        }),
      ),
    );

    expect(combined[0].team).toBe("Alpha");
    expect(combined[0].consensusAverageRank).toBe(4);
    expect(combined[0].consensusRanks).toEqual(
      NEUTRAL_FAMILY_COMPONENT_SYSTEM_IDS.map(
        (rankingSystemId, index) => ({
          rankingSystemId,
          rank: alphaRanks[index],
          included: true,
          weight: 0.25,
        }),
      ),
    );
  });
});
