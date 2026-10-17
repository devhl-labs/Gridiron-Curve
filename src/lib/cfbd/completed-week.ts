import type { Game } from "../ranking";

export function latestCompletedWeek(games: Game[]) {
  const gamesByWeek = new Map<number, Game[]>();
  for (const game of games) {
    const weekGames = gamesByWeek.get(game.week) ?? [];
    weekGames.push(game);
    gamesByWeek.set(game.week, weekGames);
  }

  const completedWeeks = [...gamesByWeek]
    .filter(([, weekGames]) => weekGames.every(({ completed }) => completed))
    .map(([week]) => week);
  return completedWeeks.length > 0 ? Math.max(...completedWeeks) : null;
}
