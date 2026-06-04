import type { Metadata } from 'next'
import Link from 'next/link'
import { cityLandingPages } from '@/lib/city-pages'

const CALCULATORS = [
  {
    href: '/fire-calculator',
    name: 'FIRE Calculator',
    description: 'Find your FIRE date, FIRE number, Coast FIRE milestone, savings rate, and monthly moves in one planning flow.',
    keyword: 'FIRE calculator',
    accent: '#064E3B',
  },
  {
    href: '/calculators/4-percent-rule',
    name: 'FIRE Number Calculator',
    description: 'Estimate how much you need invested to retire using the 4% rule and adjustable withdrawal rates.',
    keyword: 'FIRE number calculator',
    accent: '#059669',
  },
  {
    href: '/calculators/coast-fire',
    name: 'Coast FIRE Calculator',
    description: 'Find the amount you need invested today so compound growth can carry you to retirement later.',
    keyword: 'coast FIRE calculator',
    accent: '#7C3AED',
  },
  {
    href: '/calculators/savings-rate',
    name: 'Savings Rate Calculator',
    description: 'Calculate your savings rate and see how the percentage you keep changes your FIRE timeline.',
    keyword: 'savings rate calculator',
    accent: '#0EA5E9',
  },
  {
    href: '/calculators/compound-interest',
    name: 'Compound Interest Calculator',
    description: 'Project investment growth over time with monthly contributions and compounding.',
    keyword: 'compound interest calculator',
    accent: '#047857',
  },
  {
    href: '/calculators/apy',
    name: 'APY Calculator',
    description: 'Convert APR to APY and see how compounding frequency changes your real annual yield.',
    keyword: 'APY calculator',
    accent: '#20D4BF',
  },
] as const

export const metadata: Metadata = {
  title: 'Financial Calculators for FIRE Planning | UntilFire',
  description:
    'Free FIRE calculators for retirement planning, savings rate, Coast FIRE, compound interest, and APY. Use each tool on its own or calculate your full FIRE date.',
  keywords:
    'FIRE calculators, financial calculators, FIRE number calculator, coast FIRE calculator, savings rate calculator, compound interest calculator, APY calculator',
  alternates: { canonical: 'https://www.untilfire.com/calculators' },
  openGraph: {
    title: 'Financial Calculators for FIRE Planning | UntilFire',
    description:
      'Explore free calculators for FIRE planning, retirement math, savings rate, compounding, and Coast FIRE.',
    url: 'https://www.untilfire.com/calculators',
    siteName: 'UntilFire',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Financial Calculators for FIRE Planning | UntilFire',
    description:
      'Explore free calculators for FIRE planning, retirement math, savings rate, compounding, and Coast FIRE.',
  },
}

