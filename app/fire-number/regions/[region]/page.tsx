import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  getRegion,
  getRegionCities,
  getRegionStats,
  regionSlugs,
} from '@/lib/regions'
import { getStatePageSlug } from '@/lib/state-pages'

type Props = {
  params: Promise<{ region: string }>
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

export async function generateStaticParams() {
  return regionSlugs.map((region) => ({ region }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { region: slug } = await params
  const region = getRegion(slug)
  if (!region) return {}

  const cities = getRegionCities(region.stateKeys)
  const stats = getRegionStats(cities)

  const title = `FIRE Number in the ${region.name} | Cost of Living & Retirement Guide | UntilFire`
  const description = `Compare FIRE targets across ${cities.length} cities in the ${region.name}. Average annual cost ${fmt(stats.avgCost)}, FIRE target ${fmt(stats.avgFire)}. State tax context and retirement timelines for every city.`

  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: { canonical: region.canonicalUrl },
    openGraph: {
      title: `FIRE in the ${region.name} | UntilFire`,
      description,
      url: region.canonicalUrl,
      type: 'website',
      images: [{ url: `/api/og/ranking/region-${slug}`, width: 1200, height: 630, alt: `FIRE number guide for the ${region.name}` }],
    },
    twitter: {
      card: 'summary_large_image',
      images: [`/api/og/ranking/region-${slug}`],
    },
  }
}

export default async function RegionHubPage({ params }: Props) {
  const { region: slug } = await params
  const region = getRegion(slug)
  if (!region) notFound()

  const cities = getRegionCities(region.stateKeys)
  const stats = getRegionStats(cities)

  // Unique states in this region with at least one city
  const stateMap = new Map<string, { stateName: string; stateKey: string; cities: typeof cities }>()
  for (const city of cities) {
    if (!stateMap.has(city.state)) {
      stateMap.set(city.state, { stateName: city.stateName, stateKey: city.state, cities: [] })
    }
    stateMap.get(city.state)!.cities.push(city)
  }
  const states = Array.from(stateMap.values()).sort((a, b) =>
    a.stateName.localeCompare(b.stateName)
  )

  const noTaxStates = states.filter((s) => s.cities[0]?.noIncomeTax)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { background: #F7F9FB; color: #19181E; font-family: 'Manrope', sans-serif; margin: 0; }
        a { color: inherit; }
        .region-city-row { transition: background 0.12s; cursor: pointer; }
        .region-city-row:hover { background: #F0FDF4 !important; }
        .state-card { transition: border-color 0.15s, background 0.15s; }
        .state-card:hover { border-color: #059669 !important; background: #F0FDF4 !important; }
        @media(max-width: 640px) {
          .region-hero h1 { font-size: 28px !important; }
          .region-stats { grid-template-columns: repeat(2, 1fr) !important; }
          .city-table th, .city-table td { padding: 10px 8px !important; font-size: 13px !important; }
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
          <span style={{ color: '#064E3B', fontWeight: 600 }}>{region.name}</span>
        </nav>

        {/* Hero */}
        <div className="region-hero" style={{ marginBottom: 48, padding: '32px 0' }}>
          <div style={{ display: 'inline-block', background: '#ECFDF5', color: '#059669', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 14px', borderRadius: 8, marginBottom: 16 }}>
            US Region · {cities.length} cities · {states.length} states
          </div>
          <h1 style={{ fontSize: 44, fontWeight: 800, color: '#064E3B', letterSpacing: '-0.8px', margin: '0 0 16px', lineHeight: 1.1 }}>
            FIRE in the {region.name}
          </h1>
          <p style={{ fontSize: 17, color: '#475569', margin: '0 0 12px', lineHeight: 1.65, maxWidth: 700 }}>
            {region.tagline}
          </p>
          <p style={{ fontSize: 15, color: '#64748B', margin: '0 0 32px', lineHeight: 1.7, maxWidth: 720 }}>
            {region.description}
          </p>

          {/* Stats */}
          <div className="region-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, maxWidth: 800 }}>
            {[
              { label: 'Cities covered', value: `${cities.length}` },
              { label: 'Avg annual cost', value: fmt(stats.avgCost) },
              { label: 'Avg FIRE target', value: fmt(stats.avgFire) },
              { label: 'No-income-tax states', value: `${noTaxStates.length}` },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#064E3B', letterSpacing: '-0.3px' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Full city table */}
        <section style={{ marginBottom: 56 }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#064E3B', margin: '0 0 8px', letterSpacing: '-0.03em' }}>
              All cities ranked by cost of living
            </h2>
            <p style={{ fontSize: 14, color: '#64748B', margin: 0 }}>
              Cheapest first. Click any city for detailed FIRE calculations and retirement timelines.
            </p>
          </div>

          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
            <table className="city-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>#</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>City</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>State</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#475569', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Annual Cost</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#475569', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>FIRE Target</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#475569', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Income Tax</th>
                </tr>
              </thead>
              <tbody>
                {cities.map((city, i) => (
                  <tr
                    key={city.key}
                    className="region-city-row"
                    style={{ borderBottom: i < cities.length - 1 ? '1px solid #F1F5F9' : undefined, background: '#fff' }}
                  >
                    <td style={{ padding: '13px 16px', color: '#94A3B8', fontWeight: 600 }}>{i + 1}</td>
                    <td style={{ padding: '13px 16px' }}>
                      <Link href={`/fire-number/${city.key}`} style={{ textDecoration: 'none', color: '#064E3B', fontWeight: 700 }}>
                        {city.name}
                      </Link>
                    </td>
                    <td style={{ padding: '13px 16px', color: '#64748B' }}>
                      <Link href={`/fire-number/states/${getStatePageSlug(city.state)}`} style={{ textDecoration: 'none', color: '#475569' }}>
                        {city.stateName}
                      </Link>
                    </td>
                    <td style={{ padding: '13px 16px', textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>
                      {fmt(city.col)}
                    </td>
                    <td style={{ padding: '13px 16px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                      {fmt(city.fireTarget)}
                    </td>
                    <td style={{ padding: '13px 16px', textAlign: 'right' }}>
                      {city.noIncomeTax ? (
                        <span style={{ background: '#ECFDF5', color: '#059669', padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>None</span>
                      ) : (
                        <span style={{ color: '#64748B' }}>{(city.taxRate * 100).toFixed(1)}%</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* States in this region */}
        <section style={{ marginBottom: 56 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#064E3B', margin: '0 0 16px', letterSpacing: '-0.03em' }}>
            Browse by state
          </h2>
          <div className="state-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {states.map((s) => {
              const avgCol = Math.round(s.cities.reduce((sum, c) => sum + c.col, 0) / s.cities.length)
              const slug = getStatePageSlug(s.stateKey)
              return (
                <Link
                  key={s.stateKey}
                  href={`/fire-number/states/${slug}`}
                  className="state-card"
                  style={{
                    display: 'block',
                    textDecoration: 'none',
                    background: '#fff',
                    border: '1px solid #E2E8F0',
                    borderRadius: 12,
                    padding: '16px 18px',
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#064E3B', marginBottom: 6 }}>{s.stateName}</div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div style={{ fontSize: 12, color: '#64748B' }}>
                      <span style={{ fontWeight: 600, color: '#0F172A' }}>{s.cities.length}</span> cities
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>
                      Avg <span style={{ fontWeight: 600, color: '#059669' }}>{fmt(avgCol)}</span>/yr
                    </div>
                    {s.cities[0]?.noIncomeTax && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', background: '#ECFDF5', padding: '2px 8px', borderRadius: 5 }}>No tax</span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Best/worst callout */}
        {stats.cheapest && stats.mostExpensive && (
          <section style={{ marginBottom: 56, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ background: '#ECFDF5', border: '1px solid #6EE7B7', borderRadius: 14, padding: '20px 22px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#059669', marginBottom: 8 }}>Cheapest in region</div>
              <Link href={`/fire-number/${stats.cheapest.key}`} style={{ textDecoration: 'none' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#064E3B' }}>{stats.cheapest.name}</div>
                <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>{fmt(stats.cheapest.col)}/yr · {fmt(stats.cheapest.fireTarget)} FIRE target</div>
              </Link>
            </div>
            <div style={{ background: '#FFF7ED', border: '1px solid #FDBA74', borderRadius: 14, padding: '20px 22px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#EA580C', marginBottom: 8 }}>Most expensive</div>
              <Link href={`/fire-number/${stats.mostExpensive.key}`} style={{ textDecoration: 'none' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#9A3412' }}>{stats.mostExpensive.name}</div>
                <div style={{ fontSize: 13, color: '#92400E', marginTop: 4 }}>{fmt(stats.mostExpensive.col)}/yr · {fmt(stats.mostExpensive.fireTarget)} FIRE target</div>
              </Link>
            </div>
          </section>
        )}

        {/* Bottom CTA */}
        <div style={{ background: 'linear-gradient(135deg, #064E3B 0%, #047857 100%)', borderRadius: 16, padding: '32px 36px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 10px' }}>
            Calculate your personal FIRE date in the {region.name}
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', margin: '0 0 20px' }}>
            Use the full calculator to model your income, savings rate, and exact city costs to get a personalized freedom date.
          </p>
          <Link
            href={`/?source=region-${slug}`}
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
            Start the FIRE calculator
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
              { '@type': 'ListItem', position: 3, name: `FIRE in the ${region.name}`, item: region.canonicalUrl },
            ],
          }),
        }}
      />
    </>
  )
}
