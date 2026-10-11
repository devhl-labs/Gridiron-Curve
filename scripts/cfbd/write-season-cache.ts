import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  CfbdGame,
  CfbdGameTeamStats,
  CfbdPollWeek,
  CfbdTeam,
} from "../../src/lib/cfbd/client";
import {
  CFBD_CACHE_FORMAT_VERSION,
  getCfbdCacheRoot,
  type CfbdCacheManifest,
} from "../../src/lib/cfbd/cache";

type SeasonCacheInput = {
  year: number;
  throughWeek: number;
  games: CfbdGame[];
  pollWeeks: CfbdPollWeek[];
  teams: CfbdTeam[];
  teamStatsByWeek: CfbdGameTeamStats[][];
};

export async function writeSeasonCache({
  year,
  throughWeek,
  games,
  pollWeeks,
  teams,
  teamStatsByWeek,
}: SeasonCacheInput) {
  if (teamStatsByWeek.length !== throughWeek) {
    throw new Error(
      `Expected ${throughWeek} weekly stat responses for ${year}, received ${teamStatsByWeek.length}.`,
    );
  }

  const fetchedAt = new Date().toISOString();
  const syncId = fetchedAt.replaceAll(":", "-").replace(".", "-");
  const manifest: CfbdCacheManifest = {
    formatVersion: CFBD_CACHE_FORMAT_VERSION,
    season: year,
    throughWeek,
    fetchedAt,
    syncId,
  };
  const syncDirectory = path.join(
    getCfbdCacheRoot(),
    String(year),
    "syncs",
    syncId,
  );
  const teamStatsDirectory = path.join(
    syncDirectory,
    "team-game-stats",
  );
  await mkdir(teamStatsDirectory, { recursive: true });
  await Promise.all([
    writeFile(
      path.join(syncDirectory, "games.json"),
      `${JSON.stringify(games, null, 2)}\n`,
      "utf8",
    ),
    writeFile(
      path.join(syncDirectory, "polls.json"),
      `${JSON.stringify(pollWeeks, null, 2)}\n`,
      "utf8",
    ),
    writeFile(
      path.join(syncDirectory, "teams.json"),
      `${JSON.stringify(teams, null, 2)}\n`,
      "utf8",
    ),
    ...teamStatsByWeek.map((teamStats, index) =>
      writeFile(
        path.join(
          teamStatsDirectory,
          `week-${String(index + 1).padStart(2, "0")}.json`,
        ),
        `${JSON.stringify(teamStats, null, 2)}\n`,
        "utf8",
      ),
    ),
  ]);

  const seasonDirectory = path.dirname(path.dirname(syncDirectory));
  const outputPath = path.join(seasonDirectory, "latest.json");
  const temporaryPath = path.join(
    seasonDirectory,
    `.${path.basename(outputPath)}.${process.pid}.tmp`,
  );
  try {
    await writeFile(
      temporaryPath,
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8",
    );
    await rename(temporaryPath, outputPath);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }

  return {
    manifest,
    syncDirectory: path.relative(process.cwd(), syncDirectory),
  };
}
