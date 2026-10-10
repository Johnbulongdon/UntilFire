import Link from "next/link";
import { cityLandingPages } from "@/lib/city-pages";
import HomeClient from "./HomeClient";

export const metadata = {
  title: 'UntilFire — FIRE Calculator & Financial Freedom Planner',
  description:
    'Use UntilFire’s free FIRE calculator to estimate your FIRE number and freedom date from your income, spending and savings. No login required.',
  alternates: { canonical: 'https://www.untilfire.com/' },
  openGraph: {
    title: 'UntilFire — FIRE Calculator & Financial Freedom Planner',
    description: 'Use UntilFire’s free FIRE calculator to estimate your FIRE number and freedom date. Explore when work could become optional, no login required.',
    siteName: 'UntilFire',
    url: 'https://www.untilfire.com/',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UntilFire — FIRE Calculator & Financial Freedom Planner',
    description: 'Use UntilFire’s free FIRE calculator to estimate your FIRE number and freedom date. Explore when work could become optional, no login required.',
    images: ['https://www.untilfire.com/opengraph-image'],
  },
}

const seoHeading: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 800,
  color: "var(--uf-teal)",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  margin: "0 0 10px",
};

const calculators = [
  { href: "/calculators/4-percent-rule", label: "4% Rule / FIRE Number Calculator", desc: "How much you need to retire, using the 25× rule." },
  { href: "/calculators/coast-fire", label: "Coast FIRE Calculator", desc: "See if your investments can coast to FIRE on their own." },
  { href: "/calculators/savings-rate", label: "Savings Rate Calculator", desc: "Turn your savings rate into a retirement timeline." },
  { href: "/calculators/net-worth-by-age", label: "Net Worth by Age Calculator", desc: "Compare your net worth with US households in your age group." },
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
    a: "Your FIRE number is an estimate of the invested portfolio needed to cover your expected annual spending at a chosen withdrawal rate. At 4%, multiply spending by 25. This is a starting point, not a guarantee: retirement length, taxes, fees, inflation and market returns can change what you need.",
  },
  {
    q: "What is a freedom date?",
    a: "Your freedom date is the estimated year your investments could support your expected spending. UntilFire lets you explore how changes to saving, spending or income could move that date. It is a projection based on assumptions, not a promised retirement year.",
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
        className="uf-home-seo-shell"
        aria-label="About the UntilFire FIRE calculator"
        style={{
          background: "var(--uf-ground)",
          borderTop: "1px solid var(--uf-border)",
          fontFamily: "'Manrope', sans-serif",
          color: "var(--uf-ink-2)",
        }}
      >
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "56px 24px 72px" }}>
          <p style={seoHeading}>Finance your freedom</p>
          <h2 style={{ fontFamily: "'Instrument Serif', Georgia, 'Times New Roman', serif", fontSize: "clamp(32px, 4.6vw, 46px)", fontWeight: 400, lineHeight: 1.12, letterSpacing: "-0.02em", color: "var(--uf-ink)", margin: "0 0 16px" }}>
            Understand your FIRE estimate
          </h2>
          <p style={{ fontSize: 18, lineHeight: 1.8, color: "var(--uf-ink-2)", margin: "0 0 16px", maxWidth: 720 }}>
            Your <strong style={{ color: "var(--uf-teal)" }}>FIRE number</strong> estimates the investments needed
            to cover your spending. Your <strong style={{ color: "var(--uf-teal)" }}>freedom date</strong> estimates
            when you could reach it. Use the free calculator above to explore your own numbers, without an account.
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: "var(--uf-ink-2)", margin: "0 0 32px", maxWidth: 720 }}>
            The 25× rule is a starting point: $50,000 in annual spending gives a $1.25 million target at a 4%
            withdrawal rate. It does not guarantee your money will last. Review the assumptions in the{" "}
            <Link href="/calculators/4-percent-rule" style={{ color: "var(--uf-green)", fontWeight: 700 }}>4% rule guide</Link>
            {" "}before treating an estimate as a retirement plan.
          </p>

          {/* FIRE calculators */}
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--uf-ink)", letterSpacing: "-0.03em", margin: "0 0 18px" }}>
            Free FIRE calculators
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginBottom: 40 }}>
            {calculators.map((c) => (
              <Link key={c.href} href={c.href} style={{ textDecoration: "none", background: "var(--uf-surface)", border: "1px solid var(--uf-border)", borderRadius: 16, padding: "18px 16px", display: "block" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--uf-teal)", marginBottom: 6 }}>{c.label}</div>
                <div style={{ fontSize: 16, color: "var(--uf-ink-2)", lineHeight: 1.6 }}>{c.desc}</div>
              </Link>
            ))}
          </div>

          {/* FIRE number by city */}
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--uf-ink)", letterSpacing: "-0.03em", margin: "0 0 8px" }}>
            FIRE number by city
          </h2>
          <p style={{ fontSize: 16, color: "var(--uf-ink-2)", lineHeight: 1.7, margin: "0 0 18px", maxWidth: 680 }}>
            How much you need to retire depends on where you live. Explore FIRE numbers and cost-of-living context for
            popular cities, or <Link href="/fire-number" style={{ color: "var(--uf-teal)", fontWeight: 700, textDecoration: "none" }}>browse all city FIRE guides</Link>.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 40 }}>
            {cityLandingPages.map((c) => (
              <Link key={c.slug} href={`/fire-number/${c.slug}`} style={{ textDecoration: "none", background: "var(--uf-surface)", border: "1px solid var(--uf-border)", borderRadius: 2, padding: "8px 16px", fontSize: 16, fontWeight: 700, color: "var(--uf-ink-2)" }}>
                {c.city.name} FIRE number
              </Link>
            ))}
          </div>

          {/* FAQ */}
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--uf-ink)", letterSpacing: "-0.03em", margin: "0 0 18px" }}>
            FIRE calculator — frequently asked questions
          </h2>
          <div style={{ display: "grid", gap: 12, marginBottom: 32 }}>
            {homeFaqs.map((f) => (
              <div key={f.q} style={{ background: "var(--uf-surface)", border: "1px solid var(--uf-border)", borderRadius: 14, padding: "18px 18px 16px" }}>
                <h3 style={{ margin: "0 0 8px", fontSize: 18, color: "var(--uf-ink)" }}>{f.q}</h3>
                <p style={{ margin: 0, fontSize: 16, color: "var(--uf-ink-2)", lineHeight: 1.8 }}>{f.a}</p>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 16 }}>
            <Link href="/learn" style={{ color: "var(--uf-teal)", fontWeight: 700, textDecoration: "none" }}>FIRE learning hub →</Link>
            <Link href="/learn/what-is-fire-financial-independence-retire-early" style={{ color: "var(--uf-teal)", fontWeight: 700, textDecoration: "none" }}>What is FIRE? →</Link>
            <Link href="/calculators" style={{ color: "var(--uf-teal)", fontWeight: 700, textDecoration: "none" }}>All calculators →</Link>
            <Link href="/pricing" style={{ color: "var(--uf-teal)", fontWeight: 700, textDecoration: "none" }}>Pricing →</Link>
          </div>
        </div>
      </section>
      {/* The homepage's only FAQ schema, from the same source as the visible
          FAQ above. Other pages carry their own; the layout carries none. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: homeFaqs.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          }),
        }}
      />
    </>
  );
}
