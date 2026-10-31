import type { Game } from ".";

export type TeamGame = {
  kind: "game";
  id: number;
  week: number;
  startDate: string | null;
  opponent: string;
  location: "Home" | "Away" | "Neutral";
  result: "W" | "L" | "T" | null;
  teamScore: number | null;
  opponentScore: number | null;
};

export type TeamIdleWeek = {
  kind: "idle";
  id: string;
  week: number;
};

export type TeamScheduleEntry = TeamGame | TeamIdleWeek;

export type StrongestWin = {
  opponent: string;
  gameWeek: number;
  atGameRank: number | null;
  currentRank: number;
};

export function createTeamSchedule(
  games: Game[],
  team: string,
): TeamScheduleEntry[] {
  const regularSeasonGames = games.filter(
    (game) => game.seasonType !== "postseason",
  );
  const teamGames = regularSeasonGames
    .filter(
      (game) => game.homeTeam === team || game.awayTeam === team,
    )
    .map((game): TeamGame => {
      const isHome = game.homeTeam === team;
      const teamScore = isHome ? game.homePoints : game.awayPoints;
      const opponentScore = isHome ? game.awayPoints : game.homePoints;
      const hasResult =
        game.completed && teamScore !== null && opponentScore !== null;

      return {
        kind: "game",
        id: game.id,
        week: game.week,
        startDate: game.startDate ?? null,
        opponent: isHome ? game.awayTeam : game.homeTeam,
        location: game.neutralSite ? "Neutral" : isHome ? "Home" : "Away",
        result: !hasResult
          ? null
          : teamScore > opponentScore
            ? "W"
            : teamScore < opponentScore
              ? "L"
              : "T",
        teamScore,
        opponentScore,
      };
    })
    .sort((a, b) => a.week - b.week || a.id - b.id);
  const weeks = regularSeasonGames.map(({ week }) => week);
  if (weeks.length === 0) return teamGames;
  const firstWeek = Math.min(...weeks);
  const lastWeek = Math.max(...weeks);
  const gamesByWeek = new Map<number, TeamGame[]>();
  for (const game of teamGames) {
    const weekGames = gamesByWeek.get(game.week) ?? [];
    weekGames.push(game);
    gamesByWeek.set(game.week, weekGames);
  }

  return Array.from(
    { length: lastWeek - firstWeek + 1 },
    (_, index) => firstWeek + index,
  ).flatMap((week): TeamScheduleEntry[] => {
    const weekGames = gamesByWeek.get(week);
    return weekGames ?? [
      {
        kind: "idle",
        id: `idle-${week}`,
        week,
      },
    ];
  });
}

export function selectStrongestWin(
  schedule: TeamScheduleEntry[],
  throughWeek: number,
  ranks: {
    preseasonAp: ReadonlyMap<string, number | null>;
    compositeByWeek: ReadonlyMap<
      number,
      ReadonlyMap<string, number>
    >;
    currentComposite: ReadonlyMap<string, number>;
  },
): StrongestWin | undefined {
  return schedule
    .flatMap((game): StrongestWin[] => {
      if (
        game.kind !== "game" ||
        game.result !== "W" ||
        game.week > throughWeek
      ) {
        return [];
      }
      const currentRank = ranks.currentComposite.get(game.opponent);
      if (currentRank === undefined) return [];
      const atGameRank =
        game.week === 1
          ? (ranks.preseasonAp.get(game.opponent) ?? null)
          : (ranks.compositeByWeek
              .get(game.week - 1)
              ?.get(game.opponent) ?? null);
      return [
        {
          opponent: game.opponent,
          gameWeek: game.week,
          atGameRank,
          currentRank,
        },
      ];
    })
    .toSorted(
      (left, right) =>
        (left.atGameRank ?? Number.POSITIVE_INFINITY) -
          (right.atGameRank ?? Number.POSITIVE_INFINITY) ||
        left.currentRank - right.currentRank ||
        left.gameWeek - right.gameWeek ||
        left.opponent.localeCompare(right.opponent),
    )[0];
}
