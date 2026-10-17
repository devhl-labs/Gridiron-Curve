"use client";

import { RankingSystemSelect } from "@/components/ranking-system-select";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  rankingSystemDisplayName,
  type RankingSystemId,
} from "@/lib/ranking";

type MethodSection = {
  kicker: string;
  title: string;
  description: string;
  formula?: string;
  formulaDescription?: string;
};

type Methodology = {
  headline: string;
  introduction: string;
  sections: MethodSection[];
};

const METHODOLOGIES: Partial<Record<RankingSystemId, Methodology>> = {
  "Blend.1.0": {
    headline: "Computer results, checked by people.",
    introduction:
      "Computer + AP/Coaches combines the Computer Composite with the AP and Coaches polls. The computer result carries half the normal weight, while each poll carries one quarter.",
    sections: [
      {
        kicker: "01 · COMMON POINTS",
        title: "Put three rankings on one scale",
        description:
          "Each source receives 25 points for No. 1, 24 for No. 2, down to one point for No. 25. An unranked team receives zero poll points. Computer Composite positions below No. 25 receive a descending fraction below one point so the complete FBS field does not collapse into one zero-score tie.",
        formula:
          "P(r) = 26 − r for r ≤ 25; C(r) = (N − r) ÷ (N − 25) after No. 25",
        formulaDescription:
          "The Top-25 conversion applies to all sources; only the full-field Computer Composite supplies the sub-one-point tail after No. 25.",
      },
      {
        kicker: "02 · WEIGHTING",
        title: "Balance computers and polls",
        description:
          "The complete six-model Computer Composite has the same total influence as the two human polls combined.",
        formula: "B = 0.50C + 0.25A + 0.25H",
        formulaDescription:
          "B is the combined score, C is Computer Composite points, A is AP points, and H is Coaches points.",
      },
      {
        kicker: "03 · EXACT TIES",
        title: "Use the field before another formula",
        description:
          "Teams with exactly the same combined score are compared by their win percentage in completed head-to-head games among that tied group. If head-to-head cannot separate them, the complete Computer Composite rank decides.",
      },
      {
        kicker: "04 · POLL TIMING",
        title: "Never borrow a future opinion",
        description:
          "A ranking through Week W targets polls labeled Week W+1. When historical data is missing that release, each poll uses its latest available week at or before the target. If an entire poll is unavailable, the displayed available-source weights are proportionally renormalized.",
      },
    ],
  },
  "Consensus.1.0": {
    headline: "Six rankings. One composite.",
    introduction:
      "The Computer Composite combines six separately calculated full-field rankings. For each team, it removes that team's best and worst component positions and averages the middle four.",
    sections: [
      {
        kicker: "01 · COMPONENTS",
        title: "Start with six complete rankings",
        description:
          "Curve.5, Record Matrix, Pairwise Odds, Result Sequence, Least Squares, and Victory Paths each rank the same FBS field from the same completed-game snapshot.",
      },
      {
        kicker: "02 · COMMON SCALE",
        title: "Use positions, not incompatible raw scores",
        description:
          "Every component contributes its full-field rank. This prevents one method's numerical scale from carrying more weight than another method's scale.",
        formula: "r₁, r₂, r₃, r₄, r₅, r₆",
        formulaDescription:
          "Each r is the team's position in one component ranking.",
      },
      {
        kicker: "03 · TRIM",
        title: "Remove both extremes",
        description:
          "The best and worst component positions are discarded independently for every team. A single unusually favorable or unfavorable model therefore cannot determine the result.",
        formula: "C = (r₍₂₎ + r₍₃₎ + r₍₄₎ + r₍₅₎) ÷ 4",
        formulaDescription:
          "The ordered middle four positions form the composite average.",
      },
      {
        kicker: "04 · ORDER",
        title: "Lowest average ranks first",
        description:
          "Teams are ordered by the trimmed average. Exact ties use the untrimmed six-model average, then strength of schedule, then team name for deterministic publication.",
      },
    ],
  },
  "RecordMatrix.1.0": {
    headline: "Record plus connected schedule.",
    introduction:
      "Record Matrix solves one connected system in which a team's value depends on its wins, losses, and the values of every opponent it played.",
    sections: [
      {
        kicker: "01 · EVIDENCE",
        title: "Count completed results",
        description:
          "Every completed regular-season game contributes one schedule connection. A win raises the right side of the team's equation and a loss lowers it.",
      },
      {
        kicker: "02 · MATRIX",
        title: "Solve every team together",
        description:
          "Each opponent appears in the team's equation, so schedule strength is produced by the connected result graph rather than added as a separate bonus.",
        formula: "(2 + nᵢ)rᵢ − Σ nᵢⱼrⱼ = 1 + (wᵢ − lᵢ) ÷ 2",
        formulaDescription:
          "n is games played, nᵢⱼ is meetings with an opponent, and r is the solved rating.",
      },
      {
        kicker: "03 · PUBLICATION",
        title: "Rank the FBS field",
        description:
          "Lower-division opponents remain result-graph nodes when they play an FBS team, but only FBS teams are published.",
      },
    ],
  },
  "Pairwise.1.0": {
    headline: "Find the most plausible strengths.",
    introduction:
      "Pairwise Odds chooses team values that make the observed wins and losses collectively likely, with modest stabilization for sparse early-season schedules.",
    sections: [
      {
        kicker: "01 · MATCHUP ODDS",
        title: "Convert rating differences to probabilities",
        description:
          "Equal ratings imply even odds. A larger positive difference makes a win more likely without making an upset impossible.",
        formula: "p(i beats j) = 1 ÷ (1 + e^(rⱼ − rᵢ))",
        formulaDescription:
          "Only the result enters the likelihood; scoring margin and venue do not.",
      },
      {
        kicker: "02 · FIT",
        title: "Fit all results at once",
        description:
          "The ratings repeatedly move toward the values that best explain every observed outcome. A small symmetric penalty keeps undefeated and winless groups finite.",
      },
      {
        kicker: "03 · PUBLICATION",
        title: "Turn fitted values into ranks",
        description:
          "The fitted values order the common FBS field. Raw probability-model values are not mixed directly with other systems.",
      },
    ],
  },
  "Sequence.1.0": {
    headline: "Let each result update the next.",
    introduction:
      "Result Sequence begins every team evenly and processes completed games chronologically. Unexpected results produce larger two-team updates.",
    sections: [
      {
        kicker: "01 · EXPECTATION",
        title: "Set pregame expectations",
        description:
          "The current rating difference defines the expected result before each game.",
        formula: "Eᵢ = 1 ÷ (1 + 10^((Rⱼ − Rᵢ) ÷ 400))",
        formulaDescription:
          "Equal ratings produce a 50% expectation.",
      },
      {
        kicker: "02 · UPDATE",
        title: "Reward surprise",
        description:
          "Both teams receive equal and opposite updates. Beating a highly rated opponent moves the winner more than an expected win.",
        formula: "ΔRᵢ = 24 × (Sᵢ − Eᵢ)",
        formulaDescription:
          "S is 1 for a win, 0.5 for a tie, and 0 for a loss.",
      },
      {
        kicker: "03 · RESET",
        title: "Start each season neutral",
        description:
          "No preseason poll, previous-season result, scoring margin, venue, or brand value enters this component.",
      },
    ],
  },
  "LeastSquares.1.0": {
    headline: "Fit the cleanest result differences.",
    introduction:
      "Least Squares treats every win as a one-unit result relationship and finds the set of team values that minimizes total disagreement across the connected schedule.",
    sections: [
      {
        kicker: "01 · GAME EQUATIONS",
        title: "Represent outcomes consistently",
        description:
          "A win targets a one-unit advantage, a loss targets a one-unit disadvantage, and a tie targets equality.",
        formula: "rᵢ − rⱼ = 1",
        formulaDescription:
          "The target is constant; a 40-point win and a one-point win are identical.",
      },
      {
        kicker: "02 · GLOBAL FIT",
        title: "Minimize total squared error",
        description:
          "Because schedules conflict and form cycles, the system solves for the ratings that best satisfy all game equations together.",
        formula: "min Σ(rᵢ − rⱼ − yᵢⱼ)² + Σrᵢ²",
        formulaDescription:
          "The final term supplies symmetric early-season stabilization.",
      },
      {
        kicker: "03 · PUBLICATION",
        title: "Order the fitted ratings",
        description:
          "Only current-season completed outcomes enter the fit, and only FBS teams appear in the published ranking.",
      },
    ],
  },
  "VictoryPaths.1.0": {
    headline: "Pass value through victories.",
    introduction:
      "Victory Paths builds a directed graph from each losing team toward the team that defeated it, then repeatedly distributes value through those paths.",
    sections: [
      {
        kicker: "01 · GRAPH",
        title: "Point each result toward the winner",
        description:
          "A defeated team passes value to the winner. Ties create equal half-strength paths in both directions.",
      },
      {
        kicker: "02 · RECURSION",
        title: "Reward victories over valuable opponents",
        description:
          "A win becomes more valuable when the defeated opponent has accumulated value from its own results. Repeated updates propagate that context across the schedule.",
        formula: "v′ = 0.15 ÷ N + 0.85 × transferred value",
        formulaDescription:
          "The common reset share keeps sparse and disconnected schedules stable.",
      },
      {
        kicker: "03 · PUBLICATION",
        title: "Rank by settled graph value",
        description:
          "The process continues until values stop materially changing. Scores, venue, polls, and previous seasons are excluded.",
      },
    ],
  },
};

