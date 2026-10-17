"use client";

import { usePathname, useSearchParams } from "next/navigation";
import {
  DEFAULT_RANKING_SYSTEM_ID,
  RANKING_SYSTEM_SELECT_GROUPS,
  isSelectableRankingSystemId,
  rankingSystemDisplayName,
  rankingSystemSelectDescription,
  rankingSystemSelectDisplayName,
  type RankingSystemId,
} from "@/lib/ranking";

type RankingSystemSelectProps = {
  selectedSystemId: RankingSystemId;
  descriptionId?: string;
  showDescription?: boolean;
};

export function RankingSystemSelect({
  selectedSystemId,
  descriptionId,
  showDescription = false,
}: RankingSystemSelectProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const resolvedDescriptionId =
    descriptionId ??
    (showDescription ? "ranking-method-description" : undefined);

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
    <>
      <label className="history-select">
      <span>Ranking Method</span>
      <select
        aria-label="Ranking method"
        aria-describedby={resolvedDescriptionId}
        value={selectedSystemId}
        onChange={(event) =>
          selectSystem(event.target.value as RankingSystemId)
        }
      >
        {!isSelectableRankingSystemId(selectedSystemId) && (
          <option hidden value={selectedSystemId}>
            {rankingSystemDisplayName(selectedSystemId)}
          </option>
        )}
        {RANKING_SYSTEM_SELECT_GROUPS.map((group) => (
          <optgroup
            key={group.label}
            label={group.label}
          >
            {group.rankingSystemIds.map((rankingSystemId) => (
                <option key={rankingSystemId} value={rankingSystemId}>
                  {rankingSystemSelectDisplayName(rankingSystemId)}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
    </label>
      {showDescription && (
        <p
          className="ranking-method-description"
          id={resolvedDescriptionId}
        >
          {rankingSystemSelectDescription(selectedSystemId)}
        </p>
      )}
    </>
  );
}
