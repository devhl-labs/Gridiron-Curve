import type { Game, TeamBoxScore } from "../ranking";

const CFBD_BASE_URL = "https://api.collegefootballdata.com";

export type CfbdGame = {
  id: number;
  week: number;
  startDate: string | null;
  seasonType: string;
  completed: boolean;
  neutralSite: boolean;
  homeTeam: string;
  homePoints: number | null;
  awayTeam: string;
  awayPoints: number | null;
  homeClassification: string | null;
  awayClassification: string | null;
};

export type CfbdGameTeamStats = {
  id: number;
  teams: Array<{
    homeAway: "home" | "away";
    team: string;
    stats: Array<{ category: string; stat: string }>;
  }>;
};

export type CfbdTeam = {
  id: number;
  school: string;
  mascot: string | null;
  abbreviation: string | null;
  color: string | null;
  alternateColor: string | null;
  logos: string[];
};

type GameBoxScore = {
  gameId: number;
  home: TeamBoxScore | null;
  away: TeamBoxScore | null;
};

export type CfbdPollWeek = {
  season: number;
  week: number;
  polls: Array<{
    poll: string;
    ranks: Array<{ rank: number; school: string }>;
  }>;
};

async function cfbdFetch<T>(path: string): Promise<T> {
  const token = process.env.CFBD_API_KEY;
  if (!token) {
    throw new Error("CFBD_API_KEY is required to retrieve college football data.");
  }

  const response = await fetch(`${CFBD_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const details = (await response.text()).trim();
    throw new Error(
      `CollegeFootballData request failed (${response.status} ${response.statusText}) for ${path}${details ? `: ${details}` : "."}`,
    );
  }
  return (await response.json()) as T;
}

export function fetchSeasonGames(year: number) {
  return cfbdFetch<CfbdGame[]>(
    `/games?year=${year}&seasonType=regular&classification=fbs`,
  );
}

export function normalizeGames(
  games: CfbdGame[],
  teamStats: CfbdGameTeamStats[],
): Game[] {
  const boxScoresByGame = new Map(
    teamStats.map((game) => {
      const boxScore: GameBoxScore = {
        gameId: game.id,
        home: parseTeamBoxScore(
          game.teams.find(({ homeAway }) => homeAway === "home"),
        ),
        away: parseTeamBoxScore(
          game.teams.find(({ homeAway }) => homeAway === "away"),
        ),
      };
      return [game.id, boxScore];
    }),
  );

  return games.map((game) => {
    const boxScore = boxScoresByGame.get(game.id);
    return {
    id: game.id,
    week: game.week,
      startDate: game.startDate,
      seasonType: game.seasonType,
    completed: game.completed,
    neutralSite: game.neutralSite,
    homeTeam: game.homeTeam,
    homePoints: game.homePoints,
    awayTeam: game.awayTeam,
    awayPoints: game.awayPoints,
    homeClassification: game.homeClassification,
    awayClassification: game.awayClassification,
      homeStats: boxScore?.home ?? null,
      awayStats: boxScore?.away ?? null,
    };
  });
}

export function fetchSeasonPolls(year: number) {
  return cfbdFetch<CfbdPollWeek[]>(
    `/rankings?year=${year}&seasonType=regular`,
  );
}

export function fetchTeams(year: number) {
  return cfbdFetch<CfbdTeam[]>(`/teams?year=${year}`);
}

function parseStat(
  stats: CfbdGameTeamStats["teams"][number]["stats"],
  category: string,
) {
  const rawValue = stats.find((stat) => stat.category === category)?.stat;
  if (rawValue === undefined) return null;
  const value = Number(rawValue);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid ${category} value from CollegeFootballData: ${rawValue}`);
  }
  return value;
}

function parseTeamBoxScore(
  team: CfbdGameTeamStats["teams"][number] | undefined,
): TeamBoxScore | null {
  if (!team) return null;
  const totalYards = parseStat(team.stats, "totalYards");
  const rushingAttempts = parseStat(team.stats, "rushingAttempts");
  const turnovers = parseStat(team.stats, "turnovers");
  const completionAttempts = team.stats.find(
    ({ category }) => category === "completionAttempts",
  )?.stat;
  const passingAttempts = completionAttempts
    ? Number(completionAttempts.split("-").at(-1))
    : null;

  if (
    totalYards === null ||
    rushingAttempts === null ||
    turnovers === null ||
    passingAttempts === null
  ) {
    return null;
  }
  if (!Number.isFinite(passingAttempts) || passingAttempts < 0) {
    throw new Error(
      `Invalid completionAttempts value from CollegeFootballData: ${completionAttempts}`,
    );
  }

  return { totalYards, rushingAttempts, passingAttempts, turnovers };
}

export function fetchTeamStatsWeek(
  year: number,
  week: number,
) {
  return cfbdFetch<CfbdGameTeamStats[]>(
    `/games/teams?year=${year}&week=${week}&seasonType=regular&classification=fbs`,
  );
}
