import Link from 'next/link'
import { cityLandingPages } from '@/lib/city-pages'
import { getStageArticles, learnStages } from '@/lib/learn'

export const metadata = {
  title: 'Learning Hub | UntilFire',
  description: 'Choose your FIRE stage and get the most relevant articles, calculators, and next steps without getting overwhelmed.',
  alternates: {
    canonical: 'https://untilfire.com/learn',
  },
}

export default function LearnHubPage() {
  return (
    <main className="uf-hub-page">
      <div className="uf-hub-shell">
        <header className="uf-hub-hero">
          <div className="uf-hub-topline">Learning Hub</div>
          <h1>Choose the FIRE stage you are in.</h1>
          <p>
            Start with the guidance that matches your season: learn the basics, build momentum, pressure-test your plan, or focus on living off the portfolio without getting swamped by everything at once.
          </p>
          <div className="uf-hub-actions">
            <Link href="/?source=learn-hub" className="uf-hub-button uf-hub-button-primary">Run the calculator</Link>
            <Link href="/learn/articles" className="uf-hub-button uf-hub-button-secondary">Browse all articles</Link>
            <Link href="/learn/topics" className="uf-hub-button uf-hub-button-secondary">Browse by topic</Link>
          </div>
        </header>

        <section style={{ display: 'grid', gap: 18 }}>
          {learnStages.map((stage) => {
            const articles = getStageArticles(stage.id).slice(0, 3)
            return (
              <section
                key={stage.id}
                className="uf-hub-card"
                style={{
                  padding: 28,
                  display: 'grid',
                  gap: 20,
                  background: 'linear-gradient(180deg, #ffffff 0%, #f8fcf9 100%)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'start', flexWrap: 'wrap' }}>
                  <div style={{ maxWidth: 650 }}>
                    <div className="uf-hub-card-meta" style={{ justifyContent: 'flex-start', marginBottom: 10 }}>
                      <span style={{ color: '#059669' }}>{stage.shortLabel}</span>
                      <span>{articles.length} recommended reads</span>
                    </div>
                    <h2 style={{ marginTop: 0 }}>{stage.label}</h2>
                    <p style={{ marginBottom: 12 }}>{stage.description}</p>
                    <p style={{ margin: 0, fontSize: 14, color: '#334155', lineHeight: 1.7 }}>
                      <strong style={{ color: '#064E3B' }}>What matters now:</strong> {stage.whatMattersNow}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    <Link href={`/learn/stages/${stage.id}`} className="uf-hub-button uf-hub-button-primary">
                      Open stage path
                    </Link>
                    <Link href={stage.nextActionHref} className="uf-hub-button uf-hub-button-secondary">
                      {stage.nextActionLabel}
                    </Link>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 18 }}>
                  <div style={{ display: 'grid', gap: 12 }}>
                    {articles.map((article) => (
                      <Link
                        key={article.slug}
                        href={`/learn/${article.slug}`}
                        style={{
                          textDecoration: 'none',
                          background: '#ffffff',
                          border: '1px solid #E2E8F0',
                          borderRadius: 16,
                          padding: '16px 18px',
                          boxShadow: '0 10px 22px rgba(15, 23, 42, 0.03)',
                        }}
                      >
                        <div className="uf-hub-card-meta" style={{ justifyContent: 'flex-start', marginBottom: 8 }}>
                          <span>{article.category}</span>
                          <span>{article.readTime}</span>
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#19181E', marginBottom: 6, letterSpacing: '-0.02em' }}>
                          {article.title}
                        </div>
                        <div style={{ fontSize: 14, color: '#64748B', lineHeight: 1.7 }}>
                          {article.description}
                        </div>
                      </Link>
                    ))}
                  </div>

                  <div className="uf-hub-card" style={{ padding: 20 }}>
                    <div className="uf-hub-card-meta" style={{ justifyContent: 'flex-start', marginBottom: 12 }}>
                      <span>Next tools</span>
                    </div>
                    <div style={{ display: 'grid', gap: 10 }}>
                      {stage.calculatorLinks.map((calculator) => (
                        <Link
                          key={calculator.href}
                          href={calculator.href}
                          style={{
                            textDecoration: 'none',
                            color: '#064E3B',
                            background: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            borderRadius: 14,
                            padding: '14px 16px',
                            fontWeight: 700,
                          }}
                        >
                          {calculator.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )
          })}
        </section>

        <section className="uf-hub-grid" style={{ marginTop: 24 }}>
          <article className="uf-hub-card">
            <div className="uf-hub-card-meta">
              <span>Full library</span>
              <span>/learn/articles</span>
            </div>
            <h2>Want everything at once?</h2>
            <p>
              Browse the complete article archive if you already know what you want to read or you want the whole library in one place.
            </p>
            <Link href="/learn/articles" className="uf-hub-link">Browse all articles</Link>
          </article>
          <article className="uf-hub-card">
            <div className="uf-hub-card-meta">
              <span>By concept</span>
              <span>/learn/topics</span>
            </div>
            <h2>Prefer concept navigation?</h2>
            <p>
              Jump into topics like the 4% rule, Coast FIRE, retirement tax strategy, and sequence of returns risk.
            </p>
            <Link href="/learn/topics" className="uf-hub-link">Browse topics</Link>
          </article>
          <article className="uf-hub-card">
            <div className="uf-hub-card-meta">
              <span>City guides</span>
              <span>{cityLandingPages.length} pages</span>
            </div>
            <h2>See location-specific FIRE examples</h2>
            <p>
              Explore the city landing pages to compare cost of living, taxes, and retirement targets in a few high-intent markets.
            </p>
            <Link href={`/fire-number/${cityLandingPages[0].slug}`} className="uf-hub-link">Explore city guides</Link>
          </article>
        </section>
      </div>
    </main>
  )
}
