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
import { formatMoney } from "@/lib/money";

type Props = {
  params: Promise<{ region: string }>
}


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
  const description = `Compare FIRE targets across ${cities.length} cities in the ${region.name}. Average annual cost ${formatMoney(stats.avgCost)}, FIRE target ${formatMoney(stats.avgFire)}. State tax context and retirement timelines for every city.`

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
        body { background: var(--uf-surface); color: var(--uf-ink); font-family: 'Manrope', sans-serif; margin: 0; }
        a { color: inherit; }
        .region-city-row { transition: background 0.12s; cursor: pointer; }
        .region-city-row:hover { background: var(--uf-green-50) !important; }
        .state-card { transition: border-color 0.15s, background 0.15s; }
        .state-card:hover { border-color: var(--uf-green) !important; background: var(--uf-green-50) !important; }
        @media(max-width: 640px) {
          .region-hero h1 { font-size: 28px !important; }
          .region-stats { grid-template-columns: repeat(2, 1fr) !important; }
          .city-table th, .city-table td { padding: 10px 8px !important; font-size: 13px !important; }
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
          <span style={{ color: 'var(--uf-green-900)', fontWeight: 600 }}>{region.name}</span>
        </nav>

        {/* Hero */}
        <div className="region-hero" style={{ marginBottom: 48, padding: '32px 0' }}>
          <div style={{ display: 'inline-block', background: 'var(--uf-green-50)', color: 'var(--uf-green)', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 14px', borderRadius: 8, marginBottom: 16 }}>
            US Region · {cities.length} cities · {states.length} states
          </div>
          <h1 style={{ fontSize: 44, fontWeight: 800, color: 'var(--uf-green-900)', letterSpacing: '-0.8px', margin: '0 0 16px', lineHeight: 1.1 }}>
            FIRE in the {region.name}
          </h1>
          <p style={{ fontSize: 17, color: 'var(--uf-ink-2)', margin: '0 0 12px', lineHeight: 1.65, maxWidth: 700 }}>
            {region.tagline}
          </p>
          <p style={{ fontSize: 15, color: 'var(--uf-ink-2)', margin: '0 0 32px', lineHeight: 1.7, maxWidth: 720 }}>
            {region.description}
          </p>

          {/* Stats */}
          <div className="region-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, maxWidth: 800 }}>
            {[
              { label: 'Cities covered', value: `${cities.length}` },
              { label: 'Avg annual cost', value: formatMoney(stats.avgCost) },
              { label: 'Avg FIRE target', value: formatMoney(stats.avgFire) },
              { label: 'No-income-tax states', value: `${noTaxStates.length}` },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: 'var(--uf-card)', border: '1px solid var(--uf-border)', borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--uf-ink-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--uf-green-900)', letterSpacing: '-0.3px' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Full city table */}
        <section style={{ marginBottom: 56 }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--uf-green-900)', margin: '0 0 8px', letterSpacing: '-0.03em' }}>
              All cities ranked by cost of living
            </h2>
            <p style={{ fontSize: 14, color: 'var(--uf-ink-2)', margin: 0 }}>
              Cheapest first. Click any city for detailed FIRE calculations and retirement timelines.
            </p>
          </div>

          <div style={{ background: 'var(--uf-card)', border: '1px solid var(--uf-border)', borderRadius: 14, overflow: 'hidden' }}>
            <table className="city-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: 'var(--uf-surface)', borderBottom: '1px solid var(--uf-border)' }}>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--uf-ink-2)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>#</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--uf-ink-2)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>City</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--uf-ink-2)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>State</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--uf-ink-2)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Annual Cost</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--uf-ink-2)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>FIRE Target</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--uf-ink-2)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Income Tax</th>
                </tr>
              </thead>
              <tbody>
                {cities.map((city, i) => (
                  <tr
                    key={city.key}
                    className="region-city-row"
                    style={{ borderBottom: i < cities.length - 1 ? '1px solid var(--uf-surface-2)' : undefined, background: 'var(--uf-card)' }}
                  >
                    <td style={{ padding: '13px 16px', color: 'var(--uf-ink-3)', fontWeight: 600 }}>{i + 1}</td>
                    <td style={{ padding: '13px 16px' }}>
                      <Link href={`/fire-number/${city.key}`} style={{ textDecoration: 'none', color: 'var(--uf-green-900)', fontWeight: 700 }}>
                        {city.name}
                      </Link>
                    </td>
                    <td style={{ padding: '13px 16px', color: 'var(--uf-ink-2)' }}>
                      <Link href={`/fire-number/states/${getStatePageSlug(city.state)}`} style={{ textDecoration: 'none', color: 'var(--uf-ink-2)' }}>
                        {city.stateName}
                      </Link>
                    </td>
                    <td style={{ padding: '13px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--uf-ink)' }}>
                      {formatMoney(city.col)}
                    </td>
                    <td style={{ padding: '13px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--uf-green)' }}>
                      {formatMoney(city.fireTarget)}
                    </td>
                    <td style={{ padding: '13px 16px', textAlign: 'right' }}>
                      {city.noIncomeTax ? (
                        <span style={{ background: 'var(--uf-green-50)', color: 'var(--uf-green)', padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>None</span>
                      ) : (
                        <span style={{ color: 'var(--uf-ink-2)' }}>{(city.taxRate * 100).toFixed(1)}%</span>
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
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--uf-green-900)', margin: '0 0 16px', letterSpacing: '-0.03em' }}>
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
                    background: 'var(--uf-card)',
                    border: '1px solid var(--uf-border)',
                    borderRadius: 12,
                    padding: '16px 18px',
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--uf-green-900)', marginBottom: 6 }}>{s.stateName}</div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div style={{ fontSize: 12, color: 'var(--uf-ink-2)' }}>
                      <span style={{ fontWeight: 600, color: 'var(--uf-ink)' }}>{s.cities.length}</span> cities
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--uf-ink-2)' }}>
                      Avg <span style={{ fontWeight: 600, color: 'var(--uf-green)' }}>{formatMoney(avgCol)}</span>/yr
                    </div>
                    {s.cities[0]?.noIncomeTax && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--uf-green)', background: 'var(--uf-green-50)', padding: '2px 8px', borderRadius: 5 }}>No tax</span>
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
            <div style={{ background: 'var(--uf-green-50)', border: '1px solid var(--uf-teal-line)', borderRadius: 14, padding: '20px 22px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--uf-green)', marginBottom: 8 }}>Cheapest in region</div>
              <Link href={`/fire-number/${stats.cheapest.key}`} style={{ textDecoration: 'none' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--uf-green-900)' }}>{stats.cheapest.name}</div>
                <div style={{ fontSize: 13, color: 'var(--uf-ink-2)', marginTop: 4 }}>{formatMoney(stats.cheapest.col)}/yr · {formatMoney(stats.cheapest.fireTarget)} FIRE target</div>
              </Link>
            </div>
            <div style={{ background: 'var(--uf-warn-bg)', border: '1px solid var(--uf-warn)', borderRadius: 14, padding: '20px 22px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#EA580C', marginBottom: 8 }}>Most expensive</div>
              <Link href={`/fire-number/${stats.mostExpensive.key}`} style={{ textDecoration: 'none' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#9A3412' }}>{stats.mostExpensive.name}</div>
                <div style={{ fontSize: 13, color: '#92400E', marginTop: 4 }}>{formatMoney(stats.mostExpensive.col)}/yr · {formatMoney(stats.mostExpensive.fireTarget)} FIRE target</div>
              </Link>
            </div>
          </section>
        )}

        {/* Bottom CTA */}
        <div style={{ background: 'linear-gradient(135deg, var(--uf-green-900) 0%, var(--uf-green-700) 100%)', borderRadius: 16, padding: '32px 36px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--uf-card)', margin: '0 0 10px' }}>
            Calculate your personal FIRE date in the {region.name}
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', margin: '0 0 20px' }}>
            Use the full calculator to model your income, savings rate, and exact city costs to get a personalized freedom date.
          </p>
          <Link
            href={`/?source=region-${slug}`}
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
