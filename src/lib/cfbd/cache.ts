import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  normalizeGames,
  type CfbdGame,
  type CfbdGameTeamStats,
  type CfbdPollWeek,
  type CfbdTeam,
} from "./client";
import type { Game } from "../ranking";

export const CFBD_CACHE_FORMAT_VERSION = 1 as const;
export const CFBD_CACHE_NAMESPACE =
  `v${CFBD_CACHE_FORMAT_VERSION}` as const;

export type CfbdCacheManifest = {
  formatVersion: typeof CFBD_CACHE_FORMAT_VERSION;
  season: number;
  throughWeek: number;
  fetchedAt: string;
  syncId: string;
};

export function getCfbdCacheRoot(cwd = process.cwd()) {
  return path.join(cwd, ".cache", "cfbd", CFBD_CACHE_NAMESPACE);
}

export type CfbdSourceCache = {
  season: number;
  throughWeek: number;
  fetchedAt: string;
  games: Game[];
  pollWeeks: CfbdPollWeek[];
  teams: CfbdTeam[];
};

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function readJson(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function parseManifest(value: unknown, filePath: string): CfbdCacheManifest {
  if (typeof value !== "object" || value === null) {
    throw new Error(`CFBD cache manifest is not an object: ${filePath}`);
  }
  const manifest = value as Record<string, unknown>;
  if (
    manifest.formatVersion !== CFBD_CACHE_FORMAT_VERSION ||
    typeof manifest.season !== "number" ||
    typeof manifest.throughWeek !== "number" ||
    typeof manifest.fetchedAt !== "string" ||
    typeof manifest.syncId !== "string"
  ) {
    throw new Error(`CFBD cache manifest has an invalid shape: ${filePath}`);
  }
  return manifest as CfbdCacheManifest;
}

function parseArray<T>(
  value: unknown,
  filePath: string,
  description: string,
): T[] {
  if (!Array.isArray(value)) {
    throw new Error(`${description} is not an array: ${filePath}`);
  }
  return value as T[];
}

export function loadCfbdSourceCache(
  cacheRoot: string,
  manifest: CfbdCacheManifest,
): CfbdSourceCache {
  const syncDirectory = path.join(
    cacheRoot,
    String(manifest.season),
    "syncs",
    manifest.syncId,
  );
  const games = parseArray<CfbdGame>(
    readJson(path.join(syncDirectory, "games.json")),
    path.join(syncDirectory, "games.json"),
    "CFBD games response",
  );
  const pollWeeks = parseArray<CfbdPollWeek>(
    readJson(path.join(syncDirectory, "polls.json")),
    path.join(syncDirectory, "polls.json"),
    "CFBD polls response",
  );
  const teams = parseArray<CfbdTeam>(
    readJson(path.join(syncDirectory, "teams.json")),
    path.join(syncDirectory, "teams.json"),
    "CFBD teams response",
  );
  const teamStats = Array.from(
    { length: manifest.throughWeek },
    (_, index) => {
      const filePath = path.join(
        syncDirectory,
        "team-game-stats",
        `week-${String(index + 1).padStart(2, "0")}.json`,
      );
      return parseArray<CfbdGameTeamStats>(
        readJson(filePath),
        filePath,
        "CFBD team game stats response",
      );
    },
  ).flat();

  return {
    season: manifest.season,
    throughWeek: manifest.throughWeek,
    fetchedAt: manifest.fetchedAt,
    games: normalizeGames(games, teamStats),
    pollWeeks,
    teams,
  };
}

export function readLatestCfbdSourceCache(): CfbdSourceCache | null {
  const cacheRoot = getCfbdCacheRoot();
  const manifests = listCfbdCacheManifests(cacheRoot);
  if (manifests.length === 0) return null;
  return loadCfbdSourceCache(cacheRoot, manifests[0]);
}

export function listCfbdCacheManifests(
  cacheRoot = getCfbdCacheRoot(),
): CfbdCacheManifest[] {
  let seasonEntries;
  try {
    seasonEntries = readdirSync(/* turbopackIgnore: true */ cacheRoot, {
      withFileTypes: true,
    });
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") return [];
    throw error;
  }

  return seasonEntries
    .filter((entry) => entry.isDirectory() && /^\d{4}$/.test(entry.name))
    .map((entry) => Number(entry.name))
    .sort((a, b) => b - a)
    .flatMap((season) => {
      const manifestPath = path.join(
        cacheRoot,
        String(season),
        "latest.json",
      );
      try {
        return [parseManifest(readJson(manifestPath), manifestPath)];
      } catch (error) {
        if (isNodeError(error) && error.code === "ENOENT") return [];
        throw error;
      }
    });
}

export function readCfbdSourceCache(
  season: number,
): CfbdSourceCache | null {
  const cacheRoot = getCfbdCacheRoot();
  const manifest = listCfbdCacheManifests(cacheRoot).find(
    (candidate) => candidate.season === season,
  );
  return manifest ? loadCfbdSourceCache(cacheRoot, manifest) : null;
}
