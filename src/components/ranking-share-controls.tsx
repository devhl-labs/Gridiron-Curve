"use client";

import { useState } from "react";
type RankingShareControlsProps = {
  imagePath: string;
};

export function RankingShareControls({
  imagePath,
}: RankingShareControlsProps) {
  const [message, setMessage] = useState("");

  async function shareImage() {
    const url = new URL(imagePath, window.location.origin).toString();
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Gridiron Curve rankings",
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      setMessage("Copied");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      setMessage("Retry");
    }
  }

  return (
    <div className="header-share">
      <button type="button" onClick={shareImage}>
        <svg
          aria-hidden="true"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle cx="18" cy="5" r="2.5" />
          <circle cx="6" cy="12" r="2.5" />
          <circle cx="18" cy="19" r="2.5" />
          <path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5" />
        </svg>
        {message || "Share"}
      </button>
      <a href={imagePath} download>
        <svg
          aria-hidden="true"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path d="M12 3v11m0 0 4-4m-4 4-4-4M5 17v3h14v-3" />
        </svg>
        Download
      </a>
      <span className="visually-hidden" aria-live="polite">{message}</span>
    </div>
  );
}
