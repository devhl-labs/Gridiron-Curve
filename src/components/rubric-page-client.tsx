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

const curveCriteria = [
  {
    title: "Completed games are the evidence",
    description:
      "Rankings measure what teams have done on the field, not what they might do next week.",
  },
  {
    title: "Results come before projections",
    description:
      "Wins and losses carry more authority than talent estimates, betting markets, or hypothetical matchups.",
  },
  {
    title: "Opponent quality must be earned",
    description:
      "A team is a strong opponent because of its results and schedule, not its logo, conference, or preseason reputation.",
  },
  {
    title: "The same rules apply to every team",
    description:
      "Every result is evaluated by one published standard regardless of brand, ranking, or postseason expectations.",
  },
  {
    title: "Margin provides context, not absolution",
    description:
      "How decisively a team played can distinguish similar results, but a convincing loss does not become a win.",
  },
  {
    title: "Starting assumptions must fade",
    description:
      "Preseason information may stabilize early rankings, but played games steadily replace inherited expectations.",
  },
  {
    title: "The whole resume matters",
    description:
      "Head-to-head results matter without erasing every other opponent, win, loss, and degree of difficulty.",
  },
  {
    title: "Every ranking should be explainable",
    description:
      "A team's position should be traceable to its schedule, results, opponents, and the published methodology.",
  },
];

const computerCriteria = [
  {
    title: "Completed outcomes are the evidence",
    description:
      "Only completed regular-season wins, losses, and ties can change the ranking.",
  },
  {
    title: "Every team starts evenly",
    description:
      "Preseason polls, previous seasons, recruiting, and brand reputation are excluded.",
  },
  {
    title: "Opponent context is connected",
    description:
      "A result gains meaning through the opponent's results and the larger schedule graph.",
  },
  {
    title: "Winning margin is irrelevant",
    description:
      "A one-point win and a forty-point win contribute the same outcome.",
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
    title: "The formula is versioned",
    description:
      "Parameters and behavior remain fixed within a published system version.",
  },
  {
    title: "The implementation is inspectable",
    description:
      "The project publishes its own code and methodology rather than claiming an opaque external result.",
  },
];

function consensusCriteria(componentCount: number) {
  const includedCount = componentCount - 2;
  return [
    {
      title: `${componentCount} complete rankings vote`,
      description:
        "Every component evaluates the same FBS field from the same completed-game snapshot.",
    },
    {
      title: "Positions share one scale",
      description:
        "The composite uses full-field ranks instead of mixing incompatible raw rating values.",
    },
    {
      title: "Every component has equal weight",
      description:
        "No method receives an editorial multiplier inside the composite.",
    },
    {
      title: "The best rank is discarded",
      description:
        "One unusually favorable component cannot lift a team by itself.",
    },
    {
      title: "The worst rank is discarded",
      description:
        "One unusually unfavorable component cannot sink a team by itself.",
    },
    {
      title: `The middle ${includedCount} decide`,
      description:
        "The arithmetic mean of the remaining positions determines the consensus order.",
    },
    {
      title: "Disagreement remains visible",
      description:
        "Published component positions identify which values were included and discarded.",
    },
    {
      title: "Components remain independently versioned",
      description:
        "Changing one component creates a new composite version rather than silently rewriting history.",
    },
  ];
}

const weightedConsensusCriteria = [
  {
    title: "Three evidence families vote",
    description:
      "Graded Résumé, Schedule-Adjusted Record, and the Neutral Computer Family rank the same complete FBS field.",
  },
  {
    title: "Schedule-adjusted results lead",
    description:
      "Schedule-Adjusted Record carries 60% so wins over weak opponents cannot dominate through record alone.",
  },
  {
    title: "Résumé context remains independent",
    description:
      "Graded Résumé contributes 20% using its published opponent and accomplishment evaluation.",
  },
  {
    title: "Related neutral methods share one vote",
    description:
      "Record Matrix, Result Sequence, Least Squares, and Victory Paths first form one equally weighted family ranking.",
  },
  {
    title: "The neutral family contributes 20%",
    description:
      "The four related algorithms collectively receive one family vote rather than four separate votes.",
  },
  {
    title: "Positions share one scale",
    description:
      "Every family contributes a full-field rank instead of mixing incompatible raw rating values.",
  },
  {
    title: "Every weight is published",
    description:
      "Ranking rows expose all three family positions and their 20/60/20 weights.",
  },
  {
    title: "Every version remains reproducible",
    description:
      "Earlier composite formulas remain directly addressable rather than being silently rewritten.",
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
  const isCurve = engineId.startsWith("Curve.");
  const isConsensus = engineId.startsWith("Consensus.");
  const isWeightedConsensus = engineId === "Consensus.3";
  const isBlend = engineId.startsWith("Blend.");
  const criteria = isCurve
    ? curveCriteria
    : isBlend
      ? blendCriteria
    : isConsensus
      ? engineId === "Consensus.3"
        ? weightedConsensusCriteria
        : consensusCriteria(engineId === "Consensus.2" ? 5 : 6)
      : computerCriteria;

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
              : isWeightedConsensus
              ? "Which records earned the most?"
              : isConsensus
              ? "Where do the methods agree?"
              : "What has each team earned?"}
          </h2>
          <p>
            {isBlend
              ? `${publicEngineName} balances the Computer Composite with current AP and Coaches opinion.`
              : isWeightedConsensus
              ? `${publicEngineName} balances opponent-weighted results with résumé context and one neutral algorithm family.`
              : isConsensus
              ? `${publicEngineName} rewards agreement across independent result-based approaches.`
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
