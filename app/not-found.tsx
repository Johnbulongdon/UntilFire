import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found — UntilFire",
  robots: { index: false },
};

/** Old shared links and typos land here; give them two ways forward instead of a dead end. */
export default function NotFound() {
  return (
    <main style={{ minHeight: "70vh", background: "var(--uf-ground)", padding: "var(--uf-s7) var(--uf-s4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ maxWidth: 520, width: "100%", background: "var(--uf-yellow)", color: "var(--uf-on-accent)", borderRadius: "var(--uf-r-card)", padding: "var(--uf-s6)", textAlign: "center" }}>
        <p className="uf-t-label" style={{ margin: "0 0 var(--uf-s2)" }}>404</p>
        <h1 className="uf-t-h1" style={{ margin: "0 0 var(--uf-s2)" }}>This page wandered off</h1>
        <p className="uf-t-body" style={{ margin: "0 0 var(--uf-s5)" }}>The link may be old or mistyped. Your freedom date is still one step away.</p>
        <div style={{ display: "grid", gap: "var(--uf-s3)" }}>
          <Link href="/?source=404" className="uf-pricing-cta uf-pricing-cta--primary" style={{ background: "var(--uf-on-accent)", borderColor: "var(--uf-on-accent)", color: "var(--uf-yellow)" }}>Find my freedom date</Link>
          <Link href="/explore" className="uf-pricing-cta uf-pricing-cta--secondary" style={{ color: "var(--uf-on-accent)", borderColor: "var(--uf-on-accent)" }}>Explore cities</Link>
        </div>
      </div>
    </main>
  );
}
