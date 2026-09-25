import type { Metadata } from 'next'
import Link from 'next/link'
import { getNoIncomeTaxStates, getStateStats } from '@/lib/ranking-pages'
import { STATE_NAMES } from '@/lib/state-pages'
import { formatMoney } from "@/lib/money";


export const metadata: Metadata = {
  title: 'Best No-Income-Tax States for FIRE | Early Retirement Tax Guide | UntilFire',
  description:
    'Discover 9 US states with zero income tax: Texas, Florida, Nevada, Washington, and more. Compare FIRE numbers, cost of living, and tax savings for each state.',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://www.untilfire.com/fire-number/no-income-tax-states' },
  openGraph: {
    images: [
      {
        url: "/api/og/ranking/no-income-tax-states",
        width: 1200,
        height: 630,
        alt: "FIRE ranking for no-income-tax-states",
      },
    ],
    title: 'No-Income-Tax States for FIRE | UntilFire',
    description: '9 US states with zero income tax. Compare FIRE targets and living costs for tax-efficient retirement.',
    type: 'website',
  },
}

export default function NoIncomeTaxStatesPage() {
  const stateKeys = getNoIncomeTaxStates()
  const stateStats = stateKeys
    .map((key) => getStateStats(key))
    .filter((s): s is Exclude<typeof s, null> => s !== null)
    .sort((a, b) => a.avgCol - b.avgCol)

  const avgCost = Math.round(stateStats.reduce((sum, s) => sum + s.avgCol, 0) / stateStats.length)
  const potentialTaxSavings = 0.05 * 100_000 // rough estimate: 5% tax rate * typical income

  // The visible FAQ and its structured data share one source, so the schema
  // only ever describes questions this page shows.
  const stateNames = stateStats.map((s) => STATE_NAMES[s.stateKey])
  const faqs = [
    {
      question: 'Which US states have no income tax?',
      answer: `${stateStats.length} US states have no state tax on wages: ${stateNames.slice(0, -1).join(', ')} and ${stateNames[stateNames.length - 1]}. Washington does tax large long-term capital gains, which can matter when you sell investments in retirement.`,
    },
    {
      question: 'How much can I save with no state income tax?',
      answer: 'On a $100,000 income, a 5% state income tax is $5,000 a year. Invested instead, that compounds over 30 years into meaningful portfolio growth. Combined with disciplined spending and a lower-cost city in these states, it can bring your FIRE target closer.',
    },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { background: var(--uf-surface); color: var(--uf-ink); font-family: 'Manrope', sans-serif; margin: 0; }
        a { color: inherit; }
        .state-card { transition: border-color 0.15s, background 0.15s; }
        .state-card:hover { border-color: var(--uf-green) !important; background: var(--uf-green-50) !important; }
        @media(max-width: 640px) {
          .ranking-hero { padding: 24px 16px !important; }
          .state-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px 80px' }}>

        {/* Breadcrumb */}
        <nav style={{ fontSize: 13, color: 'var(--uf-ink-3)', marginBottom: 24, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/" style={{ textDecoration: 'none', color: 'var(--uf-ink-3)' }}>UntilFire</Link>
          <span>›</span>
          <Link href="/fire-number" style={{ textDecoration: 'none', color: 'var(--uf-ink-3)' }}>FIRE Number by City</Link>
          <span>›</span>
          <span style={{ color: 'var(--uf-green-900)', fontWeight: 600 }}>No-Income-Tax States</span>
        </nav>

        {/* Hero */}
        <div className="ranking-hero" style={{ marginBottom: 48, padding: '32px 0' }}>
          <h1 style={{ fontSize: 44, fontWeight: 800, color: 'var(--uf-green-900)', letterSpacing: '-0.8px', margin: '0 0 16px', lineHeight: 1.1 }}>
            FIRE in No-Income-Tax States: Tax-Efficient Retirement
          </h1>
          <p style={{ fontSize: 17, color: 'var(--uf-ink-2)', margin: '0 0 28px', lineHeight: 1.65, maxWidth: 700 }}>
            Nine US states have zero income tax, keeping more of each raise invested. From Texas to Alaska, these states let you convert higher gross income directly into portfolio growth. Compare cost of living, FIRE targets, and tax savings across all nine no-tax states.
          </p>

          {/* Key stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, maxWidth: 600 }}>
            {[
              { label: 'No-income-tax states', value: `${stateStats.length}` },
              { label: 'Avg annual cost', value: formatMoney(avgCost) },
              { label: 'Potential tax savings', value: formatMoney(potentialTaxSavings) },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: 'var(--uf-card)', border: '1px solid var(--uf-border)', borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--uf-ink-2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--uf-green-900)', letterSpacing: '-0.4px' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* State grid */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--uf-green-900)', margin: '0 0 20px', letterSpacing: '-0.03em' }}>
            All 9 no-income-tax states, ranked by cost of living
          </h2>

          <div className="state-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {stateStats.map((state) => (
              <Link
                key={state.stateKey}
                href={`/fire-number/states/${STATE_NAMES[state.stateKey]?.toLowerCase().replace(/\s+/g, '').replace(/\./g, '')}`}
                className="state-card"
                style={{
                  textDecoration: 'none',
                  background: 'var(--uf-card)',
                  border: '1px solid var(--uf-border)',
                  borderRadius: 14,
                  padding: '20px',
                }}
              >
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--uf-green)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                    Zero income tax
                  </div>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--uf-green-900)', margin: 0, lineHeight: 1.2 }}>
                    {STATE_NAMES[state.stateKey]}
                  </h3>
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--uf-ink-2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                      Cities
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--uf-ink)' }}>{state.count}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--uf-ink-2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                      Avg annual cost
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--uf-ink)' }}>{formatMoney(state.avgCol)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--uf-ink-2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                      Avg FIRE target
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--uf-teal)' }}>{formatMoney(state.fireTarget)}</div>
                  </div>
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--uf-border)' }}>
                    <div style={{ fontSize: 12, color: 'var(--uf-green)', fontWeight: 700 }}>View all cities →</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Questions about no-income-tax states */}
        <section style={{ background: 'var(--uf-green-50)', border: '1px solid var(--uf-green-100)', borderRadius: 16, padding: '24px', marginBottom: 48 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--uf-green-900)', margin: '0 0 16px' }}>
            No-income-tax states and FIRE: common questions
          </h2>
          {faqs.map(({ question, answer }, i) => (
            <div key={question} style={{ marginTop: i === 0 ? 0 : 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--uf-green-900)', margin: '0 0 6px' }}>{question}</h3>
              <p style={{ margin: 0, fontSize: 15, color: 'var(--uf-ink-2)', lineHeight: 1.7 }}>{answer}</p>
            </div>
          ))}
        </section>

        {/* Bottom CTA */}
        <div style={{ background: 'linear-gradient(135deg, var(--uf-green-900) 0%, var(--uf-green-700) 100%)', borderRadius: 16, padding: '32px 36px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--uf-card)', margin: '0 0 10px' }}>
            Model your FIRE date in a no-tax state
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', margin: '0 0 24px' }}>
            Use the FIRE calculator to see how zero state income tax accelerates your path, or log in to track your actual savings.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            <Link
              href="/?source=no-tax-states"
              style={{
                display: 'inline-block',
                background: 'var(--uf-teal)',
                color: 'var(--uf-green-900)',
                padding: '12px 28px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 800,
                textDecoration: 'none',
              }}
            >
              Start the calculator
            </Link>
            <Link
              href="/dashboard"
              style={{
                display: 'inline-block',
                background: 'rgba(255,255,255,0.15)',
                color: 'var(--uf-card)',
                padding: '12px 28px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 800,
                textDecoration: 'none',
                border: '1px solid rgba(255,255,255,0.3)',
              }}
            >
              Go to dashboard
            </Link>
          </div>
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.untilfire.com/' },
                { '@type': 'ListItem', position: 2, name: 'FIRE Number by City', item: 'https://www.untilfire.com/fire-number' },
                { '@type': 'ListItem', position: 3, name: 'No-Income-Tax States', item: 'https://www.untilfire.com/fire-number/no-income-tax-states' },
              ],
            },
            {
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: faqs.map(({ question, answer }) => ({
                '@type': 'Question',
                name: question,
                acceptedAnswer: { '@type': 'Answer', text: answer },
              })),
            },
          ]),
        }}
      />
    </>
  )
}
