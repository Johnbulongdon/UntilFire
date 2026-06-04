import { Metadata } from 'next'
import Link from 'next/link'
import CompoundInterestCalculator from './CompoundInterestCalculator'

export const metadata: Metadata = {
  title: 'Compound Interest Calculator -Investment Growth Projector | UntilFire',
  description:
    'Free compound interest calculator. Enter your starting balance, monthly contributions, and expected return to see how your investments grow over time. Visualize the power of compounding.',
  keywords:
    'compound interest calculator, investment growth calculator, savings growth calculator, compounding calculator, investment returns calculator, wealth projector',
  alternates: { canonical: 'https://www.untilfire.com/calculators/compound-interest' },
  openGraph: {
    title: 'Compound Interest Calculator | UntilFire',
    description: 'See how your investments grow with compound interest and regular contributions.',
    url: 'https://www.untilfire.com/calculators/compound-interest',
    siteName: 'UntilFire',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Compound Interest Calculator | UntilFire',
    description: 'See how your investments grow with compound interest and regular contributions.',
  },
}

const faqs = [
  {
    q: 'What is compound interest?',
    a: 'Compound interest is interest calculated on both your initial principal and the interest already accumulated. Unlike simple interest, compounding grows exponentially over time. For example, $10,000 invested at 7% grows to $19,672 after 10 years with compound interest, versus $17,000 with simple interest.',
  },
  {
    q: 'How does compound interest affect FIRE planning?',
    a: 'Compound interest is the engine behind FIRE (Financial Independence Retire Early). Starting earlier gives your money more time to compound, dramatically shortening the timeline to financial independence. Investing $500/month starting at age 25 instead of 35 can result in more than double the portfolio at retirement due to compounding.',
  },
  {
    q: 'What is the Rule of 72?',
    a: 'The Rule of 72 is a quick way to estimate how long it takes to double your money at a given interest rate. Divide 72 by your annual return rate. At 7% returns, your money doubles approximately every 72 ÷ 7 = 10.3 years. At 10% returns, it doubles every 7.2 years.',
  },
]

export default function CompoundInterestPage() {
  return (
    <>
      <CompoundInterestCalculator />

      <section style={{ background: '#F7F9FB', padding: '0 24px 72px', fontFamily: "'Manrope', sans-serif" }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'grid', gap: 18 }}>
          <article style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 18, padding: '26px 24px' }}>
            <h1 style={{ margin: '0 0 12px', color: '#064E3B', fontSize: 28, letterSpacing: '-0.03em' }}>
              Compound Interest Calculator: See Your Investments Grow
            </h1>
            <p style={{ margin: '0 0 12px', color: '#64748B', fontSize: 16, lineHeight: 1.75 }}>
              Compound interest earns returns on both your contributions and the growth they have already produced — the
              force that turns steady investing into financial independence. Set your starting balance, monthly contribution,
              and expected return above to watch the curve bend upward over time.
            </p>
            <p style={{ margin: 0, color: '#64748B', fontSize: 16, lineHeight: 1.75 }}>
              Once you see how your money compounds, turn it into a retirement date with the{' '}
              <Link href="/fire-calculator" style={{ color: '#059669', fontWeight: 800, textDecoration: 'none' }}>FIRE calculator</Link>, or
              size your target with the <Link href="/calculators/4-percent-rule" style={{ color: '#059669', fontWeight: 800, textDecoration: 'none' }}>FIRE number calculator</Link>. Read more in{' '}
              <Link href="/learn/compound-interest-and-fire" style={{ color: '#059669', fontWeight: 800, textDecoration: 'none' }}>compound interest and FIRE</Link>.
            </p>
          </article>
          <article style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 18, padding: '26px 24px' }}>
            <h2 style={{ margin: '0 0 12px', color: '#064E3B', fontSize: 24 }}>Compound interest FAQ</h2>
            {faqs.map((f) => (
              <div key={f.q} style={{ marginBottom: 14 }}>
                <h3 style={{ margin: '0 0 8px', color: '#19181E', fontSize: 18 }}>{f.q}</h3>
                <p style={{ margin: 0, color: '#64748B', lineHeight: 1.75 }}>{f.a}</p>
              </div>
            ))}
          </article>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'Compound Interest Calculator',
            description: 'Free compound interest calculator with monthly contributions and growth visualization.',
            url: 'https://www.untilfire.com/calculators/compound-interest',
            applicationCategory: 'FinanceApplication',
            operatingSystem: 'Any',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
            breadcrumb: {
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.untilfire.com' },
                { '@type': 'ListItem', position: 2, name: 'Calculators', item: 'https://www.untilfire.com/calculators' },
                { '@type': 'ListItem', position: 3, name: 'Compound Interest Calculator', item: 'https://www.untilfire.com/calculators/compound-interest' },
              ],
            },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          }),
        }}
      />
    </>
  )
}