type ComputerMethodologyPageProps = {
  rankingSystemId: RankingSystemId;
};

export function ComputerMethodologyPage({
  rankingSystemId,
}: ComputerMethodologyPageProps) {
  const methodology = METHODOLOGIES[rankingSystemId];
  if (!methodology) {
    throw new Error(`No computer methodology is defined for ${rankingSystemId}.`);
  }
  const displayName = rankingSystemDisplayName(rankingSystemId);

  return (
    <main>
      <SiteHeader
        active="methodology"
        status={`Methodology · ${displayName}`}
        rankingSystemId={rankingSystemId}
      />
      <section className="info-hero">
        <span className="kicker">HOW IT WORKS</span>
        <h1>{methodology.headline}</h1>
        <p>{methodology.introduction}</p>
        <div className="case-model-control">
          <RankingSystemSelect
            selectedSystemId={rankingSystemId}
            showDescription
          />
        </div>
      </section>
      <section className="method-details">
        {methodology.sections.map((section) => (
          <div className="method-section" key={section.kicker}>
            <span className="kicker">{section.kicker}</span>
            <h2>{section.title}</h2>
            <p>{section.description}</p>
            {section.formula && (
              <div className="formula-block">
                <code>{section.formula}</code>
                <span>{section.formulaDescription}</span>
              </div>
            )}
          </div>
        ))}
        <div className="method-section">
          <span className="kicker">INDEPENDENT IMPLEMENTATION</span>
          <h2>Generic mathematics, original code</h2>
          <p>
            This project uses descriptive names and independently written
            implementations of established mathematical techniques. These
            systems do not claim to reproduce, represent, or be affiliated
            with any historical or commercial ranking provider.
          </p>
          <p className="method-note">
            The computer components are FBS adaptations built from the
            project&apos;s published game cache. Lower-division schedules are
            not represented beyond games involving an FBS team.
          </p>
        </div>
      </section>
      <SiteFooter rankingSystemId={rankingSystemId} />
    </main>
  );
}
