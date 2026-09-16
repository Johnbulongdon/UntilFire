import { Metadata } from 'next'
import Link from 'next/link'
import CoastFireCalculator from './CoastFireCalculator'

export const metadata: Metadata = {
  title: 'Coast FIRE Calculator -Find Your Coast FI Number | UntilFire',
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
            <h2 className="uf-t-h2" style={{ margin: '0 0 var(--uf-s4)' }}>Coast FIRE FAQ</h2>

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
            description: 'Calculate your Coast FIRE number -how much to save now so you never need to contribute again.',
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
