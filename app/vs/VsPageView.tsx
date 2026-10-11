import Link from "next/link";
import { Icon } from "@/components/ui";
import { CHECKED_ON, CHECKED_ON_ISO, VS_PAGES, WINS, type Mark, type VsPage } from "@/lib/vs/pages";
import ProductPreview from "./ProductPreview";
import styles from "./Vs.module.css";

/**
 * One comparison page: UntilFire first, visual first, no links off the site.
 * Content and its sourcing rules live in lib/vs/pages.ts; this is layout.
 */
function Cell({ mark, us }: { mark: Mark; us: boolean }) {
  if (mark === true) {
    return <span className={styles.yes}><Icon name="positive" size={22} strokeWidth={2.4} aria-label="Yes" role="img" /></span>;
  }
  if (mark === false) return <span className={styles.no} aria-label="No">&ndash;</span>;
  return <span className={us ? styles.partUs : styles.part}>{mark}</span>;
}

const money = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;

export default function VsPageView({ page }: { page: VsPage }) {
  const tools = ["UntilFire", ...page.rivals];
  const maxPrice = page.prices ? Math.max(...page.prices.map((p) => p.perYear)) : 0;
  const rivalList = page.rivals.join(" and ");

  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        <header className={styles.heroSplit}>
          <div className={styles.heroCopy}>
            <Link href="/vs" className={`uf-t-label ${styles.eyebrow}`}>Compare</Link>
            <h1 className="uf-t-h1" style={{ margin: 0 }}>{page.h1}</h1>
            <p className={`uf-t-lead ${styles.muted}`} style={{ margin: 0 }}>{page.lead}</p>
            <Link href="/fire-calculator" className={`uf-t-body ${styles.cta}`}>See your freedom date</Link>
            <p className={`uf-t-small ${styles.ctaNote}`}>Free. No login. About a minute.</p>
          </div>
          <ProductPreview />
        </header>

        <section className={styles.section} aria-labelledby="table">
          <h2 id="table" className={`uf-t-h2 ${styles.center}`} style={{ margin: "0 0 var(--uf-s5)" }}>How they compare</h2>
          <div className={styles.tableWrap} role="region" aria-labelledby="table" tabIndex={0}>
            <table className={`uf-t-body ${styles.table}`}>
              <thead>
                <tr>
                  <th scope="col"><span className="sr-only">Feature</span></th>
                  {tools.map((t, i) => <th key={t} scope="col" className={i === 0 ? styles.colUs : undefined}>{t}</th>)}
                </tr>
              </thead>
              <tbody>
                {page.rows.map((r) => (
                  <tr key={r.label}>
                    <th scope="row">{r.label}</th>
                    {r.marks.map((m, i) => (
                      <td key={tools[i]} className={i === 0 ? styles.colUs : undefined}><Cell mark={m} us={i === 0} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="why">
          <h2 id="why" className={`uf-t-h2 ${styles.center}`} style={{ margin: "0 0 var(--uf-s5)" }}>Why people choose UntilFire</h2>
          <div className={styles.wins}>
            {WINS.map((w) => (
              <div key={w.title} className={styles.win}>
                <span className={styles.winIcon}><Icon name={w.icon} size={22} /></span>
                <h3 className="uf-t-h3">{w.title}</h3>
                <p className={`uf-t-body ${styles.muted}`}>{w.line}</p>
              </div>
            ))}
          </div>
        </section>

        {page.prices && (
          <section className={styles.section} aria-labelledby="price">
            <h2 id="price" className={`uf-t-h2 ${styles.center}`} style={{ margin: "0 0 var(--uf-s5)" }}>Price per year</h2>
            <div className={styles.prices}>
              {page.prices.map((p, i) => (
                <div key={tools[i]} className={styles.priceRow}>
                  <span className="uf-t-body" style={{ fontWeight: 700 }}>{tools[i]}</span>
                  <div
                    className={`uf-t-data ${styles.bar} ${i === 0 ? styles.barUs : ""}`}
                    style={{ width: `${Math.round((p.perYear / maxPrice) * 100)}%` }}
                  >
                    {money(p.perYear)}<span className={`uf-t-small ${styles.barNote}`}>{p.note}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className={styles.section} aria-labelledby="niche">
          <h2 id="niche" className={`uf-t-h3 ${styles.center}`} style={{ margin: "0 0 var(--uf-s4)" }}>
            Where {page.rivals.length > 1 ? "they specialise" : `${rivalList} specialises`}
          </h2>
          <div className={styles.niche}>
            {page.niches.map((n) => (
              <div key={n.tool} className={styles.nicheItem}>
                <p className="uf-t-body"><strong>{n.tool}.</strong> <span className={styles.muted}>{n.line}</span></p>
              </div>
            ))}
          </div>
        </section>

        <section className={`${styles.section} ${styles.faq}`} aria-labelledby="faq">
          <h2 id="faq" className="uf-t-h2" style={{ margin: "0 0 var(--uf-s3)" }}>Questions</h2>
          {page.faqs.map((f) => (
            <details key={f.q}>
              <summary className="uf-t-body">{f.q}</summary>
              <p className="uf-t-body">{f.a}</p>
            </details>
          ))}
        </section>

        <section className={styles.band} aria-labelledby="start">
          <h2 id="start" className="uf-t-h2">Your freedom date is a minute away</h2>
          <Link href="/fire-calculator" className={`uf-t-body ${styles.cta}`}>Get my freedom date</Link>
          <p className={`uf-t-small ${styles.ctaNote}`}>Free forever. No login. Export your data anytime.</p>
        </section>

        <p className={`uf-t-small ${styles.fine}`}>
          <span className={styles.others}>
            {VS_PAGES.filter((o) => o.slug !== page.slug).map((o) => (
              <Link key={o.slug} href={`/vs/${o.slug}`} className={styles.more}>vs {o.rivals.join(" & ")}</Link>
            ))}
            <Link href="/vs" className={styles.more}>All comparisons</Link>
          </span>
          Prices and features from each company&apos;s public website, checked{" "}
          <time dateTime={CHECKED_ON_ISO}>{CHECKED_ON}</time>. {rivalList} {page.rivals.length > 1 ? "are trademarks" : "is a trademark"} of
          {page.rivals.length > 1 ? " their owners" : " its owner"}; UntilFire isn&apos;t affiliated with {page.rivals.length > 1 ? "either" : "it"}.
        </p>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: page.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
          }),
        }}
      />
    </main>
  );
}
