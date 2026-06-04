import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLearnStage, getStageArticles, isLearnStageId, learnStages } from '@/lib/learn'
import { SITE_URL } from '@/lib/site'

type Props = {
  params: Promise<{ stage: string }>
}

export async function generateStaticParams() {
  return learnStages.map((stage) => ({ stage: stage.id }))
}

export async function generateMetadata({ params }: Props) {
  const { stage } = await params

  if (!isLearnStageId(stage)) {
    return {}
  }

  const stageData = getLearnStage(stage)

  return {
    title: `${stageData.label} FIRE Guides | UntilFire`,
    description: stageData.description,
    alternates: {
      canonical: `https://www.untilfire.com/learn/stages/${stageData.id}`,
    },
  }
}

export default async function LearnStagePage({ params }: Props) {
  const { stage } = await params

  if (!isLearnStageId(stage)) {
    notFound()
  }

  const stageData = getLearnStage(stage)
  const articles = getStageArticles(stageData.id)

  return (
    <>
    <main className="uf-hub-page">
      <div className="uf-hub-shell">
        <header className="uf-hub-hero">
          <div className="uf-hub-topline">
            <span>{stageData.shortLabel}</span>
            <span>{articles.length} articles in this path</span>
          </div>
          <h1>{stageData.label}</h1>
          <p>{stageData.description}</p>
          <div
            style={{
              marginTop: 18,
              padding: '18px 20px',
              borderRadius: 18,
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
            }}
          >
            <div style={{ fontSize: 12, color: '#059669', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
              What matters now
            </div>
            <div style={{ fontSize: 15, lineHeight: 1.8, color: '#334155' }}>
              {stageData.whatMattersNow}
            </div>
          </div>
          <div className="uf-hub-actions">
            <Link href={stageData.nextActionHref} className="uf-hub-button uf-hub-button-primary">
              {stageData.nextActionLabel}
            </Link>
            <Link href="/learn" className="uf-hub-button uf-hub-button-secondary">
              Switch stages
            </Link>
            <Link href="/learn/articles" className="uf-hub-button uf-hub-button-secondary">
              Browse all articles
            </Link>
          </div>
        </header>

        <section className="uf-hub-grid" style={{ marginBottom: 24 }}>
          {articles.map((article) => (
            <article key={article.slug} className="uf-hub-card">
              <div className="uf-hub-card-meta">
                <span>{article.category}</span>
                <span>{article.readTime}</span>
              </div>
              <h2>{article.title}</h2>
              <p>{article.description}</p>
              <Link href={`/learn/${article.slug}`} className="uf-hub-link">
                Read article →
              </Link>
            </article>
          ))}
        </section>

        <section className="uf-hub-grid">
          <article className="uf-hub-card">
            <div className="uf-hub-card-meta">
              <span>Recommended tools</span>
            </div>
            <h2>Use the calculators that fit this stage.</h2>
            <p>These are the fastest next tools for this part of the journey.</p>
            <div style={{ display: 'grid', gap: 10, marginTop: 18 }}>
              {stageData.calculatorLinks.map((calculator) => (
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
          </article>

          <article className="uf-hub-card" style={{ gridColumn: 'span 2' }}>
            <div className="uf-hub-card-meta">
              <span>Switch stages</span>
            </div>
            <h2>Read outside your current stage anytime.</h2>
            <p>
              The stage path is there to reduce overwhelm, not to lock you in. Jump to another stage if you want to explore more advanced or foundational topics.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 18 }}>
              {learnStages.map((candidate) => (
                <Link
                  key={candidate.id}
                  href={`/learn/stages/${candidate.id}`}
                  style={{
                    textDecoration: 'none',
                    padding: '10px 14px',
                    borderRadius: 999,
                    border: candidate.id === stageData.id ? '1px solid #047857' : '1px solid #E2E8F0',
                    background: candidate.id === stageData.id ? 'rgba(209,250,229,0.45)' : '#ffffff',
                    color: candidate.id === stageData.id ? '#065F46' : '#334155',
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {candidate.label}
                </Link>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify([
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: `${stageData.label} FIRE Guides`,
            description: stageData.description,
            url: `${SITE_URL}/learn/stages/${stageData.id}`,
            hasPart: articles.map((article) => ({
              '@type': 'Article',
              name: article.title,
              url: `${SITE_URL}/learn/${article.slug}`,
            })),
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
              { '@type': 'ListItem', position: 2, name: 'Learn', item: `${SITE_URL}/learn` },
              { '@type': 'ListItem', position: 3, name: stageData.label, item: `${SITE_URL}/learn/stages/${stageData.id}` },
            ],
          },
        ]),
      }}
    />
    </>
  )
}
