import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Directory partners | UntilFire",
  description: "Directories where UntilFire is seeking a product listing.",
  alternates: { canonical: "https://www.untilfire.com/directory-partners" },
};

export default function DirectoryPartnersPage() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--uf-ground)", color: "var(--uf-ink)", padding: "64px 24px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Link href="/" style={{ color: "var(--uf-green)", display: "inline-flex", alignItems: "center", minHeight: 44 }}>
          Back to UntilFire
        </Link>
        <h1 style={{ fontSize: "clamp(32px, 6vw, 48px)", lineHeight: 1.15, margin: "32px 0 16px" }}>Directory partners</h1>
        <p style={{ fontSize: 16, lineHeight: 1.6, color: "var(--uf-ink-2)", margin: "0 0 32px" }}>
          We are applying to these directories. A badge here does not mean a listing has been approved.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: 24 }}>
          <section style={{ background: "var(--uf-surface)", border: "1px solid var(--uf-border)", borderRadius: 24, padding: 24 }}>
            <h2 style={{ fontSize: 20, margin: "0 0 24px" }}>Discoverly</h2>
            <a href="https://discoverly.tech/" target="_blank" rel="noopener" title="Featured on Discoverly" style={{ display: "inline-flex", maxWidth: "100%", borderRadius: 8 }}>
              {/* Official external badge must remain available to the directory verifier. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://discoverly.tech/badge.svg" alt="Featured on Discoverly" width={200} height={54} style={{ maxWidth: "100%", height: "auto" }} />
            </a>
          </section>
        </div>
      </div>
    </main>
  );
}
