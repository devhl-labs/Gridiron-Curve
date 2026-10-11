"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DEFAULT_MODEL_VERSION,
  type ModelVersion,
} from "@/lib/ranking";
import { ModelVersionSelect } from "./model-version-select";

type RankingSelection = {
  season: number;
  week: number;
};

type RankingHistoryControlsProps = {
  seasons: Array<{ season: number; throughWeek: number }>;
  selectedSeason: number;
  selectedWeek: number;
  modelVersion: ModelVersion;
  previous?: RankingSelection;
  next?: RankingSelection;
};

function rankingHref(
  { season, week }: RankingSelection,
  modelVersion: ModelVersion,
) {
  const model =
    modelVersion === DEFAULT_MODEL_VERSION ? "" : `&model=${modelVersion}`;
  return `/?season=${season}&week=${week}${model}`;
}

export function RankingHistoryControls({
  seasons,
  selectedSeason,
  selectedWeek,
  modelVersion,
  previous,
  next,
}: RankingHistoryControlsProps) {
  const router = useRouter();
  const selectedSeasonWeeks =
    seasons.find(({ season }) => season === selectedSeason)?.throughWeek ??
    selectedWeek;

  return (
    <nav className="history-controls" aria-label="Ranking history">
      {previous ? (
        <Link
          className="history-step"
          href={rankingHref(previous, modelVersion)}
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
            router.push(
              rankingHref(
                {
                  season: Number(event.target.value),
                  week:
                    seasons.find(
                      ({ season }) =>
                        season === Number(event.target.value),
                    )?.throughWeek ?? 1,
                },
                modelVersion,
              ),
            )
          }
        >
          {seasons.map(({ season }) => (
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
            router.push(
              rankingHref(
                {
                  season: selectedSeason,
                  week: Number(event.target.value),
                },
                modelVersion,
              ),
            )
          }
        >
          {Array.from(
            { length: selectedSeasonWeeks },
            (_, index) => index + 1,
          ).map((week) => (
            <option key={week} value={week}>
              {week}
            </option>
          ))}
        </select>
      </label>
      <ModelVersionSelect selectedVersion={modelVersion} />
      {next ? (
        <Link
          className="history-step"
          href={rankingHref(next, modelVersion)}
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
