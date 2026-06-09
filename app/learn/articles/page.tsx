import Link from 'next/link'
import { getLearnArticleMeta, getLearnStage, learnArticles } from '@/lib/learn'
import { SITE_URL } from '@/lib/site'

export const metadata = {
  title: 'FIRE Articles & Guides | UntilFire',
  description: 'In-depth guides on financial independence, early retirement, the 4% rule, savings rate, Roth IRA strategy, compound interest, and more.',
  alternates: {
    canonical: 'https://www.untilfire.com/learn/articles',
  },
}

const CATEGORY_COLORS: Record<string, string> = {
  'FIRE Basics': '#059669',
  'Planning': '#0ea5e9',
  'Tax & Accounts': '#8b5cf6',
  'Risk & Strategy': '#f97316',
}

export default function ArticlesPage() {
  return (
    <>
    <main className="uf-hub-page">
      <div className="uf-hub-shell">
        <header className="uf-hub-hero">
          <div className="uf-hub-topline">Articles</div>
          <h1>FIRE guides, explained plainly.</h1>
          <p>
            In-depth articles on financial independence, early retirement strategy, tax-advantaged accounts, and the math behind FIRE. Use this page when you want the full library instead of a curated stage path.
          </p>
          <div className="uf-hub-actions">
            <Link href="/" className="uf-hub-button uf-hub-button-primary">Run the calculator</Link>
            <Link href="/learn" className="uf-hub-button uf-hub-button-secondary">← Stage-based Learning Hub</Link>
            <Link href="/learn/topics" className="uf-hub-button uf-hub-button-secondary">Browse topics</Link>
          </div>
        </header>

        <section className="uf-hub-grid">
          {learnArticles.map((article) => {
            const meta = getLearnArticleMeta(article)
            const stage = getLearnStage(meta.primaryStage)

            return (
              <article key={article.slug} className="uf-hub-card">
                <div className="uf-hub-card-meta" style={{ justifyContent: 'flex-start', flexWrap: 'wrap' }}>
                  <span style={{ color: CATEGORY_COLORS[article.category] ?? '#059669' }}>
                    {article.category}
                  </span>
                  <span>{article.readTime}</span>
                  <span style={{ color: '#064E3B' }}>Best for: {stage.label}</span>
                </div>
                <h2>{article.title}</h2>
                <p>{article.description}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  <Link href={`/learn/${article.slug}`} className="uf-hub-link">
                    Read article →
                  </Link>
                  <Link href={`/learn/stages/${stage.id}`} className="uf-hub-link" style={{ color: '#64748B' }}>
                    {stage.label} path
                  </Link>
                </div>
              </article>
            )
          })}
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
            name: 'FIRE Articles & Guides',
            description: 'In-depth guides on financial independence, early retirement, the 4% rule, savings rate, Roth IRA strategy, compound interest, and more.',
            url: `${SITE_URL}/learn/articles`,
            hasPart: learnArticles.map((article) => ({
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
              { '@type': 'ListItem', position: 3, name: 'Articles', item: `${SITE_URL}/learn/articles` },
            ],
          },
        ]),
      }}
    />
    </>
  )
}
