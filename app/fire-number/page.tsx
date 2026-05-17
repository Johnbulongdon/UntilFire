import type { Metadata } from "next";
import Link from "next/link";
import { CITIES, STATE_TAX, isUS } from "@/lib/fire-data";

export const metadata: Metadata = {
  title: "FIRE Number by City — How Much to Retire Anywhere in the US | UntilFire",
  description:
    "Find out exactly how much you need to retire in any US city. Browse 97 cities with local cost-of-living data, state tax rates, and interactive FIRE calculators.",
  alternates: { canonical: "https://www.untilfire.com/fire-number" },
  openGraph: {
    title: "FIRE Number by City | UntilFire",
    description: "How much do you need to retire in your city? 97 US cities with local cost-of-living data.",
    type: "website",
  },
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const US_CITIES = CITIES.filter((c) => isUS(c.state));

const STATE_NAMES: Record<string, string> = {
  ca: "California", ny: "New York", nyc: "New York", tx: "Texas", fl: "Florida",
  wa: "Washington", or: "Oregon", co: "Colorado", il: "Illinois", ma: "Massachusetts",
  ga: "Georgia", nc: "North Carolina", az: "Arizona", nv: "Nevada", tn: "Tennessee",
  mi: "Michigan", pa: "Pennsylvania", oh: "Ohio", mn: "Minnesota", ut: "Utah",
  in_us: "Indiana", mo: "Missouri", wi: "Wisconsin", ne: "Nebraska", dc: "Washington D.C.",
  md: "Maryland", ct: "Connecticut", ri: "Rhode Island", va: "Virginia", la: "Louisiana",
  id: "Idaho", nm: "New Mexico", sc: "South Carolina", al: "Alabama", ar_us: "Arkansas",
  ia: "Iowa", nd: "North Dakota", ok: "Oklahoma", ks: "Kansas", vt: "Vermont",
  me: "Maine", nj: "New Jersey", nh: "New Hampshire", sd: "South Dakota", ms: "Mississippi",
};

const byState = US_CITIES.reduce<Record<string, typeof US_CITIES>>((acc, city) => {
  const stateName = STATE_NAMES[city.state] ?? city.state.toUpperCase();
  if (!acc[stateName]) acc[stateName] = [];
  acc[stateName].push(city);
  return acc;
}, {});

const sortedStates = Object.keys(byState).sort();

export default function FireNumberHubPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { background: #F7F9FB; color: #19181E; font-family: 'Manrope', sans-serif; margin: 0; }
        a { color: inherit; }
        .city-card:hover { border-color: #059669 !important; background: #F0FDF4 !important; }
        @media(max-width: 640px) {
          .hub-hero h1 { font-size: 28px !important; }
          .hub-stats { grid-template-columns: repeat(2, 1fr) !important; }
          .city-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px 80px" }}>

        {/* Breadcrumb */}
        <nav style={{ fontSize: 13, color: "#94A3B8", marginBottom: 24, display: "flex", gap: 6 }}>
          <Link href="/" style={{ textDecoration: "none", color: "#94A3B8" }}>UntilFire</Link>
          <span>›</span>
          <span style={{ color: "#064E3B", fontWeight: 600 }}>FIRE Number by City</span>
        </nav>

        {/* Hero */}
        <div className="hub-hero" style={{ marginBottom: 48 }}>
          <h1 style={{ fontSize: 40, fontWeight: 800, color: "#064E3B", letterSpacing: "-0.8px", margin: "0 0 16px", lineHeight: 1.1 }}>
            FIRE Number by City
          </h1>
          <p style={{ fontSize: 17, color: "#475569", margin: "0 0 32px", lineHeight: 1.65, maxWidth: 600 }}>
            The cost to retire varies enormously across the US — from{" "}
            <strong style={{ color: "#064E3B" }}>$875k in Wichita, KS</strong> to{" "}
            <strong style={{ color: "#064E3B" }}>$2.75M in San Francisco, CA</strong>. Pick your city to
            find your exact FIRE number with local cost-of-living data and state tax rates.
          </p>

          {/* Quick stats */}
          <div className="hub-stats" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, maxWidth: 600 }}>
            {[
              { label: "US cities covered", value: `${US_CITIES.length}` },
              { label: "Avg FIRE target", value: fmt(US_CITIES.reduce((s, c) => s + c.col * 25, 0) / US_CITIES.length) },
              { label: "States with no income tax", value: "9" },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, padding: "16px 18px" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#064E3B", letterSpacing: "-0.4px" }}>{value}</div>
                <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 4, fontWeight: 600 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* City grid by state */}
        {sortedStates.map((stateName) => (
          <div key={stateName} style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "#064E3B", margin: "0 0 14px", letterSpacing: "-0.2px" }}>
              {stateName}
              {byState[stateName][0] && STATE_TAX[byState[stateName][0].state]?.rate === 0 && (
                <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, background: "#D1FAE5", color: "#065F46", borderRadius: 4, padding: "2px 7px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  No income tax
                </span>
              )}
            </h2>
            <div className="city-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {byState[stateName].map((city) => (
                <Link
                  key={city.key}
                  href={`/fire-number/${city.key}`}
                  className="city-card"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px 16px",
                    background: "#fff",
                    border: "1px solid #E2E8F0",
                    borderRadius: 10,
                    textDecoration: "none",
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                >
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{city.flag}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#064E3B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{city.name}</div>
                    <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>
                      {fmt(city.col * 25)} target · {fmt(city.col)}/yr
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}

        {/* Bottom CTA */}
        <div style={{ marginTop: 48, background: "linear-gradient(135deg, #064E3B 0%, #047857 100%)", borderRadius: 16, padding: "32px 36px", textAlign: "center" }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", margin: "0 0 10px" }}>
            Track your actual progress toward FIRE
          </h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", margin: "0 0 20px" }}>
            Log transactions, see your savings rate, and watch your FIRE date move closer every month.
          </p>
          <Link
            href="/dashboard"
            style={{
              display: "inline-block",
              background: "#22d3a5",
              color: "#064E3B",
              padding: "12px 28px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 800,
              textDecoration: "none",
            }}
          >
            Start free — no credit card
          </Link>
        </div>
      </div>
    </>
  );
}
