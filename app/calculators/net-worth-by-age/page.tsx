import { Metadata } from 'next'
import Link from 'next/link'
import NetWorthByAgeCalculator from './NetWorthByAgeCalculator'
import { AGE_BANDS, AGE_BAND_SHORT, percentileToday, type AgeBand } from '@/lib/net-worth-compare'
import { NET_WORTH_BENCHMARKS } from '@/lib/net-worth-benchmarks'
import { NET_WORTH_INFLATION } from '@/lib/net-worth-inflation'
import { formatMoney } from '@/lib/money'

const PAGE_URL = 'https://www.untilfire.com/calculators/net-worth-by-age'
const YEAR = NET_WORTH_BENCHMARKS.year
const THROUGH = NET_WORTH_INFLATION?.through ?? `${YEAR} dollars`
const COLUMNS = [
  { pct: 50, label: 'Median' },
  { pct: 25, label: '25th percentile' },
  { pct: 75, label: '75th percentile' },
  { pct: 90, label: '90th percentile' },
]
// No top-1% column: a five-year group has a few hundred survey households,
// so its top 1% is two or three of them — not a figure worth printing.

const at = (band: AgeBand, pct: number) =>
  formatMoney(percentileToday(NET_WORTH_BENCHMARKS, band, pct, NET_WORTH_INFLATION) ?? 0, { style: 'compact' })

const SAMPLE: AgeBand[] = ['18_24', '25_29', '30_34', '40_44', '50_54', '60_64']
const medians = SAMPLE.map((b) => `${at(b, 50)} at ${AGE_BAND_SHORT[b]}`)
const households = (band: AgeBand) => NET_WORTH_BENCHMARKS.households?.[band]
// Largest gap between our ten-year medians and the Fed's, from the build's check.
const FED_GAP_PCT = Math.max(...Object.values(NET_WORTH_BENCHMARKS.fedCheck ?? {}).map((c) => Math.abs(c.ours - c.published) / c.published * 100))

// The visible FAQ and its structured data share this list.
const faqs = [
  {
    question: 'What is the median net worth by age in the US?',
    answer: `In ${THROUGH} dollars, the median US household net worth is about ${medians.slice(0, -1).join(', ')} and ${medians[medians.length - 1]}. Across all ages it is about ${at('all', 50)}. The table above has every five-year age group. Source: Federal Reserve Survey of Consumer Finances, ${YEAR}.`,
  },
  {
    question: 'What counts as net worth?',
    answer: 'Everything a household owns, such as cash, investments, retirement accounts and the equity in a home, vehicles or a business, minus everything it owes, such as mortgages, student loans and card balances. The survey measures whole households, so compare your household’s net worth rather than one person’s.',
  },
  {
    question: 'Is my net worth good for my age?',
    answer: 'The median is the middle household: half have more and half have less. Being above it means you are ahead of most households your age, but whether your net worth is enough depends on when you want work to be optional. The freedom date calculator turns your net worth, income and spending into that date.',
  },
  {
    question: 'Why are the survey figures adjusted for inflation?',
    answer: `The survey measured ${YEAR}. Prices have risen since, so its amounts are brought forward with the US consumer price index (CPI-U) to ${THROUGH}${NET_WORTH_INFLATION ? `, a factor of ${NET_WORTH_INFLATION.factor}` : ''}. That keeps today’s net worth and the survey in the same money.`,
  },
]

export const metadata: Metadata = {
  title: 'Net Worth by Age Calculator (US): How Do You Compare? | UntilFire',
  description: `Compare your net worth with US households your age. Medians and percentiles by age from the Federal Reserve, in ${THROUGH} dollars. Free, no sign-up.`,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: 'Net Worth by Age: How Do You Compare? | UntilFire',
    description: 'See where your net worth stands among US households your age, from Federal Reserve data adjusted to today’s dollars.',
    url: PAGE_URL,
    siteName: 'UntilFire',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Net Worth by Age: How Do You Compare? | UntilFire',
    description: 'See where your net worth stands among US households your age, from Federal Reserve data adjusted to today’s dollars.',
  },
}

const cell: React.CSSProperties = { padding: 'var(--uf-s2) var(--uf-s3)', borderBottom: '1px solid var(--uf-border)', textAlign: 'right', whiteSpace: 'nowrap' }
const card: React.CSSProperties = { background: 'var(--uf-card)', border: '1px solid var(--uf-border)', borderRadius: 20, padding: 'var(--uf-s5)' }
const link: React.CSSProperties = { color: 'var(--uf-green)', textDecoration: 'underline' }

