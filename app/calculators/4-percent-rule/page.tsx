import { Metadata } from 'next'
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
