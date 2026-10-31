type SiteFooterProps = {
  dataSyncedAt?: string | null;
};

function formatEasternTimestamp(value: string) {
  const timestamp = new Date(value);
  const date = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(timestamp);
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  }).format(timestamp);
  return `${date} at ${time}`;
}

export function SiteFooter({
  dataSyncedAt,
}: SiteFooterProps) {
  return (
    <footer>
      <div className="brand">
        <span className="brand-mark">G</span>
        <span>GRIDIRON CURVE</span>
      </div>
      <div className="footer-center">
        <p className={dataSyncedAt ? "footer-data-sync" : "footer-tagline"}>
          {dataSyncedAt
            ? `Data synced ${formatEasternTimestamp(dataSyncedAt)}`
            : "Every result, graded in context."}
        </p>
      </div>
      <a
        className="footer-attribution"
        href="https://collegefootballdata.com/"
      >
        Data provided by CollegeFootballData.com
      </a>
    </footer>
  );
}
