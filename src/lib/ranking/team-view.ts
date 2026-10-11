import type { Game } from ".";

export type TeamGame = {
  id: number;
  week: number;
  startDate: string | null;
  opponent: string;
  location: "Home" | "Away" | "Neutral";
  result: "W" | "L" | "T" | null;
  teamScore: number | null;
  opponentScore: number | null;
};

export function createTeamSchedule(games: Game[], team: string): TeamGame[] {
  return games
    .filter(
      (game) =>
        game.seasonType !== "postseason" &&
        (game.homeTeam === team || game.awayTeam === team),
    )
    .map((game): TeamGame => {
      const isHome = game.homeTeam === team;
      const teamScore = isHome ? game.homePoints : game.awayPoints;
      const opponentScore = isHome ? game.awayPoints : game.homePoints;
      const hasResult =
        game.completed && teamScore !== null && opponentScore !== null;

      return {
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
}
