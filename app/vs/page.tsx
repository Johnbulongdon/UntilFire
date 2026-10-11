import type { Metadata } from "next";
import Link from "next/link";
import { siteUrl } from "@/lib/site";
import { VS_PAGES } from "@/lib/vs/pages";
import styles from "./Vs.module.css";

const url = siteUrl("/vs");
const title = "UntilFire vs Other FIRE Tools: Side-by-Side Comparisons";
const description = "How UntilFire compares with ProjectionLab, Boldin, FI Calc, FIRECalc and Monarch Money: real spending, bank sync, a monthly next move and price.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  openGraph: { title, description, url, siteName: "UntilFire", type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

/** The comparison hub: a signpost to each /vs page, one card each. */
export default function VsHubPage() {
  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        <header className={styles.hero}>
          <p className={`uf-t-label ${styles.eyebrow}`}>Compare</p>
          <h1 className="uf-t-h1" style={{ margin: 0 }}>UntilFire vs the rest</h1>
          <p className={`uf-t-lead ${styles.muted}`} style={{ margin: 0, maxWidth: 560 }}>
            Other tools give you a model or a budget. UntilFire gives you a date and the next move.
          </p>
        </header>
        <div className={styles.hub}>
          {VS_PAGES.map((p) => (
            <Link key={p.slug} href={`/vs/${p.slug}`} className={styles.hubCard}>
              <span className="uf-t-h3">UntilFire vs {p.rivals.join(" vs ")}</span>
              <span className={`uf-t-body ${styles.muted}`}>{p.card}</span>
              <span className={styles.hubArrow} aria-hidden>&rarr;</span>
            </Link>
          ))}
        </div>
        <section className={styles.band} aria-labelledby="start" style={{ marginTop: "var(--uf-s7)" }}>
          <h2 id="start" className="uf-t-h2">Your freedom date is a minute away</h2>
          <Link href="/fire-calculator" className={`uf-t-body ${styles.cta}`}>Get my freedom date</Link>
          <p className={`uf-t-small ${styles.ctaNote}`}>Free forever. No login.</p>
        </section>
      </div>
    </main>
  );
}
