import type { Metadata } from 'next'
import Link from 'next/link'
import { CITIES, STATE_TAX, isUS } from '@/lib/fire-data'
import { STATE_NAMES, getStatePageSlug } from '@/lib/state-pages'

const fmt = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)

export const metadata: Metadata = {
  title: 'Best States for FIRE: Early Retirement Tax & Cost Guide | UntilFire',
  description:
    'Which US states are best for FIRE? Compare tax rates, cost of living, and retirement timelines. Find states that combine low taxes, affordable living, and FIRE-friendly policies.',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://www.untilfire.com/fire-number/best-states' },
  openGraph: {
    title: 'Best States for FIRE | UntilFire',
    description: 'Compare US states by tax efficiency and cost of living for early retirement planning.',
    type: 'website',
    images: [
      {
        url: '/api/og/ranking/best-states',
        width: 1200,
        height: 630,
        alt: 'Best states for FIRE',
      },
    ],
  },
}

export default function BestStatesPage() {
  const US_CITIES = CITIES.filter((c) => isUS(c.state))

  // Calculate state scores based on cost + tax efficiency
  const stateStats = new Map<string, { cities: typeof US_CITIES; stateName: string }>()
  for (const city of US_CITIES) {
    if (!stateStats.has(city.state)) {
      stateStats.set(city.state, { cities: [], stateName: STATE_NAMES[city.state] || city.state })
    }
    stateStats.get(city.state)!.cities.push(city)
  }

  const scored = Array.from(stateStats.entries())
    .map(([stateKey, { cities, stateName }]) => {
      const avgCol = Math.round(cities.reduce((sum, c) => sum + c.col, 0) / cities.length)
      const taxInfo = STATE_TAX[stateKey]
      const taxRate = taxInfo?.rate ?? 0

      // Score: lower cost + lower tax = higher score
      // Normalize: lower avg cost is better, lower tax rate is better
      const costScore = 100 - Math.min(avgCol / 1000, 100) // 0-100 scale
      const taxScore = (1 - taxRate) * 100 // 0-100 scale
      const overallScore = Math.round((costScore * 0.4 + taxScore * 0.6) * 100) / 100

      return {
        stateKey,
        stateName,
        cities,
        avgCol,
        fireTarget: avgCol * 25,
        taxRate,
        taxLabel: taxInfo?.label ?? 'State taxes apply',
        costScore: Math.round(costScore),
        taxScore: Math.round(taxScore),
        overallScore,
      }
    })
    .sort((a, b) => b.overallScore - a.overallScore)

  const topStates = scored.slice(0, 10)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { background: #F7F9FB; color: #19181E; font-family: 'Manrope', sans-serif; margin: 0; }
        a { color: inherit; }
        .score-badge { display: inline-block; background: #D1FAE5; color: #065F46; padding: 4px 10px; border-radius: 20px; font-weight: 700; font-size: 12px; }
        .state-card { transition: transform 0.15s, box-shadow 0.15s; }
        .state-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
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
          <span style={{ color: '#064E3B', fontWeight: 600 }}>Best States</span>
        </nav>

        {/* Hero */}
        <div className="ranking-hero" style={{ marginBottom: 48, padding: '32px 0' }}>
          <h1 style={{ fontSize: 44, fontWeight: 800, color: '#064E3B', letterSpacing: '-0.8px', margin: '0 0 16px', lineHeight: 1.1 }}>
            Best States for FIRE: Tax Efficiency + Affordability
          </h1>
          <p style={{ fontSize: 17, color: '#475569', margin: '0 0 28px', lineHeight: 1.65, maxWidth: 700 }}>
            The best states for early retirement combine affordable living with low tax rates. Texas, Florida, Nevada, and Washington top the list with zero state income tax. But affordability matters too. Find the perfect blend of low cost and low taxes to maximize your FIRE timeline.
          </p>

          <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 12, padding: '20px', maxWidth: 600 }}>
            <div style={{ fontSize: 14, color: '#047857', fontWeight: 700, marginBottom: 8 }}>
              🎯 How we score states
            </div>
            <div style={{ fontSize: 13, color: '#065F46', lineHeight: 1.6, margin: 0 }}>
              Overall score combines tax efficiency (60%) and affordability (40%). Higher score = better for FIRE.
            </div>
          </div>
        </div>

        {/* Top 10 states */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#064E3B', margin: '0 0 24px', letterSpacing: '-0.03em' }}>
            Top 10 states for FIRE
          </h2>

          <div className="state-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18 }}>
            {topStates.map((state, idx) => (
              <Link
                key={state.stateKey}
                href={`/fire-number/states/${getStatePageSlug(state.stateKey)}`}
                className="state-card"
                style={{
                  textDecoration: 'none',
                  background: '#fff',
                  border: '1px solid #E2E8F0',
                  borderRadius: 14,
                  padding: '22px',
                }}
              >
                <div style={{ marginBottom: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 800, color: '#064E3B', margin: 0 }}>
                      #{idx + 1}
                    </h3>
                    <div className="score-badge">{state.overallScore.toFixed(1)}</div>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#064E3B', margin: '8px 0 0' }}>
                    {state.stateName}
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ padding: '10px', background: '#F8FAFC', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                      Avg annual cost
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#19181E' }}>{fmt(state.avgCol)}</div>
                  </div>

                  <div style={{ padding: '10px', background: '#F8FAFC', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                      State tax rate
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: state.taxRate === 0 ? '#059669' : '#19181E' }}>
                      {state.taxRate === 0 ? '0% — No tax' : `${(state.taxRate * 100).toFixed(1)}%`}
                    </div>
                  </div>

                  <div style={{ padding: '10px', background: '#F8FAFC', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                      FIRE target
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#22d3a5' }}>{fmt(state.fireTarget)}</div>
                  </div>
                </div>

                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: 12, color: '#059669', fontWeight: 700 }}>View all cities in {state.stateName} →</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Why these states */}
        <section style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: '28px 24px', marginBottom: 48 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#064E3B', margin: '0 0 16px' }}>
            Why these states rank highest for FIRE
          </h2>
          <div style={{ display: 'grid', gap: 14 }}>
            {[
              {
                title: 'Tax efficiency',
                desc: 'States with zero or low income tax keep more of your earnings invested. A 5% tax difference on a $100k income compounds to $500k+ over 30 years.',
              },
              {
                title: 'Affordable living',
                desc: 'Lower cost of living means your portfolio can sustain you longer. Every $10k/year in spending reduction lowers your FIRE target by $250k.',
              },
              {
                title: 'Combination effect',
                desc: 'The best states for FIRE do both: low taxes AND affordable living. This compounds the advantage significantly.',
              },
            ].map((item) => (
              <div key={item.title} style={{ paddingBottom: 14, borderBottom: '1px solid #E2E8F0' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#064E3B', margin: '0 0 6px' }}>{item.title}</h3>
                <p style={{ margin: 0, fontSize: 14, color: '#475569', lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <div style={{ background: 'linear-gradient(135deg, #064E3B 0%, #047857 100%)', borderRadius: 16, padding: '32px 36px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 10px' }}>
            Find your best-fit FIRE state
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', margin: '0 0 24px' }}>
            Explore the top 10 and all 50 states with detailed cost, tax, and retirement timeline data. Then log in to start tracking.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            <Link
              href="/?source=best-states"
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
              Start your FIRE plan
            </Link>
            <Link
              href="/dashboard"
              style={{
                display: 'inline-block',
                background: 'rgba(255,255,255,0.15)',
                color: '#fff',
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
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.untilfire.com/' },
              { '@type': 'ListItem', position: 2, name: 'FIRE Number by City', item: 'https://www.untilfire.com/fire-number' },
              { '@type': 'ListItem', position: 3, name: 'Best States', item: 'https://www.untilfire.com/fire-number/best-states' },
            ],
          }),
        }}
      />
    </>
  )
}
