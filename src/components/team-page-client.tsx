"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  DEFAULT_MODEL_VERSION,
  parseModelVersion,
} from "@/lib/ranking";
import { createTeamSchedule } from "@/lib/ranking/team-view";
import {
  fetchPublicationManifest,
  fetchPublishedJson,
  type PublicationManifest,
  type PublishedSeason,
  type RankingView,
} from "@/lib/publication/client";
import {
  rankingDataPath,
  seasonDataPath,
} from "@/lib/publication/types";

function parseSelection(value: string | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function formatKickoff(startDate: string | null) {
  if (!startDate) return "Time TBD";
  const kickoff = new Date(startDate);
  const date = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  }).format(kickoff);
  const hour = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    hourCycle: "h23",
    timeZone: "America/New_York",
  }).format(kickoff);
  if (hour === "00") return `${date} · Time TBD`;

  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  }).format(kickoff);
  return `${date} · ${time}`;
}

type TeamState = {
  manifest: PublicationManifest;
  source: PublishedSeason;
  view: RankingView;
};

export function TeamPageClient() {
  const searchParams = useSearchParams();
  const teamName = searchParams.get("team") ?? "";
  const modelVersion = parseModelVersion(searchParams.get("model"));
  const [publication, setPublication] = useState<TeamState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function loadTeam() {
      try {
        setError(null);
        if (!teamName) throw new Error("A team is required.");
        const manifest = await fetchPublicationManifest(controller.signal);
        const requestedSeason = parseSelection(
          searchParams.get("season") ?? undefined,
        );
        const selectedSeason =
          manifest.seasons.find(({ season }) => season === requestedSeason) ??
          manifest.seasons.at(-1);
        if (!selectedSeason) throw new Error("No published season is available.");
        const requestedWeek = parseSelection(
          searchParams.get("week") ?? undefined,
        );
        const week = Math.min(
          requestedWeek ?? selectedSeason.throughWeek,
          selectedSeason.throughWeek,
        );
        const [source, view] = await Promise.all([
          fetchPublishedJson<PublishedSeason>(
            seasonDataPath(selectedSeason.season),
            controller.signal,
          ),
          fetchPublishedJson<RankingView>(
            rankingDataPath(selectedSeason.season, week, modelVersion),
            controller.signal,
          ),
        ]);
        setPublication({ manifest, source, view });
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return;
        }
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load the published team.",
        );
      }
    }
    void loadTeam();
    return () => controller.abort();
  }, [modelVersion, searchParams, teamName]);

  if (!publication) {
    return (
      <main className="publication-loading-page">
        <SiteHeader active="rankings" status="Published team" />
        <section className="publication-loading">
          <span className="kicker">{error ? "PUBLICATION ERROR" : "LOADING"}</span>
          <h1>{error ?? "Loading team…"}</h1>
        </section>
      </main>
    );
  }

  const { source, view } = publication;
  const ranking = view.rankings.find(({ team }) => team === teamName);
  if (!ranking) {
    return (
      <main className="publication-loading-page">
        <SiteHeader active="rankings" status="Team unavailable" />
        <section className="publication-loading">
          <span className="kicker">NOT FOUND</span>
          <h1>{teamName} is not in this published ranking.</h1>
        </section>
      </main>
    );
  }

  const games = createTeamSchedule(source.games, teamName);
  const teamsBySchool = new Map(
    source.teams.map((team) => [team.school, team]),
  );
  const rankingsHref = `/?season=${source.season}&week=${view.week}${
    modelVersion === DEFAULT_MODEL_VERSION ? "" : `&model=${modelVersion}`
  }`;

  return (
    <main>
      <SiteHeader
        active="rankings"
        status={`Week ${view.week} · ${source.season}`}
        modelVersion={modelVersion}
      />

      <section className="team-page">
        <Link className="back-link" href={rankingsHref}>
          ← Back to rankings
        </Link>

        <div className="team-page-heading">
          <div
            className="team-page-logo"
            style={{ borderColor: ranking.color ?? undefined }}
          >
            {ranking.logo ? (
              <Image
                src={ranking.logo}
                alt={`${ranking.team} logo`}
                width={96}
                height={96}
              />
            ) : (
              ranking.team.slice(0, 2).toUpperCase()
            )}
          </div>
          <div>
            <span className="kicker">
              {source.season} Season · Metrics through Week {view.week}
            </span>
            <h1>{ranking.team}</h1>
          </div>
        </div>

        <div className="team-summary">
          <div>
            <span>Rank</span>
            <strong>#{ranking.rank}</strong>
          </div>
          <div>
            <span>Record</span>
            <strong>{ranking.record}</strong>
          </div>
          <div>
            <span>SOS Played</span>
            <strong>#{ranking.scheduleRank}</strong>
          </div>
          <div>
            <span>SOS Upcoming</span>
            <strong>
              {ranking.upcomingScheduleRank
                ? `#${ranking.upcomingScheduleRank}`
                : "—"}
            </strong>
          </div>
        </div>

        <section className="team-games" aria-label="Regular-season schedule">
          <div className="game-table-head">
            <span>Week</span>
            <span>Result</span>
            <span>Opponent</span>
            <span>Site</span>
            <span>Score / Time</span>
          </div>
          {games.map((game) => {
            const opponent = teamsBySchool.get(game.opponent);
            const opponentLogo =
              opponent?.logos.find((logo) => logo.includes("/logos/96/")) ??
              opponent?.logos[0];

            return (
              <article
                className={`game-row ${game.result === null ? "upcoming" : ""}`}
                key={game.id}
              >
              <span className="game-week">{game.week}</span>
              <strong
                className={`game-result ${
                  game.result?.toLowerCase() ?? "scheduled"
                }`}
              >
                {game.result ?? "UPCOMING"}
              </strong>
              <div className="game-opponent">
                <div
                  className="opponent-logo"
                  style={{
                    borderColor:
                      opponent?.color ?? undefined,
                  }}
                >
                  {opponentLogo ? (
                    <Image
                      src={opponentLogo}
                      alt={`${game.opponent} logo`}
                      width={36}
                      height={36}
                    />
                  ) : (
                    game.opponent.slice(0, 2).toUpperCase()
                  )}
                </div>
                <span>{game.opponent}</span>
              </div>
              <span className="game-location">{game.location}</span>
              <span className="game-score">
                {game.result
                  ? `${game.teamScore}–${game.opponentScore}`
                  : formatKickoff(game.startDate)}
              </span>
              </article>
            );
          })}
        </section>
      </section>

      <SiteFooter modelVersion={modelVersion} />
    </main>
  );
}
