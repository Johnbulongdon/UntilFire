import Link from "next/link";

export type LegalSection = { title: string; body: string[] };

/**
 * The privacy policy and terms, set like the creator program terms
 * (app/invite/terms): plain sections on the warm ground, one reading column.
 * The iOS app links to both pages from Profile, and Apple checks they load.
 */
export function LegalPage({ title, updated, intro, sections }: { title: string; updated: string; intro: string; sections: LegalSection[] }) {
  return (
    <main style={{ minHeight: "100vh", background: "var(--uf-ground)", padding: "var(--uf-s6) var(--uf-s4) var(--uf-s7)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", display: "grid", gap: "var(--uf-s5)" }}>
        <Link href="/" className="uf-t-small" style={{ color: "var(--uf-ink-3)", textDecoration: "none" }}>← UntilFire</Link>
        <div>
          <h1 className="uf-t-h1" style={{ margin: 0 }}>{title}</h1>
          <p className="uf-t-small" style={{ margin: "var(--uf-s2) 0 0", color: "var(--uf-ink-3)" }}>Last updated {updated}</p>
        </div>
        <p className="uf-t-body" style={{ margin: 0, color: "var(--uf-ink)", lineHeight: 1.7 }}>{intro}</p>
        {sections.map((s) => (
          <section key={s.title}>
            <h2 className="uf-t-h3" style={{ margin: "0 0 var(--uf-s2)" }}>{s.title}</h2>
            {s.body.map((p, i) => (
              <p key={i} className="uf-t-body" style={{ margin: i ? "var(--uf-s2) 0 0" : 0, color: "var(--uf-ink-2)", lineHeight: 1.7 }}>{p}</p>
            ))}
          </section>
        ))}
        <p className="uf-t-small" style={{ margin: 0, color: "var(--uf-ink-3)" }}>
          Questions: <a href="mailto:hello@untilfire.com" style={{ color: "var(--uf-green)" }}>hello@untilfire.com</a>
          {" · "}<Link href="/privacy" style={{ color: "var(--uf-green)" }}>Privacy</Link>
          {" · "}<Link href="/terms" style={{ color: "var(--uf-green)" }}>Terms</Link>
        </p>
      </div>
    </main>
  );
}
