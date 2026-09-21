import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { countryPages, getCountryPage } from '@/lib/country-pages'

type Props = { params: Promise<{ slug: string }> }

export const dynamicParams = false

export async function generateStaticParams() {
  return countryPages.map((page) => ({ slug: page.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const page = getCountryPage(slug)
  if (!page) return {}

  return {
    title: page.title,
    description: page.description,
    keywords: `FIRE ${page.shortName}, retire early ${page.shortName}, cost of living ${page.shortName}, financial independence ${page.shortName}, FIRE number`,
    robots: { index: true, follow: true },
    alternates: { canonical: page.canonicalUrl },
    openGraph: {
      title: page.title,
      description: page.description,
      url: page.canonicalUrl,
      siteName: 'UntilFire',
      type: 'article',
    },
    twitter: { card: 'summary_large_image', title: page.title, description: page.description },
  }
}

const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`

export default async function CountryPage({ params }: Props) {
  const { slug } = await params
  const page = getCountryPage(slug)
  if (!page) notFound()

  const cheaperThanUs = page.vsUsPct < 0
  const spread = page.dearestCity.col - page.cheapestCity.col
  const multiCity = page.cities.length > 1

  return (
    <div style={{ background: 'var(--uf-ground)', minHeight: '100vh' }}>
      <section style={{ padding: 'var(--uf-s6) var(--uf-s5) var(--uf-s7)' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <nav className="uf-t-small" style={{ marginBottom: 'var(--uf-s4)', color: 'var(--uf-ink-3)' }}>
            <Link href="/" style={{ color: 'var(--uf-green)', textDecoration: 'none' }}>Home</Link>
            {' · '}
            <Link href="/fire-number" style={{ color: 'var(--uf-green)', textDecoration: 'none' }}>FIRE by location</Link>
            {' · '}
            {page.shortName}
          </nav>

          <h1 className="uf-t-h1" style={{ margin: '0 0 var(--uf-s3)' }}>
            {page.flag} {page.heroTitle}
          </h1>

          <p className="uf-t-lead" style={{ margin: '0 0 var(--uf-s5)', color: 'var(--uf-ink-2)', lineHeight: 1.6 }}>
            Living in {page.name} costs roughly <strong>{money(page.avgCol)} a year</strong> across
            the {multiCity ? `${page.cities.length} cities` : 'city'} we track, which puts a
            full FIRE target near <strong>{money(page.fireTarget)}</strong> at a 4% withdrawal
            rate. {page.noIncomeTax
              ? 'There is no personal income tax, so every unit earned is a unit you keep.'
              : `Income is taxed at roughly ${Math.round(page.taxRate * 100)}% effective, which is what actually decides how fast you get there.`}
          </p>

          <article style={{ background: 'var(--uf-card)', border: '1px solid var(--uf-border)', borderRadius: 'var(--uf-r-card, 20px)', padding: 'var(--uf-s5)', marginBottom: 'var(--uf-s5)' }}>
            <h2 className="uf-t-h2" style={{ margin: '0 0 var(--uf-s4)' }}>The three numbers</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--uf-s4)' }}>
              {[
                { label: 'Annual cost', value: money(page.avgCol), note: 'average across our cities' },
                { label: 'FIRE target', value: money(page.fireTarget), note: '25× annual spending' },
                {
                  label: 'Effective tax',
                  value: page.noIncomeTax ? 'None' : `${Math.round(page.taxRate * 100)}%`,
                  note: page.noIncomeTax ? 'no personal income tax' : 'on employment income',
                },
              ].map((stat) => (
                <div key={stat.label} style={{ minWidth: 0 }}>
                  <div className="uf-t-label" style={{ color: 'var(--uf-ink-2)', marginBottom: 'var(--uf-s1)' }}>{stat.label}</div>
                  <div className="uf-t-data" style={{ fontSize: 24, fontWeight: 700, color: 'var(--uf-teal)' }}>{stat.value}</div>
                  <div className="uf-t-small" style={{ color: 'var(--uf-ink-3)', marginTop: 'var(--uf-s1)' }}>{stat.note}</div>
                </div>
              ))}
            </div>
          </article>

          <article style={{ background: 'var(--uf-card)', border: '1px solid var(--uf-border)', borderRadius: 'var(--uf-r-card, 20px)', padding: 'var(--uf-s5)', marginBottom: 'var(--uf-s5)', minWidth: 0 }}>
            <h2 className="uf-t-h2" style={{ margin: '0 0 var(--uf-s3)' }}>
              How {page.shortName} compares
            </h2>
            <p className="uf-t-body" style={{ margin: '0 0 var(--uf-s4)', color: 'var(--uf-ink-2)', lineHeight: 1.75 }}>
              {page.shortName.charAt(0).toUpperCase() + page.shortName.slice(1)} is the{' '}
              <strong>{page.costRank}{ordinal(page.costRank)} cheapest</strong> of the{' '}
              {page.countryCount} countries we hold cost data for — about{' '}
              <strong>{Math.abs(page.vsUsPct)}% {cheaperThanUs ? 'less' : 'more'}</strong> than
              the average US city. {cheaperThanUs
                ? 'A portfolio that funds an ordinary American life funds a longer one here, which is the whole arithmetic behind moving.'
                : 'That works the other way round: the same portfolio buys fewer years here than it would in the average US city.'}
            </p>
            {multiCity && (
              <p className="uf-t-body" style={{ margin: 0, color: 'var(--uf-ink-2)', lineHeight: 1.75 }}>
                The spread inside the country is {money(spread)} a year — {page.dearestCity.name.split(',')[0]} against{' '}
                {page.cheapestCity.name.split(',')[0]} — which is {spread * 25 > page.fireTarget * 0.25 ? 'large enough to move your FIRE date by years on its own' : 'small enough that the country matters more than the city'}.
              </p>
            )}
          </article>

          {multiCity && (
            <article style={{ background: 'var(--uf-card)', border: '1px solid var(--uf-border)', borderRadius: 'var(--uf-r-card, 20px)', padding: 'var(--uf-s5)', marginBottom: 'var(--uf-s5)', minWidth: 0 }}>
              <h2 className="uf-t-h2" style={{ margin: '0 0 var(--uf-s3)' }}>
                FIRE number by city in {page.shortName}
              </h2>
              {/* minWidth 0 on the wrapper AND the article: a grid or flex
                  child defaults to min-width auto, so without it the table
                  widens its parent instead of scrolling inside it. */}
              <div style={{ overflowX: 'auto', minWidth: 0 }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 280 }}>
                  <thead>
                    <tr>
                      <th className="uf-t-label" style={cellHead('left')}>City</th>
                      <th className="uf-t-label" style={cellHead('right')}>Per year</th>
                      <th className="uf-t-label" style={cellHead('right')}>FIRE number</th>
                    </tr>
                  </thead>
                  <tbody>
                    {page.cities.map((city) => (
                      <tr key={city.key}>
                        <td className="uf-t-data" style={cell('left')}>{city.name.split(',')[0]}</td>
                        <td className="uf-t-data" style={cell('right')}>{money(city.col)}</td>
                        <td className="uf-t-data" style={{ ...cell('right'), fontWeight: 700 }}>{money(city.col * 25)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="uf-t-small" style={{ margin: 'var(--uf-s3) 0 0', color: 'var(--uf-ink-3)', lineHeight: 1.7 }}>
                Every FIRE number here is 25× the annual cost, the standard 4% rule. Change the
                withdrawal rate and the whole column moves — a 3.5% rule multiplies by 28.6 instead.
              </p>
            </article>
          )}

          <article style={{ background: 'var(--uf-card)', border: '1px solid var(--uf-border)', borderRadius: 'var(--uf-r-card, 20px)', padding: 'var(--uf-s5)', marginBottom: 'var(--uf-s5)' }}>
            <h2 className="uf-t-h2" style={{ margin: '0 0 var(--uf-s3)' }}>
              What moving here does to your number
            </h2>
            <p className="uf-t-body" style={{ margin: '0 0 var(--uf-s4)', color: 'var(--uf-ink-2)', lineHeight: 1.75 }}>
              Retiring in the average US city takes about{' '}
              <strong>{money(page.usFireTarget)}</strong>. Retiring in {page.name} takes{' '}
              <strong>{money(page.fireTarget)}</strong> — {cheaperThanUs ? 'a saving of' : 'an extra'}{' '}
              <strong>{money(Math.abs(page.usFireTarget - page.fireTarget))}</strong>.{' '}
              {cheaperThanUs
                ? 'That difference is not a discount on your lifestyle, it is years off the front of your working life, because it is the portfolio you no longer have to build.'
                : 'That is the price of the move, and it has to be worth something else to you — the maths alone will not justify it.'}
            </p>
            <p className="uf-t-body" style={{ margin: '0 0 var(--uf-s4)', color: 'var(--uf-ink-2)', lineHeight: 1.75 }}>
              Put differently: a $1,000,000 portfolio funds about{' '}
              <strong>{page.yearsPerMillion} years</strong> of life in {page.name} at a 4%
              withdrawal rate, against {Math.round(1_000_000 / page.usAvgCol)} years in the
              average US city.
            </p>
            {(page.cheaperNeighbour || page.dearerNeighbour) && (
              <p className="uf-t-body" style={{ margin: 0, color: 'var(--uf-ink-2)', lineHeight: 1.75 }}>
                On cost, {page.shortName} sits{' '}
                {page.cheaperNeighbour ? <>just above {page.cheaperNeighbour}</> : <>at the bottom of our list</>}
                {page.cheaperNeighbour && page.dearerNeighbour ? ' and ' : ''}
                {page.dearerNeighbour ? <>just below {page.dearerNeighbour}</> : ''}
                {' '}— worth checking both if the country matters less to you than the number does.
              </p>
            )}
          </article>

          <article style={{ background: 'var(--uf-card)', border: '1px solid var(--uf-border)', borderRadius: 'var(--uf-r-card, 20px)', padding: 'var(--uf-s5)', marginBottom: 'var(--uf-s5)' }}>
            <h2 className="uf-t-h2" style={{ margin: '0 0 var(--uf-s3)' }}>Where these numbers come from</h2>
            <p className="uf-t-body" style={{ margin: '0 0 var(--uf-s4)', color: 'var(--uf-ink-2)', lineHeight: 1.75 }}>
              The cost figure is annual spending for one person living an ordinary middle-class
              life — housing, food, transport, healthcare, the rest — not a backpacker budget and
              not a luxury one. The tax figure is an effective rate on employment income, not a
              marginal bracket, so it already accounts for the allowances most people get.
            </p>
            <p className="uf-t-body" style={{ margin: 0, color: 'var(--uf-ink-2)', lineHeight: 1.75 }}>
              Both are estimates, and they are the right kind of estimate for a decision this
              size: close enough to tell you whether {page.shortName} shortens your timeline,
              not precise enough to budget a month on. Put your own income and savings in
              and the answer becomes yours rather than the average&apos;s —{' '}
              <Link href="/" style={{ color: 'var(--uf-green)', fontWeight: 700, textDecoration: 'none' }}>
                find your freedom date
              </Link>{' '}
              or model the move directly with the{' '}
              <Link href="/calculators/expat-fire" style={{ color: 'var(--uf-green)', fontWeight: 700, textDecoration: 'none' }}>
                Expat FIRE calculator
              </Link>.
            </p>
          </article>

          <article style={{ background: 'var(--uf-card)', border: '1px solid var(--uf-border)', borderRadius: 'var(--uf-r-card, 20px)', padding: 'var(--uf-s5)' }}>
            <h2 className="uf-t-h2" style={{ margin: '0 0 var(--uf-s4)' }}>Other countries</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--uf-s2)' }}>
              {countryPages
                .filter((other) => other.slug !== page.slug)
                .map((other) => (
                  <Link
                    key={other.slug}
                    href={`/fire-number/countries/${other.slug}`}
                    className="uf-t-small"
                    style={{
                      color: 'var(--uf-green)', textDecoration: 'none', fontWeight: 600,
                      border: '1px solid var(--uf-border)', borderRadius: 999,
                      padding: 'var(--uf-s1) var(--uf-s3)',
                    }}
                  >
                    {other.flag} {other.shortName}
                  </Link>
                ))}
            </div>
          </article>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: `What is the FIRE number for ${page.shortName}?`,
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: `About ${money(page.fireTarget)}, from an annual cost of roughly ${money(page.avgCol)} and the 4% rule. That is an average across the ${page.cities.length} ${page.cities.length === 1 ? 'city' : 'cities'} we hold data for; your own spending decides your own number.`,
                },
              },
              {
                '@type': 'Question',
                name: `How much does it cost to live in ${page.shortName} per year?`,
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: `Roughly ${money(page.avgCol)} a year for one person living an ordinary middle-class life, which is ${Math.abs(page.vsUsPct)}% ${cheaperThanUs ? 'less' : 'more'} than the average US city.`,
                },
              },
              {
                '@type': 'Question',
                name: `What is the effective income tax rate in ${page.shortName}?`,
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: page.noIncomeTax
                    ? `${page.shortName.charAt(0).toUpperCase() + page.shortName.slice(1)} levies no personal income tax, so gross pay and take-home pay are the same figure.`
                    : `Around ${Math.round(page.taxRate * 100)}% effective on employment income — an all-in rate after typical allowances, not a marginal bracket.`,
                },
              },
            ],
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.untilfire.com' },
              { '@type': 'ListItem', position: 2, name: 'FIRE by location', item: 'https://www.untilfire.com/fire-number' },
              { '@type': 'ListItem', position: 3, name: page.heroTitle, item: page.canonicalUrl },
            ],
          }),
        }}
      />
    </div>
  )
}

function ordinal(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return 'th'
  return ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'
}

function cellHead(align: 'left' | 'right') {
  return {
    textAlign: align,
    padding: 'var(--uf-s2)',
    borderBottom: '1px solid var(--uf-border)',
    color: 'var(--uf-ink-2)',
  } as const
}

function cell(align: 'left' | 'right') {
  return {
    textAlign: align,
    padding: 'var(--uf-s2)',
    borderBottom: '1px solid var(--uf-border)',
  } as const
}
