"use client";

import { usePathname, useSearchParams } from "next/navigation";
import {
  DEFAULT_RANKING_ENGINE_ID,
  RANKING_ENGINE_IDS,
  rankingEngineDisplayName,
  type RankingEngineId,
} from "@/lib/ranking";

type EngineSelectProps = {
  selectedEngineId: RankingEngineId;
};

export function EngineSelect({ selectedEngineId }: EngineSelectProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
    <label className="history-select">
      <span>Ranking</span>
      <select
        aria-label="Ranking engine"
        value={selectedEngineId}
        onChange={(event) =>
          selectEngine(event.target.value as RankingEngineId)
        }
      >
        {RANKING_ENGINE_IDS.map((engineId) => (
          <option key={engineId} value={engineId}>
            {rankingEngineDisplayName(engineId)}
          </option>
        ))}
      </select>
    </label>
  );
}
