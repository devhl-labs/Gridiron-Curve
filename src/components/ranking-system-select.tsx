"use client";

import { usePathname, useSearchParams } from "next/navigation";
import {
  DEFAULT_RANKING_SYSTEM_ID,
  RANKING_SYSTEM_IDS,
  compareRankingSystems,
  rankingSystemDisplayName,
  type RankingSystemId,
} from "@/lib/ranking";

type RankingSystemSelectProps = {
  selectedSystemId: RankingSystemId;
};

export function RankingSystemSelect({
  selectedSystemId,
}: RankingSystemSelectProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function selectSystem(rankingSystemId: RankingSystemId) {
    const next = new URLSearchParams(searchParams);
    if (rankingSystemId === DEFAULT_RANKING_SYSTEM_ID) {
      next.delete("ranking");
    } else {
      next.set("ranking", rankingSystemId);
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
        aria-label="Ranking system and version"
        value={selectedSystemId}
        onChange={(event) =>
          selectSystem(event.target.value as RankingSystemId)
        }
      >
        <optgroup label="Resume rankings">
          {RANKING_SYSTEM_IDS.toSorted((left, right) =>
            compareRankingSystems(right, left),
          ).map((rankingSystemId) => (
            <option key={rankingSystemId} value={rankingSystemId}>
              {rankingSystemDisplayName(rankingSystemId)}
            </option>
          ))}
        </optgroup>
      </select>
    </label>
  );
}
