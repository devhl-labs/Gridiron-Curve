"use client";

import Link from "next/link";
import { useState } from "react";
import { RankingShareControls } from "@/components/ranking-share-controls";
import {
  DEFAULT_RANKING_SYSTEM_ID,
  type RankingSystemId,
} from "@/lib/ranking";

type SiteHeaderProps = {
  active: "rankings" | "methodology" | "case-studies" | "about";
  status?: string;
  rankingSystemId?: RankingSystemId;
  shareImagePath?: string;
};

export function SiteHeader({
  active,
  status,
  rankingSystemId = DEFAULT_RANKING_SYSTEM_ID,
  shareImagePath,
}: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const rankingQuery =
    rankingSystemId === DEFAULT_RANKING_SYSTEM_ID
      ? ""
      : `?ranking=${rankingSystemId}`;

  return (
    <header className="site-header">
      <Link
        className="brand"
        href={`/${rankingQuery}`}
        onClick={() => setMenuOpen(false)}
      >
        <span className="brand-mark">G</span>
        <span>GRIDIRON CURVE</span>
      </Link>
      <button
        aria-controls="site-menu"
        aria-expanded={menuOpen}
        className="site-menu-toggle"
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
      >
        {menuOpen ? "Close" : "Menu"}
      </button>
      <div
        className={`site-menu${menuOpen ? " open" : ""}`}
        id="site-menu"
      >
        <nav aria-label="Main navigation">
          <Link
            className={active === "rankings" ? "active" : ""}
            href={`/${rankingQuery}`}
            onClick={() => setMenuOpen(false)}
          >
            Rankings
          </Link>
          <Link
            className={active === "methodology" ? "active" : ""}
            href={`/methodology${rankingQuery}`}
            onClick={() => setMenuOpen(false)}
          >
            Methodology
          </Link>
          <Link
            className={active === "case-studies" ? "active" : ""}
            href={`/case-studies${rankingQuery}`}
            onClick={() => setMenuOpen(false)}
          >
            Case Studies
          </Link>
          <Link
            className={active === "about" ? "active" : ""}
            href="/about"
            onClick={() => setMenuOpen(false)}
          >
            About
          </Link>
          <a
            className="external-link"
            href="https://github.com/devhl-labs/Gridiron-Curve"
            rel="noreferrer"
            style={{
              alignItems: "center",
              display: "inline-flex",
              flexShrink: 0,
              gap: "5px",
              whiteSpace: "nowrap",
            }}
            target="_blank"
            onClick={() => setMenuOpen(false)}
          >
            GitHub
            <svg
              aria-hidden="true"
              fill="none"
              height="13"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.6"
              viewBox="0 0 16 16"
              width="13"
            >
              <path d="M9.5 2.5h4v4m0-4-6 6" />
              <path d="M7 4H3.5a1 1 0 0 0-1 1v7.5a1 1 0 0 0 1 1H11a1 1 0 0 0 1-1V9" />
            </svg>
          </a>
        </nav>
        <div className="header-utilities">
          {shareImagePath && (
            <RankingShareControls imagePath={shareImagePath} />
          )}
          {status && (
            <div className="week-chip">
              <span /> {status}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
