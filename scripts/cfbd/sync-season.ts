import {
  fetchSeasonGames,
  fetchSeasonPolls,
  fetchTeams,
  fetchTeamStatsWeek,
} from "../../src/lib/cfbd/client";
import { writeSeasonCache } from "./write-season-cache";

function parsePositiveInteger(value: string | undefined, name: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
}

async function main() {
  const year = parsePositiveInteger(process.argv[2], "year");
  const throughWeek = parsePositiveInteger(process.argv[3], "week");

  const [games, pollWeeks, teams, teamStatsByWeek] = await Promise.all([
    fetchSeasonGames(year),
    fetchSeasonPolls(year),
    fetchTeams(year),
    Promise.all(
      Array.from({ length: throughWeek }, (_, index) =>
        fetchTeamStatsWeek(year, index + 1),
      ),
    ),
  ]);

  const { syncDirectory } = await writeSeasonCache({
    year,
    throughWeek,
    games,
    pollWeeks,
    teams,
    teamStatsByWeek,
  });

  console.log(
    `Cached raw CFBD responses for ${year} through Week ${throughWeek} in ${syncDirectory}.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
