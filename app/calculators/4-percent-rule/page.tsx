import { Metadata } from 'next'
import Link from 'next/link'
import FourPercentRuleCalculator from './FourPercentRuleCalculator'

export const metadata: Metadata = {
  title: 'FIRE Number Calculator -How Much Do You Need to Retire? | UntilFire',
  description:
    'Free FIRE number calculator. Enter your annual retirement expenses and see exactly how much you need to retire. Compare withdrawal rates from 3% to 5% using the 4% rule.',
  keywords:
    'FIRE number calculator, 4 percent rule calculator, safe withdrawal rate calculator, how much do I need to retire, retirement number calculator, 25x rule calculator, SWR calculator',
  alternates: { canonical: 'https://www.untilfire.com/calculators/4-percent-rule' },
  openGraph: {
    title: '4% Rule Calculator -How Much Do You Need to Retire? | UntilFire',
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
      <section style={{ background: '#F7F9FB', padding: '0 24px 72px', fontFamily: "'Manrope', sans-serif" }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'grid', gap: 18 }}>
          <article style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 18, padding: '26px 24px' }}>
            <h2 style={{ margin: '0 0 12px', color: '#064E3B', fontSize: 28, letterSpacing: '-0.03em' }}>
              How to use this FIRE number calculator
            </h2>
            <p style={{ margin: '0 0 12px', color: '#64748B', fontSize: 16, lineHeight: 1.75 }}>
              Your FIRE number is the portfolio target that could support your annual spending without traditional work. A common starting point is the 4% rule: annual spending multiplied by 25. For a more conservative early-retirement plan, compare 3%, 3.5%, and 4% withdrawal rates instead of treating one number as final.
            </p>
            <p style={{ margin: 0, color: '#64748B', fontSize: 16, lineHeight: 1.75 }}>
              After you estimate the target, use the <Link href="/fire-calculator" style={{ color: '#059669', fontWeight: 800, textDecoration: 'none' }}>FIRE calculator</Link> to turn it into a projected freedom date, or compare your compounding milestone with the <Link href="/calculators/coast-fire" style={{ color: '#059669', fontWeight: 800, textDecoration: 'none' }}>Coast FIRE calculator</Link>.
            </p>
          </article>
          <article style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 18, padding: '26px 24px' }}>
            <h2 style={{ margin: '0 0 12px', color: '#064E3B', fontSize: 24 }}>FIRE number FAQ</h2>
            <h3 style={{ margin: '0 0 8px', color: '#19181E', fontSize: 18 }}>Is the 25x rule the same as the 4% rule?</h3>
            <p style={{ margin: '0 0 14px', color: '#64748B', lineHeight: 1.75 }}>Yes. The 25x rule says you need about 25 times annual expenses invested. That is the inverse of a 4% withdrawal rate.</p>
            <h3 style={{ margin: '0 0 8px', color: '#19181E', fontSize: 18 }}>Should early retirees use less than 4%?</h3>
            <p style={{ margin: 0, color: '#64748B', lineHeight: 1.75 }}>Many early retirees model 3% to 3.5% because their retirement horizon can be much longer. Taxes, healthcare, market timing, flexibility, and part-time income all matter.</p>
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
    </>
  )
}
