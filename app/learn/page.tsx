import Link from 'next/link'
import { learnArticles } from '@/lib/learn'
import { CITIES, isUS } from '@/lib/fire-data'

export const metadata = {
  title: 'Learning Hub | UntilFire',
  description: 'Short, practical guides on FIRE planning, savings rate, withdrawal rules, and reaching financial independence sooner.',
  alternates: {
    canonical: 'https://untilfire.com/learn',
  },
}

const FEATURED_CITY_KEYS = ['austin', 'nyc', 'miami', 'seattle', 'denver', 'chicago']
const ALL_US_CITIES = CITIES.filter((c) => isUS(c.state))
const featuredCities = FEATURED_CITY_KEYS.map((key) => ALL_US_CITIES.find((c) => c.key === key)).filter(Boolean)

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

export default function LearnHubPage() {
  return (
    <main className="uf-hub-page">
      <div className="uf-hub-shell">
        <header className="uf-hub-hero">
          <div className="uf-hub-topline">Learning Hub</div>
          <h1>Build conviction before you build the spreadsheet.</h1>
          <p>
            Practical FIRE explainers, planning notes, and evergreen articles that make the calculators easier to use well.
          </p>
          <div className="uf-hub-actions">
            <Link href="/" className="uf-hub-button uf-hub-button-primary">Run the calculator</Link>
            <Link href="/calculators" className="uf-hub-button uf-hub-button-secondary">Browse calculators</Link>
            <Link href="/dashboard" className="uf-hub-button uf-hub-button-secondary">Open dashboard</Link>
          </div>
        </header>

        <section className="uf-hub-grid">
          {learnArticles.map((article) => (
            <article key={article.slug} className="uf-hub-card">
              <div className="uf-hub-card-meta">
                <span>{article.category}</span>
                <span>{article.readTime}</span>
              </div>
              <h2>{article.title}</h2>
              <p>{article.description}</p>
              <Link href={`/learn/${article.slug}`} className="uf-hub-link">Read article</Link>
            </article>
          ))}
        </section>

        {/* FIRE Number by City */}
        <section style={{ marginTop: 56 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                FIRE by Location
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#064E3B', margin: 0, letterSpacing: '-0.4px' }}>
                FIRE Number by City
              </h2>
            </div>
            <Link href="/fire-number" style={{ fontSize: 14, fontWeight: 700, color: '#059669', textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Browse all 97 US cities →
            </Link>
          </div>

          <div className="uf-hub-grid">
            {featuredCities.map((city) => {
              if (!city) return null
              const fireTarget = city.col * 25
              return (
                <article key={city.key} className="uf-hub-card">
                  <div className="uf-hub-card-meta">
                    <span>{city.flag} City Guide</span>
                    <span>{fmt(city.col)}/yr COL</span>
                  </div>
                  <h2 style={{ fontSize: '1.15rem' }}>Retire in {city.name}</h2>
                  <p>
                    You&apos;ll need <strong>{fmt(fireTarget)}</strong> to reach FIRE in {city.name}, based on local
                    cost-of-living data. See income scenarios and calculate your personal timeline.
                  </p>
                  <Link href={`/fire-number/${city.key}`} className="uf-hub-link">
                    Calculate →
                  </Link>
                </article>
              )
            })}
          </div>
        </section>
      </div>
    </main>
  )
}
