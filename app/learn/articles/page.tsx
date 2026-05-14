import Link from 'next/link'
import { learnArticles } from '@/lib/learn'

export const metadata = {
  title: 'FIRE Articles & Guides | UntilFire',
  description: 'In-depth guides on financial independence, early retirement, the 4% rule, savings rate, Roth IRA strategy, compound interest, and more.',
  alternates: {
    canonical: 'https://untilfire.com/learn/articles',
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
    <main className="uf-hub-page">
      <div className="uf-hub-shell">
        <header className="uf-hub-hero">
          <div className="uf-hub-topline">Articles</div>
          <h1>FIRE guides, explained plainly.</h1>
          <p>
            In-depth articles on financial independence, early retirement strategy, tax-advantaged accounts, and the math behind FIRE. No fluff.
          </p>
          <div className="uf-hub-actions">
            <Link href="/" className="uf-hub-button uf-hub-button-primary">Run the calculator</Link>
            <Link href="/learn" className="uf-hub-button uf-hub-button-secondary">← Learning Hub</Link>
          </div>
        </header>

        <section className="uf-hub-grid">
          {learnArticles.map((article) => (
            <article key={article.slug} className="uf-hub-card">
              <div className="uf-hub-card-meta">
                <span style={{ color: CATEGORY_COLORS[article.category] ?? '#059669' }}>
                  {article.category}
                </span>
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
      </div>
    </main>
  )
}
