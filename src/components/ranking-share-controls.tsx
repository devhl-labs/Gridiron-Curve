"use client";

import { useState } from "react";
type RankingShareControlsProps = {
  imagePath: string;
};

export function RankingShareControls({
  imagePath,
}: RankingShareControlsProps) {
  const [message, setMessage] = useState("");

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
      <a href={imagePath} download>Download JPG</a>
      <span aria-live="polite">{message}</span>
    </div>
  );
}
