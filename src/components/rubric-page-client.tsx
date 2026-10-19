"use client";

import { useSearchParams } from "next/navigation";
import { EngineSelect } from "@/components/engine-select";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  isSelectableRankingEngineId,
  parseRankingEngineId,
  rankingEngineDisplayName,
  rankingEngineName,
  rankingEngineSelectDisplayName,
} from "@/lib/ranking";

const componentCriteria = [
  {
    title: "Completed games are the evidence",
    description:
      "Only completed regular-season games can change current-season evidence.",
  },
  {
    title: "Starting assumptions fade",
    description:
      "A shared prior stabilizes sparse early schedules and reaches zero after Week 6.",
  },
  {
    title: "Opponent context is connected",
    description:
      "A result gains meaning through the opponent's results and the larger schedule graph.",
  },
  {
    title: "Each family answers one question",
    description:
      "Result Network measures outcomes, Record Value measures schedule-adjusted accomplishment, and Performance measures capped scoring margins.",
  },
  {
    title: "Venue is irrelevant",
    description:
      "Home, road, and neutral-site outcomes enter with the same weight.",
  },
  {
    title: "The complete FBS field is ranked",
    description:
      "The method produces one deterministic order rather than only selecting a Top 25.",
  },
  {
    title: "Scores become tie-safe positions",
    description:
      "Composite inputs use full-field positions instead of mixing incompatible raw scales.",
  },
  {
    title: "The implementation is inspectable",
    description:
      "The project publishes its own code and methodology rather than claiming an opaque external result.",
  },
];

const consensusCriteria = [
  {
    title: "Two evidence families vote",
    description:
      "Record Value receives 40% and Capped-Margin Performance receives 60% of the base composite.",
  },
  {
    title: "Result Network grades the résumé",
    description:
      "Result Network supplies opponent ranks and schedule strength without receiving a separate direct vote.",
  },
  {
    title: "Top-25 résumés are certified",
    description:
      "Weak schedules and weak best-two wins can add up to 14 positions of downward pressure.",
  },
  {
    title: "Losses matter most near the top",
    description:
      "The first, second, and later losses add maturity-scaled pressure through a steep continuous curve based on the pre-pressure provisional rank.",
  },
  {
    title: "Positions share one scale",
    description:
      "The composite uses tie-safe full-field positions rather than mixing incompatible family scores.",
  },
  {
    title: "One shared prior stabilizes early weeks",
    description:
      "All three families use the same preseason information, which fades completely after Week 6.",
  },
  {
    title: "Pressure matures with evidence",
    description:
      "The résumé check is zero through two FBS games, grows linearly, and reaches full strength after eight.",
  },
  {
    title: "Close groups use earned tiebreaks",
    description:
      "After pressure, same-record teams separated by no more than one adjacent effective position use head-to-head, strongest defeated opponent, SOS, then preliminary order.",
  },
];

const blendCriteria = [
  {
    title: "Three published rankings contribute",
    description:
      "The Computer Composite, the AP Poll, and the Coaches Poll form the complete input set.",
  },
  {
    title: "Top-25 positions share one scale",
    description:
      "Each source receives 25 points for No. 1 through one point for No. 25.",
  },
  {
    title: "Computers retain half the influence",
    description:
      "The current Computer Composite carries 50%, while AP and Coaches each carry 25%.",
  },
  {
    title: "Poll timing follows completed games",
    description:
      "Computer + AP/Coaches targets the first poll release after the ranking's completed week and never borrows a future release.",
  },
  {
    title: "Missing history is visible",
    description:
      "Unavailable historical poll inputs receive no hidden substitute, and the remaining displayed weights are renormalized.",
  },
  {
    title: "Head-to-head breaks exact ties first",
    description:
      "Completed games among teams with identical combined scores take priority over another mathematical tiebreaker.",
  },
  {
    title: "The computer composite resolves remaining ties",
    description:
      "If head-to-head records cannot separate a tied group, the complete Computer Composite rank decides.",
  },
  {
    title: "Every input remains inspectable",
    description:
      "The published row exposes all three ranks, their effective weights, and any tied-group head-to-head record.",
  },
];

export function RubricPageClient() {
  const searchParams = useSearchParams();
  const engineId = parseRankingEngineId(searchParams.get("engine"));
  const engineDisplayName = rankingEngineDisplayName(engineId);
  const publicEngineName = isSelectableRankingEngineId(engineId)
    ? rankingEngineSelectDisplayName(engineId)
    : engineDisplayName;
  const engineName = rankingEngineName(engineId);
  const isConsensus = engineId.startsWith("Consensus.");
  const isBlend = engineId.startsWith("Blend.");
  const criteria = isBlend
      ? blendCriteria
    : isConsensus
      ? consensusCriteria
      : componentCriteria;

  return (
    <main>
      <SiteHeader active="rubric" />
      <section className="info-hero rubric-hero">
        <span className="kicker">ENGINE RUBRIC</span>
        <h1>What {publicEngineName}<br /><em>rewards.</em></h1>
        <p>
          Each ranking engine can define a different way to evaluate a resume.
          This rubric describes the criteria used by {publicEngineName}.
        </p>
        <div className="rubric-engine-control">
          <EngineSelect selectedEngineId={engineId} showDescription />
        </div>
      </section>

      <section className="rubric-overview">
        <article>
          <span className="kicker">THE QUESTION</span>
          <h2>
            {isBlend
              ? "Where do computers and polls agree?"
              : isConsensus
              ? "Which teams balance outcomes and performance?"
              : "What has each team earned?"}
          </h2>
          <p>
            {isBlend
              ? `${publicEngineName} balances the Computer Composite with current AP and Coaches opinion.`
              : isConsensus
              ? `${publicEngineName} balances schedule-sensitive outcome evidence with opponent-adjusted performance.`
              : `${publicEngineName} rewards accomplished results in the context of who each team played.`}
          </p>
        </article>
        <article>
          <span className="kicker">NOT A POWER RATING</span>
          <h2>No predictions disguised as results</h2>
          <p>
            This engine does not claim to predict tomorrow&apos;s winner or
            identify the most talented roster.
          </p>
        </article>
        <article>
          <span className="kicker">THE STANDARD</span>
          <h2>Consistent, inspectable rules</h2>
          <p>
            Every team is evaluated by the same versioned method, and every
            published model remains reproducible.
          </p>
        </article>
      </section>

      <section className="rubric-criteria">
        <div className="rubric-heading">
          <span className="kicker">{criteria.length} CRITERIA</span>
          <h2>
            {isSelectableRankingEngineId(engineId)
              ? publicEngineName
              : engineName} rubric
          </h2>
          <p>
            These criteria describe the current engine strategy. Another
            resume engine may use a different rubric while answering the same
            ranking question.
          </p>
        </div>
        <ol className="rubric-list">
          {criteria.map(({ title, description }, index) => (
            <li key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <SiteFooter />
    </main>
  );
}
