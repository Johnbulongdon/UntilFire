import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLearnArticle } from '@/lib/learn'
import { cityLandingPages, getCityLandingPage } from '@/lib/city-pages'

type Props = {
  params: Promise<{ slug: string }>
}

function usd(amount: number) {
  return `$${Math.round(amount).toLocaleString()}`
}

export async function generateStaticParams() {
  return cityLandingPages.map((page) => ({ slug: page.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const page = getCityLandingPage(slug)

  if (!page) return {}

  return {
    title: page.title,
    description: page.description,
    keywords: `${page.keyword}, FIRE calculator, retirement calculator, financial independence calculator, ${page.city.name}`,
    alternates: {
      canonical: page.canonicalUrl,
    },
    openGraph: {
      title: page.title,
      description: page.description,
      url: page.canonicalUrl,
      siteName: 'UntilFire',
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: page.title,
      description: page.description,
    },
  }
}

export default async function CityFireNumberPage({ params }: Props) {
  const { slug } = await params
  const page = getCityLandingPage(slug)

  if (!page) {
    notFound()
  }

  const article = getLearnArticle(page.articleSlug)
  const source = `fire-number-${page.slug}`

  return (
    <>
      <main style={{ background: '#F7F9FB', minHeight: '100vh', fontFamily: "'Manrope', sans-serif" }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '28px 24px 88px' }}>
          <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 26, fontSize: 13 }}>
            <Link href="/" style={{ color: '#64748B', textDecoration: 'none' }}>Home</Link>
            <Link href="/calculators" style={{ color: '#64748B', textDecoration: 'none' }}>Calculators</Link>
            <Link href="/learn" style={{ color: '#64748B', textDecoration: 'none' }}>Learn</Link>
            <span style={{ color: '#94A3B8' }}>{page.city.name}</span>
          </nav>

          <section
            style={{
              background: 'linear-gradient(135deg, #FFFFFF 0%, #ECFDF5 100%)',
              border: '1px solid #D1FAE5',
              borderRadius: 24,
              padding: '34px 28px',
              marginBottom: 28,
            }}
          >
            <p style={{ fontSize: 12, color: '#059669', fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', margin: '0 0 14px' }}>
              City FIRE Guide
            </p>
            <h1 style={{ fontSize: 'clamp(34px, 5vw, 56px)', lineHeight: 1.02, color: '#19181E', letterSpacing: '-0.05em', margin: '0 0 16px' }}>
              {page.heroTitle}
            </h1>
            <p style={{ maxWidth: 760, fontSize: 17, lineHeight: 1.8, color: '#475569', margin: '0 0 24px' }}>
              {page.intro}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
              <Link
                href={`/?source=${source}`}
                style={{ textDecoration: 'none', background: 'linear-gradient(135deg, #059669, #064E3B)', color: '#fff', padding: '12px 18px', borderRadius: 10, fontWeight: 700, fontSize: 14 }}
              >
                Run the full FIRE calculator
              </Link>
              <Link
                href={`${page.calculatorHref}?source=${source}`}
                style={{ textDecoration: 'none', background: '#fff', color: '#19181E', padding: '12px 18px', borderRadius: 10, border: '1px solid #E2E8F0', fontWeight: 700, fontSize: 14 }}
              >
                Open {page.calculatorLabel}
              </Link>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 14,
              }}
            >
              {page.summaryItems.map((item) => (
                <div key={item.label} style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 16, padding: '18px 18px 16px' }}>
                  <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em', color: '#19181E' }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.6fr) minmax(280px, 1fr)',
              gap: 18,
              marginBottom: 28,
            }}
          >
            <article style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 20, padding: '28px 24px' }}>
              <h2 style={{ margin: '0 0 16px', fontSize: 28, color: '#19181E', letterSpacing: '-0.03em' }}>
                Why {page.city.name} changes your FIRE math
              </h2>
              <p style={{ margin: '0 0 16px', fontSize: 15, lineHeight: 1.9, color: '#475569' }}>
                {page.audienceNote}
              </p>
              <p style={{ margin: '0 0 16px', fontSize: 15, lineHeight: 1.9, color: '#475569' }}>
                {page.costAngle}
              </p>
              <p style={{ margin: '0 0 24px', fontSize: 15, lineHeight: 1.9, color: '#475569' }}>
                {page.taxAngle}
              </p>

              <div style={{ display: 'grid', gap: 12 }}>
                {[
                  {
                    label: 'Local tax context',
                    value: page.taxLabel,
                  },
                  {
                    label: 'Compared with a $52,000/year US baseline',
                    value:
                      page.comparedToUsAverage >= 0
                        ? `${usd(page.comparedToUsAverage)} higher`
                        : `${usd(Math.abs(page.comparedToUsAverage))} lower`,
                  },
                  {
                    label: '25x rule implication',
                    value: `Every $1,000/year you cut lowers the target by ${usd(25_000)}.`,
                  },
                ].map((item) => (
                  <div key={item.label} style={{ display: 'flex', flexDirection: 'column', gap: 6, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 14, padding: '16px 16px 14px' }}>
                    <div style={{ fontSize: 12, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: 16, lineHeight: 1.6, color: '#19181E', fontWeight: 600 }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <aside style={{ display: 'grid', gap: 18 }}>
              <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 20, padding: '24px 20px' }}>
                <div style={{ fontSize: 12, color: '#059669', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>
                  Next best tool
                </div>
                <h2 style={{ margin: '0 0 10px', fontSize: 22, lineHeight: 1.2, color: '#19181E' }}>
                  Go from city estimate to your actual timeline.
                </h2>
                <p style={{ margin: '0 0 14px', fontSize: 14, lineHeight: 1.8, color: '#64748B' }}>
                  Start with {page.calculatorLabel} if you want one specific answer, or use the full UntilFire calculator if you want your retirement date adjusted for income, savings, and taxes.
                </p>
                <div style={{ display: 'grid', gap: 10 }}>
                  <Link href={`/?source=${source}`} style={{ textDecoration: 'none', background: '#064E3B', color: '#fff', borderRadius: 10, padding: '12px 14px', fontWeight: 700, fontSize: 14 }}>
                    Calculate my FIRE date
                  </Link>
                  <Link href={`${page.calculatorHref}?source=${source}`} style={{ textDecoration: 'none', background: '#ECFDF5', color: '#064E3B', borderRadius: 10, padding: '12px 14px', fontWeight: 700, fontSize: 14 }}>
                    Open {page.calculatorLabel}
                  </Link>
                </div>
              </div>

              {article ? (
                <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 20, padding: '24px 20px' }}>
                  <div style={{ fontSize: 12, color: '#0F766E', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>
                    Related reading
                  </div>
                  <h2 style={{ margin: '0 0 8px', fontSize: 20, lineHeight: 1.25, color: '#19181E' }}>
                    {page.articleTitle}
                  </h2>
                  <p style={{ margin: '0 0 14px', fontSize: 14, lineHeight: 1.8, color: '#64748B' }}>
                    {article.description}
                  </p>
                  <Link href={`/learn/${article.slug}`} style={{ color: '#059669', fontWeight: 700, textDecoration: 'none', fontSize: 14 }}>
                    Read the guide
                  </Link>
                </div>
              ) : null}
            </aside>
          </section>

          <section style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 20, padding: '28px 24px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 20 }}>
              <div>
                <p style={{ margin: '0 0 8px', fontSize: 12, color: '#059669', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  Popular city pages
                </p>
                <h2 style={{ margin: 0, fontSize: 26, lineHeight: 1.15, letterSpacing: '-0.03em', color: '#19181E' }}>
                  Compare nearby FIRE planning paths
                </h2>
              </div>
              <Link href="/learn/topics" style={{ color: '#059669', textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
                Browse FIRE topics
              </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
              {cityLandingPages
                .filter((entry) => entry.slug !== page.slug)
                .map((entry) => (
                  <Link
                    key={entry.slug}
                    href={`/fire-number/${entry.slug}`}
                    style={{
                      textDecoration: 'none',
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: 16,
                      padding: '18px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    <div style={{ fontSize: 12, color: '#64748B', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      {entry.keyword}
                    </div>
                    <div style={{ fontSize: 19, color: '#19181E', fontWeight: 800, letterSpacing: '-0.02em' }}>
                      {entry.city.name}
                    </div>
                    <div style={{ fontSize: 14, color: '#64748B', lineHeight: 1.7 }}>
                      Annual baseline {usd(entry.city.col)} · target {usd(entry.fireTarget)}
                    </div>
                  </Link>
                ))}
            </div>
          </section>
        </div>
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.untilfire.com/' },
                { '@type': 'ListItem', position: 2, name: 'Calculators', item: 'https://www.untilfire.com/calculators' },
                { '@type': 'ListItem', position: 3, name: page.city.name, item: page.canonicalUrl },
              ],
            },
            {
              '@context': 'https://schema.org',
              '@type': 'WebPage',
              name: page.title,
              description: page.description,
              url: page.canonicalUrl,
              about: {
                '@type': 'Thing',
                name: `FIRE planning in ${page.city.name}`,
              },
            },
          ]),
        }}
      />
    </>
  )
}
