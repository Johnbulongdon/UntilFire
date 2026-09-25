import { Metadata } from 'next'
import Link from 'next/link'
import CoastFireCalculator from './CoastFireCalculator'

// The rendered FAQ and structured answers share one source.
const faqs = [
  {
    question: 'What is my Coast FIRE number?',
    answer: 'Your Coast FIRE number is the amount invested today that could grow to your retirement target without further contributions. It depends on annual retirement spending, withdrawal rate, years until retirement, and assumed real return. Current investments and monthly contributions determine when you might reach that threshold.',
  },
  {
    question: 'Does this Coast FIRE calculator account for inflation?',
    answer: "Yes, through the return you enter. Use an after-inflation (real) annual return and spending in today's money. Do not enter a nominal return and assume inflation will be subtracted automatically. For example, 7% nominal growth with 3% inflation is about 3.9% real growth: (1.07 / 1.03) - 1. Fees and taxes are not deducted automatically either.",
  },
  {
    question: 'Can I stop saving now, or only at my Coast FIRE age?',
    answer: 'Those are different questions. The Coast number is the threshold for stopping contributions today. The calculator also uses your existing savings and monthly contributions to estimate the earliest age you could reach that threshold. Moving Stop paying in at compares a chosen plan with continuing to contribute until retirement. You still need income to cover living costs during the coasting years; this model assumes no portfolio withdrawals until retirement.',
  },
  {
    question: 'Is Coast FI the same as Coast FIRE?',
    answer: 'Yes, both refer to the same milestone. Reaching it means retirement contributions could become optional under your assumptions; it does not mean work is already optional or retirement is guaranteed.',
  },
  {
    question: 'Is Coast FIRE the same as Barista FIRE?',
    answer: 'No. Coast FIRE assumes the retirement portfolio stays invested without withdrawals while other income covers living costs. Barista FIRE usually combines part-time work with portfolio income or other resources to cover current spending. Working part time can fit either approach, but drawing from the portfolio before retirement changes the Coast FIRE calculation.',
  },
  {
    question: 'What inputs matter most for Coast FIRE?',
    answer: 'All four target assumptions matter. Spending changes the target proportionally; a lower withdrawal rate raises it. Return and years to retirement compound together. For a $1,250,000 retirement target in 30 years, the Coast number is about $164,000 at 7% real return, $289,000 at 5%, or $515,000 at 3%. These are scenarios, not predicted returns.',
  },
]

export const metadata: Metadata = {
  title: 'Coast FIRE Calculator — Find Your Coast FI Number | UntilFire',
  description:
    'Estimate your Coast FIRE number and the age you could stop saving. Compare contributions, retirement spending and inflation-adjusted returns. Free, no login.',
  keywords:
    'coast FIRE calculator, coast FI calculator, coast fire number, coast FI number, barista FIRE calculator, semi-retirement calculator, how much to save to coast',
  alternates: { canonical: 'https://www.untilfire.com/calculators/coast-fire' },
  openGraph: {
    title: 'Coast FIRE Calculator | UntilFire',
    description: 'Estimate when you could stop retirement contributions and compare the assumptions behind your Coast FIRE plan.',
    url: 'https://www.untilfire.com/calculators/coast-fire',
    siteName: 'UntilFire',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Coast FIRE Calculator | UntilFire',
    description: 'Estimate when you could stop retirement contributions and compare the assumptions behind your Coast FIRE plan.',
  },
}

