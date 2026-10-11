import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  listCfbdCacheManifests,
  readCfbdSourceCache,
} from "@/lib/cfbd/cache";
import {
  DEFAULT_MODEL_VERSION,
  parseModelVersion,
} from "@/lib/ranking";
import { createTeamSchedule } from "@/lib/ranking/team-view";
import { createRankingView } from "@/lib/ranking/view";

export const instant = false;

type TeamPageProps = {
  params: Promise<{ team: string }>;
  searchParams: Promise<{ season?: string; model?: string }>;
};

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

export default async function TeamPage({
  params,
  searchParams,
}: TeamPageProps) {
  await connection();
  const [{ team: encodedTeamName }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  const teamName = decodeURIComponent(encodedTeamName);
  const modelVersion = parseModelVersion(query.model);
  const manifests = listCfbdCacheManifests();
  const requestedSeason = parseSelection(query.season);
  const manifest =
    manifests.find(({ season }) => season === requestedSeason) ?? manifests[0];
  if (!manifest) notFound();

  const source = readCfbdSourceCache(manifest.season);
  if (!source) notFound();
  const historicalSources = manifests
    .filter(({ season }) => season < manifest.season)
    .toSorted((a, b) => a.season - b.season)
    .map(({ season }) => readCfbdSourceCache(season))
    .filter((candidate) => candidate !== null);

  const ranking = createRankingView(
    source,
    historicalSources,
    modelVersion,
  ).rankings.find(({ team }) => team === teamName);
  if (!ranking) notFound();

  const games = createTeamSchedule(source.games, teamName);
  const teamsBySchool = new Map(
    source.teams.map((team) => [team.school, team]),
  );
  const rankingsHref = `/?season=${source.season}${
    modelVersion === DEFAULT_MODEL_VERSION ? "" : `&model=${modelVersion}`
  }`;

  return (
    <main>
      <SiteHeader
        active="rankings"
        status={`Week ${source.throughWeek} · ${source.season}`}
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
              {source.season} Season · Metrics through Week {source.throughWeek}
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
