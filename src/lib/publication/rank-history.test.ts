import { describe, expect, it } from "vitest";
import type { CfbdPollWeek } from "../cfbd/client";
import {
  summarizePollRankHistories,
  summarizeRankHistory,
} from "./rank-history";

describe("summarizeRankHistory", () => {
  it("uses the first release and ranked season extrema", () => {
    expect(summarizeRankHistory([22, 21, 14, 20])).toEqual({
      releaseCount: 4,
      openingRank: 22,
      seasonHighRank: 14,
      seasonLowRank: 22,
    });
  });

  it("treats any unranked release as the season low", () => {
    expect(summarizeRankHistory([null, 24, 18, null])).toEqual({
      releaseCount: 4,
      openingRank: null,
      seasonHighRank: 18,
      seasonLowRank: null,
    });
  });
});

describe("summarizePollRankHistories", () => {
  const pollWeeks: CfbdPollWeek[] = [
    {
      season: 2026,
      week: 8,
      polls: [
        {
          poll: "AP Top 25",
          ranks: [{ rank: 15, school: "Iowa" }],
        },
        {
          poll: "Coaches Poll",
          ranks: [{ rank: 14, school: "Iowa" }],
        },
      ],
    },
    {
      season: 2026,
      week: 1,
      polls: [
        {
          poll: "AP Top 25",
          ranks: [{ rank: 22, school: "Iowa" }],
        },
        {
          poll: "Coaches Poll",
          ranks: [{ rank: 22, school: "Iowa" }],
        },
      ],
    },
    {
      season: 2026,
      week: 5,
      polls: [
        {
          poll: "AP Top 25",
          ranks: [{ rank: 14, school: "Iowa" }],
        },
        {
          poll: "Coaches Poll",
          ranks: [],
        },
      ],
    },
    {
      season: 2026,
      week: 9,
      polls: [
        {
          poll: "AP Top 25",
          ranks: [{ rank: 10, school: "Iowa" }],
        },
      ],
    },
  ];

  it("includes releases through the selected results week without future data", () => {
    expect(summarizePollRankHistories(pollWeeks, 7, "Iowa")).toEqual([
      {
        source: "AP Poll",
        releaseCount: 3,
        openingRank: 22,
        seasonHighRank: 14,
        seasonLowRank: 22,
      },
      {
        source: "Coaches Poll",
        releaseCount: 3,
        openingRank: 22,
        seasonHighRank: 14,
        seasonLowRank: null,
      },
    ]);
  });
});
