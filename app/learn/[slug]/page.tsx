import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLearnArticle, learnArticles } from '@/lib/learn'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return learnArticles.map((article) => ({ slug: article.slug }))
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const article = getLearnArticle(slug)

  if (!article) {
    return {}
  }

  return {
    title: `${article.title} | UntilFire`,
    description: article.description,
    alternates: {
      canonical: `https://untilfire.com/learn/${article.slug}`,
    },
    openGraph: {
      title: article.title,
      description: article.description,
      type: 'article',
      publishedTime: article.publishedAt,
    },
  }
}

export default async function LearnArticlePage({ params }: Props) {
  const { slug } = await params
  const article = getLearnArticle(slug)

  if (!article) {
    notFound()
  }

  return (
    <main className="uf-article-page">
      <article className="uf-article-shell">
        <Link href="/learn" className="uf-article-back">← Back to Learning Hub</Link>
        <div className="uf-article-meta">
          <span>{article.category}</span>
          <span>{article.readTime}</span>
          <span>{article.publishedAt}</span>
        </div>
        <h1>{article.title}</h1>
        <p className="uf-article-dek">{article.description}</p>
        <div className="uf-article-body">
          {article.body.map((node, i) =>
            node.type === 'h2'
              ? <h2 key={i}>{node.text}</h2>
              : <p key={i}>{node.text}</p>
          )}
        </div>
        <div style={{ marginTop: 40, paddingTop: 32, borderTop: '1px solid #E2E8F0' }}>
          <p style={{ fontSize: 14, color: '#64748B', marginBottom: 16 }}>
            Ready to calculate your own FIRE number?
          </p>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #059669, #064E3B)',
              color: '#ffffff',
              borderRadius: 12,
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            Run the FIRE Calculator →
          </Link>
        </div>
      </article>
    </main>
  )
}
