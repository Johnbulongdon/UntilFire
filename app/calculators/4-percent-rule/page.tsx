import { Metadata } from 'next'
import Link from 'next/link'
import FourPercentRuleCalculator from './FourPercentRuleCalculator'

export const metadata: Metadata = {
  title: 'FIRE Number Calculator — How Much Do You Need to Retire? | UntilFire',
  description:
    'Free FIRE number calculator. Enter your annual retirement expenses and see exactly how much you need to retire. Compare withdrawal rates from 3% to 5% using the 4% rule.',
  keywords:
    'FIRE number calculator, 4 percent rule calculator, safe withdrawal rate calculator, how much do I need to retire, retirement number calculator, 25x rule calculator, SWR calculator',
  alternates: { canonical: 'https://www.untilfire.com/calculators/4-percent-rule' },
  openGraph: {
    title: '4% Rule Calculator — How Much Do You Need to Retire? | UntilFire',
    description: 'Calculate your FIRE number using the safe withdrawal rate. Adjust the rate and see the impact.',
    url: 'https://www.untilfire.com/calculators/4-percent-rule',
    siteName: 'UntilFire',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FIRE Number Calculator | UntilFire',
    description: 'Calculate exactly how much you need to retire. Adjust the withdrawal rate and see how it changes your target.',
  },
}

export default function FourPercentRulePage() {
  return (
    <>
      <FourPercentRuleCalculator />
      <section style={{ background: 'var(--uf-ground)', padding: '0 var(--uf-s6) 72px' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 18 }}>
          <article style={{ background: 'var(--uf-card)', border: '1px solid var(--uf-border)', borderRadius: 18, padding: '26px 24px' }}>
            <h2 style={{ margin: '0 0 12px', color: 'var(--uf-green-900)', fontSize: 28, letterSpacing: '-0.03em' }}>
              How much do you need to retire?
            </h2>
            <p style={{ margin: '0 0 12px', color: 'var(--uf-ink-2)', fontSize: 16, lineHeight: 1.75 }}>
              Your FIRE number is the portfolio target that could support your annual spending without traditional work. A common starting point is the 4% rule: annual spending multiplied by 25. For a more conservative early-retirement plan, compare 3%, 3.5%, and 4% withdrawal rates instead of treating one number as final.
            </p>
            <p style={{ margin: 0, color: 'var(--uf-ink-2)', fontSize: 16, lineHeight: 1.75 }}>
              After you estimate the target, use the <Link href="/fire-calculator" style={{ color: 'var(--uf-green)', fontWeight: 800, textDecoration: 'none' }}>FIRE calculator</Link> to turn it into a projected freedom date, or compare your compounding milestone with the <Link href="/calculators/coast-fire" style={{ color: 'var(--uf-green)', fontWeight: 800, textDecoration: 'none' }}>Coast FIRE calculator</Link>.
            </p>
          </article>
          <article style={{ background: 'var(--uf-card)', border: '1px solid var(--uf-border)', borderRadius: 18, padding: '26px 24px' }}>
            <h2 style={{ margin: '0 0 12px', color: 'var(--uf-green-900)', fontSize: 24 }}>How this calculator works</h2>
            <p className="uf-t-data" style={{ margin: '0 0 12px', color: 'var(--uf-ink)', fontSize: 15, lineHeight: 1.7 }}>
              FIRE number = (yearly spending − other income) ÷ (1 − tax on withdrawals) ÷ withdrawal rate
            </p>
            <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--uf-ink-2)', fontSize: 16, lineHeight: 1.75 }}>
              <li>Everything is in today&apos;s dollars. The withdrawal rate is the first year&apos;s share; after that the amount rises with prices.</li>
              <li>It starts at the plain rule (4%, no tax, no other income) so the first number matches the familiar 25×. Each factor shows our recommendation and what it changes.</li>
              <li>The recommended withdrawal rate follows how long the money has to last, planning to age 95: 4% for up to 30 years (what the Trinity Study tested), 3.5% for up to 45 and 3% beyond.</li>
              <li>Other income only counts if it starts when you stop working. Income that starts later, like Social Security, needs a projection over time, which the <Link href="/?source=calculator-4-percent-rule" style={{ color: 'var(--uf-green)', fontWeight: 800 }}>freedom date calculator</Link> does.</li>
              <li>Worked example: $60,000 a year at 4% is $1,500,000. With $12,000 of other income and 10% tax, it is $48,000 ÷ 0.9 ÷ 4% = $1,333,333.</li>
            </ul>
          </article>
          <article style={{ background: 'var(--uf-card)', border: '1px solid var(--uf-border)', borderRadius: 18, padding: '26px 24px' }}>
            <h2 style={{ margin: '0 0 12px', color: 'var(--uf-green-900)', fontSize: 24 }}>FIRE number FAQ</h2>
            <h3 style={{ margin: '0 0 8px', color: 'var(--uf-ink)', fontSize: 18 }}>Is the 25x rule the same as the 4% rule?</h3>
            <p style={{ margin: '0 0 14px', color: 'var(--uf-ink-2)', lineHeight: 1.75 }}>Yes. The 25x rule says you need about 25 times annual expenses invested. That is the inverse of a 4% withdrawal rate.</p>
            <h3 style={{ margin: '0 0 8px', color: 'var(--uf-ink)', fontSize: 18 }}>Should early retirees use less than 4%?</h3>
            <p style={{ margin: 0, color: 'var(--uf-ink-2)', lineHeight: 1.75 }}>Many early retirees model 3% to 3.5% because their retirement horizon can be much longer. Taxes, healthcare, market timing, flexibility, and part-time income all matter.</p>
          </article>
        </div>
      </section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'FIRE Number Calculator',
            description: 'Calculate exactly how much you need to retire using safe withdrawal rates from 3% to 5%.',
            url: 'https://www.untilfire.com/calculators/4-percent-rule',
            applicationCategory: 'FinanceApplication',
            operatingSystem: 'Any',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
            breadcrumb: {
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.untilfire.com' },
                { '@type': 'ListItem', position: 2, name: 'Calculators', item: 'https://www.untilfire.com/calculators' },
                { '@type': 'ListItem', position: 3, name: 'FIRE Number Calculator', item: 'https://www.untilfire.com/calculators/4-percent-rule' },
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
                name: 'Is the 25x rule the same as the 4% rule?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Yes. The 25x rule says you need about 25 times annual expenses invested. That is the inverse of a 4% withdrawal rate.',
                },
              },
              {
                '@type': 'Question',
                name: 'Should early retirees use less than 4%?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Many early retirees model 3% to 3.5% because their retirement horizon can be much longer. Taxes, healthcare, market timing, flexibility, and part-time income all matter.',
                },
              },
            ],
          }),
        }}
      />
    </>
  )
}
