"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ModelVersionSelect } from "@/components/model-version-select";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  DEFAULT_MODEL_VERSION,
  parseModelVersion,
} from "@/lib/ranking";
import {
  fetchPublicationManifest,
  fetchPublishedJson,
  type RankingView,
} from "@/lib/publication/client";
import { rankingDataPath } from "@/lib/publication/types";

type SelectionCase = {
  season: number;
  week?: number;
  title: string;
  decision: string;
  lens: string;
  teams: string[];
  selected: string[];
  spots: number;
};

type RankingCase = {
  season: number;
  week: number;
  title: string;
  decision: string;
  lens: string;
  teams: string[];
  rankedTeam: string;
  officialRank: number;
};

type CaseStudy = SelectionCase | RankingCase;

const CASE_STUDIES: CaseStudy[] = [
  {
    season: 2000,
    title: "Florida State over Miami",
    decision:
      "Florida State reached the BCS Championship even though one-loss Miami had beaten the Seminoles head-to-head.",
    lens:
      "Does the complete résumé support Florida State, or does Miami's direct win carry the comparison?",
    teams: ["Florida State", "Miami"],
    selected: ["Florida State"],
    spots: 1,
  },
  {
    season: 2001,
    title: "Nebraska over Oregon",
    decision:
      "Nebraska received a championship berth after a 62-36 loss to Colorado, while one-loss Oregon was left out.",
    lens:
      "Compare the network position and win quality behind two very different one-loss résumés.",
    teams: ["Nebraska", "Oregon"],
    selected: ["Nebraska"],
    spots: 1,
  },
  {
    season: 2003,
    title: "USC left outside the BCS title game",
    decision:
      "Oklahoma and LSU played for the BCS title while top-ranked USC went to the Rose Bowl and ultimately shared the national championship.",
    lens:
      "The comparison tests whether the connected schedule supports the human-poll favorite or the BCS pairing.",
    teams: ["USC", "LSU", "Oklahoma"],
    selected: ["LSU", "Oklahoma"],
    spots: 2,
  },
  {
    season: 2004,
    title: "Four unbeaten teams, two title spots",
    decision:
      "USC and Oklahoma played for the title, leaving undefeated Auburn and Utah without a path to the championship.",
    lens:
      "An undefeated record remains important, but opponent quality separates otherwise perfect résumés.",
    teams: ["USC", "Oklahoma", "Auburn", "Utah"],
    selected: ["USC", "Oklahoma"],
    spots: 2,
  },
  {
    season: 2007,
    week: 7,
    title: "South Florida reaches BCS No. 2",
    decision:
      "Undefeated South Florida was second in the first BCS standings after wins over Auburn and West Virginia.",
    lens:
      "This early-season case tests whether strong signature wins justify an elite ranking before the schedule is complete.",
    teams: ["South Florida", "Ohio State", "Boston College", "LSU", "Oklahoma"],
    rankedTeam: "South Florida",
    officialRank: 2,
  },
  {
    season: 2008,
    title: "Oklahoma over Texas",
    decision:
      "Oklahoma won the three-way Big 12 South tiebreak and reached the BCS title game even though Texas had beaten the Sooners.",
    lens:
      "Texas Tech's win over Texas created a cycle that made a simple head-to-head rule impossible.",
    teams: ["Oklahoma", "Texas", "Texas Tech"],
    selected: ["Oklahoma"],
    spots: 1,
  },
  {
    season: 2011,
    title: "Alabama over Oklahoma State",
    decision:
      "Alabama received a rematch with LSU for the national championship instead of one-loss Big 12 champion Oklahoma State.",
    lens:
      "The case contrasts Alabama's underlying strength with Oklahoma State's collection of high-value wins.",
    teams: ["Alabama", "Oklahoma State"],
    selected: ["Alabama"],
    spots: 1,
  },
  {
    season: 2014,
    title: "Ohio State jumps TCU and Baylor",
    decision:
      "Ohio State moved into the final playoff position after winning the Big Ten Championship 59-0.",
    lens:
      "The final weekend added a dominant result to an already connected résumé.",
    teams: ["Ohio State", "TCU", "Baylor"],
    selected: ["Ohio State"],
    spots: 1,
  },
  {
    season: 2017,
    title: "Alabama in, Ohio State and UCF out",
    decision:
      "One-loss Alabama made the playoff without winning its division, while Big Ten champion Ohio State and undefeated UCF were excluded.",
    lens:
      "This comparison shows how severely schedule context can separate similar or better records.",
    teams: ["Alabama", "Ohio State", "UCF"],
    selected: ["Alabama"],
    spots: 1,
  },
  {
    season: 2023,
    title: "Undefeated Florida State excluded",
    decision:
      "The committee selected one-loss Alabama over 13-0 ACC champion Florida State for the final four-team playoff.",
    lens:
      "The central question is whether an unbeaten record outweighs differences in schedule and win quality.",
    teams: ["Alabama", "Florida State"],
    selected: ["Alabama"],
    spots: 1,
  },
  {
    season: 2024,
    title: "SMU over Alabama",
    decision:
      "SMU received the final at-large playoff berth after losing the ACC Championship, leaving three-loss Alabama outside the field.",
    lens:
      "The expanded playoff raised a familiar question: record advantage or strength of résumé?",
    teams: ["SMU", "Alabama", "Miami"],
    selected: ["SMU"],
    spots: 1,
  },
  {
    season: 2025,
    title: "Miami over Notre Dame",
    decision:
      "Miami received the final at-large berth after the committee used its head-to-head win to separate two 10-2 teams.",
    lens:
      "Gridiron Curve considers the entire résumé rather than applying a hard head-to-head override.",
    teams: ["Miami", "Notre Dame"],
    selected: ["Miami"],
    spots: 1,
  },
];