export default function CalculatorsHubPage() {
  return (
    <>
      <main style={{ background: '#F7F9FB', minHeight: '100vh', fontFamily: "'Manrope', sans-serif" }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '56px 24px 88px' }}>
          <header style={{ marginBottom: 40 }}>
            <p style={{ fontSize: 12, color: '#059669', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 12px' }}>
              Calculators
            </p>
            <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', lineHeight: 1.05, letterSpacing: '-0.04em', color: '#19181E', margin: '0 0 16px' }}>
              Free FIRE calculators that answer the questions people actually search for.
            </h1>
            <p style={{ maxWidth: 760, fontSize: 17, lineHeight: 1.8, color: '#64748B', margin: 0 }}>
              Start with one specific question like your FIRE number, Coast FIRE target, savings rate, or APY. Then move into the full UntilFire calculator when you want your retirement date adjusted for your city, income, and spending.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 24 }}>
              <Link
                href="/?source=calculators-hub"
                style={{ textDecoration: 'none', background: 'linear-gradient(135deg, #059669, #064E3B)', color: '#fff', padding: '12px 18px', borderRadius: 10, fontWeight: 700, fontSize: 14 }}
              >
                Calculate full FIRE date
              </Link>
              <Link
                href="/learn"
                style={{ textDecoration: 'none', background: '#fff', color: '#19181E', padding: '12px 18px', borderRadius: 10, border: '1px solid #E2E8F0', fontWeight: 700, fontSize: 14 }}
              >
                Read FIRE guides
              </Link>
            </div>
          </header>

          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: 18,
              marginBottom: 44,
            }}
          >
            {CALCULATORS.map((calculator) => (
              <Link
                key={calculator.href}
                href={calculator.href}
                style={{
                  textDecoration: 'none',
                  background: '#ffffff',
                  border: '1px solid #E2E8F0',
                  borderRadius: 16,
                  padding: '22px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  minHeight: 228,
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    background: `${calculator.accent}14`,
                    border: `1px solid ${calculator.accent}33`,
                    color: calculator.accent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: 13,
                  }}
                >
                  UF
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: calculator.accent }}>
                  {calculator.keyword}
                </div>
                <h2 style={{ margin: 0, fontSize: 21, lineHeight: 1.2, letterSpacing: '-0.02em', color: '#19181E' }}>
                  {calculator.name}
                </h2>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: '#64748B', flexGrow: 1 }}>
                  {calculator.description}
                </p>
                <div style={{ fontSize: 13, fontWeight: 700, color: calculator.accent }}>
                  Open calculator
                </div>
              </Link>
            ))}
          </section>

          <section style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 18, padding: '28px 24px' }}>
            <h2 style={{ margin: '0 0 12px', fontSize: 24, color: '#19181E', letterSpacing: '-0.02em' }}>
              How these calculators fit together
            </h2>
            <p style={{ margin: '0 0 12px', fontSize: 15, lineHeight: 1.8, color: '#64748B' }}>
              The calculator pages are designed for high-intent search queries. Someone looking for an APY calculator has a different immediate question than someone looking for a FIRE number calculator. The goal is to answer both well, then connect them back to the full planning journey.
            </p>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.8, color: '#64748B' }}>
              If you are just starting, begin with the <Link href="/fire-calculator" style={{ color: '#059669', fontWeight: 700, textDecoration: 'none' }}>FIRE Calculator</Link> for the full freedom-date view, then use the <Link href="/calculators/4-percent-rule" style={{ color: '#059669', fontWeight: 700, textDecoration: 'none' }}>FIRE Number Calculator</Link> to pressure-test withdrawal rates. If you are comparing milestones, use the <Link href="/calculators/coast-fire" style={{ color: '#059669', fontWeight: 700, textDecoration: 'none' }}>Coast FIRE Calculator</Link>. If you want to understand the concepts before you model them, the <Link href="/learn" style={{ color: '#059669', fontWeight: 700, textDecoration: 'none' }}>Learning Hub</Link> explains the assumptions behind the math.
            </p>
          </section>

          <section style={{ marginTop: 24, background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 18, padding: '28px 24px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.4px', textTransform: 'uppercase', color: '#059669', marginBottom: 8 }}>
                  City intent pages
                </div>
                <h2 style={{ margin: 0, fontSize: 24, color: '#19181E', letterSpacing: '-0.02em' }}>
                  Compare FIRE math in the cities people actually search for.
                </h2>
              </div>
              <Link href="/learn/topics" style={{ color: '#059669', fontWeight: 700, textDecoration: 'none', fontSize: 14 }}>
                See topic clusters
              </Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
              {cityLandingPages.map((page) => (
                <Link
                  key={page.slug}
                  href={`/fire-number/${page.slug}`}
                  style={{
                    textDecoration: 'none',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: 16,
                    padding: '18px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: '#64748B' }}>
                    {page.keyword}
                  </div>
                  <div style={{ fontSize: 19, fontWeight: 800, color: '#19181E', letterSpacing: '-0.02em' }}>
                    {page.city.name}
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.7, color: '#64748B' }}>
                    Baseline spending ${Math.round(page.city.col).toLocaleString()} / year
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section style={{ marginTop: 24, background: "#ffffff", border: "1px solid #E2E8F0", borderRadius: 18, padding: "28px 24px" }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 24, color: "#19181E", letterSpacing: "-0.02em" }}>Calculator tools FAQ</h2>
            <div style={{ display: "grid", gap: 16 }}>
              <article style={{ borderTop: "1px solid #E2E8F0", paddingTop: 16 }}>
                <h3 style={{ margin: "0 0 8px", color: "#19181E", fontSize: 18 }}>Which calculator should I use first?</h3>
                <p style={{ margin: 0, color: "#64748B", fontSize: 15, lineHeight: 1.75 }}>Start with the full FIRE calculator if you want a complete retirement date and plan. Use the individual calculators for specific questions: FIRE number calculator for a target, coast FIRE for a milestone, savings rate for understanding your lever, compound interest for growth, and APY for savings account comparisons.</p>
              </article>
              <article style={{ borderTop: "1px solid #E2E8F0", paddingTop: 16 }}>
                <h3 style={{ margin: "0 0 8px", color: "#19181E", fontSize: 18 }}>What does the FIRE number calculator show?</h3>
                <p style={{ margin: 0, color: "#64748B", fontSize: 15, lineHeight: 1.75 }}>It shows how much you need invested based on your annual spending and a withdrawal rate (3%, 4%, or 5%). The default 4% rule suggests multiplying spending by 25. Adjust the withdrawal rate to pressure-test your assumptions for a longer or earlier retirement.</p>
              </article>
              <article style={{ borderTop: "1px solid #E2E8F0", paddingTop: 16 }}>
                <h3 style={{ margin: "0 0 8px", color: "#19181E", fontSize: 18 }}>How is Coast FIRE different from regular FIRE?</h3>
                <p style={{ margin: 0, color: "#64748B", fontSize: 15, lineHeight: 1.75 }}>Coast FIRE is the point where your existing portfolio, untouched, will grow to your full FIRE number by age 65. Regular FIRE means having enough to retire immediately. Coast FIRE is useful when you want work to feel optional sooner but don&apos;t need to stop earning entirely.</p>
              </article>
              <article style={{ borderTop: "1px solid #E2E8F0", paddingTop: 16 }}>
                <h3 style={{ margin: "0 0 8px", color: "#19181E", fontSize: 18 }}>Can I compare multiple cities at once?</h3>
                <p style={{ margin: 0, color: "#64748B", fontSize: 15, lineHeight: 1.75 }}>Use the FIRE number calculator for a baseline target, then visit the city pages in the calculators hub to see how the same target translates across different locations. Each city page shows the FIRE number, Coast FIRE number, and monthly savings timeline for that city&apos;s cost of living.</p>
              </article>
              <article style={{ borderTop: "1px solid #E2E8F0", paddingTop: 16 }}>
                <h3 style={{ margin: "0 0 8px", color: "#19181E", fontSize: 18 }}>Are these calculators accurate for my situation?</h3>
                <p style={{ margin: 0, color: "#64748B", fontSize: 15, lineHeight: 1.75 }}>These tools give you a starting estimate based on standard assumptions. Your actual FIRE date depends on your specific income, spending, taxes, healthcare, Social Security, market returns, and flexibility. Use them to understand the levers, then refine with the full FIRE calculator or a financial adviser for major decisions.</p>
              </article>
            </div>
          </section>
        </div>
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'UntilFire Calculators',
            description:
              'A hub of free FIRE planning calculators including FIRE number, Coast FIRE, savings rate, compound interest, and APY.',
            url: 'https://www.untilfire.com/calculators',
            hasPart: CALCULATORS.map((calculator, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              url: `https://www.untilfire.com${calculator.href}`,
              name: calculator.name,
            })),
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'Which calculator should I use first?',
                acceptedAnswer: { '@type': 'Answer', text: 'Start with the full FIRE calculator if you want a complete retirement date and plan. Use the individual calculators for specific questions: FIRE number calculator for a target, coast FIRE for a milestone, savings rate for understanding your lever, compound interest for growth, and APY for savings account comparisons.' },
              },
              {
                '@type': 'Question',
                name: 'What does the FIRE number calculator show?',
                acceptedAnswer: { '@type': 'Answer', text: 'It shows how much you need invested based on your annual spending and a withdrawal rate (3%, 4%, or 5%). The default 4% rule suggests multiplying spending by 25. Adjust the withdrawal rate to pressure-test your assumptions for a longer or earlier retirement.' },
              },
              {
                '@type': 'Question',
                name: 'How is Coast FIRE different from regular FIRE?',
                acceptedAnswer: { '@type': 'Answer', text: 'Coast FIRE is the point where your existing portfolio, untouched, will grow to your full FIRE number by age 65. Regular FIRE means having enough to retire immediately. Coast FIRE is useful when you want work to feel optional sooner but don\'t need to stop earning entirely.' },
              },
              {
                '@type': 'Question',
                name: 'Can I compare multiple cities at once?',
                acceptedAnswer: { '@type': 'Answer', text: 'Use the FIRE number calculator for a baseline target, then visit the city pages in the calculators hub to see how the same target translates across different locations. Each city page shows the FIRE number, Coast FIRE number, and monthly savings timeline for that city\'s cost of living.' },
              },
              {
                '@type': 'Question',
                name: 'Are these calculators accurate for my situation?',
                acceptedAnswer: { '@type': 'Answer', text: 'These tools give you a starting estimate based on standard assumptions. Your actual FIRE date depends on your specific income, spending, taxes, healthcare, Social Security, market returns, and flexibility. Use them to understand the levers, then refine with the full FIRE calculator or a financial adviser for major decisions.' },
              },
            ],
          }),
        }}
      />
    </>
  )
}
