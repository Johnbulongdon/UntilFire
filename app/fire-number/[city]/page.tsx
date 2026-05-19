import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { CITIES, STATE_TAX, isUS } from "@/lib/fire-data";
import { calcFIRE, calcTakeHome } from "@/lib/fire";
import CityCalcWidget from "./CityCalcWidget";

const US_CITIES = CITIES.filter((c) => isUS(c.state));

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export async function generateStaticParams() {
  return US_CITIES.map((c) => ({ city: c.key }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city } = await params;
  const data = US_CITIES.find((c) => c.key === city);
  if (!data) return {};
  return {
    title: `${data.name} FIRE Number Calculator | UntilFire`,
    description: `How much do you need to retire in ${data.name}? Based on a local cost of living of ${fmt(data.col)}/year. Calculate your personal FIRE number in seconds.`,
    alternates: { canonical: `https://www.untilfire.com/fire-number/${data.key}` },
    openGraph: {
      title: `${data.name} FIRE Number Calculator`,
      description: `Retire in ${data.name} — find your number based on local costs of ${fmt(data.col)}/yr.`,
      type: "website",
    },
  };
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;
  const data = US_CITIES.find((c) => c.key === city);
  if (!data) notFound();

  const fireTarget = data.col * 25;
  const tax = STATE_TAX[data.state];
  const taxRate = tax?.rate ?? 0;
  const taxLabel = tax?.label ?? data.state.toUpperCase();

  const SCENARIOS = [75000, 100000, 150000];
  const SAVINGS_RATE = 0.20;
  const START_AGE = 30;

  const scenarios = SCENARIOS.map((gross) => {
    const { takeHome } = calcTakeHome(gross, data.state);
    const monthlySavings = (takeHome * SAVINGS_RATE) / 12;
    const result = calcFIRE(monthlySavings, data.col, START_AGE, 0);
    return { gross, takeHome, monthlySavings, ...result };
  });

  const relatedCities = US_CITIES
    .filter((c) => c.state === data.state && c.key !== data.key)
    .slice(0, 5);

  const heading: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 700,
    color: "#64748B",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 10,
    marginTop: 0,
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { background: #F7F9FB; color: #19181E; font-family: 'Manrope', sans-serif; margin: 0; }
        a { color: inherit; }
        table { border-collapse: collapse; width: 100%; }
        th { text-align: left; }
        @media(max-width: 640px) {
          .city-hero-grid { grid-template-columns: 1fr !important; }
          .city-scenario-table th, .city-scenario-table td { padding: 10px 12px !important; font-size: 13px !important; }
          .city-related { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 24px 80px" }}>

        {/* Breadcrumb */}
        <nav style={{ fontSize: 13, color: "#94A3B8", marginBottom: 24, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <Link href="/" style={{ textDecoration: "none", color: "#94A3B8" }}>UntilFire</Link>
          <span>›</span>
          <Link href="/fire-number" style={{ textDecoration: "none", color: "#94A3B8" }}>FIRE Number by City</Link>
          <span>›</span>
          <span style={{ color: "#064E3B", fontWeight: 600 }}>{data.name}</span>
        </nav>

        {/* Hero */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>{data.flag}</div>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: "#064E3B", letterSpacing: "-0.8px", margin: "0 0 12px", lineHeight: 1.1 }}>
            FIRE Number Calculator<br />for {data.name}
          </h1>
          <p style={{ fontSize: 17, color: "#475569", margin: 0, lineHeight: 1.6, maxWidth: 580 }}>
            How much do you need to retire in {data.name}? Based on a local cost of living of{" "}
            <strong style={{ color: "#064E3B" }}>{fmt(data.col)}/year</strong>, your FIRE target is{" "}
            <strong style={{ color: "#064E3B" }}>{fmt(fireTarget)}</strong>.
          </p>
        </div>

        {/* Key stats */}
        <div className="city-hero-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 40 }}>
          {[
            { label: "Annual cost of living", value: fmt(data.col), sub: "local baseline" },
            { label: "FIRE target (25× rule)", value: fmt(fireTarget), sub: "4% withdrawal" },
            { label: "State income tax", value: taxRate === 0 ? "0% — no income tax" : `${(taxRate * 100).toFixed(1)}%`, sub: taxLabel },
          ].map(({ label, value, sub }) => (
            <div key={label} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "20px 22px" }}>
              <div style={heading}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#064E3B", letterSpacing: "-0.4px" }}>{value}</div>
              <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Scenarios table */}
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, overflow: "hidden", marginBottom: 32 }}>
          <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #E2E8F0" }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#064E3B", margin: 0 }}>
              Sample retirement timelines in {data.name}
            </h2>
            <p style={{ fontSize: 13, color: "#94A3B8", margin: "4px 0 0" }}>
              Starting at age 30 with $0 saved, 20% savings rate
            </p>
          </div>
          <table className="city-scenario-table">
            <thead style={{ background: "#F8FAFC" }}>
              <tr>
                {["Annual income", "Take-home pay", "Monthly savings", "Years to FIRE", "Retire at age"].map((h) => (
                  <th key={h} style={{ padding: "12px 24px", fontSize: 12, fontWeight: 700, color: "#64748B", letterSpacing: "0.05em", textTransform: "uppercase", borderBottom: "1px solid #E2E8F0" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scenarios.map((s, i) => (
                <tr key={s.gross} style={{ borderBottom: i < scenarios.length - 1 ? "1px solid #F1F5F9" : "none" }}>
                  <td style={{ padding: "16px 24px", fontSize: 15, fontWeight: 700, color: "#19181E" }}>{fmt(s.gross)}</td>
                  <td style={{ padding: "16px 24px", fontSize: 14, color: "#475569" }}>{fmt(s.takeHome)}</td>
                  <td style={{ padding: "16px 24px", fontSize: 14, color: "#475569" }}>{fmt(s.monthlySavings)}</td>
                  <td style={{ padding: "16px 24px", fontSize: 15, fontWeight: 700, color: "#064E3B" }}>{Math.round(s.years)} yrs</td>
                  <td style={{ padding: "16px 24px", fontSize: 15, fontWeight: 800, color: "#22d3a5" }}>
                    {START_AGE + Math.round(s.years)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Interactive calc */}
        <CityCalcWidget city={data} />

        {/* Editorial content */}
        <div style={{ marginTop: 48, marginBottom: 40 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#064E3B", letterSpacing: "-0.4px", marginBottom: 16 }}>
            What does it take to retire in {data.name}?
          </h2>
          <div style={{ fontSize: 15, color: "#475569", lineHeight: 1.75, display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ margin: 0 }}>
              Using the 4% rule — the most widely used FIRE guideline — retiring in {data.name} requires a portfolio of{" "}
              <strong style={{ color: "#064E3B" }}>{fmt(fireTarget)}</strong>. This assumes you&apos;ll spend{" "}
              {fmt(data.col)} per year and withdraw 4% of your portfolio annually, which historical data suggests can
              sustain a 30+ year retirement.
            </p>
            <p style={{ margin: 0 }}>
              {taxRate === 0
                ? `${data.name} is in a state with no income tax, which significantly boosts your take-home pay and accelerates your path to FIRE compared to high-tax states.`
                : `${data.name} residents pay approximately ${(taxRate * 100).toFixed(1)}% in effective state income tax. Maximising pre-tax contributions to a 401(k) or IRA is especially impactful here.`}
            </p>
            <p style={{ margin: 0 }}>
              The biggest levers: your savings rate and when you start. Saving 20% of take-home versus 10% can cut
              your time to retirement nearly in half. Starting at 25 instead of 35 can mean retiring a decade earlier.
            </p>
          </div>
        </div>

        {/* Related cities */}
        {relatedCities.length > 0 && (
          <div style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#064E3B", marginBottom: 16 }}>
              Other cities in the same state
            </h2>
            <div className="city-related" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {relatedCities.map((c) => (
                <Link
                  key={c.key}
                  href={`/fire-number/${c.key}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "14px 16px",
                    background: "#fff",
                    border: "1px solid #E2E8F0",
                    borderRadius: 10,
                    textDecoration: "none",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#064E3B",
                    transition: "border-color 0.15s",
                  }}
                >
                  <span style={{ fontSize: 20 }}>{c.flag}</span>
                  <div>
                    <div>{c.name}</div>
                    <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 400 }}>{fmt(c.col * 25)} target</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Bottom CTA */}
        <div style={{ background: "linear-gradient(135deg, #064E3B 0%, #047857 100%)", borderRadius: 16, padding: "32px 36px", textAlign: "center" }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 0 10px", letterSpacing: "-0.4px" }}>
            Ready to build your real FIRE plan?
          </h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.75)", margin: "0 0 24px" }}>
            Track your spending, model your investments, and see exactly when you can retire in {data.name}.
          </p>
          <Link
            href="/dashboard"
            style={{
              display: "inline-block",
              background: "#22d3a5",
              color: "#064E3B",
              padding: "14px 32px",
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 800,
              textDecoration: "none",
              letterSpacing: "-0.2px",
            }}
          >
            Start free — no credit card
          </Link>
        </div>
      </div>
    </>
  );
}
