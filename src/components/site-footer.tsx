import {
  DEFAULT_RANKING_SYSTEM_ID,
  rankingSystemDisplayName,
  type RankingSystemId,
} from "@/lib/ranking";

type SiteFooterProps = {
  rankingSystemId?: RankingSystemId;
};

export function SiteFooter({
  rankingSystemId = DEFAULT_RANKING_SYSTEM_ID,
}: SiteFooterProps) {
  return (
    <footer>
      <div className="brand">
        <span className="brand-mark">G</span>
        <span>GRIDIRON CURVE</span>
      </div>
      <p>Every result, graded in context.</p>
      <span>RANKING {rankingSystemDisplayName(rankingSystemId)}</span>
    </footer>
  );
}
