import type { CfbdPollWeek } from "../cfbd/client";
import type {
  PublishedPollRankHistory,
  PublishedRankHistory,
} from "./types";

const PUBLISHED_POLLS = [
  { source: "AP Poll", providerName: "AP Top 25" },
  { source: "Coaches Poll", providerName: "Coaches Poll" },
] as const;

export function summarizeRankHistory(
  ranks: Array<number | null>,
): PublishedRankHistory {
  const ranked = ranks.filter((rank): rank is number => rank !== null);
  return {
    releaseCount: ranks.length,
    openingRank: ranks[0] ?? null,
    seasonHighRank: ranked.length > 0 ? Math.min(...ranked) : null,
    seasonLowRank:
      ranks.length > 0 && ranked.length === ranks.length
        ? Math.max(...ranked)
        : null,
  };
}

export function summarizePollRankHistories(
  pollWeeks: CfbdPollWeek[],
  resultsThroughWeek: number,
  team: string,
): PublishedPollRankHistory[] {
  const eligiblePollWeeks = pollWeeks
    .filter(({ week }) => week <= resultsThroughWeek + 1)
    .toSorted((left, right) => left.week - right.week);

  return PUBLISHED_POLLS.map(({ source, providerName }) => {
    const ranks = eligiblePollWeeks.flatMap(({ polls }) => {
      const poll = polls.find(({ poll: name }) => name === providerName);
      if (!poll) return [];
      return [poll.ranks.find(({ school }) => school === team)?.rank ?? null];
    });
    return {
      source,
      ...summarizeRankHistory(ranks),
    };
  });
}
