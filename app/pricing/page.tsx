import Link from "next/link";
import type { Metadata } from "next";
import {
  ANNUAL_MONTHS_FREE, ANNUAL_PER_MONTH_LABEL, PRO_ANNUAL_LABEL, PRO_ANNUAL_USD,
  PRO_MONTHLY_LABEL, PRO_MONTHLY_USD, TRIAL_LABEL,
} from "@/lib/pricing";
import { siteUrl } from "@/lib/site";
import { Badge, Card } from "@/components/ui";

const pricingUrl = siteUrl('/pricing');

export const metadata: Metadata = {
  title: "UntilFire Pricing — Free Plan & Pro Unlimited Bank Connections",
  description: `Free forever for the full FIRE calculator and dashboard. Upgrade to Pro for ${PRO_MONTHLY_LABEL}/mo, or ${PRO_ANNUAL_LABEL}/yr, to unlock unlimited bank connections and priority access to the AI adviser.`,
  keywords: "untilfire pricing, fire planner cost, financial independence app price, fire calculator free",
  alternates: { canonical: pricingUrl },
  openGraph: {
    title: "UntilFire Pricing — Free Plan & Pro Unlimited Bank Connections",
    description: `Free forever for the full calculator and dashboard. Upgrade to Pro for ${PRO_MONTHLY_LABEL}/mo, or ${PRO_ANNUAL_LABEL}/yr.`,
    url: pricingUrl,
    siteName: "UntilFire",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "UntilFire Pricing — Free Plan & Pro Unlimited Bank Connections",
    description: `Free forever for the full calculator and dashboard. Upgrade to Pro for ${PRO_MONTHLY_LABEL}/mo, or ${PRO_ANNUAL_LABEL}/yr.`,
  },
};

const FREE_FEATURES = [
  "FIRE number calculator (300+ cities worldwide)",
  "Full dashboard — cashflow, assets & liabilities",
  "Expense & budget tracking",
  "Investment portfolio simulator",
  "1 bank connection via Plaid",
  "Share your FIRE number",
  "All free calculators & learning hub",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Unlimited bank connections (Plaid)",
  "AI FIRE adviser (priority access)",
];

