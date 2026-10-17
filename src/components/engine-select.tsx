"use client";

import { usePathname, useSearchParams } from "next/navigation";
import {
  DEFAULT_RANKING_ENGINE_ID,
  RANKING_ENGINE_SELECT_GROUPS,
  isSelectableRankingEngineId,
  rankingEngineDisplayName,
  rankingEngineSelectDescription,
  rankingEngineSelectDisplayName,
  type RankingEngineId,
} from "@/lib/ranking";

type EngineSelectProps = {
  selectedEngineId: RankingEngineId;
  showDescription?: boolean;
};

export function EngineSelect({
  selectedEngineId,
  showDescription = false,
}: EngineSelectProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const descriptionId = showDescription
    ? "ranking-engine-description"
    : undefined;

  function selectEngine(engineId: RankingEngineId) {
    const next = new URLSearchParams(searchParams);
    if (engineId === DEFAULT_RANKING_ENGINE_ID) {
      next.delete("engine");
    } else {
      next.set("engine", engineId);
    }
    const query = next.toString();
    window.history.pushState(
      null,
      "",
      query ? `${pathname}?${query}` : pathname,
    );
  }

  return (
    <>
      <label className="history-select">
      <span>Ranking Method</span>
      <select
        aria-label="Ranking method"
        aria-describedby={descriptionId}
        value={selectedEngineId}
        onChange={(event) =>
          selectEngine(event.target.value as RankingEngineId)
        }
      >
        {!isSelectableRankingEngineId(selectedEngineId) && (
          <option hidden value={selectedEngineId}>
            {rankingEngineDisplayName(selectedEngineId)}
          </option>
        )}
        {RANKING_ENGINE_SELECT_GROUPS.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.rankingEngineIds.map((engineId) => (
              <option key={engineId} value={engineId}>
                {rankingEngineSelectDisplayName(engineId)}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
      {showDescription && (
        <p
          className="ranking-method-description"
          id={descriptionId}
        >
          {rankingEngineSelectDescription(selectedEngineId)}
        </p>
      )}
    </>
  );
}
