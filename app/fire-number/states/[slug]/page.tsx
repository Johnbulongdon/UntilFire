import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getStatePage, statePages } from '@/lib/state-pages'

type Props = {
  params: Promise<{ slug: string }>
}

const fmt = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)

export async function generateStaticParams() {
  return statePages.map((page) => ({ slug: page.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const page = getStatePage(slug)

  if (!page) return {}

  return {
    title: page.title,
    description: page.description,
    keywords: `${page.stateName} FIRE number, ${page.stateName} cost of living, FIRE in ${page.stateName}, retirement calculator ${page.stateName}`,
    robots: {
      index: true,
      follow: true,
    },
    alternates: { canonical: page.canonicalUrl },
    openGraph: {
      title: `FIRE Number in ${page.stateName} | UntilFire`,
      description: page.description,
      url: page.canonicalUrl,
      type: 'website',
    },
  }
}

export default async function StateFireNumberPage({ params }: Props) {
  const { slug } = await params
  const page = getStatePage(slug)

  if (!page) {
    notFound()
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { background: #F7F9FB; color: #19181E; font-family: 'Manrope', sans-serif; margin: 0; }
        a { color: inherit; }
        .state-city-card { transition: border-color 0.15s, background 0.15s; }
        .state-city-card:hover { border-color: #059669 !important; background: #F0FDF4 !important; }
        @media(max-width: 640px) {
          .state-hero { padding: 24px 16px !important; }
          .state-stats { grid-template-columns: 1fr !important; }
          .state-city-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '32px 24px 80px' }}>

        {/* Breadcrumb */}
        <nav style={{ fontSize: 13, color: '#94A3B8', marginBottom: 24, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/" style={{ textDecoration: 'none', color: '#94A3B8' }}>UntilFire</Link>
          <span>›</span>
          <Link href="/fire-number" style={{ textDecoration: 'none', color: '#94A3B8' }}>FIRE Number by City</Link>
          <span>›</span>
          <span style={{ color: '#064E3B', fontWeight: 600 }}>{page.stateName}</span>
        </nav>

        {/* Hero */}
        <div className="state-hero" style={{ marginBottom: 48, padding: '32px 0' }}>
          <h1 style={{ fontSize: 44, fontWeight: 800, color: '#064E3B', letterSpacing: '-0.8px', margin: '0 0 16px', lineHeight: 1.1 }}>
            {page.heroTitle}
          </h1>
          <p style={{ fontSize: 17, color: '#475569', margin: '0 0 32px', lineHeight: 1.65, maxWidth: 700 }}>
            Explore FIRE baselines across {page.cities.length} cities in {page.stateName}. {page.noIncomeTax ? `No state income tax means more savings turn into invested capital.` : `State taxes affect your take-home, so we show local tax context for each city.`} Find your target and compare retirement timelines.
          </p>

          {/* Key stats */}
          <div className="state-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, maxWidth: 800 }}>
            {[
              { label: 'Cities covered', value: `${page.cities.length}` },
              { label: 'Avg FIRE target', value: fmt(page.fireTarget) },
              { label: 'Avg annual cost', value: fmt(page.avgCityColAccross) },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '18px 20px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{label}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#064E3B', letterSpacing: '-0.4px' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Cities in state */}
        <section style={{ marginBottom: 48 }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: '#064E3B', margin: '0 0 10px', letterSpacing: '-0.03em' }}>
              All cities in {page.stateName}
            </h2>
            <p style={{ fontSize: 15, color: '#475569', margin: 0, lineHeight: 1.6 }}>
              Ranked by cost of living. Pick a city to see detailed FIRE calculations, tax context, and retirement scenarios specific to that location.
            </p>
          </div>

          <div className="state-city-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {page.cities.map((city) => (
              <Link
                key={city.key}
                href={`/fire-number/${city.key}`}
                className="state-city-card"
                style={{
                  textDecoration: 'none',
                  background: '#fff',
                  border: '1px solid #E2E8F0',
                  borderRadius: 14,
                  padding: '18px 16px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 24 }}>{city.flag}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#064E3B' }}>{city.name}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ fontSize: 13, color: '#475569' }}>
                    <span style={{ fontWeight: 700 }}>{fmt(city.col)}</span>/year baseline
                  </div>
                  <div style={{ fontSize: 13, color: '#64748B' }}>
                    {fmt(city.col * 25)} FIRE target
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <div style={{ background: 'linear-gradient(135deg, #064E3B 0%, #047857 100%)', borderRadius: 16, padding: '32px 36px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 10px' }}>
            Calculate your FIRE date for any city in {page.stateName}
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', margin: '0 0 20px' }}>
            Use the full calculator to model your specific income, savings rate, and taxes to get an exact retirement date.
          </p>
          <Link
            href="/?source=state-hub"
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
              { '@type': 'ListItem', position: 3, name: page.stateName, item: page.canonicalUrl },
            ],
          }),
        }}
      />
    </>
  )
}
