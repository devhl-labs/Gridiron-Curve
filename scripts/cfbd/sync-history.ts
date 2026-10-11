import {
  fetchSeasonGames,
  fetchSeasonPolls,
  fetchTeams,
} from "../../src/lib/cfbd/client";
import { writeSeasonCache } from "./write-season-cache";

function parseYear(value: string | undefined, fallback: number, name: string) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1869) {
    throw new Error(`${name} must be a valid college-football season.`);
  }
  return parsed;
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchHistoricalSeason(year: number) {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const [games, pollWeeks, teams] = await Promise.all([
        fetchSeasonGames(year),
        fetchSeasonPolls(year),
        fetchTeams(year),
      ]);
      return { games, pollWeeks, teams };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("429") || attempt === 5) throw error;
      const delay = attempt * 5_000;
      console.warn(
        `CFBD rate-limited ${year}; retrying in ${delay / 1_000} seconds.`,
      );
      await wait(delay);
    }
  }
  throw new Error(`Unable to retrieve historical season ${year}.`);
}

async function main() {
  const startYear = parseYear(process.argv[2], 2000, "start year");
  const endYear = parseYear(
    process.argv[3],
    new Date().getFullYear() - 1,
    "end year",
  );
  if (endYear < startYear) {
    throw new Error("end year must be greater than or equal to start year.");
  }

  for (let year = startYear; year <= endYear; year += 1) {
    const { games, pollWeeks, teams } = await fetchHistoricalSeason(year);
    if (games.length === 0) {
      throw new Error(`CollegeFootballData returned no FBS games for ${year}.`);
    }
    const throughWeek = Math.max(...games.map(({ week }) => week));
    const teamStatsByWeek = Array.from(
      { length: throughWeek },
      () => [],
    );
    const { syncDirectory } = await writeSeasonCache({
      year,
      throughWeek,
      games,
      pollWeeks,
      teams,
      teamStatsByWeek,
    });
    console.log(
      `Cached ${year} through Week ${throughWeek} (${games.length} games) in ${syncDirectory}.`,
    );
    if (year < endYear) await wait(1_000);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
