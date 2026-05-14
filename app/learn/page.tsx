import Link from 'next/link'
import { learnArticles } from '@/lib/learn'

export const metadata = {
  title: 'Learning Hub | UntilFire',
  description: 'Short, practical guides on FIRE planning, savings rate, withdrawal rules, and reaching financial independence sooner.',
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
      </div>
    </main>
  )
}
