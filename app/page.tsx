import Link from "next/link";
import { cityLandingPages } from "@/lib/city-pages";
import HomeClient from "./HomeClient";

export const metadata = {
  title: 'FIRE Calculator — Find Your Freedom Date in 60 Seconds | UntilFire',
  description:
    'Free FIRE calculator: enter your income, savings, and spending to see your FIRE number and freedom date instantly. No login. Used by thousands of people planning early retirement.',
  alternates: { canonical: 'https://www.untilfire.com/' },
  openGraph: {
    title: 'FIRE Calculator — Find Your Freedom Date in 60 Seconds',
    description: 'Free FIRE calculator: find your FIRE number and early retirement date in under a minute. No login required.',
    url: 'https://www.untilfire.com/',
    type: 'website',
  },
}

const seoHeading: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  color: "#059669",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  margin: "0 0 10px",
};

const calculators = [
  { href: "/calculators/4-percent-rule", label: "4% Rule / FIRE Number Calculator", desc: "How much you need to retire, using the 25× rule." },
  { href: "/calculators/coast-fire", label: "Coast FIRE Calculator", desc: "See if your investments can coast to FIRE on their own." },
  { href: "/calculators/savings-rate", label: "Savings Rate Calculator", desc: "Turn your savings rate into a retirement timeline." },
  { href: "/calculators/compound-interest", label: "Compound Interest Calculator", desc: "Watch how contributions and growth compound over time." },
  { href: "/calculators/apy", label: "APY Calculator", desc: "Compare real returns across savings and investment rates." },
];

const homeFaqs = [
  {
    q: "What is a FIRE calculator?",
    a: "A FIRE (Financial Independence, Retire Early) calculator estimates how much you need invested to stop relying on a paycheck, and when you could reach that point. UntilFire turns your income, spending, and savings into a freedom date — the year work becomes optional — in about 60 seconds, no login required.",
  },
  {
    q: "How much money do I need to retire early?",
    a: "The most common FIRE rule is 25× your annual spending — the amount that lets you withdraw about 4% per year. If you spend $50,000 a year, your FIRE number is roughly $1.25 million. Your real target depends on your cost of living, taxes, and the lifestyle you want, which is why UntilFire personalizes it to you.",
  },
  {
    q: "What is my FIRE number?",
    a: "Your FIRE number is the portfolio size that can fund your lifestyle indefinitely at a safe withdrawal rate. Multiply your expected annual expenses by 25 for a quick estimate, or run the calculator above for a number adjusted to your city, income, and savings rate.",
  },
  {
    q: "What is a freedom date?",
    a: "Your freedom date is the year you could stop working for money because your investments cover your expenses. It moves earlier when you raise your savings rate, lower your spending, or grow your income — and UntilFire shows you exactly which move brings it closer.",
  },
  {
    q: "What are Coast, Barista, Lean, and Fat FIRE?",
    a: "They're variations on the same goal. Coast FIRE means you've invested enough that growth alone reaches your number by traditional retirement age. Barista FIRE blends part-time work with portfolio income. Lean FIRE targets a frugal lifestyle, while Fat FIRE funds a more comfortable one. UntilFire helps you plan toward whichever fits your life.",
  },
];

