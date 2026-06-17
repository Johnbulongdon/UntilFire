import type { Metadata } from 'next'
import Link from 'next/link'
import { getMostExpensiveCities } from '@/lib/ranking-pages'

const fmt = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)

export const metadata: Metadata = {
  title: 'Most Expensive US Cities for FIRE | Cost of Living Guide | UntilFire',
  description:
    'Compare the 20 most expensive US cities: San Francisco, New York, LA, and more. See exact FIRE targets, tax rates, and realistic retirement costs for each city.',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://www.untilfire.com/fire-number/most-expensive-cities' },
  openGraph: {
    title: 'Most Expensive US Cities for FIRE | UntilFire',
    description: 'The 20 most expensive US cities ranked by annual cost of living with FIRE targets.',
    type: 'website',
  },
}

export default function MostExpensiveCitiesPage() {
  const cities = getMostExpensiveCities()
  const avgCost = Math.round(cities.reduce((sum, c) => sum + c.col, 0) / cities.length)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { background: #F7F9FB; color: #19181E; font-family: 'Manrope', sans-serif; margin: 0; }
        a { color: inherit; }
        .city-row { transition: background 0.15s; }
        .city-row:hover { background: #FEF2F2 !important; }
        @media(max-width: 640px) {
          .ranking-hero { padding: 24px 16px !important; }
          .city-table { font-size: 13px !important; }
          .city-table th, .city-table td { padding: 10px 8px !important; }
        }
      `}</style>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px 80px' }}>

        {/* Breadcrumb */}
        <nav style={{ fontSize: 13, color: '#94A3B8', marginBottom: 24, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/" style={{ textDecoration: 'none', color: '#94A3B8' }}>UntilFire</Link>
          <span>›</span>
          <Link href="/fire-number" style={{ textDecoration: 'none', color: '#94A3B8' }}>FIRE Number by City</Link>
          <span>›</span>
          <span style={{ color: '#064E3B', fontWeight: 600 }}>Most Expensive Cities</span>
        </nav>

        {/* Hero */}
        <div className="ranking-hero" style={{ marginBottom: 48, padding: '32px 0' }}>
          <h1 style={{ fontSize: 44, fontWeight: 800, color: '#064E3B', letterSpacing: '-0.8px', margin: '0 0 16px', lineHeight: 1.1 }}>
            The Most Expensive US Cities & Their FIRE Numbers
          </h1>
          <p style={{ fontSize: 17, color: '#475569', margin: '0 0 28px', lineHeight: 1.65, maxWidth: 700 }}>
            High-cost cities demand larger portfolios. San Francisco requires $2.75M at the 25× rule, while New York City tops $2.37M. Even for high earners, controlling spending in expensive cities is critical to hitting your FIRE target on a realistic timeline. Here are the 20 most expensive US cities by annual cost of living.
          </p>

          {/* Key stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, maxWidth: 600 }}>
            {[
              { label: 'Cities listed', value: `${cities.length}` },
              { label: 'Avg annual cost', value: fmt(avgCost) },
              { label: 'Avg FIRE target', value: fmt(avgCost * 25) },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#064E3B', letterSpacing: '-0.4px' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Ranking table */}
        <section style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, overflow: 'hidden', marginBottom: 48 }}>
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #E2E8F0' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#064E3B', margin: 0 }}>
              Ranked by annual cost of living
            </h2>
          </div>
          <table className="city-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#F8FAFC' }}>
              <tr>
                {['Rank', 'City', 'State', 'Annual Cost', 'FIRE Target (25×)', 'State Tax'].map((h) => (
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
              {cities.map((city, idx) => {
                const taxInfo = require('@/lib/fire-data').STATE_TAX[city.state]
                return (
                  <tr
                    key={city.key}
                    className="city-row"
                    style={{ borderBottom: idx < cities.length - 1 ? '1px solid #F1F5F9' : 'none' }}
                  >
                    <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 700, color: '#64748B' }}>{idx + 1}</td>
                    <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 700, color: '#064E3B' }}>
                      <Link href={`/fire-number/${city.key}`} style={{ color: '#059669', textDecoration: 'none' }}>
                        {city.name}
                      </Link>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#475569' }}>{city.state.toUpperCase()}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 700, color: '#064E3B' }}>{fmt(city.col)}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 700, color: '#ef4444' }}>{fmt(city.col * 25)}</td>
                    <td style={{ padding: '14px 16px', fontSize: 12, color: '#64748B' }}>
                      {taxInfo?.rate === 0 ? '0%' : `${(taxInfo?.rate * 100).toFixed(1)}%`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>

        {/* Bottom CTA */}
        <div style={{ background: 'linear-gradient(135deg, #064E3B 0%, #047857 100%)', borderRadius: 16, padding: '32px 36px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 10px' }}>
            Plan for high-cost living with exact numbers
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', margin: '0 0 24px' }}>
            Use the FIRE calculator to model different spending scenarios, or log in to track your actual progress.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            <Link
              href="/?source=expensive-cities"
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
          __html: JSON.stringify([
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.untilfire.com/' },
                { '@type': 'ListItem', position: 2, name: 'FIRE Number by City', item: 'https://www.untilfire.com/fire-number' },
                { '@type': 'ListItem', position: 3, name: 'Most Expensive Cities', item: 'https://www.untilfire.com/fire-number/most-expensive-cities' },
              ],
            },
            {
              '@context': 'https://schema.org',
              '@type': 'Table',
              name: 'Most Expensive US Cities for FIRE',
              description: 'Ranked list of the 20 most expensive US cities by annual cost of living with FIRE targets',
              url: 'https://www.untilfire.com/fire-number/most-expensive-cities',
            },
          ]),
        }}
      />
    </>
  )
}
