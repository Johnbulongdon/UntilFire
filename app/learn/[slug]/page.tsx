import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cityLandingPages } from '@/lib/city-pages'
import { SITE_URL } from '@/lib/site'
import {
  getLearnArticle,
  getLearnArticleMeta,
  getLearnStage,
  getRelatedArticles,
  learnArticles,
  learnStages,
} from '@/lib/learn'

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
    keywords: article.category + ', financial independence, FIRE, retire early',
    alternates: {
      canonical: `https://www.untilfire.com/learn/${article.slug}`,
    },
    openGraph: {
      title: article.title,
      description: article.description,
      type: 'article',
      publishedTime: article.publishedAt,
      url: `https://www.untilfire.com/learn/${article.slug}`,
      siteName: 'UntilFire',
      images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.description,
      images: [`${SITE_URL}/opengraph-image`],
    },
  }
}

export default async function LearnArticlePage({ params }: Props) {
  const { slug } = await params
  const article = getLearnArticle(slug)

  if (!article) {
    notFound()
  }

  const articleMeta = getLearnArticleMeta(article)
  const primaryStage = getLearnStage(articleMeta.primaryStage)
  const relatedArticles = getRelatedArticles(article.slug, 3)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: article.title,
            description: article.description,
            datePublished: article.publishedAt,
            dateModified: article.publishedAt,
            author: { '@type': 'Organization', name: 'UntilFire', url: 'https://www.untilfire.com' },
            publisher: { '@type': 'Organization', name: 'UntilFire', url: 'https://www.untilfire.com' },
            url: `https://www.untilfire.com/learn/${article.slug}`,
            image: `${SITE_URL}/opengraph-image`,
            breadcrumb: {
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.untilfire.com' },
                { '@type': 'ListItem', position: 2, name: 'Learn', item: 'https://www.untilfire.com/learn' },
                { '@type': 'ListItem', position: 3, name: article.title, item: `https://www.untilfire.com/learn/${article.slug}` },
              ],
            },
          }),
        }}
      />
    <main className="uf-article-page">
      <article className="uf-article-shell">
        <Link href={`/learn/stages/${primaryStage.id}`} className="uf-article-back">← Back to {primaryStage.label}</Link>
        <div className="uf-article-meta">
          <span>{primaryStage.label}</span>
          <span>{article.category}</span>
          <span>{article.readTime}</span>
          <span>{article.publishedAt}</span>
        </div>
        <h1>{article.title}</h1>
        <p className="uf-article-dek">{article.description}</p>
        <div style={{ display: 'grid', gap: 16, marginBottom: 26 }}>
          <div
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 18,
              padding: '18px 20px',
            }}
          >
            <div style={{ fontSize: 12, color: '#059669', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
              Best for
            </div>
            <div style={{ fontSize: 16, color: '#19181E', fontWeight: 800, marginBottom: 8 }}>
              {primaryStage.label}
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.75, color: '#64748B' }}>
              {primaryStage.whatMattersNow}
            </div>
          </div>
        </div>
        <div className="uf-article-body">
          {article.body.map((node, i) => {
            if (node.type === 'h2') return <h2 key={i}>{node.text}</h2>
            if (node.type === 'h3') return <h3 key={i} style={{ fontSize: 19, color: '#19181E', margin: '18px 0 8px', letterSpacing: '-0.01em' }}>{node.text}</h3>
            if (node.type === 'ul') return (
              <ul key={i} style={{ paddingLeft: 22, margin: '4px 0 16px', lineHeight: 1.75, color: '#334155' }}>
                {node.items.map((item, j) => <li key={j} style={{ marginBottom: 6 }}>{item}</li>)}
              </ul>
            )
            if (node.type === 'ol') return (
              <ol key={i} style={{ paddingLeft: 22, margin: '4px 0 16px', lineHeight: 1.75, color: '#334155' }}>
                {node.items.map((item, j) => <li key={j} style={{ marginBottom: 6 }}>{item}</li>)}
              </ol>
            )
            return <p key={i}>{node.text}</p>
          })}
        </div>
        <div style={{ marginTop: 40, paddingTop: 32, borderTop: '1px solid #E2E8F0', display: 'grid', gap: 18 }}>
          <div>
            <div style={{ fontSize: 12, color: '#059669', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
              Related calculators
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {articleMeta.relatedCalculators.map((calculator) => (
                <Link
                  key={calculator.href}
                  href={calculator.href}
                  style={{
                    textDecoration: 'none',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: 16,
                    padding: '16px 18px',
                    fontWeight: 700,
                    color: '#064E3B',
                  }}
                >
                  {calculator.label}
                </Link>
              ))}
            </div>
          </div>

          {relatedArticles.length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: '#059669', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
                Keep reading in this stage
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                {relatedArticles.map((related) => (
                  <Link
                    key={related.slug}
                    href={`/learn/${related.slug}`}
                    style={{
                      textDecoration: 'none',
                      background: '#ffffff',
                      border: '1px solid #E2E8F0',
                      borderRadius: 16,
                      padding: '16px 18px',
                    }}
                  >
                    <div style={{ fontSize: 12, color: '#64748B', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                      {related.category}
                    </div>
                    <div style={{ fontSize: 17, color: '#19181E', fontWeight: 800, marginBottom: 6, letterSpacing: '-0.02em' }}>
                      {related.title}
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.7, color: '#64748B' }}>
                      {related.description}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div>
            <div style={{ fontSize: 12, color: '#059669', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
              Switch stages
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {learnStages.map((stage) => (
                <Link
                  key={stage.id}
                  href={`/learn/stages/${stage.id}`}
                  style={{
                    textDecoration: 'none',
                    padding: '10px 14px',
                    borderRadius: 999,
                    border: stage.id === primaryStage.id ? '1px solid #047857' : '1px solid #E2E8F0',
                    background: stage.id === primaryStage.id ? 'rgba(209,250,229,0.45)' : '#ffffff',
                    color: stage.id === primaryStage.id ? '#065F46' : '#334155',
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {stage.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
          <p style={{ fontSize: 14, color: '#64748B', marginBottom: 16 }}>
            Ready to calculate your own FIRE number?
          </p>
          <Link
            href="/?source=learn-article"
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
        </div>
        <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          {cityLandingPages.slice(0, 3).map((page) => (
            <Link
              key={page.slug}
              href={`/fire-number/${page.slug}`}
              style={{
                textDecoration: 'none',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 16,
                padding: '18px 16px',
              }}
            >
              <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                {page.keyword}
              </div>
              <div style={{ fontSize: 18, color: '#19181E', fontWeight: 800, marginBottom: 6 }}>
                {page.city.name}
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.7, color: '#64748B' }}>
                Compare this article with a location-specific FIRE target page.
              </div>
            </Link>
          ))}
        </div>
      </article>
    </main>
    </>
  )
}
