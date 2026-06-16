import type { Metadata } from 'next'
import Link from 'next/link'
import { getNoIncomeTaxStates, getStateStats } from '@/lib/ranking-pages'
import { STATE_NAMES } from '@/lib/state-pages'

const fmt = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)

export const metadata: Metadata = {
  title: 'Best No-Income-Tax States for FIRE | Early Retirement Tax Guide | UntilFire',
  description:
    'Discover 9 US states with zero income tax: Texas, Florida, Nevada, Washington, and more. Compare FIRE numbers, cost of living, and tax savings for each state.',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://www.untilfire.com/fire-number/no-income-tax-states' },
  openGraph: {
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

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { background: #F7F9FB; color: #19181E; font-family: 'Manrope', sans-serif; margin: 0; }
        a { color: inherit; }
        .state-card { transition: border-color 0.15s, background 0.15s; }
        .state-card:hover { border-color: #059669 !important; background: #F0FDF4 !important; }
        @media(max-width: 640px) {
          .ranking-hero { padding: 24px 16px !important; }
          .state-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px 80px' }}>

        {/* Breadcrumb */}
        <nav style={{ fontSize: 13, color: '#94A3B8', marginBottom: 24, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/" style={{ textDecoration: 'none', color: '#94A3B8' }}>UntilFire</Link>
          <span>›</span>
          <Link href="/fire-number" style={{ textDecoration: 'none', color: '#94A3B8' }}>FIRE Number by City</Link>
          <span>›</span>
          <span style={{ color: '#064E3B', fontWeight: 600 }}>No-Income-Tax States</span>
        </nav>

        {/* Hero */}
        <div className="ranking-hero" style={{ marginBottom: 48, padding: '32px 0' }}>
          <h1 style={{ fontSize: 44, fontWeight: 800, color: '#064E3B', letterSpacing: '-0.8px', margin: '0 0 16px', lineHeight: 1.1 }}>
            FIRE in No-Income-Tax States: Tax-Efficient Retirement
          </h1>
          <p style={{ fontSize: 17, color: '#475569', margin: '0 0 28px', lineHeight: 1.65, maxWidth: 700 }}>
            Nine US states have zero income tax, keeping more of each raise invested. From Texas to Alaska, these states let you convert higher gross income directly into portfolio growth. Compare cost of living, FIRE targets, and tax savings across all nine no-tax states.
          </p>

          {/* Key stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, maxWidth: 600 }}>
            {[
              { label: 'No-income-tax states', value: `${stateStats.length}` },
              { label: 'Avg annual cost', value: fmt(avgCost) },
              { label: 'Potential tax savings', value: fmt(potentialTaxSavings) },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#064E3B', letterSpacing: '-0.4px' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* State grid */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#064E3B', margin: '0 0 20px', letterSpacing: '-0.03em' }}>
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
                  background: '#fff',
                  border: '1px solid #E2E8F0',
                  borderRadius: 14,
                  padding: '20px',
                }}
              >
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                    Zero income tax
                  </div>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: '#064E3B', margin: 0, lineHeight: 1.2 }}>
                    {STATE_NAMES[state.stateKey]}
                  </h3>
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                      Cities
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#19181E' }}>{state.count}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                      Avg annual cost
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#19181E' }}>{fmt(state.avgCol)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                      Avg FIRE target
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#22d3a5' }}>{fmt(state.fireTarget)}</div>
                  </div>
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 12, color: '#059669', fontWeight: 700 }}>View all cities →</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Tax benefit callout */}
        <section style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 16, padding: '24px', marginBottom: 48 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#064E3B', margin: '0 0 12px' }}>
            Why no-income-tax states matter for FIRE
          </h2>
          <p style={{ margin: 0, fontSize: 15, color: '#475569', lineHeight: 1.7 }}>
            A 5% state tax on a $100k income means $5,000/year stays in your pocket instead of going to the state. Over 30 years, that compounds into meaningful portfolio growth. Combined with disciplined spending and a lower-cost city in these states, you can hit your FIRE target years faster.
          </p>
        </section>

        {/* Bottom CTA */}
        <div style={{ background: 'linear-gradient(135deg, #064E3B 0%, #047857 100%)', borderRadius: 16, padding: '32px 36px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 10px' }}>
            Model your FIRE date in a no-tax state
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', margin: '0 0 20px' }}>
            Use the FIRE calculator to see how zero state income tax accelerates your path to financial independence.
          </p>
          <Link
            href="/?source=no-tax-states"
            style={{
              display: 'inline-block',
              background: '#22d3a5',
              color: '#064E3B',
              padding: '12px 28px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 800,
              textDecoration: 'none',
            }}
          >
            Start the calculator
          </Link>
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.untilfire.com/' },
              { '@type': 'ListItem', position: 2, name: 'FIRE Number by City', item: 'https://www.untilfire.com/fire-number' },
              { '@type': 'ListItem', position: 3, name: 'No-Income-Tax States', item: 'https://www.untilfire.com/fire-number/no-income-tax-states' },
            ],
          }),
        }}
      />
    </>
  )
}
