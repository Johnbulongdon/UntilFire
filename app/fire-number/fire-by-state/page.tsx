import type { Metadata } from 'next'
import Link from 'next/link'
import { CITIES, STATE_TAX, isUS } from '@/lib/fire-data'
import { STATE_NAMES, getStatePageSlug } from '@/lib/state-pages'

const fmt = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)

export const metadata: Metadata = {
  title: 'FIRE Number by State | State-by-State Retirement Guide | UntilFire',
  description:
    'Compare average FIRE targets across all US states. See state tax rates, cheapest and most expensive cities, and median retirement costs for each state.',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://www.untilfire.com/fire-number/fire-by-state' },
  openGraph: {
    title: 'FIRE Number by State | UntilFire',
    description: 'State-by-state comparison of FIRE targets, tax rates, and retirement costs.',
    type: 'website',
  },
}

export default function FireByStatePage() {
  const US_CITIES = CITIES.filter((c) => isUS(c.state))

  // Group cities by state and calculate stats
  const stateStats = new Map<string, { cities: typeof US_CITIES; stateName: string }>()
  for (const city of US_CITIES) {
    if (!stateStats.has(city.state)) {
      stateStats.set(city.state, { cities: [], stateName: STATE_NAMES[city.state] || city.state })
    }
    stateStats.get(city.state)!.cities.push(city)
  }

  const sortedStates = Array.from(stateStats.entries())
    .map(([stateKey, { cities, stateName }]) => {
      const avgCol = Math.round(cities.reduce((sum, c) => sum + c.col, 0) / cities.length)
      const cheapest = cities.reduce((a, b) => (a.col < b.col ? a : b))
      const mostExpensive = cities.reduce((a, b) => (a.col > b.col ? a : b))
      const taxInfo = STATE_TAX[stateKey]
      return {
        stateKey,
        stateName,
        cities,
        avgCol,
        fireTarget: avgCol * 25,
        cheapest,
        mostExpensive,
        taxRate: taxInfo?.rate ?? 0,
        taxLabel: taxInfo?.label ?? 'State taxes apply',
      }
    })
    .sort((a, b) => a.avgCol - b.avgCol)

  const nationalAvg = Math.round(sortedStates.reduce((sum, s) => sum + s.avgCol, 0) / sortedStates.length)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { background: #F7F9FB; color: #19181E; font-family: 'Manrope', sans-serif; margin: 0; }
        a { color: inherit; }
        .state-row { transition: background 0.15s; }
        .state-row:hover { background: #F0FDF4 !important; }
        @media(max-width: 640px) {
          .ranking-hero { padding: 24px 16px !important; }
          .state-table { font-size: 13px !important; }
          .state-table th, .state-table td { padding: 10px 8px !important; }
        }
      `}</style>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 80px' }}>

        {/* Breadcrumb */}
        <nav style={{ fontSize: 13, color: '#94A3B8', marginBottom: 24, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/" style={{ textDecoration: 'none', color: '#94A3B8' }}>UntilFire</Link>
          <span>›</span>
          <Link href="/fire-number" style={{ textDecoration: 'none', color: '#94A3B8' }}>FIRE Number by City</Link>
          <span>›</span>
          <span style={{ color: '#064E3B', fontWeight: 600 }}>By State</span>
        </nav>

        {/* Hero */}
        <div className="ranking-hero" style={{ marginBottom: 48, padding: '32px 0' }}>
          <h1 style={{ fontSize: 44, fontWeight: 800, color: '#064E3B', letterSpacing: '-0.8px', margin: '0 0 16px', lineHeight: 1.1 }}>
            FIRE Number by State: Compare Retirement Targets
          </h1>
          <p style={{ fontSize: 17, color: '#475569', margin: '0 0 28px', lineHeight: 1.65, maxWidth: 700 }}>
            Retirement costs vary dramatically by state — from $875k in Mississippi to $2.75M in San Francisco, CA. Compare average FIRE targets, state tax rates, and the cheapest/most expensive cities in all 50 US states. See how your home state stacks up for early retirement.
          </p>

          {/* Key stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, maxWidth: 600 }}>
            {[
              { label: 'States covered', value: `${sortedStates.length}` },
              { label: 'US avg annual cost', value: fmt(nationalAvg) },
              { label: 'Range', value: `${fmt(sortedStates[0].avgCol)} — ${fmt(sortedStates[sortedStates.length - 1].avgCol)}` },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#064E3B', letterSpacing: '-0.4px' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* State comparison table */}
        <section style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, overflow: 'hidden', marginBottom: 48 }}>
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #E2E8F0' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#064E3B', margin: 0 }}>
              All 50 states ranked by average cost of living
            </h2>
          </div>
          <table className="state-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#F8FAFC', position: 'sticky', top: 0 }}>
              <tr>
                {['State', 'Cities', 'Avg Cost', 'Avg FIRE Target', 'Cheapest City', 'Most Expensive', 'Tax Rate'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '12px 16px',
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#64748B',
                      textAlign: 'left',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      borderBottom: '1px solid #E2E8F0',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedStates.map((state, idx) => (
                <tr
                  key={state.stateKey}
                  className="state-row"
                  style={{ borderBottom: idx < sortedStates.length - 1 ? '1px solid #F1F5F9' : 'none' }}
                >
                  <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 700, color: '#064E3B' }}>
                    <Link
                      href={`/fire-number/states/${getStatePageSlug(state.stateKey)}`}
                      style={{ color: '#059669', textDecoration: 'none' }}
                    >
                      {state.stateName}
                    </Link>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: '#475569' }}>{state.cities.length}</td>
                  <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 700, color: '#064E3B' }}>{fmt(state.avgCol)}</td>
                  <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 700, color: '#22d3a5' }}>{fmt(state.fireTarget)}</td>
                  <td style={{ padding: '14px 16px', fontSize: 12, color: '#64748B' }}>
                    <Link href={`/fire-number/${state.cheapest.key}`} style={{ color: '#059669', textDecoration: 'none' }}>
                      {state.cheapest.name.split(',')[0]}
                    </Link>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 12, color: '#64748B' }}>
                    <Link href={`/fire-number/${state.mostExpensive.key}`} style={{ color: '#ef4444', textDecoration: 'none' }}>
                      {state.mostExpensive.name.split(',')[0]}
                    </Link>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 12, color: '#64748B' }}>
                    {state.taxRate === 0 ? '0%' : `${(state.taxRate * 100).toFixed(1)}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Bottom CTA */}
        <div style={{ background: 'linear-gradient(135deg, #064E3B 0%, #047857 100%)', borderRadius: 16, padding: '32px 36px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 10px' }}>
            Find your state&apos;s FIRE path
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', margin: '0 0 20px' }}>
            Click any state above to see all cities and compare retirement timelines with local tax context.
          </p>
          <Link
            href="/?source=fire-by-state"
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
            Calculate your FIRE date
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
              { '@type': 'ListItem', position: 3, name: 'By State', item: 'https://www.untilfire.com/fire-number/fire-by-state' },
            ],
          }),
        }}
      />
    </>
  )
}
