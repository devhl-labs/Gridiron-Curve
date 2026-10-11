import Link from "next/link";
import {
  DEFAULT_MODEL_VERSION,
  type ModelVersion,
} from "@/lib/ranking";

type SiteHeaderProps = {
  active: "rankings" | "methodology" | "case-studies" | "about";
  status?: string;
  modelVersion?: ModelVersion;
};

export function SiteHeader({
  active,
  status,
  modelVersion = DEFAULT_MODEL_VERSION,
}: SiteHeaderProps) {
  const modelQuery =
    modelVersion === DEFAULT_MODEL_VERSION ? "" : `?model=${modelVersion}`;

  return (
    <header className="site-header">
      <Link className="brand" href={`/${modelQuery}`}>
        <span className="brand-mark">G</span>
        <span>GRIDIRON CURVE</span>
      </Link>
      <nav aria-label="Main navigation">
        <Link
          className={active === "rankings" ? "active" : ""}
          href={`/${modelQuery}`}
        >
          Rankings
        </Link>
        <Link
          className={active === "methodology" ? "active" : ""}
          href={`/methodology${modelQuery}`}
        >
          Methodology
        </Link>
        <Link
          className={active === "case-studies" ? "active" : ""}
          href={`/case-studies${modelQuery}`}
        >
          Case Studies
        </Link>
        <Link className={active === "about" ? "active" : ""} href="/about">
          About
        </Link>
      </nav>
      {status ? (
        <div className="week-chip">
          <span /> {status}
        </div>
      ) : (
        <div />
      )}
    </header>
  );
}
