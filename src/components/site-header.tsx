"use client";

import Link from "next/link";
import { useState } from "react";
import { RankingShareControls } from "@/components/ranking-share-controls";
import {
  DEFAULT_MODEL_VERSION,
  type ModelVersion,
} from "@/lib/ranking";

type SiteHeaderProps = {
  active: "rankings" | "methodology" | "case-studies" | "about";
  status?: string;
  modelVersion?: ModelVersion;
  shareImagePath?: string;
};

export function SiteHeader({
  active,
  status,
  modelVersion = DEFAULT_MODEL_VERSION,
  shareImagePath,
}: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const modelQuery =
    modelVersion === DEFAULT_MODEL_VERSION ? "" : `?model=${modelVersion}`;

  return (
    <header className="site-header">
      <Link
        className="brand"
        href={`/${modelQuery}`}
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
            href={`/${modelQuery}`}
            onClick={() => setMenuOpen(false)}
          >
            Rankings
          </Link>
          <Link
            className={active === "methodology" ? "active" : ""}
            href={`/methodology${modelQuery}`}
            onClick={() => setMenuOpen(false)}
          >
            Methodology
          </Link>
          <Link
            className={active === "case-studies" ? "active" : ""}
            href={`/case-studies${modelQuery}`}
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
