import Link from "next/link";
import type { Metadata } from "next";
import { siteUrl } from "@/lib/site";

const pricingUrl = siteUrl('/pricing');

export const metadata: Metadata = {
  title: "UntilFire Pricing — Free Plan & Pro Unlimited Bank Connections",
  description: "Free forever for the full FIRE calculator and dashboard. Upgrade to Pro for $4.99/mo to unlock unlimited bank connections and priority access to the AI adviser.",
  keywords: "untilfire pricing, fire planner cost, financial independence app price, fire calculator free",
  alternates: { canonical: pricingUrl },
  openGraph: {
    title: "UntilFire Pricing — Free Plan & Pro Unlimited Bank Connections",
    description: "Free forever for the full calculator and dashboard. Upgrade to Pro for $4.99/mo.",
    url: pricingUrl,
    siteName: "UntilFire",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "UntilFire Pricing — Free Plan & Pro Unlimited Bank Connections",
    description: "Free forever for the full calculator and dashboard. Upgrade to Pro for $4.99/mo.",
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
                price: "4.99",
                priceCurrency: "USD",
                availability: "https://schema.org/InStock",
                priceSpecification: {
                  "@type": "RecurringCharge",
                  price: "4.99",
                  priceCurrency: "USD",
                  billingDuration: "P1M",
                },
              },
            ],
          }),
        }}
      />
    <main
      style={{
        minHeight: "100vh",
        background: "#08080e",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "64px 24px 120px",
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      <Link
        href="/"
        style={{
          fontSize: 13,
          color: "#6b7280",
          textDecoration: "none",
          marginBottom: 48,
          alignSelf: "flex-start",
          maxWidth: 800,
          width: "100%",
          margin: "0 auto 48px",
        }}
      >
        ← untilfire.com
      </Link>

      <div style={{ textAlign: "center", marginBottom: 56 }}>
        <h1
          style={{
            fontFamily: "Syne, sans-serif",
            fontSize: 40,
            fontWeight: 800,
            color: "#f1f5f9",
            margin: "0 0 12px",
            letterSpacing: "-0.02em",
          }}
        >
          Simple pricing
        </h1>
        <p style={{ fontSize: 17, color: "#9ca3af", margin: 0 }}>
          Free forever. Upgrade when you&apos;re ready.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          gap: 20,
          flexWrap: "wrap",
          justifyContent: "center",
          maxWidth: 780,
          width: "100%",
        }}
      >
        {/* FREE */}
        <div
          style={{
            flex: 1,
            minWidth: 300,
            background: "#111118",
            border: "1px solid #23232d",
            borderRadius: 20,
            padding: "36px 32px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
            Free
          </div>
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 42, fontWeight: 800, color: "#f1f5f9", fontFamily: "Syne, sans-serif" }}>$0</span>
            <span style={{ fontSize: 15, color: "#6b7280", marginLeft: 4 }}>/month</span>
          </div>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 28px" }}>No account required to get started.</p>

          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
            {FREE_FEATURES.map((f) => (
              <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "#d1d5db" }}>
                <span style={{ color: "#22d3a5", fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
                {f}
              </li>
            ))}
          </ul>

          <Link
            href="/login"
            style={{
              display: "block",
              textAlign: "center",
              padding: "12px 24px",
              borderRadius: 10,
              border: "1px solid #374151",
              background: "transparent",
              color: "#d1d5db",
              fontSize: 14,
              fontWeight: 700,
              textDecoration: "none",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            Get started free
          </Link>
        </div>

        {/* PRO */}
        <div
          style={{
            flex: 1,
            minWidth: 300,
            background: "#111118",
            border: "1.5px solid #059669",
            borderRadius: 20,
            padding: "36px 32px",
            display: "flex",
            flexDirection: "column",
            position: "relative",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: -13,
              left: "50%",
              transform: "translateX(-50%)",
              background: "#059669",
              color: "#fff",
              fontSize: 11,
              fontWeight: 800,
              padding: "3px 12px",
              borderRadius: 20,
              whiteSpace: "nowrap",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            Most popular
          </span>

          <div style={{ fontSize: 13, fontWeight: 700, color: "#059669", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
            Pro
          </div>
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 42, fontWeight: 800, color: "#f1f5f9", fontFamily: "Syne, sans-serif" }}>$4.99</span>
            <span style={{ fontSize: 15, color: "#6b7280", marginLeft: 4 }}>/month</span>
          </div>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 28px" }}>Cancel anytime. No long-term commitment.</p>

          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
            {PRO_FEATURES.map((f) => (
              <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "#d1d5db" }}>
                <span style={{ color: "#059669", fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
                {f}
              </li>
            ))}
          </ul>

          <Link
            href="/login"
            style={{
              display: "block",
              textAlign: "center",
              padding: "12px 24px",
              borderRadius: 10,
              border: "none",
              background: "#059669",
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              textDecoration: "none",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            Get started →
          </Link>
        </div>
      </div>

      <p style={{ marginTop: 52, fontSize: 13, color: "#4b5563", textAlign: "center" }}>
        Questions?{" "}
        <a href="mailto:hello@untilfire.com" style={{ color: "#22d3a5", textDecoration: "none" }}>
          hello@untilfire.com
        </a>
      </p>
    </main>
    </>
  );
}