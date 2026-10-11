import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  CFBD_CACHE_FORMAT_VERSION,
  getCfbdCacheRoot,
  loadCfbdSourceCache,
  type CfbdCacheManifest,
} from "./cache";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true }),
    ),
  );
});

describe("loadCfbdSourceCache", () => {
  it("normalizes separate raw endpoint responses in memory", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "merit-cfbd-"));
    temporaryDirectories.push(root);
    const manifest: CfbdCacheManifest = {
      formatVersion: CFBD_CACHE_FORMAT_VERSION,
      season: 2026,
      throughWeek: 1,
      fetchedAt: "2026-10-10T20:00:00.000Z",
      syncId: "test-sync",
    };
    const syncDirectory = path.join(
      root,
      "2026",
      "syncs",
      manifest.syncId,
    );
    await mkdir(path.join(syncDirectory, "team-game-stats"), {
      recursive: true,
    });

    await Promise.all([
      writeFile(
        path.join(syncDirectory, "games.json"),
        JSON.stringify([
          {
            id: 1,
            week: 1,
            completed: true,
            neutralSite: false,
            homeTeam: "Example",
            homePoints: 28,
            awayTeam: "Opponent",
            awayPoints: 21,
            homeClassification: "fbs",
            awayClassification: "fbs",
          },
        ]),
      ),
      writeFile(path.join(syncDirectory, "polls.json"), "[]"),
      writeFile(
        path.join(syncDirectory, "teams.json"),
        JSON.stringify([
          {
            id: 1,
            school: "Example",
            mascot: "Examples",
            abbreviation: "EX",
            color: "#123456",
            alternateColor: "#ffffff",
            logos: ["https://cdn.collegefootballdata.com/logos/96/1.png"],
          },
        ]),
      ),
      writeFile(
        path.join(syncDirectory, "team-game-stats", "week-01.json"),
        JSON.stringify([
          {
            id: 1,
            teams: [
              {
                homeAway: "home",
                team: "Example",
                stats: [
                  { category: "totalYards", stat: "400" },
                  { category: "rushingAttempts", stat: "35" },
                  { category: "completionAttempts", stat: "20-30" },
                  { category: "turnovers", stat: "1" },
                ],
              },
              {
                homeAway: "away",
                team: "Opponent",
                stats: [
                  { category: "totalYards", stat: "350" },
                  { category: "rushingAttempts", stat: "34" },
                  { category: "completionAttempts", stat: "19-31" },
                  { category: "turnovers", stat: "2" },
                ],
              },
            ],
          },
        ]),
      ),
    ]);

    const source = loadCfbdSourceCache(root, manifest);

    expect(source.games[0].homeStats).toEqual({
      totalYards: 400,
      rushingAttempts: 35,
      passingAttempts: 30,
      turnovers: 1,
    });
    expect(source.teams[0].logos[0]).toContain("/logos/96/");
  });
});

describe("getCfbdCacheRoot", () => {
  it("isolates the current cache format in its own namespace", () => {
    expect(getCfbdCacheRoot("/workspace")).toBe(
      path.join("/workspace", ".cache", "cfbd", "v1"),
    );
  });
});
