import {
  fetchSeasonGames,
  fetchSeasonPolls,
  fetchTeams,
  fetchTeamStatsWeek,
} from "../../src/lib/cfbd/client";
import { latestCompletedWeek } from "../../src/lib/cfbd/completed-week";
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
  const requestedWeek = process.argv[3]
    ? parsePositiveInteger(process.argv[3], "week")
    : null;
  const games = await fetchSeasonGames(year);
  const detectedWeek = latestCompletedWeek(games);
  if (requestedWeek === null && detectedWeek === null) {
    throw new Error(`CollegeFootballData returned no completed games for ${year}.`);
  }
  const throughWeek = requestedWeek ?? detectedWeek!;

  const [pollWeeks, teams, teamStatsByWeek] = await Promise.all([
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
    `Cached raw CFBD responses for ${year} through Week ${throughWeek}${requestedWeek ? "" : " (latest completed)"} in ${syncDirectory}.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