export default function Home() {
  return (
    <>
      <HomeClient />

      <section
        aria-label="About the UntilFire FIRE calculator"
        style={{
          background: "#F7F9FB",
          borderTop: "1px solid #E2E8F0",
          fontFamily: "'Manrope', sans-serif",
          color: "#19181E",
        }}
      >
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "56px 24px 72px" }}>
          <p style={seoHeading}>Personal finance that sets you free</p>
          <h1 style={{ fontSize: "clamp(28px, 4vw, 40px)", lineHeight: 1.12, letterSpacing: "-0.03em", color: "#064E3B", margin: "0 0 16px" }}>
            FIRE Calculator — Find Your Freedom Date and FIRE Number
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.8, color: "#475569", margin: "0 0 16px", maxWidth: 720 }}>
            UntilFire is a free FIRE calculator and personal finance planner for anyone chasing financial
            independence and early retirement. Enter your income, spending, and savings, and we&apos;ll show your{" "}
            <strong style={{ color: "#064E3B" }}>FIRE number</strong>, your{" "}
            <strong style={{ color: "#064E3B" }}>freedom date</strong>, and the single move that brings early
            retirement closer — no account needed.
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: "#475569", margin: "0 0 32px", maxWidth: 720 }}>
            Most calculators stop at a number. UntilFire does it with you: a clear path, a next move, and continuity
            toward work optionality — built on the same 25× rule and 4% safe withdrawal math the FIRE community trusts.
          </p>

          {/* How it works */}
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#064E3B", letterSpacing: "-0.03em", margin: "0 0 18px" }}>
            How the FIRE calculator works
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 40 }}>
            {[
              { n: "1", t: "Tell us your numbers", d: "Income, monthly spending or savings, and current net worth. Location and age are optional." },
              { n: "2", t: "See your freedom date", d: "We estimate your FIRE number with the 25× rule and project the year work becomes optional." },
              { n: "3", t: "Find your next move", d: "See how saving more, spending less, or earning more pulls your retirement date earlier." },
            ].map((s) => (
              <div key={s.n} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: "20px 18px" }}>
                <div style={{ width: 28, height: 28, borderRadius: 999, background: "#ECFDF5", color: "#047857", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, marginBottom: 12 }}>{s.n}</div>
                <h3 style={{ fontSize: 17, color: "#19181E", margin: "0 0 8px" }}>{s.t}</h3>
                <p style={{ margin: 0, fontSize: 14, color: "#475569", lineHeight: 1.7 }}>{s.d}</p>
              </div>
            ))}
          </div>

          {/* FIRE calculators */}
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#064E3B", letterSpacing: "-0.03em", margin: "0 0 18px" }}>
            Free FIRE calculators
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginBottom: 40 }}>
            {calculators.map((c) => (
              <Link key={c.href} href={c.href} style={{ textDecoration: "none", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: "18px 16px", display: "block" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#064E3B", marginBottom: 6 }}>{c.label}</div>
                <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.6 }}>{c.desc}</div>
              </Link>
            ))}
          </div>

          {/* FIRE number by city */}
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#064E3B", letterSpacing: "-0.03em", margin: "0 0 8px" }}>
            FIRE number by city
          </h2>
          <p style={{ fontSize: 15, color: "#475569", lineHeight: 1.7, margin: "0 0 18px", maxWidth: 680 }}>
            How much you need to retire depends on where you live. Explore FIRE numbers and cost-of-living context for
            popular cities, or <Link href="/fire-number" style={{ color: "#059669", fontWeight: 700, textDecoration: "none" }}>browse all city FIRE guides</Link>.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 40 }}>
            {cityLandingPages.map((c) => (
              <Link key={c.slug} href={`/fire-number/${c.slug}`} style={{ textDecoration: "none", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 999, padding: "8px 16px", fontSize: 14, fontWeight: 700, color: "#064E3B" }}>
                {c.city.name} FIRE number
              </Link>
            ))}
          </div>

          {/* FAQ */}
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#064E3B", letterSpacing: "-0.03em", margin: "0 0 18px" }}>
            FIRE calculator — frequently asked questions
          </h2>
          <div style={{ display: "grid", gap: 12, marginBottom: 32 }}>
            {homeFaqs.map((f) => (
              <div key={f.q} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: "18px 18px 16px" }}>
                <h3 style={{ margin: "0 0 8px", fontSize: 17, color: "#19181E" }}>{f.q}</h3>
                <p style={{ margin: 0, fontSize: 14.5, color: "#475569", lineHeight: 1.8 }}>{f.a}</p>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 14 }}>
            <Link href="/learn" style={{ color: "#059669", fontWeight: 700, textDecoration: "none" }}>FIRE learning hub →</Link>
            <Link href="/learn/what-is-fire-financial-independence-retire-early" style={{ color: "#059669", fontWeight: 700, textDecoration: "none" }}>What is FIRE? →</Link>
            <Link href="/calculators" style={{ color: "#059669", fontWeight: 700, textDecoration: "none" }}>All calculators →</Link>
            <Link href="/pricing" style={{ color: "#059669", fontWeight: 700, textDecoration: "none" }}>Pricing →</Link>
          </div>
        </div>
      </section>
    </>
  );
}
