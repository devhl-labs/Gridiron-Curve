import type { CfbdSourceCache } from "../cfbd/cache";
import type { RankingSystemId } from "../ranking";
import type { RankingView as SourceRankingView } from "../ranking/view";

export const PUBLICATION_FORMAT_VERSION = 6 as const;
export const PUBLICATION_BASE_PATH = `${
  process.env.NEXT_PUBLIC_BASE_PATH ?? ""
}/generated/v${PUBLICATION_FORMAT_VERSION}`;

export type PublishedSeason = Pick<
  CfbdSourceCache,
  "season" | "throughWeek" | "games" | "teams"
>;

export type PublishedRankHistory = {
  releaseCount: number;
  openingRank: number | null;
  seasonHighRank: number | null;
  seasonLowRank: number | null;
};

export type PublishedPollRankHistory = PublishedRankHistory & {
  source: "AP Poll" | "Coaches Poll";
};

export type PublishedTeamRanking = Pick<
  SourceRankingView["rankings"][number],
  | "team"
  | "rank"
  | "rating"
  | "record"
  | "networkScore"
  | "achievementScore"
  | "qualityOfWins"
  | "logo"
  | "color"
  | "movement"
  | "lastResult"
  | "scheduleRank"
  | "upcomingScheduleRank"
  | "consensusAverageRank"
  | "consensusRanks"
  | "resumePressure"
  | "lossPressure"
  | "resumeMaturity"
  | "resumeScheduleRank"
  | "resumeBestTwoWinAverageRank"
  | "blendScore"
  | "blendComponents"
  | "blendHeadToHeadRecord"
> & {
  rankHistory?: PublishedRankHistory;
  pollRankHistories?: PublishedPollRankHistory[];
};

export type RankingView = Omit<SourceRankingView, "rankings"> & {
  rankings: PublishedTeamRanking[];
};

export type PublicationManifest = {
  formatVersion: typeof PUBLICATION_FORMAT_VERSION;
  generatedAt: string;
  defaultRankingSystemId: RankingSystemId;
  rankingSystemIds: RankingSystemId[];
  seasons: Array<{ season: number; throughWeek: number }>;
  latest: { season: number; week: number };
  shareImages: Array<{
    season: number;
    week: number;
    rankingSystemId: RankingSystemId;
    path: string;
  }>;
};

export function rankingDataPath(
  season: number,
  week: number,
  rankingSystemId: RankingSystemId,
) {
  return `${PUBLICATION_BASE_PATH}/rankings/${season}/week-${String(week).padStart(2, "0")}/${rankingSystemId}.json`;
}

export function seasonDataPath(season: number) {
  return `${PUBLICATION_BASE_PATH}/seasons/${season}.json`;
}

export function shareImagePath(
  season: number,
  week: number,
  rankingSystemId: RankingSystemId,
) {
  return `${PUBLICATION_BASE_PATH}/images/${season}/week-${String(week).padStart(2, "0")}/${rankingSystemId}.jpg`;
}
