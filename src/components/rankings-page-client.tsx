"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { RankingHistoryControls } from "@/components/ranking-history-controls";
import { RankingShareControls } from "@/components/ranking-share-controls";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  DEFAULT_MODEL_VERSION,
  parseModelVersion,
} from "@/lib/ranking";
import {
  fetchPublicationManifest,
  fetchPublishedJson,
  type PublicationManifest,
  type RankingView,
} from "@/lib/publication/client";
import { rankingDataPath } from "@/lib/publication/types";

function parseSelection(value: string | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

type PublicationState = {
  manifest: PublicationManifest;
  view: RankingView;
};

export function RankingsPageClient() {
  const searchParams = useSearchParams();
  const [publication, setPublication] = useState<PublicationState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const modelVersion = parseModelVersion(searchParams.get("model"));

  useEffect(() => {
    const controller = new AbortController();
    async function loadPublication() {
      try {
        setError(null);
        const manifest = await fetchPublicationManifest(controller.signal);
        const requestedSeason = parseSelection(
          searchParams.get("season") ?? undefined,
        );
        const selectedSeason =
          manifest.seasons.find(({ season }) => season === requestedSeason) ??
          manifest.seasons.find(
            ({ season }) => season === manifest.latest.season,
          ) ??
          manifest.seasons.at(-1);
        if (!selectedSeason) {
          throw new Error("The publication does not contain a season.");
        }
        const requestedWeek = parseSelection(
          searchParams.get("week") ?? undefined,
        );
        const week = Math.min(
          requestedWeek ?? selectedSeason.throughWeek,
          selectedSeason.throughWeek,
        );
        const view = await fetchPublishedJson<RankingView>(
          rankingDataPath(selectedSeason.season, week, modelVersion),
          controller.signal,
        );
        setPublication({ manifest, view });
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return;
        }
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load the published rankings.",
        );
      }
    }
    void loadPublication();
    return () => controller.abort();
  }, [modelVersion, searchParams]);

  if (!publication) {
    return (
      <main>
        <SiteHeader active="rankings" status="Published rankings" />
        <section className="info-hero">
          <span className="kicker">{error ? "PUBLICATION ERROR" : "LOADING"}</span>
          <h1>{error ?? "Loading rankings…"}</h1>
        </section>
      </main>
    );
  }

  const { manifest, view } = publication;
  const manifests = manifest.seasons;
  const rankings = view.rankings;
  const isSample = view.source === "sample";
  const history = manifests
    .toReversed()
    .flatMap(({ season, throughWeek }) =>
      Array.from({ length: throughWeek }, (_, index) => ({
        season,
        week: index + 1,
      })),
    );
  const historyIndex = history.findIndex(
    ({ season, week }) => season === view.season && week === view.week,
  );
  const previousRanking =
    historyIndex > 0 ? history[historyIndex - 1] : undefined;
  const nextRanking =
    historyIndex >= 0 && historyIndex < history.length - 1
      ? history[historyIndex + 1]
      : undefined;
  const shareImage = manifest.shareImages.find(
    (candidate) =>
      candidate.season === view.season &&
      candidate.week === view.week &&
      candidate.modelVersion === modelVersion,
  );

  return (
    <main>
      <SiteHeader
        active="rankings"
        status={`Week ${view.week} · ${isSample ? "Sample model" : view.season}`}
        modelVersion={modelVersion}
      />

      <section className="rankings-section rankings-page" id="rankings">
        <div className="rankings-masthead">
          <div>
            <span className="kicker">CURRENT TABLE</span>
            <h1>{isSample ? "Gridiron Curve" : `${view.season} Rankings`}</h1>
            <p>All FBS teams through Week {view.week}</p>
          </div>
          {!isSample && (
            <div className="rankings-actions">
              <RankingHistoryControls
                seasons={manifests}
                selectedSeason={view.season}
                selectedWeek={view.week}
                modelVersion={modelVersion}
                previous={previousRanking}
                next={nextRanking}
              />
              {shareImage && (
                <RankingShareControls imagePath={shareImage.path} />
              )}
            </div>
          )}
        </div>

        <div className="ranking-card">
          <div className="table-head">
            <span>RK</span>
            <span
              title={
                view.week === 1
                  ? "Change from the preseason AP/Coaches consensus"
                  : "Change from the prior week's ranking"
              }
            >
              MOVE
            </span>
            <span>TEAM</span>
            <span>RECORD</span>
            <button
              className="metric-help"
              type="button"
              data-tooltip="Strength of Schedule rank among FBS teams based on opponents already played. #1 is the hardest schedule."
              aria-label="SOS: strength of schedule rank, with number one hardest"
            >
              SOS
            </button>
            <span>LAST RESULT</span>
          </div>
          {rankings.map((team, index) => (
            <article
              className={`team-row ${
                index > 0 && index % 25 === 0 ? "ranking-break" : ""
              }`}
              key={team.team}
            >
              <div className="rank">{team.rank}</div>
              <div
                className={`movement ${
                  team.movement === null
                    ? "new"
                    : team.movement > 0
                      ? "up"
                      : team.movement < 0
                        ? "down"
                        : "same"
                }`}
              >
                {team.movement === null
                  ? view.week === 1
                    ? "NR"
                    : "NEW"
                  : team.movement > 0
                    ? `↑${team.movement}`
                    : team.movement < 0
                      ? `↓${Math.abs(team.movement)}`
                      : "—"}
              </div>
              {isSample ? (
                <div className="team">
                  <div
                    className="team-glyph"
                    style={{ borderColor: team.color ?? undefined }}
                  >
                    {team.logo ? (
                      <Image
                        src={team.logo}
                        alt={`${team.team} logo`}
                        width={48}
                        height={48}
                      />
                    ) : (
                      team.team.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div>
                    <strong>{team.team}</strong>
                  </div>
                </div>
              ) : (
                <Link
                  className="team team-link"
                  href={`/team?team=${encodeURIComponent(team.team)}&season=${view.season}&week=${view.week}${
                    modelVersion === DEFAULT_MODEL_VERSION
                      ? ""
                      : `&model=${modelVersion}`
                  }`}
                >
                  <div
                    className="team-glyph"
                    style={{ borderColor: team.color ?? undefined }}
                  >
                    {team.logo ? (
                      <Image
                        src={team.logo}
                        alt={`${team.team} logo`}
                        width={48}
                        height={48}
                      />
                    ) : (
                      team.team.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div>
                    <strong>{team.team}</strong>
                  </div>
                </Link>
              )}
              <div className="record">{team.record}</div>
              <div
                className="sos"
                  title={`Played schedule rank #${team.scheduleRank} among FBS teams; #1 is hardest`}
              >
                #{team.scheduleRank}
              </div>
              <div
                className={`last-result ${
                  team.lastResult?.startsWith("W")
                    ? "win"
                    : team.lastResult?.startsWith("L")
                      ? "loss"
                      : ""
                }`}
              >
                {team.lastResult ?? "—"}
              </div>
            </article>
          ))}
        </div>
      </section>

      <SiteFooter modelVersion={modelVersion} />
    </main>
  );
}
