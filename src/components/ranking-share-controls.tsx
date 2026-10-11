"use client";

import { useState } from "react";
import type { ModelVersion } from "@/lib/ranking";

type RankingShareControlsProps = {
  season: number;
  week: number;
  modelVersion: ModelVersion;
};

export function RankingShareControls({
  season,
  week,
  modelVersion,
}: RankingShareControlsProps) {
  const [message, setMessage] = useState("");
  const imagePath = `/api/rankings-image?season=${season}&week=${week}&model=${modelVersion}&v=4`;

  async function copyImageLink() {
    try {
      await navigator.clipboard.writeText(
        new URL(imagePath, window.location.origin).toString(),
      );
      setMessage("Link copied");
    } catch {
      setMessage("Unable to copy");
    }
  }

  return (
    <div className="ranking-share">
      <button type="button" onClick={copyImageLink}>
        Copy image link
      </button>
      <a href={`${imagePath}&download=1`}>Download JPG</a>
      <span aria-live="polite">{message}</span>
    </div>
  );
}
