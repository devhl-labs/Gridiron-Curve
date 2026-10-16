"use client";

import { useSearchParams } from "next/navigation";
import { RankingSystemSelect } from "@/components/ranking-system-select";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  parseRankingSystemId,
  rankingSystemDisplayName,
} from "@/lib/ranking";

export function MethodologyPageClient() {
  const searchParams = useSearchParams();
  const rankingSystemId = parseRankingSystemId(searchParams.get("ranking"));
  const rankingSystemName = rankingSystemDisplayName(rankingSystemId);
  const priorFades = rankingSystemId !== "Curve.0.7";
  const separateExpectation =
    rankingSystemId === "Curve.0.9" ||
    rankingSystemId === "Curve.0.10" ||
    rankingSystemId === "Curve.0.11";
  const magnitudeNetwork = rankingSystemId === "Curve.0.10";
  const hybridNetwork = rankingSystemId === "Curve.0.11";
  const ratingBasedNetwork = magnitudeNetwork || hybridNetwork;

  return (
    <main>
      <SiteHeader
        active="methodology"
        status={`Methodology · ${rankingSystemName}`}
        rankingSystemId={rankingSystemId}
      />
      <section className="info-hero">
        <span className="kicker">HOW IT WORKS</span>
        <h1>Simple inputs.<br />Stronger context.</h1>
        <p>
          Gridiron Curve blends a connected win-loss network with transparent
          achievement points for exceeding expectations. This page documents
          {` ${rankingSystemName}`}.
        </p>
        <div className="case-model-control">
          <RankingSystemSelect selectedSystemId={rankingSystemId} />
        </div>
      </section>
      <section className="method-grid info-grid">
        <article><b>01 · 50%</b><h2>Update expectations</h2><p>{separateExpectation ? "Full inherited strength grades each result, while the published résumé fades that offset to a 25% floor over six weeks." : priorFades ? "The inherited offset fades to a 25% floor over six weeks in both game expectations and the published résumé." : "The full inherited offset remains in both game expectations and the published résumé throughout the season."}</p></article>
        <article><b>02 · 30%</b><h2>Value who was beaten</h2><p>Quality of wins averages each defeated opponent&apos;s previous-week network percentile. Until an opponent plays an FBS game, its preseason percentile remains the context. FCS wins receive zero.</p></article>
        <article><b>03 · 20%</b><h2>Reward achievement</h2><p>Average points per game reward exceeding expectations and penalize falling short, using margin and prior-week opponent strength.</p></article>
        <article><b>04</b><h2>Start with context</h2><p>The available preseason polls seed 2000. Each later season combines its preseason poll leaders with the previous season&apos;s final Gridiron Curve order. {priorFades ? "The inherited rating weight falls from 100% to 25% over six completed weeks." : "The inherited rating remains at full weight throughout the season."}</p></article>
      </section>
      <section className="method-details">
        <div className="method-section">
          <span className="kicker">01 · STARTING RATINGS</span>
          <h2>Build a complete preseason field</h2>
          <p>
            The available preseason polls seed the 2000 field. Every later
            season places its preseason poll consensus first, then orders the
            remaining current FBS teams by the immediately preceding final
            Gridiron Curve ranking. New FBS teams are appended deterministically.
            This avoids treating more than 100 unranked teams as identical.
          </p>
          <div className="formula-block">
            <code>B = 800 × (P − 0.50)</code>
            <span>
              <i>B</i> is the inherited rating offset and <i>P</i> is the
              full-field prior value.
            </span>
          </div>
          <div className="formula-block">
            <code>
              {priorFades
                ? "wₜ = max(0.25, 1 − 0.75t ÷ 6)"
                : "wₜ = 1"}
            </code>
            <span>
              <i>wₜ</i> is the inherited weight after <i>t</i> completed
              weeks{priorFades ? "." : " and remains at full strength."}
            </span>
          </div>
          <div className="formula-block">
            <code>Rₜ = 1500 + wₜB + Dₜ</code>
            <span>
              <i>Rₜ</i> is the published résumé rating. <i>Dₜ</i> contains
              only current-season result updates and never fades.
            </span>
          </div>
          {separateExpectation ? (
            <div className="formula-block">
              <code>Xₜ = 1500 + B + Dₜ</code>
              <span>
                <i>Xₜ</i> is expected team strength. It retains the full
                inherited offset so fading confidence does not compress every
                matchup toward 50%.
              </span>
            </div>
          ) : (
            <div className="formula-block">
              <code>Xₜ = Rₜ</code>
              <span>
                Expected strength and the published résumé use the same
                rating in {rankingSystemName}.
              </span>
            </div>
          )}
          <p className="method-note">
            The full order maps from 1700 for the first team to 1300 for the
            last. {priorFades
              ? "Its weight falls by 12.5 percentage points after each completed week: 100%, 87.5%, 75%, 62.5%, 50%, 37.5%, then 25% from Week 6 onward."
              : "Its weight remains at 100% throughout the season."}
          </p>
        </div>

        <div className="method-section">
          <span className="kicker">02 · EXPECTED RESULTS</span>
          <h2>Grade the result against the expectation</h2>
          <p>
            Before a game, the expected-strength difference determines each
            team&apos;s expected result. Equal teams each have a 50%
            expectation. A 400-point advantage corresponds to roughly a 91%
            expectation. {separateExpectation
              ? "This strength calculation is separate from the faded rating used to publish the résumé ranking."
              : `The same rating also determines the published résumé in ${rankingSystemName}.`}
          </p>
          <div className="formula-block">
            <code>Eₐ = 1 ÷ (1 + 10^((Xᵦ − Xₐ) ÷ 400))</code>
            <span>
              <i>Eₐ</i> is Team A&apos;s expected result before the game.
            </span>
          </div>
          <div className="formula-block">
            <code>ΔDₐ = 20 × (Sₐ − Eₐ)</code>
            <span>
              <i>Sₐ</i> is 1 for a win, 0.5 for a tie, and 0 for a loss. The
              update is added to the non-fading current-season component.
            </span>
          </div>
          <p className="method-note">
            If a team with an 80% expectation wins, it gains 4 rating points:
            <code>20 × (1 − 0.80)</code>. If it loses, it drops 16 points:
            <code>20 × (0 − 0.80)</code>.
          </p>
        </div>

        <div className="method-section">
          <span className="kicker">
            03 · {ratingBasedNetwork ? "NETWORK SCORE" : "NETWORK PERCENTILE"}
          </span>
          <h2>Put ratings on a common 0–100 scale</h2>
          {hybridNetwork ? (
            <>
              <p>
                The network component combines ordinal position with rating
                magnitude. Magnitude prevents a small lead in a compressed
                field from looking elite, while percentile preserves enough
                separation for actual results to matter.
              </p>
              <div className="formula-block">
                <code>M = clamp((Rₜ − 1300) ÷ 4, 0, 100)</code>
                <span>
                  <i>M</i> maps the résumé rating from 1300–1700 onto 0–100.
                </span>
              </div>
              <div className="formula-block">
                <code>N = 0.25P + 0.75M</code>
                <span>
                  <i>P</i> is ordinal network percentile and <i>N</i> is the
                  network score used in the final blend.
                </span>
              </div>
            </>
          ) : magnitudeNetwork ? (
            <>
              <p>
                The résumé rating is mapped directly onto the inherited
                1300–1700 scale. Rating magnitude matters: a small lead inside
                a compressed field no longer becomes an automatically elite
                network component.
              </p>
              <div className="formula-block">
                <code>N = clamp((Rₜ − 1300) ÷ 4, 0, 100)</code>
                <span>
                  A 1300 rating scores 0, 1500 scores 50, and 1700 scores 100.
                </span>
              </div>
            </>
          ) : (
            <>
              <p>
                After the weekly updates, all FBS network ratings are ordered
                from lowest to highest and converted to percentiles. Tied
                ratings share the midpoint of their occupied positions. This
                percentile is the 50% foundation of the final score.
              </p>
              <div className="formula-block">
                <code>N = 100 × position ÷ (FBS teams − 1)</code>
                <span>
                  <i>N</i> is the network percentile, where 100 is the highest
                  current network rating.
                </span>
              </div>
            </>
          )}
        </div>

        <div className="method-section">
          <span className="kicker">04 · QUALITY OF WINS</span>
          <h2>Measure who was actually beaten</h2>
          <p>
            Each win receives the defeated opponent&apos;s network percentile
            from before the game. The values are averaged across all wins, so
            one marquee result cannot completely hide the rest of a résumé.
          </p>
          <div className="formula-block">
            <code>Q = sum of win values ÷ number of wins</code>
            <span>
              <i>Q</i> is the quality-of-wins score used for 30% of the final
              rating.
            </span>
          </div>
          <div className="method-table-wrap">
            <table className="method-table">
              <thead><tr><th>Defeated opponent</th><th>Win value</th></tr></thead>
              <tbody>
                <tr><td>FBS team with prior FBS evidence</td><td>Previous-week network percentile</td></tr>
                <tr><td>FBS team with no prior FBS game</td><td>Preseason network percentile</td></tr>
                <tr><td>FCS team</td><td>0</td></tr>
              </tbody>
            </table>
          </div>
          <p className="method-note">A team without a win has a quality-of-wins score of 0.</p>
        </div>

        <div className="method-section">
          <span className="kicker">05 · ACHIEVEMENT</span>
          <h2>Reward margin without rewarding excess scoring</h2>
          <p>
            Achievement uses only three margin bands and three opponent bands.
            Opponent strength comes from the previous-week network percentile,
            so the game cannot change the context used to grade itself.
          </p>
          <div className="method-table-wrap">
            <table className="method-table">
              <thead><tr><th>Margin</th><th>Stronger win</th><th>Peer win</th><th>Weaker win</th></tr></thead>
              <tbody>
                <tr><td>Dominant · 17+</td><td>4</td><td>3</td><td>1</td></tr>
                <tr><td>Clear · 7–16</td><td>3</td><td>2</td><td>0.75</td></tr>
                <tr><td>Close · 1–6</td><td>2</td><td>1</td><td>0.5</td></tr>
              </tbody>
            </table>
          </div>
          <div className="method-table-wrap">
            <table className="method-table">
              <thead><tr><th>Margin</th><th>Stronger loss</th><th>Peer loss</th><th>Weaker loss</th></tr></thead>
              <tbody>
                <tr><td>Dominant · 17+</td><td>−1</td><td>−2</td><td>−4</td></tr>
                <tr><td>Clear · 7–16</td><td>−0.5</td><td>−1</td><td>−2</td></tr>
                <tr><td>Close · 1–6</td><td>0</td><td>−0.5</td><td>−1</td></tr>
              </tbody>
            </table>
          </div>
          <p className="method-note">
            Stronger means at least 5 percentile points above the team, weaker
            means at least 5 below, and all other opponents are peers. Dominant,
            clear, and close FCS wins earn 0.25, 0.1, and 0 points.
          </p>
          <div className="formula-block">
            <code>A = clamp(50 + 15 × average achievement, 0, 100)</code>
            <span>
              <i>A</i> is the achievement score used for 20% of the final
              rating.
            </span>
          </div>
        </div>

        <div className="method-section">
          <span className="kicker">06 · FINAL RATING</span>
          <h2>Combine the three independent views</h2>
          <div className="formula-block formula-primary">
            <code>Curve = 0.50N + 0.30Q + 0.20A</code>
            <span>
              Network {ratingBasedNetwork ? "score" : "percentile"} + quality of
              wins + achievement.
            </span>
          </div>
          <p>
            Teams are ordered by the final Curve score. Exact score ties are
            broken by strength of schedule, calculated as the average current
            network percentile of opponents already played, then
            alphabetically for deterministic output.
          </p>
          <p className="method-note">
            Yardage, turnovers, venue, recency weighting, conference labels,
            and in-season human polls do not affect the rating. The FCS
            expectation is always 100 rating points below the current lowest
            FBS rating, and only FBS teams are published.
          </p>
        </div>

        <div className="method-section method-final">
          <span className="kicker">PRERELEASE VERSIONS</span>
          <h2>Reproduce each model iteration</h2>
          <p>
            The rankings and case studies can be recalculated with Curve.0.7
            through Curve.0.11. Every selection rebuilds the full historical
            chain with the same version, including each previous season&apos;s
            final order.
          </p>
          <div className="method-table-wrap">
            <table className="method-table">
              <thead>
                <tr>
                  <th>Version</th>
                  <th>Published prior</th>
                  <th>Expectation prior</th>
                  <th>Network component</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{rankingSystemDisplayName("Curve.0.7")}</td>
                  <td>100%</td>
                  <td>100%</td>
                  <td>Percentile</td>
                </tr>
                <tr>
                  <td>{rankingSystemDisplayName("Curve.0.8")}</td>
                  <td>Fades to 25%</td>
                  <td>Fades to 25%</td>
                  <td>Percentile</td>
                </tr>
                <tr>
                  <td>{rankingSystemDisplayName("Curve.0.9")}</td>
                  <td>Fades to 25%</td>
                  <td>100%</td>
                  <td>Percentile</td>
                </tr>
                <tr>
                  <td>{rankingSystemDisplayName("Curve.0.10")}</td>
                  <td>Fades to 25%</td>
                  <td>100%</td>
                  <td>Rating magnitude</td>
                </tr>
                <tr>
                  <td>{rankingSystemDisplayName("Curve.0.11")}</td>
                  <td>Fades to 25%</td>
                  <td>100%</td>
                  <td>25% percentile + 75% magnitude</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="method-note">
            These labels identify prerelease versions of the same model, not
            separately named ranking systems. Curve.0.11 is the default when a
            URL does not specify a model.
          </p>
        </div>

        <div className="method-section method-final">
          <span className="kicker">SUPPLEMENTAL METRIC · SOS</span>
          <h2>Describe the road already traveled</h2>
          <p>
            SOS Played averages the current network percentiles of every
            completed regular-season opponent. Because current ratings are
            used, schedule strength changes retroactively when an opponent
            improves or declines later in the season.
          </p>
          <div className="formula-block">
            <code>SOS played = sum of opponent network percentiles ÷ games played</code>
            <span>
              FCS opponents contribute 0. A team without a completed game
              receives a neutral value of 50.
            </span>
          </div>
          <p>
            SOS Upcoming applies the same calculation to opponents remaining
            on the regular-season schedule, using their current network
            percentiles. Teams are then ordered from hardest to easiest, so
            SOS rank #1 is the hardest schedule.
          </p>
          <div className="formula-block">
            <code>SOS upcoming = sum of remaining opponent percentiles ÷ remaining games</code>
            <span>
              Result, margin, venue, and whether the team beat an opponent do
              not change schedule strength.
            </span>
          </div>
          <p className="method-note">
            SOS is not a fourth weighted component. Network expectations,
            quality of wins, and achievement already incorporate opponent
            context. Raw SOS is used only to break an exact tie in the final
            Curve score.
          </p>
        </div>
      </section>
      <SiteFooter rankingSystemId={rankingSystemId} />
    </main>
  );
}