function selectionVerdict(
  study: SelectionCase,
  rankings: RankingView["rankings"],
) {
  const modelSelection = rankings
    .filter(({ team }) => study.teams.includes(team))
    .slice(0, study.spots)
    .map(({ team }) => team);
  const agrees =
    modelSelection.length === study.selected.length &&
    modelSelection.every((team) => study.selected.includes(team));
  return {
    agrees,
    text: agrees
      ? `Curve agrees within this comparison: ${modelSelection.join(" and ")} ${study.spots === 1 ? "leads" : "fill the available spots"}.`
      : `Curve disagrees within this comparison: it favors ${modelSelection.join(" and ")} instead of ${study.selected.join(" and ")}.`,
  };
}

function rankingVerdict(
  study: RankingCase,
  rankings: RankingView["rankings"],
) {
  const team = rankings.find(({ team }) => team === study.rankedTeam);
  if (!team) {
    return { agrees: false, text: `${study.rankedTeam} is unavailable.` };
  }
  const agrees = team.rank === study.officialRank;
  return {
    agrees,
    text: agrees
      ? `Curve also ranks ${study.rankedTeam} No. ${study.officialRank}.`
      : `Curve ranks ${study.rankedTeam} No. ${team.rank}, not No. ${study.officialRank}.`,
  };
}

function buildStudyView(
  study: CaseStudy,
  view: RankingView,
) {
  const rankings = view.rankings
    .filter(({ team }) => study.teams.includes(team))
    .sort((a, b) => a.rank - b.rank);
  const verdict =
    "selected" in study
      ? selectionVerdict(study, rankings)
      : rankingVerdict(study, rankings);
  return { study, view, rankings, verdict };
}

type BuiltStudy = ReturnType<typeof buildStudyView>;

export function CaseStudiesPageClient() {
  const searchParams = useSearchParams();
  const modelVersion = parseModelVersion(searchParams.get("model"));
  const [studies, setStudies] = useState<BuiltStudy[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function loadStudies() {
      try {
        setError(null);
        const manifest = await fetchPublicationManifest(controller.signal);
        const built = await Promise.all(
          CASE_STUDIES.toSorted((a, b) => b.season - a.season).map(
            async (study) => {
              const season = manifest.seasons.find(
                ({ season }) => season === study.season,
              );
              if (!season) return null;
              const week = Math.min(
                study.week ?? season.throughWeek,
                season.throughWeek,
              );
              const view = await fetchPublishedJson<RankingView>(
                rankingDataPath(study.season, week, modelVersion),
                controller.signal,
              );
              return buildStudyView(study, view);
            },
          ),
        );
        setStudies(built.filter((study) => study !== null));
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return;
        }
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load the published case studies.",
        );
      }
    }
    void loadStudies();
    return () => controller.abort();
  }, [modelVersion]);

  return (
    <main>
      <SiteHeader
        active="case-studies"
        status={`${studies.length} comparisons · ${modelVersion}`}
        modelVersion={modelVersion}
      />
      <section className="info-hero case-hero">
        <span className="kicker">CASE STUDIES</span>
        <h1>Controversial seasons.<br /><em>One consistent method.</em></h1>
        <p>
          These are not claims that every debate has one correct answer. They
          show how the current Gridiron Curve model evaluates each disputed
          résumé using the same rules and the information available at the time.
        </p>
        <div className="case-model-control">
          <ModelVersionSelect selectedVersion={modelVersion} />
        </div>
      </section>

      <section className="case-studies">
        {error && <p className="case-verdict disagrees">{error}</p>}
        {studies.map(({ study, view, rankings, verdict }, index) => (
          <article className="case-study" key={`${study.season}-${study.title}`}>
            <header className="case-heading">
              <div>
                <span className="kicker">
                  {String(index + 1).padStart(2, "0")} · {study.season}
                  {study.week ? ` WEEK ${study.week}` : ""}
                </span>
                <h2>{study.title}</h2>
              </div>
              <Link
                href={`/?season=${study.season}&week=${view.week}${
                  modelVersion === DEFAULT_MODEL_VERSION
                    ? ""
                    : `&model=${modelVersion}`
                }`}
              >
                View full ranking →
              </Link>
            </header>
            <div className="case-context">
              <div>
                <h3>The decision</h3>
                <p>{study.decision}</p>
              </div>
              <div>
                <h3>What to examine</h3>
                <p>{study.lens}</p>
              </div>
            </div>
            <div className="case-table-wrap">
              <table className="case-table">
                <thead>
                  <tr>
                    <th>Curve rank</th>
                    <th>Team</th>
                    <th>Record</th>
                    <th>Curve</th>
                    <th>Network</th>
                    <th>Win quality</th>
                    <th>Achievement</th>
                    <th>SOS</th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((team) => (
                    <tr key={team.team}>
                      <td>#{team.rank}</td>
                      <td><strong>{team.team}</strong></td>
                      <td>{team.record}</td>
                      <td>{team.rating.toFixed(1)}</td>
                      <td>{team.networkScore.toFixed(1)}</td>
                      <td>{team.qualityOfWins.toFixed(1)}</td>
                      <td>{team.achievementScore.toFixed(1)}</td>
                      <td>#{team.scheduleRank}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={`case-verdict ${verdict.agrees ? "agrees" : "disagrees"}`}>
              <strong>{verdict.agrees ? "AGREES" : "DISAGREES"}</strong>
              {verdict.text}
            </p>
          </article>
        ))}
      </section>
      <SiteFooter modelVersion={modelVersion} />
    </main>
  );
}
