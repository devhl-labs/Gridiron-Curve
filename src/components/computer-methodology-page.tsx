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

const METHODOLOGIES: Record<RankingSystemId, Methodology> = {
  "Blend.6.0": {
    headline: "Computer results, checked by people.",
    introduction:
      "Computer + AP/Coaches combines Computer Composite 6 with the AP and Coaches polls. The computer result receives half the weight, while each poll receives one quarter.",
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
          "Computer Composite 6 has the same total influence as the two human polls combined.",
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
  "Consensus.6.0": {
    headline: "Reward conquered schedules, then account for losses.",
    introduction:
      "Computer Composite 6 combines Record Value and opponent-adjusted Performance, checks provisional Top-25 résumés, and applies smooth loss pressure where the base ranking is strongest.",
    sections: [
      {
        kicker: "01 · BASE COMPOSITE",
        title: "Balance record value and performance",
        description:
          "Record Value measures what the record earned against its opponents. Capped-Margin Performance measures how well the team played after opponent adjustment. Their tie-safe full-field positions receive 40% and 60%.",
        formula: "B = 0.40V + 0.60P",
        formulaDescription:
          "B is the base position, V is Record Value, and P is Capped-Margin Performance.",
      },
      {
        kicker: "02 · RÉSUMÉ EVIDENCE",
        title: "Grade the schedule and the best two wins",
        description:
          "Canonical Result Network supplies opponent ranks and the displayed schedule strength. It receives no separate direct vote. A weak schedule matters most when the team's two strongest wins are also weak.",
      },
      {
        kicker: "03 · MATURITY",
        title: "Wait for the season to develop",
        description:
          "Résumé and loss pressure are zero through two completed FBS games, rise linearly from the third through eighth FBS game, and then reach full strength. FCS games do not advance maturity.",
        formula: "M = clamp((G − 2) ÷ 6, 0, 1)",
        formulaDescription:
          "G is completed FBS games and M is résumé maturity.",
      },
      {
        kicker: "04 · TOP-25 CERTIFICATION",
        title: "Apply pressure without a hard ceiling",
        description:
          "Every provisional Top-25 team and each replacement entrant is checked recursively. Below-median schedules can add up to 14 positions of pressure, scaled continuously by schedule weakness, best-two-win weakness, and maturity.",
        formula: "R = 14 × S × W × M",
        formulaDescription:
          "R is résumé pressure; S, W, and M are schedule weakness, best-two-win weakness, and maturity.",
      },
      {
        kicker: "05 · LOSS PRESSURE",
        title: "Distinguish schedule faced from schedule conquered",
        description:
          "The first loss carries one unit, the second adds four, and each later loss adds two. That total is multiplied by maturity and by the base provisional-rank percentile to the 12th power. The steep continuous curve is strongest near No. 1 and nearly zero in the lower field, without a Top-10 cliff. The rank is fixed before either pressure is applied, so the adjustment cannot feed back into itself.",
        formula: "L = U(losses) × Q¹² × M",
        formulaDescription:
          "L is loss pressure, U is 0/1/5 then +2 per later loss, Q is the pre-pressure provisional-rank percentile, and M is maturity.",
      },
      {
        kicker: "06 · SHARED START",
        title: "Stabilize sparse early schedules",
        description:
          "All three evidence families receive the same preseason AP/Coaches and prior-season Curve order. It informs early opponent estimates and positions, then fades linearly to zero after Week 6.",
        formula: "w = max(0, 1 − week ÷ 6)",
        formulaDescription:
          "After Week 6, only current-season games affect the evidence families.",
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
  "RecordValue.2.0": {
    headline: "What did that record conquer?",
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
        kicker: "03 · EARNED OPPONENT VALUE",
        title: "Credit defeated opponents, not merely scheduled opponents",
        description:
          "A win earns the defeated opponent's Result Network percentile. Every loss receives the same −0.75 debit, so merely facing an elite team does not create accomplishment credit. A tie uses the midpoint between the win credit and loss debit.",
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
          "A close loss to an elite opponent may improve the performance estimate. Outcome and record accomplishment remain separate evidence in Computer Composite 6.",
      },
      {
        kicker: "05 · PRIOR",
        title: "Estimate early opponents, then become neutral",
        description:
          "The shared preseason order stabilizes sparse early schedules and fades completely after Week 6.",
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
