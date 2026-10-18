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
  "Blend.2.0": {
    headline: "Computer results, checked by people.",
    introduction:
      "Computer + AP/Coaches combines Computer Composite 2 with the AP and Coaches polls. The computer result carries half the normal weight, while each poll carries one quarter.",
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
          "The five-model Computer Composite has the same total influence as the two human polls combined.",
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
  "Blend.3.0": {
    headline: "Computer results, checked by people.",
    introduction:
      "Computer + AP/Coaches combines Computer Composite 3 with the AP and Coaches polls. The computer result carries half the normal weight, while each poll carries one quarter.",
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
          "The three-family Computer Composite has the same total influence as the two human polls combined.",
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
  "Consensus.2.0": {
    headline: "Five rankings. One composite.",
    introduction:
      "Computer Composite 2 combines five separately calculated full-field rankings. For each team, it removes that team's best and worst component positions and averages the middle three.",
    sections: [
      {
        kicker: "01 · COMPONENTS",
        title: "Start with five distinct rankings",
        description:
          "Curve.5, Record Matrix, Result Sequence, Least Squares, and Victory Paths each rank the same FBS field from the same completed-game snapshot. Pairwise Odds remains published as an individual model but does not vote in this composite.",
      },
      {
        kicker: "02 · COMMON SCALE",
        title: "Use positions, not incompatible raw scores",
        description:
          "Every component contributes its full-field rank. This prevents one method's numerical scale from carrying more weight than another method's scale.",
        formula: "r₁, r₂, r₃, r₄, r₅",
        formulaDescription:
          "Each r is the team's position in one component ranking.",
      },
      {
        kicker: "03 · TRIM",
        title: "Remove both extremes",
        description:
          "The best and worst component positions are discarded independently for every team. A single unusually favorable or unfavorable model therefore cannot determine the result.",
        formula: "C = (r₍₂₎ + r₍₃₎ + r₍₄₎) ÷ 3",
        formulaDescription:
          "The ordered middle three positions form the composite average.",
      },
      {
        kicker: "04 · ORDER",
        title: "Lowest average ranks first",
        description:
          "Teams are ordered by the trimmed average. Exact ties use the untrimmed five-model average, then strength of schedule, then team name for deterministic publication.",
      },
    ],
  },
  "Consensus.3.0": {
    headline: "Three evidence families. One composite.",
    introduction:
      "Computer Composite 3 gives 20% to Graded Résumé, 60% to Schedule-Adjusted Record, and 20% to one Neutral Computer Family ranking.",
    sections: [
      {
        kicker: "01 · EVIDENCE FAMILIES",
        title: "Separate different questions",
        description:
          "Graded Résumé measures accomplishment, Schedule-Adjusted Record values results by opponent strength, and the Neutral Computer Family supplies a current-season algorithmic check.",
      },
      {
        kicker: "02 · ONE NEUTRAL VOTE",
        title: "Collapse related algorithms into one family",
        description:
          "Record Matrix, Result Sequence, Least Squares, and Victory Paths are averaged by full-field position and reranked before entering the composite. Together they receive one vote rather than four.",
        formula: "N = rank[(R + Q + L + V) ÷ 4]",
        formulaDescription:
          "N is the Neutral Computer Family rank produced from the four equally weighted component positions.",
      },
      {
        kicker: "03 · WEIGHTING",
        title: "Make schedule-adjusted results decisive",
        description:
          "The weighting prevents several related record algorithms from overpowering evidence that distinguishes strong and weak opponents.",
        formula: "C = 0.20R + 0.60S + 0.20N",
        formulaDescription:
          "R is Graded Résumé rank, S is Schedule-Adjusted Record rank, and N is Neutral Computer Family rank.",
      },
      {
        kicker: "04 · ORDER",
        title: "Lowest weighted position ranks first",
        description:
          "Exact ties use the unweighted three-family average, then strength of schedule, then team name for deterministic publication.",
      },
    ],
  },
  "Consensus.4.0": {
    headline: "Two evidence blocks. One computer ranking.",
    introduction:
      "Computer Composite 4 balances schedule-sensitive outcome evidence with opponent-adjusted performance. Closely related outcome algorithms are grouped before the Outcome and Performance blocks receive equal weight.",
    sections: [
      {
        kicker: "01 · OUTCOME BLOCK",
        title: "Combine two views of what the record earned",
        description:
          "Canonical Result Network averages Colley, Bradley–Terry, and binary Massey. Record Value averages Opponent Value, Wins Above Expectation, and Strength of Record. Their tie-safe full-field positions are averaged into one Outcome Block.",
        formula: "O = (R + V) ÷ 2",
        formulaDescription:
          "R is Canonical Result Network position and V is Record Value position.",
      },
      {
        kicker: "02 · PERFORMANCE BLOCK",
        title: "Adjust capped scoring margins for opponents",
        description:
          "Capped-Margin Performance averages opponent-adjusted Massey positions using 14-, 21-, and 28-point margin caps. Multiple caps reduce dependence on one arbitrary blowout threshold.",
      },
      {
        kicker: "03 · EQUAL BLOCKS",
        title: "Balance outcomes and performance",
        description:
          "Outcome and Performance receive equal block weight. Expanded across the three published families, the weights are 25% Result Network, 25% Record Value, and 50% Performance.",
        formula: "C = 0.50O + 0.50P",
        formulaDescription:
          "C is the composite position, O is the Outcome Block, and P is Capped-Margin Performance position.",
      },
      {
        kicker: "04 · SHARED START",
        title: "Stabilize sparse early schedules",
        description:
          "All three families receive the same preseason AP/Coaches and prior-season Curve order. The prior informs early opponent estimates and published positions, then fades linearly to zero after six completed weeks.",
        formula: "w = max(0, 1 − week ÷ 6)",
        formulaDescription:
          "After Week 6, only current-season games affect the three families.",
      },
      {
        kicker: "05 · COMMON SCALE",
        title: "Average positions, not incompatible scores",
        description:
          "Exact component-score ties receive their average position. The composite averages normalized full-field positions and uses team name only as the final deterministic tiebreak.",
      },
    ],
  },
  "ResultNetwork.1.0": {
    headline: "Three canonical result networks. One family.",
    introduction:
      "Canonical Result Network estimates the latent strengths that best explain the observed FBS win-and-loss graph.",
    sections: [
      {
        kicker: "01 · COMPONENTS",
        title: "Solve the result graph three ways",
        description:
          "Canonical Colley, regularized Bradley–Terry, and ridge-regularized binary Massey independently calculate complete FBS rankings from wins, losses, and ties.",
      },
      {
        kicker: "02 · FAMILY",
        title: "Average tie-safe positions",
        description:
          "The three algorithms are highly correlated, so they produce one family vote rather than three separate composite votes.",
        formula: "R = rank[(C + B + M) ÷ 3]",
        formulaDescription:
          "C, B, and M are tie-safe Colley, Bradley–Terry, and binary Massey positions.",
      },
      {
        kicker: "03 · PRIOR",
        title: "Anchor a sparse graph, then let go",
        description:
          "The shared preseason order regularizes disconnected early schedules and opponent estimates. Its influence reaches zero after Week 6.",
      },
      {
        kicker: "04 · EXCLUSIONS",
        title: "Use outcomes, not margins",
        description:
          "Scoring margin, box-score statistics, venue, recruiting, conference, and in-season polls do not enter the current-season result evidence.",
      },
    ],
  },
  "RecordValue.1.0": {
    headline: "How difficult was that record?",
    introduction:
      "Record Value measures schedule-sensitive accomplishment through three related formulations and gives them one family vote.",
    sections: [
      {
        kicker: "01 · OPPONENT VALUE",
        title: "Reward strong wins and penalize weak losses",
        description:
          "A win earns the opponent's Bradley–Terry percentile. A loss pays a larger penalty when the opponent is weak. Lower-division wins receive no positive opponent-quality credit.",
      },
      {
        kicker: "02 · EXPECTATION",
        title: "Compare with a median FBS team",
        description:
          "Wins Above Expectation subtracts the record expected from a median FBS team against the same opponents.",
      },
      {
        kicker: "03 · RECORD PROBABILITY",
        title: "Measure how unusual the record is",
        description:
          "Strength of Record uses a Poisson-binomial schedule distribution to estimate how unlikely the achieved record or better would be for a median FBS team.",
      },
      {
        kicker: "04 · FAMILY AND PRIOR",
        title: "Average one record-value family",
        description:
          "Tie-safe positions from all three formulas are averaged. The shared preseason order stabilizes early opponent estimates and fades completely after Week 6.",
      },
    ],
  },
  "CappedMarginPerformance.1.0": {
    headline: "How strongly did the team perform?",
    introduction:
      "Capped-Margin Performance fits opponent-adjusted scoring margins while limiting the value of running up the score.",
    sections: [
      {
        kicker: "01 · MARGINS",
        title: "Cap every game three ways",
        description:
          "Separate Massey systems cap each scoring margin at 14, 21, and 28 points. A larger final margin beyond a cap cannot add more value to that component.",
      },
      {
        kicker: "02 · OPPONENT ADJUSTMENT",
        title: "Solve every performance together",
        description:
          "Each capped margin is adjusted through the connected FBS schedule, so the same score difference means more against stronger opposition.",
      },
      {
        kicker: "03 · FAMILY",
        title: "Do not pretend one cap is football truth",
        description:
          "The three tie-safe component positions are averaged into one Performance family.",
        formula: "P = rank[(M₁₄ + M₂₁ + M₂₈) ÷ 3]",
        formulaDescription:
          "Each M is the opponent-adjusted Massey position at one scoring-margin cap.",
      },
      {
        kicker: "04 · INTERPRETATION",
        title: "Performance is not the résumé",
        description:
          "A close loss to an elite opponent may improve the performance estimate. Outcome and record accomplishment remain separate evidence in Computer Composite 4.",
      },
      {
        kicker: "05 · PRIOR",
        title: "Estimate early opponents, then become neutral",
        description:
          "The shared preseason order stabilizes sparse early schedules and fades completely after Week 6.",
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
  "ScheduleRecord.1.0": {
    headline: "Credit results by opponent strength.",
    introduction:
      "Schedule-Adjusted Record gives each win or tie credit according to the opponent's neutral current-season strength, then averages that earned credit across the team's completed games.",
    sections: [
      {
        kicker: "01 · OPPONENT SCALE",
        title: "Fit neutral opponent strengths",
        description:
          "A paired-comparison fit uses completed wins and losses to order the FBS field without preseason polls, previous seasons, scoring margin, or brand reputation.",
      },
      {
        kicker: "02 · RESULT CREDIT",
        title: "Make weak wins worth less",
        description:
          "A win receives the opponent's neutral percentile, a tie receives half of it, and a loss receives no result credit. Lower-division opponents sit below the FBS percentile scale.",
        formula: "g = result × opponent percentile",
        formulaDescription:
          "Result is 1 for a win, 0.5 for a tie, and 0 for a loss.",
      },
      {
        kicker: "03 · COMPLETE RECORD",
        title: "Average every completed game",
        description:
          "The team score is its total earned result credit divided by games played. Beating stronger opponents therefore raises the record more than collecting the same number of weak wins.",
        formula: "S = Σg ÷ games played",
        formulaDescription:
          "The complete schedule remains visible; no best-win cutoff or team-specific cap is used.",
      },
    ],
  },
  "NeutralFamily.1.0": {
    headline: "Four neutral methods. One family vote.",
    introduction:
      "The Neutral Computer Family prevents several related current-season algorithms from receiving separate influence in the main composite.",
    sections: [
      {
        kicker: "01 · COMPONENTS",
        title: "Calculate four complete rankings",
        description:
          "Record Matrix, Result Sequence, Least Squares, and Victory Paths independently rank the same FBS field from completed current-season results.",
      },
      {
        kicker: "02 · COMMON SCALE",
        title: "Average full-field positions",
        description:
          "Each algorithm receives equal weight after its raw output is converted to a full-field rank.",
        formula: "F = (R + Q + L + V) ÷ 4",
        formulaDescription:
          "F is the family average of the four component positions.",
      },
      {
        kicker: "03 · PUBLICATION",
        title: "Rerank the family average",
        description:
          "The averaged positions produce one complete Neutral Computer Family ranking, which contributes one 20% vote to Computer Composite 3.",
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
