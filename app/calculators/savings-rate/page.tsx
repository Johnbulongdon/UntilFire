import { Metadata } from 'next'
import SavingsRateCalculator from './SavingsRateCalculator'

export const metadata: Metadata = {
  title: 'Savings Rate Calculator — How Savings Rate Affects Your FIRE Date | UntilFire',
  description:
    'Calculate your savings rate and see exactly how it shifts your FIRE retirement date. The savings rate is the single most powerful lever in FIRE planning -find yours in seconds.',
  keywords:
    'savings rate calculator, FIRE savings rate, how long to retire calculator, financial independence calculator, savings percentage calculator, how much to save to retire',
  alternates: { canonical: 'https://www.untilfire.com/calculators/savings-rate' },
  openGraph: {
    title: 'Savings Rate Calculator | UntilFire',
    description: 'Your savings rate is the #1 lever in FIRE. Find yours and see how it changes your retirement date.',
    url: 'https://www.untilfire.com/calculators/savings-rate',
    siteName: 'UntilFire',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Savings Rate Calculator | UntilFire',
    description: 'Your savings rate is the #1 lever in FIRE. Find yours and see how it changes your retirement date.',
  },
}

export default function SavingsRatePage() {
  return (
    <>
      <SavingsRateCalculator />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'Savings Rate Calculator',
            description: 'Calculate your savings rate and see how it impacts your FIRE retirement date.',
            url: 'https://www.untilfire.com/calculators/savings-rate',
            applicationCategory: 'FinanceApplication',
            operatingSystem: 'Any',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
            breadcrumb: {
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.untilfire.com' },
                { '@type': 'ListItem', position: 2, name: 'Calculators', item: 'https://www.untilfire.com/calculators' },
                { '@type': 'ListItem', position: 3, name: 'Savings Rate Calculator', item: 'https://www.untilfire.com/calculators/savings-rate' },
              ],
            },
          }),
        }}
      />
    </>
  )
}