export default function NetWorthByAgePage() {
  return (
    <>
      <NetWorthByAgeCalculator />
      <section style={{ background: 'var(--uf-ground)', padding: '0 var(--uf-s6) var(--uf-s7)' }}>
        {/* minmax(0, 1fr), not the default auto column: a grid item won't shrink
            below its content, so the wide table would push the page sideways
            instead of scrolling inside its own box on a phone. */}
        <div style={{ maxWidth: 1040, margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 'var(--uf-s5)' }}>
          <article style={card}>
            <h2 className="uf-t-h2" style={{ margin: '0 0 var(--uf-s2)' }}>US household net worth by age</h2>
            <p className="uf-t-body" style={{ margin: '0 0 var(--uf-s4)', color: 'var(--uf-ink-2)' }}>
              In {THROUGH} dollars, in five-year groups by the age of the household&apos;s reference person. Each column is the net worth that share of households falls below: at the median, half have less. Groups with fewer households surveyed, such as 18–24, are less precise.
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table className="uf-t-data" style={{ borderCollapse: 'collapse', width: '100%', fontSize: 14 }}>
                <thead>
                  <tr>
                    <th scope="col" style={{ ...cell, textAlign: 'left' }}>Age</th>
                    {COLUMNS.map((c) => <th key={c.pct} scope="col" style={cell}>{c.label}</th>)}
                    <th scope="col" style={cell}>Households surveyed</th>
                  </tr>
                </thead>
                <tbody>
                  {[...AGE_BANDS, 'all' as const].map((band) => (
                    <tr key={band} style={band === 'all' ? { fontWeight: 700 } : undefined}>
                      <th scope="row" style={{ ...cell, textAlign: 'left' }}>{AGE_BAND_SHORT[band]}</th>
                      {COLUMNS.map((c) => <td key={c.pct} style={cell}>{at(band, c.pct)}</td>)}
                      <td style={{ ...cell, color: 'var(--uf-ink-2)' }}>{households(band)?.toLocaleString('en-US') ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article style={card}>
            <h2 className="uf-t-h2" style={{ margin: '0 0 var(--uf-s3)' }}>Where these numbers come from</h2>
            <p className="uf-t-body" style={{ margin: '0 0 var(--uf-s3)', color: 'var(--uf-ink-2)', lineHeight: 1.75 }}>
              The Federal Reserve&apos;s <a href="https://www.federalreserve.gov/econres/scfindex.htm" style={link}>Survey of Consumer Finances</a> ({YEAR}, the latest), weighted across all five of its data sets, grouped by the age of the household&apos;s reference person into five-year groups. The Fed publishes medians for ten-year groups only; built from the same rows, ours are each within {FED_GAP_PCT.toFixed(1)}% of them.
              Amounts are brought forward with the <a href="https://www.bls.gov/cpi/" style={link}>BLS consumer price index</a> to {THROUGH}.
            </p>
            <p className="uf-t-body" style={{ margin: 0, color: 'var(--uf-ink-2)', lineHeight: 1.75 }}>
              It covers US households only, and a household&apos;s whole net worth, including home equity. The survey runs every three years; these figures will update when the next one is published.
            </p>
          </article>

          <article style={card}>
            <h2 className="uf-t-h2" style={{ margin: '0 0 var(--uf-s4)' }}>Net worth by age: common questions</h2>
            {faqs.map(({ question, answer }) => (
              <div key={question} style={{ marginBottom: 'var(--uf-s4)' }}>
                <h3 className="uf-t-h3" style={{ margin: '0 0 var(--uf-s2)' }}>{question}</h3>
                <p className="uf-t-body" style={{ margin: 0, color: 'var(--uf-ink-2)', lineHeight: 1.75 }}>{answer}</p>
              </div>
            ))}
            <p className="uf-t-body" style={{ margin: 0 }}>
              Next: <Link href="/?source=net-worth-by-age" style={link}>find your freedom date</Link>, or see the <Link href="/calculators/coast-fire" style={link}>Coast FIRE calculator</Link>.
            </p>
          </article>
        </div>
      </section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'Net Worth by Age Calculator',
              url: PAGE_URL,
              applicationCategory: 'FinanceApplication',
              operatingSystem: 'Any',
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
            },
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.untilfire.com' },
                { '@type': 'ListItem', position: 2, name: 'Calculators', item: 'https://www.untilfire.com/calculators' },
                { '@type': 'ListItem', position: 3, name: 'Net Worth by Age', item: PAGE_URL },
              ],
            },
            {
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: faqs.map(({ question, answer }) => ({
                '@type': 'Question',
                name: question,
                acceptedAnswer: { '@type': 'Answer', text: answer },
              })),
            },
          ]),
        }}
      />
    </>
  )
}
