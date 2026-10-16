"use client";

import Link from "next/link";
import {
  DEFAULT_RANKING_SYSTEM_ID,
  type RankingSystemId,
} from "@/lib/ranking";
import { RankingSystemSelect } from "./ranking-system-select";

type RankingSelection = {
  season: number;
  week: number;
};

type RankingHistoryControlsProps = {
  seasons: Array<{ season: number; throughWeek: number }>;
  selectedSeason: number;
  selectedWeek: number;
  rankingSystemId: RankingSystemId;
  previous?: RankingSelection;
  next?: RankingSelection;
};

function rankingHref(
  { season, week }: RankingSelection,
  rankingSystemId: RankingSystemId,
) {
  const ranking =
    rankingSystemId === DEFAULT_RANKING_SYSTEM_ID
      ? ""
      : `&ranking=${rankingSystemId}`;
  return `/?season=${season}&week=${week}${ranking}`;
}

export function RankingHistoryControls({
  seasons,
  selectedSeason,
  selectedWeek,
  rankingSystemId,
  previous,
  next,
}: RankingHistoryControlsProps) {
  const selectedSeasonWeeks =
    seasons.find(({ season }) => season === selectedSeason)?.throughWeek ??
    selectedWeek;

  return (
    <nav className="history-controls" aria-label="Ranking history">
      {previous ? (
        <Link
          className="history-step"
          href={rankingHref(previous, rankingSystemId)}
          aria-label={`Previous ranking: ${previous.season} Week ${previous.week}`}
        >
          ←
        </Link>
      ) : (
        <span className="history-step disabled" aria-hidden="true">
          ←
        </span>
      )}
      <label className="history-select">
        <span>Season</span>
        <select
          value={selectedSeason}
          onChange={(event) =>
            window.history.pushState(
              null,
              "",
              rankingHref(
                {
                  season: Number(event.target.value),
                  week:
                    seasons.find(
                      ({ season }) =>
                        season === Number(event.target.value),
                    )?.throughWeek ?? 1,
                },
                rankingSystemId,
              ),
            )
          }
        >
          {seasons.toReversed().map(({ season }) => (
            <option key={season} value={season}>
              {season}
            </option>
          ))}
        </select>
      </label>
      <label className="history-select">
        <span>Week</span>
        <select
          value={selectedWeek}
          onChange={(event) =>
            window.history.pushState(
              null,
              "",
              rankingHref(
                {
                  season: selectedSeason,
                  week: Number(event.target.value),
                },
                rankingSystemId,
              ),
            )
          }
        >
          {Array.from(
            { length: selectedSeasonWeeks },
            (_, index) => index + 1,
          ).toReversed().map((week) => (
            <option key={week} value={week}>
              {week}
            </option>
          ))}
        </select>
      </label>
      <RankingSystemSelect selectedSystemId={rankingSystemId} />
      {next ? (
        <Link
          className="history-step"
          href={rankingHref(next, rankingSystemId)}
          aria-label={`Next ranking: ${next.season} Week ${next.week}`}
        >
          →
        </Link>
      ) : (
        <span className="history-step disabled" aria-hidden="true">
          →
        </span>
      )}
    </nav>
  );
}
