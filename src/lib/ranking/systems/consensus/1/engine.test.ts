import { describe, expect, it } from "vitest";
import type { TeamRanking } from "../../../types";
import {
  combineConsensusRankings,
  CONSENSUS_COMPONENT_SYSTEM_IDS,
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

describe("combineConsensusRankings", () => {
  it("drops each team's best and worst ranks and averages the middle four", () => {
    const alphaRanks = [1, 2, 3, 4, 5, 20];
    const bravoRanks = [2, 3, 4, 5, 6, 7];
    const combined = combineConsensusRankings(
      CONSENSUS_COMPONENT_SYSTEM_IDS.map((rankingSystemId, index) => ({
        rankingSystemId,
        rankings: [
          ranking("Alpha", alphaRanks[index]),
          ranking("Bravo", bravoRanks[index]),
        ],
      })),
    );
    const alpha = combined.find(({ team }) => team === "Alpha")!;

    expect(combined.map(({ team }) => team)).toEqual(["Alpha", "Bravo"]);
    expect(alpha.consensusAverageRank).toBe(3.5);
    expect(
      alpha.consensusRanks?.filter(({ included }) => included).map(
        ({ rank }) => rank,
      ),
    ).toEqual([2, 3, 4, 5]);
    expect(
      alpha.consensusRanks?.filter(({ included }) => !included).map(
        ({ rank }) => rank,
      ),
    ).toEqual([1, 20]);
  });

  it("rejects components that rank different team fields", () => {
    expect(() =>
      combineConsensusRankings(
        CONSENSUS_COMPONENT_SYSTEM_IDS.map((rankingSystemId, index) => ({
          rankingSystemId,
          rankings:
            index === 0
              ? [ranking("Alpha", 1)]
              : [ranking("Bravo", 1)],
        })),
      ),
    ).toThrow(/same team field/);
  });
});