export default function CoastFirePage() {
  return (
    <>
      <CoastFireCalculator />
      {/* One h1 per page. The calculator owns it — this section used to open
          with a second one, and its intro paragraph repeated what the
          calculator now says above the fold. The FAQ stays because it is the
          text behind the FAQPage schema below and answers things the
          calculator does not. */}
      <section style={{ background: 'var(--uf-ground)', padding: '0 var(--uf-s6) var(--uf-s7)' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <article
            style={{
              background: 'var(--uf-card)', border: '1px solid var(--uf-border)',
              borderRadius: 20, padding: 'var(--uf-s5)',
            }}
          >
            <h2 className="uf-t-h2" style={{ margin: '0 0 var(--uf-s4)' }}>How Coast FIRE is calculated</h2>

            <p className="uf-t-body" style={{ margin: '0 0 var(--uf-s4)', color: 'var(--uf-ink-2)', lineHeight: 1.75 }}>
              Coast FIRE is one division. Work out the portfolio you need at retirement, then
              discount it back to today at whatever return you expect to earn between now and
              then. What comes out is the amount that, left alone, grows into the full number
              without further contributions, if those assumptions hold.
            </p>

            <p className="uf-t-body" style={{ margin: '0 0 var(--uf-s3)', color: 'var(--uf-ink-2)', lineHeight: 1.75 }}>
              <strong>Coast number = (annual spending ÷ withdrawal rate) ÷ (1 + return)<sup>years to retirement</sup></strong>
            </p>

            <h3 className="uf-t-h3" style={{ margin: '0 0 var(--uf-s2)' }}>A worked example</h3>
            <p className="uf-t-body" style={{ margin: '0 0 var(--uf-s4)', color: 'var(--uf-ink-2)', lineHeight: 1.75 }}>
              You are 35, you expect to spend $50,000 a year in retirement, and you plan to stop
              at 65. At a 4% withdrawal rate the full target is $1,250,000. You have 30 years of
              growth ahead, so at a 7% real return the discount factor is 1.07<sup>30</sup>, or
              about 7.6. Divide and you get roughly <strong>$164,000</strong>. Reach that, and
              you could stop contributing today and still land on $1,250,000 at 65 — provided the
              assumed growth is achieved. This is a scenario, not a guaranteed outcome.
            </p>

            <h3 className="uf-t-h3" style={{ margin: '0 0 var(--uf-s2)' }}>Coast FIRE number by age</h3>
            <p className="uf-t-body" style={{ margin: '0 0 var(--uf-s3)', color: 'var(--uf-ink-2)', lineHeight: 1.75 }}>
              The same $1,250,000 target, a 7% real return, retiring at 65. Every year you wait,
              the number you need today climbs — that is compounding working against you rather
              than for you.
            </p>
            <div style={{ overflowX: 'auto', margin: '0 0 var(--uf-s4)' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 280 }}>
                <thead>
                  <tr>
                    <th className="uf-t-label" style={{ textAlign: 'left', padding: 'var(--uf-s2)', borderBottom: '1px solid var(--uf-border)', color: 'var(--uf-ink-2)' }}>Age</th>
                    <th className="uf-t-label" style={{ textAlign: 'left', padding: 'var(--uf-s2)', borderBottom: '1px solid var(--uf-border)', color: 'var(--uf-ink-2)' }}>Years left</th>
                    <th className="uf-t-label" style={{ textAlign: 'right', padding: 'var(--uf-s2)', borderBottom: '1px solid var(--uf-border)', color: 'var(--uf-ink-2)' }}>Coast number</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { age: 25, years: 40, amount: '$83,000' },
                    { age: 30, years: 35, amount: '$117,000' },
                    { age: 35, years: 30, amount: '$164,000' },
                    { age: 40, years: 25, amount: '$230,000' },
                    { age: 45, years: 20, amount: '$323,000' },
                    { age: 50, years: 15, amount: '$453,000' },
                    { age: 55, years: 10, amount: '$635,000' },
                  ].map((row) => (
                    <tr key={row.age}>
                      <td className="uf-t-data" style={{ padding: 'var(--uf-s2)', borderBottom: '1px solid var(--uf-border)' }}>{row.age}</td>
                      <td className="uf-t-data" style={{ padding: 'var(--uf-s2)', borderBottom: '1px solid var(--uf-border)', color: 'var(--uf-ink-2)' }}>{row.years}</td>
                      <td className="uf-t-data" style={{ padding: 'var(--uf-s2)', borderBottom: '1px solid var(--uf-border)', textAlign: 'right', fontWeight: 700 }}>{row.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="uf-t-small" style={{ margin: '0 0 var(--uf-s5)', color: 'var(--uf-ink-3)', lineHeight: 1.7 }}>
              The ratio is what matters, not the currency — read these in whatever you spend in.
              Change any assumption in the calculator above and the whole curve moves.
            </p>

            <h2 className="uf-t-h2" style={{ margin: '0 0 var(--uf-s4)' }}>How to choose your Coast FIRE inputs</h2>
            <p className="uf-t-body" style={{ margin: '0 0 var(--uf-s4)', color: 'var(--uf-ink-2)', lineHeight: 1.75 }}>
              Keep savings, contributions and spending in the same currency. Count the investments
              intended to fund retirement, rather than money reserved for near-term bills or an
              emergency fund. Enter annual retirement spending in today&apos;s money, including
              costs the portfolio must cover such as housing, healthcare and withdrawal taxes.
            </p>
            <p className="uf-t-body" style={{ margin: '0 0 var(--uf-s4)', color: 'var(--uf-ink-2)', lineHeight: 1.75 }}>
              The monthly contribution is converted to an annual amount and added at the end of
              each projected year. Pension and Social Security start dates, investment fees and
              taxes are not modelled separately. The 7% return and 4% withdrawal defaults are
              editable assumptions; compare lower returns and different spending before relying
              on the result. Even small{' '}
              <a href="https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins/updated" style={{ color: 'var(--uf-green)', textDecoration: 'underline' }}>
                investment fees reduce long-term growth
              </a>.
            </p>
            <p className="uf-t-body" style={{ margin: '0 0 var(--uf-s5)', color: 'var(--uf-ink-2)', lineHeight: 1.75 }}>
              The chart uses constant annual growth and shows ten years after retirement. It is
              not a lifetime sustainability test. Learn how{' '}
              <Link href="/learn/sequence-of-returns-risk" style={{ color: 'var(--uf-green)', textDecoration: 'underline' }}>
                the order of investment returns affects retirement withdrawals
              </Link>{' '}
              before treating a smooth projection as a promise.
            </p>

            <h2 className="uf-t-h2" style={{ margin: '0 0 var(--uf-s4)' }}>Coast FIRE FAQ</h2>

            {faqs.map(({ question, answer }) => (
              <div key={question}>
                <h3 className="uf-t-h3" style={{ margin: '0 0 var(--uf-s2)' }}>{question}</h3>
                <p className="uf-t-body" style={{ margin: '0 0 var(--uf-s4)', color: 'var(--uf-ink-2)', lineHeight: 1.75 }}>
                  {answer}
                </p>
              </div>
            ))}

            <h3 className="uf-t-h3" style={{ margin: '0 0 var(--uf-s2)' }}>Plan the next step</h3>
            <p className="uf-t-body" style={{ margin: 0, color: 'var(--uf-ink-2)', lineHeight: 1.75 }}>
              Use the{' '}
              <Link href="/fire-calculator" style={{ color: 'var(--uf-green)', fontWeight: 700, textDecoration: 'none' }}>
                FIRE calculator
              </Link>{' '}
              for the full number and a date, then{' '}
              <Link href="/calculators/4-percent-rule" style={{ color: 'var(--uf-green)', fontWeight: 700, textDecoration: 'none' }}>
                pressure-test the withdrawal rate
              </Link>
              . Coast FIRE is the milestone between where you are and either of those.
            </p>
          </article>
        </div>
      </section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'Coast FIRE Calculator',
            description: 'Estimate your Coast FIRE number and when retirement contributions could become optional under your assumptions.',
            url: 'https://www.untilfire.com/calculators/coast-fire',
            applicationCategory: 'FinanceApplication',
            operatingSystem: 'Any',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
            breadcrumb: {
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.untilfire.com' },
                { '@type': 'ListItem', position: 2, name: 'Calculators', item: 'https://www.untilfire.com/calculators' },
                { '@type': 'ListItem', position: 3, name: 'Coast FIRE Calculator', item: 'https://www.untilfire.com/calculators/coast-fire' },
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
            mainEntity: faqs.map(({ question, answer }) => ({
              '@type': 'Question',
              name: question,
              acceptedAnswer: { '@type': 'Answer', text: answer },
            })),
          }),
        }}
      />
    </>
  )
}
