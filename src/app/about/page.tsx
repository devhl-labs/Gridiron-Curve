import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "About | Gridiron Curve",
};

export default function AboutPage() {
  return (
    <main>
      <SiteHeader active="about" />
      <section className="info-hero">
        <span className="kicker">THE RESUME, NOT THE REPUTATION</span>
        <h1>Every win has a<br /><em>degree of difficulty.</em></h1>
        <p>
          Gridiron Curve is an independent college-football ranking that
          measures what happened and who it happened against.
        </p>
      </section>
      <section className="about-content">
        <article>
          <h2>What this ranking asks</h2>
          <p>Which teams have earned the strongest resumes on the field so far?</p>
        </article>
        <article>
          <h2>What it is not</h2>
          <p>It is not a prediction of who would win tomorrow and it does not reward brand reputation for its own sake.</p>
        </article>
        <article>
          <h2>Data and transparency</h2>
          <p>Game results, team statistics, schedules, and polls come from CollegeFootballData. The methodology is published so every ranking can be examined and challenged.</p>
        </article>
      </section>
      <SiteFooter />
    </main>
  );
}