export default function PricingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: "UntilFire Pro",
            description: "AI-powered FIRE planning with unlimited bank connections and personalized retirement advice.",
            url: pricingUrl,
            brand: { "@type": "Brand", name: "UntilFire" },
            offers: [
              {
                "@type": "Offer",
                name: "Pro Monthly",
                price: String(PRO_MONTHLY_USD),
                priceCurrency: "USD",
                availability: "https://schema.org/InStock",
                priceSpecification: {
                  "@type": "RecurringCharge",
                  price: String(PRO_MONTHLY_USD),
                  priceCurrency: "USD",
                  billingDuration: "P1M",
                },
              },
              {
                "@type": "Offer",
                name: "Pro Yearly",
                price: String(PRO_ANNUAL_USD),
                priceCurrency: "USD",
                availability: "https://schema.org/InStock",
                priceSpecification: {
                  "@type": "RecurringCharge",
                  price: String(PRO_ANNUAL_USD),
                  priceCurrency: "USD",
                  billingDuration: "P1Y",
                },
              },
            ],
          }),
        }}
      />
    <main
      style={{
        minHeight: "100vh",
        background: "var(--uf-ground)",
        padding: "var(--uf-s6) var(--uf-s4) var(--uf-s7)",
      }}
    >
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <Link
          href="/"
          className="uf-t-small"
          style={{ color: "var(--uf-ink-3)", textDecoration: "none", display: "inline-block", marginBottom: "var(--uf-s6)" }}
        >
          &larr; untilfire.com
        </Link>

        <div style={{ textAlign: "center", marginBottom: "var(--uf-s6)" }}>
          <h1 className="uf-t-h1" style={{ margin: "0 0 var(--uf-s2)" }}>Simple pricing</h1>
          <p className="uf-t-lead" style={{ color: "var(--uf-ink-2)", margin: 0 }}>
            Free forever. Upgrade when you&apos;re ready.
          </p>
        </div>

        <div className="uf-pricing-grid">
          <Card style={{ display: "flex", flexDirection: "column", padding: "var(--uf-s6)" }}>
            <div className="uf-t-label" style={{ color: "var(--uf-ink-3)", marginBottom: "var(--uf-s2)" }}>FREE</div>
            <div style={{ display: "flex", alignItems: "baseline", marginBottom: "var(--uf-s1)" }}>
              <span className="uf-t-display" style={{ color: "var(--uf-ink)" }}>$0</span>
              <span className="uf-t-body" style={{ color: "var(--uf-ink-3)", marginLeft: 4 }}>/month</span>
            </div>
            <p className="uf-t-small" style={{ color: "var(--uf-ink-3)", margin: "0 0 var(--uf-s5)" }}>
              No account required to get started.
            </p>

            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 var(--uf-s5)", display: "grid", gap: "var(--uf-s3)" }}>
              {FREE_FEATURES.map((f) => (
                <li key={f} className="uf-t-body" style={{ display: "flex", gap: "var(--uf-s2)", color: "var(--uf-ink-2)" }}>
                  <span aria-hidden style={{ color: "var(--uf-green)", flexShrink: 0 }}>&#10003;</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <Link href="/login" className="uf-pricing-cta uf-pricing-cta--secondary">
              Get started free
            </Link>
          </Card>

          <Card
            elevation="float"
            style={{
              display: "flex",
              flexDirection: "column",
              padding: "var(--uf-s6)",
              border: "1.5px solid var(--uf-green)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--uf-s2)", marginBottom: "var(--uf-s2)" }}>
              <span className="uf-t-label" style={{ color: "var(--uf-ink-3)" }}>PRO</span>
              <Badge tone="positive">{TRIAL_LABEL}</Badge>
            </div>

            <div style={{ display: "flex", alignItems: "baseline", marginBottom: "var(--uf-s1)" }}>
              <span className="uf-t-display" style={{ color: "var(--uf-ink)" }}>{PRO_MONTHLY_LABEL}</span>
              <span className="uf-t-body" style={{ color: "var(--uf-ink-3)", marginLeft: 4 }}>/month after</span>
            </div>
            <p className="uf-t-small" style={{ color: "var(--uf-ink-2)", margin: "0 0 4px" }}>
              or {PRO_ANNUAL_LABEL}/year &mdash; {ANNUAL_MONTHS_FREE} months free, {ANNUAL_PER_MONTH_LABEL}/mo
            </p>
            <p className="uf-t-small" style={{ color: "var(--uf-ink-3)", margin: "0 0 var(--uf-s5)" }}>
              {TRIAL_LABEL} &mdash; no charge today. Cancel anytime.
            </p>

            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 var(--uf-s5)", display: "grid", gap: "var(--uf-s3)" }}>
              {PRO_FEATURES.map((f) => (
                <li key={f} className="uf-t-body" style={{ display: "flex", gap: "var(--uf-s2)", color: "var(--uf-ink-2)" }}>
                  <span aria-hidden style={{ color: "var(--uf-green)", flexShrink: 0 }}>&#10003;</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <Link href="/login?intent=pro" className="uf-pricing-cta uf-pricing-cta--primary">
              Start {TRIAL_LABEL} &rarr;
            </Link>
          </Card>
        </div>

        <p className="uf-t-small" style={{ marginTop: "var(--uf-s6)", color: "var(--uf-ink-3)", textAlign: "center" }}>
          Questions?{" "}
          <a href="mailto:hello@untilfire.com" style={{ color: "var(--uf-green)", textDecoration: "none" }}>
            hello@untilfire.com
          </a>
        </p>
      </div>
    </main>
    </>
  );
}