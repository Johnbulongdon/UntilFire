import { Metadata } from 'next'
import Link from 'next/link'
import CoastFireCalculator from './CoastFireCalculator'

export const metadata: Metadata = {
  title: 'Coast FIRE Calculator — Find Your Coast FI Number | UntilFire',
  description:
    'Calculate your Coast FIRE number -the amount you need saved today so that compound growth alone carries you to full retirement, without any more contributions. Free calculator.',
  keywords:
    'coast FIRE calculator, coast FI calculator, coast fire number, coast FI number, barista FIRE calculator, semi-retirement calculator, how much to save to coast',
  alternates: { canonical: 'https://www.untilfire.com/calculators/coast-fire' },
  openGraph: {
    title: 'Coast FIRE Calculator | UntilFire',
    description: 'Find the number where you can stop saving and let compound growth finish the job.',
    url: 'https://www.untilfire.com/calculators/coast-fire',
    siteName: 'UntilFire',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Coast FIRE Calculator | UntilFire',
    description: 'Find the number where you can stop saving and let compound growth finish the job.',
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
              without another penny from you.
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
              7% holds, which is the whole gamble.
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

            <h2 className="uf-t-h2" style={{ margin: '0 0 var(--uf-s4)' }}>Coast FIRE FAQ</h2>

            <h3 className="uf-t-h3" style={{ margin: '0 0 var(--uf-s2)' }}>
              What is my Coast FIRE number?
            </h3>
            <p className="uf-t-body" style={{ margin: '0 0 var(--uf-s4)', color: 'var(--uf-ink-2)', lineHeight: 1.75 }}>
              It is personal to three things: what you expect to spend in retirement, when you
              want to retire, and what return you assume. There is no single figure — someone
              retiring at 50 needs far more today than someone retiring at 65, because the second
              has fifteen more years of compounding doing the work. Put your own three numbers
              into the calculator above rather than borrowing anyone else&apos;s.
            </p>

            <h3 className="uf-t-h3" style={{ margin: '0 0 var(--uf-s2)' }}>
              Is Coast FI the same as Coast FIRE?
            </h3>
            <p className="uf-t-body" style={{ margin: '0 0 var(--uf-s4)', color: 'var(--uf-ink-2)', lineHeight: 1.75 }}>
              Yes — two names for the same milestone. Some people prefer &ldquo;Coast FI&rdquo;
              because it drops the &ldquo;retire early&rdquo; part, which is fair: reaching it
              does not oblige you to retire at all. It means contributions have become optional,
              not that work has.
            </p>

            <h3 className="uf-t-h3" style={{ margin: '0 0 var(--uf-s2)' }}>
              Is Coast FIRE the same as Barista FIRE?
            </h3>

            <h3 className="uf-t-h3" style={{ margin: '0 0 var(--uf-s2)' }}>
              Is Coast FIRE the same as Barista FIRE?
            </h3>
            <p className="uf-t-body" style={{ margin: '0 0 var(--uf-s4)', color: 'var(--uf-ink-2)', lineHeight: 1.75 }}>
              No. Coast FIRE means your existing investments can grow into a full retirement on
              their own. Barista FIRE usually means you still work part time to cover today&apos;s
              expenses while they do it.
            </p>

            <h3 className="uf-t-h3" style={{ margin: '0 0 var(--uf-s2)' }}>
              What inputs matter most?
            </h3>
            <p className="uf-t-body" style={{ margin: '0 0 var(--uf-s4)', color: 'var(--uf-ink-2)', lineHeight: 1.75 }}>
              Expected return and years remaining, by a wide margin. Both sit in an exponent, so a
              single percentage point moves the Coast number far more than a change to your
              spending does. Try 6% against 7% above and watch the curve.
            </p>

            <h3 className="uf-t-h3" style={{ margin: '0 0 var(--uf-s2)' }}>
              Where does this fit with the rest?
            </h3>
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
            description: 'Calculate your Coast FIRE number — how much to save now so you never need to contribute again.',
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
            mainEntity: [
              {
                '@type': 'Question',
                name: 'What is my Coast FIRE number?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'It depends on three things: what you expect to spend in retirement, when you want to retire, and what return you assume. Coast number = (annual spending \u00f7 withdrawal rate) \u00f7 (1 + return) raised to the years remaining. At $50,000 a year, a 4% withdrawal rate, a 7% real return and retirement at 65, a 35-year-old needs about $164,000.',
                },
              },
              {
                '@type': 'Question',
                name: 'Is Coast FI the same as Coast FIRE?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Yes, two names for the same milestone. Coast FI drops the \u201cretire early\u201d part, which is fair: reaching it means contributions have become optional, not that work has.',
                },
              },
              {
                '@type': 'Question',
                name: 'Is Coast FIRE the same as Barista FIRE?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'No. Coast FIRE means your existing investments can grow into a full retirement on their own. Barista FIRE usually means you still work part time to cover today\u2019s expenses while they do it.',
                },
              },
              {
                '@type': 'Question',
                name: 'What inputs matter most for Coast FIRE?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Expected return and years remaining, by a wide margin. Both sit in an exponent, so a single percentage point moves the Coast FIRE number far more than a change to your spending does.',
                },
              },
              {
                '@type': 'Question',
                name: 'Where does Coast FIRE fit with a full FIRE number?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Coast FIRE is the milestone before full financial independence. Work out the full number and a date first, then treat Coast FIRE as the earlier point where contributions become optional.',
                },
              },
            ],
          }),
        }}
      />
    </>
  )
}
