import type { Metadata } from 'next'
import Link from 'next/link'
import { getCheapestCities, getRankingPage } from '@/lib/ranking-pages'
import { formatMoney } from "@/lib/money";


export const metadata: Metadata = {
  title: 'Cheapest US Cities for Early Retirement | FIRE Number | UntilFire',
  description:
    'Explore the 20 cheapest US cities for FIRE. See local cost of living, FIRE targets, state tax context, and retirement timelines for budget-conscious early retirees.',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://www.untilfire.com/fire-number/cheapest-cities' },
  openGraph: {
    images: [
      {
        url: "/api/og/ranking/cheapest-cities",
        width: 1200,
        height: 630,
        alt: "FIRE ranking for cheapest-cities",
      },
    ],
    title: 'Cheapest US Cities for FIRE | UntilFire',
    description: 'The 20 cheapest US cities ranked by cost of living with FIRE targets and tax context.',
    type: 'website',
  },
}

export default function CheapestCitiesPage() {
  const cities = getCheapestCities()
  const avgCost = Math.round(cities.reduce((sum, c) => sum + c.col, 0) / cities.length)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { background: var(--uf-surface); color: var(--uf-ink); font-family: 'Manrope', sans-serif; margin: 0; }
        a { color: inherit; }
        .city-row { transition: background 0.15s; }
        .city-row:hover { background: var(--uf-green-50) !important; }
        @media(max-width: 640px) {
          .ranking-hero { padding: 24px 16px !important; }
          .city-table { font-size: 13px !important; }
          .city-table th, .city-table td { padding: 10px 8px !important; }
        }
      `}</style>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px 80px' }}>

        {/* Breadcrumb */}
        <nav style={{ fontSize: 13, color: 'var(--uf-ink-3)', marginBottom: 24, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/" style={{ textDecoration: 'none', color: 'var(--uf-ink-3)' }}>UntilFire</Link>
          <span>›</span>
          <Link href="/fire-number" style={{ textDecoration: 'none', color: 'var(--uf-ink-3)' }}>FIRE Number by City</Link>
          <span>›</span>
          <span style={{ color: 'var(--uf-green-900)', fontWeight: 600 }}>Cheapest Cities</span>
        </nav>

        {/* Hero */}
        <div className="ranking-hero" style={{ marginBottom: 48, padding: '32px 0' }}>
          <h1 style={{ fontSize: 44, fontWeight: 800, color: 'var(--uf-green-900)', letterSpacing: '-0.8px', margin: '0 0 16px', lineHeight: 1.1 }}>
            The Cheapest US Cities to Retire Early
          </h1>
          <p style={{ fontSize: 17, color: 'var(--uf-ink-2)', margin: '0 0 28px', lineHeight: 1.65, maxWidth: 700 }}>
            Lower cost of living is the fastest way to bring your FIRE date closer. A portfolio that sustains you in Memphis, TN ($42k/year) requires only $1.05M—while the same lifestyle in San Francisco demands $2.75M. These 20 cities offer the lowest barriers to financial independence.
          </p>

          {/* Key stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, maxWidth: 600 }}>
            {[
              { label: 'Cities listed', value: `${cities.length}` },
              { label: 'Avg annual cost', value: formatMoney(avgCost) },
              { label: 'Avg FIRE target', value: formatMoney(avgCost * 25) },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: 'var(--uf-card)', border: '1px solid var(--uf-border)', borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--uf-ink-2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--uf-green-900)', letterSpacing: '-0.4px' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Ranking table */}
        <section style={{ background: 'var(--uf-card)', border: '1px solid var(--uf-border)', borderRadius: 16, overflow: 'hidden', marginBottom: 48 }}>
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--uf-border)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--uf-green-900)', margin: 0 }}>
              Ranked by annual cost of living
            </h2>
          </div>
          <table className="city-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'var(--uf-surface)' }}>
              <tr>
                {['Rank', 'City', 'State', 'Annual Cost', 'FIRE Target (25×)', 'State Tax'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '12px 16px',
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--uf-ink-2)',
                      textAlign: 'left',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      borderBottom: '1px solid var(--uf-border)',
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
                    style={{ borderBottom: idx < cities.length - 1 ? '1px solid var(--uf-surface-2)' : 'none' }}
                  >
                    <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 700, color: 'var(--uf-ink-2)' }}>{idx + 1}</td>
                    <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 700, color: 'var(--uf-green-900)' }}>
                      <Link href={`/fire-number/${city.key}`} style={{ color: 'var(--uf-green)', textDecoration: 'none' }}>
                        {city.name}
                      </Link>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--uf-ink-2)' }}>{city.state.toUpperCase()}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 700, color: 'var(--uf-green-900)' }}>{formatMoney(city.col)}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 700, color: 'var(--uf-teal)' }}>{formatMoney(city.col * 25)}</td>
                    <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--uf-ink-2)' }}>
                      {taxInfo?.rate === 0 ? '0%' : `${(taxInfo?.rate * 100).toFixed(1)}%`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>

        {/* Bottom CTA */}
        <div style={{ background: 'linear-gradient(135deg, var(--uf-green-900) 0%, var(--uf-green-700) 100%)', borderRadius: 16, padding: '32px 36px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--uf-card)', margin: '0 0 10px' }}>
            Retire earlier in one of these cities
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', margin: '0 0 24px' }}>
            Use the FIRE calculator to model your exact timeline, or log in to track your actual progress.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            <Link
              href="/?source=cheapest-cities"
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
              Calculate your FIRE date
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
                { '@type': 'ListItem', position: 3, name: 'Cheapest Cities', item: 'https://www.untilfire.com/fire-number/cheapest-cities' },
              ],
            },
            {
              '@context': 'https://schema.org',
              '@type': 'Table',
              name: 'Cheapest US Cities for FIRE',
              description: 'Ranked list of the 20 cheapest US cities by annual cost of living with FIRE targets',
              url: 'https://www.untilfire.com/fire-number/cheapest-cities',
            },
          ]),
        }}
      />
    </>
  )
}
