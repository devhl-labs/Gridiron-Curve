"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  DEFAULT_RANKING_SYSTEM_ID,
  parseRankingSystemId,
  type RankingSystemId,
} from "@/lib/ranking";
import {
  createTeamSchedule,
} from "@/lib/ranking/team-view";
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
  type PublishedRankHistory,
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
  consensusView: RankingView;
  blendView: RankingView;
  resultNetworkView: RankingView;
};

function componentDisplayName(rankingSystemId: RankingSystemId) {
  if (rankingSystemId.startsWith("ResultNetwork.")) {
    return "Result Network";
  }
  if (rankingSystemId.startsWith("RecordValue.")) {
    return "Record Value";
  }
  if (rankingSystemId.startsWith("CappedMarginPerformance.")) {
    return "Performance";
  }
  return rankingSystemId;
}

function displayedRank(rank: number | null) {
  return rank === null ? "NR" : `#${rank}`;
}

const ADJUDICATION_CRITERION_LABELS = {
  "head-to-head": "Head-to-head",
  "strongest-defeated-opponent": "Strongest defeated opponent",
  "strength-of-schedule": "Strength of schedule",
} as const;

function displayedHistoryRank(
  history: PublishedRankHistory | undefined,
  field: "openingRank" | "seasonHighRank" | "seasonLowRank",
) {
  if (!history || history.releaseCount === 0) return "—";
  return displayedRank(history[field]);
}

function RankHistoryDetails({
  history,
  openingLabel,
}: {
  history: PublishedRankHistory | undefined;
  openingLabel: string;
}) {
  return (
    <dl className="team-poll-history">
      <div>
        <dt>{openingLabel}</dt>
        <dd>{displayedHistoryRank(history, "openingRank")}</dd>
      </div>
      <div>
        <dt>High</dt>
        <dd>{displayedHistoryRank(history, "seasonHighRank")}</dd>
      </div>
      <div>
        <dt>Low</dt>
        <dd>{displayedHistoryRank(history, "seasonLowRank")}</dd>
      </div>
    </dl>
  );
}

