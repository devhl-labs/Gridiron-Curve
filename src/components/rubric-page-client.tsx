"use client";

import { useSearchParams } from "next/navigation";
import { EngineSelect } from "@/components/engine-select";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  parseRankingEngineId,
  rankingEngineDisplayName,
  rankingEngineName,
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

export function RubricPageClient() {
  const searchParams = useSearchParams();
  const engineId = parseRankingEngineId(searchParams.get("engine"));
  const engineDisplayName = rankingEngineDisplayName(engineId);
  const engineName = rankingEngineName(engineId);

  return (
    <main>
      <SiteHeader active="rubric" />
      <section className="info-hero rubric-hero">
        <span className="kicker">ENGINE RUBRIC</span>
        <h1>What {engineDisplayName}<br /><em>rewards.</em></h1>
        <p>
          Each ranking engine can define a different way to evaluate a resume.
          This rubric describes the criteria used by {engineDisplayName}.
        </p>
        <div className="rubric-engine-control">
          <EngineSelect selectedEngineId={engineId} />
        </div>
      </section>

      <section className="rubric-overview">
        <article>
          <span className="kicker">THE QUESTION</span>
          <h2>What has each team earned?</h2>
          <p>
            {engineDisplayName} is a resume engine. It rewards accomplished
            results in the context of who each team played.
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
          <span className="kicker">EIGHT CRITERIA</span>
          <h2>{engineName} rubric</h2>
          <p>
            These criteria describe the current engine strategy. Another
            resume engine may use a different rubric while answering the same
            ranking question.
          </p>
        </div>
        <ol className="rubric-list">
          {curveCriteria.map(({ title, description }, index) => (
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