export function TeamPageClient() {
  const searchParams = useSearchParams();
  const teamName = searchParams.get("team") ?? "";
  const rankingSystemId = parseRankingSystemId(searchParams.get("ranking"));
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
        const supportingSystemIds = [
          "Consensus.7.0",
          "Blend.7.0",
          "ResultNetwork.1.0",
        ] as const satisfies readonly RankingSystemId[];
        const viewIds = [
          ...new Set<RankingSystemId>([
            rankingSystemId,
            ...supportingSystemIds,
          ]),
        ];
        const [source, loadedViews] = await Promise.all([
          fetchPublishedJson<PublishedSeason>(
            seasonDataPath(selectedSeason.season),
            controller.signal,
          ),
          Promise.all(
            viewIds.map((viewId) =>
              fetchPublishedJson<RankingView>(
                rankingDataPath(selectedSeason.season, week, viewId),
                controller.signal,
              ),
            ),
          ),
        ]);
        const viewsById = new Map(
          loadedViews.map((loadedView) => [
            loadedView.rankingSystemId,
            loadedView,
          ]),
        );
        const view = viewsById.get(rankingSystemId);
        const consensusView = viewsById.get("Consensus.7.0");
        const blendView = viewsById.get("Blend.7.0");
        const resultNetworkView = viewsById.get("ResultNetwork.1.0");
        if (!view || !consensusView || !blendView || !resultNetworkView) {
          throw new Error("Required published team evidence is unavailable.");
        }
        setPublication({
          manifest,
          source,
          view,
          consensusView,
          blendView,
          resultNetworkView,
        });
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
  }, [rankingSystemId, searchParams, teamName]);

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

  const {
    source,
    view,
    consensusView,
    blendView,
    resultNetworkView,
  } = publication;
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
  const blendRanking = blendView.rankings.find(
    ({ team }) => team === teamName,
  );
  const consensusRanking = consensusView.rankings.find(
    ({ team }) => team === teamName,
  );
  const blendComponents = new Map(
    blendRanking?.blendComponents?.map((component) => [
      component.source,
      component,
    ]) ?? [],
  );
  const computerRank = consensusRanking?.rank ?? null;
  const apRank = blendComponents.get("AP Poll")?.rank ?? null;
  const coachesRank = blendComponents.get("Coaches Poll")?.rank ?? null;
  const pollRankHistories = new Map(
    blendRanking?.pollRankHistories?.map((history) => [
      history.source,
      history,
    ]) ?? [],
  );
  const resultNetworkRanks = new Map(
    resultNetworkView.rankings.map(({ team, rank }) => [team, rank]),
  );
  const strongestWin = source.games
    .flatMap((game) => {
      if (
        !game.completed ||
        game.seasonType === "postseason" ||
        game.week > view.week ||
        game.homePoints === null ||
        game.awayPoints === null ||
        (game.homeTeam !== teamName && game.awayTeam !== teamName)
      ) {
        return [];
      }
      const isHome = game.homeTeam === teamName;
      const teamScore = isHome ? game.homePoints : game.awayPoints;
      const opponentScore = isHome ? game.awayPoints : game.homePoints;
      if (teamScore <= opponentScore) return [];
      const opponent = isHome ? game.awayTeam : game.homeTeam;
      const opponentRank = resultNetworkRanks.get(opponent);
      return opponentRank === undefined
        ? []
        : [{ opponent, rank: opponentRank }];
    })
    .toSorted(
      (left, right) =>
        left.rank - right.rank ||
        left.opponent.localeCompare(right.opponent),
    )[0];
  const completedFbsGames = source.games.filter(
    (game) =>
      game.completed &&
      game.seasonType !== "postseason" &&
      game.week <= view.week &&
      resultNetworkRanks.has(game.homeTeam) &&
      resultNetworkRanks.has(game.awayTeam) &&
      (game.homeTeam === teamName || game.awayTeam === teamName),
  ).length;
  const teamsBySchool = new Map(
    source.teams.map((team) => [team.school, team]),
  );
  const rankingsHref = `/?season=${source.season}&week=${view.week}${
    rankingSystemId === DEFAULT_RANKING_SYSTEM_ID
      ? ""
      : `&ranking=${rankingSystemId}`
  }`;

  return (
    <main>
      <SiteHeader
        active="rankings"
        status={`Week ${view.week} · ${source.season}`}
        rankingSystemId={rankingSystemId}
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

        {consensusRanking && computerRank !== null && (
          <section
            className="team-ranking-explanation"
            aria-label="Computer Composite ranking explanation"
          >
            <div className="team-explanation-heading">
              <div>
                <span className="kicker">RANKING BREAKDOWN</span>
                <h2>Why Computer #{computerRank}?</h2>
              </div>
              <p>
                Component positions establish the base. Résumé and loss
                pressure establish a preliminary order. Close same-record
                groups then use earned résumé evidence.
              </p>
            </div>

            <div className="team-component-grid">
              {consensusRanking.consensusRanks?.map(
                ({ rankingSystemId: componentId, rank, weight }) => (
                  <article key={componentId}>
                    <span>{componentDisplayName(componentId)}</span>
                    <strong>#{rank}</strong>
                    <small>
                      {weight === 0
                        ? "Résumé evidence"
                        : `${((weight ?? 0) * 100).toFixed(0)}% of base`}
                    </small>
                  </article>
                ),
              )}
            </div>

            <div className="team-explanation-panels">
              <article className="team-calculation-panel">
                <span className="kicker">THE CALCULATION</span>
                <div>
                  <span>Weighted base position</span>
                  <strong>
                    {consensusRanking.consensusAverageRank?.toFixed(2) ?? "—"}
                  </strong>
                </div>
                <div>
                  <span>Weak-schedule pressure</span>
                  <strong>
                    +{(consensusRanking.resumePressure ?? 0).toFixed(2)}
                  </strong>
                </div>
                <div>
                  <span>Loss pressure</span>
                  <strong>
                    +{(consensusRanking.lossPressure ?? 0).toFixed(2)}
                  </strong>
                </div>
                <div>
                  <span>Post-pressure rank</span>
                  <strong>
                    #
                    {consensusRanking.consensusPreliminaryRank ??
                      computerRank}
                  </strong>
                </div>
                {consensusRanking.consensusAdjudication && (
                  <>
                    <div className="team-adjudication-result">
                      <span>Close-call decision</span>
                      <strong>
                        {consensusRanking.consensusAdjudication.decidingCriteria
                          .map(
                            (criterion) =>
                              ADJUDICATION_CRITERION_LABELS[criterion],
                          )
                          .join(" · ")}
                      </strong>
                    </div>
                    <div className="team-adjudication-group">
                      <span>Adjudicated group</span>
                      <strong>
                        {consensusRanking.consensusAdjudication.members
                          .map(
                            ({ team, preliminaryRank, finalRank }) =>
                              `${team} #${preliminaryRank}→#${finalRank}`,
                          )
                          .join(" · ")}
                      </strong>
                    </div>
                  </>
                )}
                <div className="team-calculation-result">
                  <span>Final Computer Composite</span>
                  <strong>#{computerRank}</strong>
                </div>
              </article>

              <article className="team-poll-panel">
                <span className="kicker">POLL COMPARISON</span>
                <div className="team-poll-ranks">
                  <div>
                    <span>Computer</span>
                    <strong>#{computerRank}</strong>
                    <RankHistoryDetails
                      history={consensusRanking.rankHistory}
                      openingLabel="Week 1"
                    />
                  </div>
                  <div>
                    <span>AP</span>
                    <strong>{displayedRank(apRank)}</strong>
                    <RankHistoryDetails
                      history={pollRankHistories.get("AP Poll")}
                      openingLabel="Preseason"
                    />
                  </div>
                  <div>
                    <span>Coaches</span>
                    <strong>{displayedRank(coachesRank)}</strong>
                    <RankHistoryDetails
                      history={pollRankHistories.get("Coaches Poll")}
                      openingLabel="Preseason"
                    />
                  </div>
                </div>
              </article>
            </div>

            <div className="team-resume-evidence">
              <div>
                <span>Schedule played</span>
                <strong>
                  {consensusRanking.resumeScheduleRank
                    ? `#${consensusRanking.resumeScheduleRank}`
                    : "—"}
                </strong>
              </div>
              <div>
                <span>Best-two-win average</span>
                <strong>
                  {consensusRanking.resumeBestTwoWinAverageRank === undefined
                    ? "—"
                    : `#${consensusRanking.resumeBestTwoWinAverageRank.toFixed(1)}`}
                </strong>
              </div>
              <div>
                <span>Strongest win</span>
                <strong>
                  {strongestWin
                    ? `#${strongestWin.rank} ${strongestWin.opponent}`
                    : "None yet"}
                </strong>
              </div>
              <div>
                <span>FBS games / maturity</span>
                <strong>
                  {completedFbsGames} /{" "}
                  {((consensusRanking.resumeMaturity ?? 0) * 100).toFixed(0)}%
                </strong>
              </div>
            </div>
          </section>
        )}

        <section className="team-games" aria-label="Regular-season schedule">
          <div className="game-table-head">
            <span>Week</span>
            <span>Result</span>
            <span>Opponent</span>
            <span>Site</span>
            <span>Score / Time</span>
          </div>
          {games.map((game) => {
            const isSelectedWeek = game.week === view.week;
            if (game.kind === "idle") {
              return (
                <article
                  className={`game-row idle${
                    isSelectedWeek ? " selected-week" : ""
                  }`}
                  key={game.id}
                >
                  <span className="game-week">{game.week}</span>
                  <strong className="game-result idle">BYE</strong>
                  <div className="game-opponent">
                    <span>—</span>
                  </div>
                  <span className="game-location">—</span>
                  <span className="game-score">—</span>
                </article>
              );
            }
            const opponent = teamsBySchool.get(game.opponent);
            const opponentLogo =
              opponent?.logos.find((logo) => logo.includes("/logos/96/")) ??
              opponent?.logos[0];

            return (
              <article
                className={`game-row${
                  game.result === null ? " upcoming" : ""
                }${isSelectedWeek ? " selected-week" : ""}`}
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

      <SiteFooter rankingSystemId={rankingSystemId} />
    </main>
  );
}
