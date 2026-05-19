import { Metadata } from 'next'
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

export default function CompoundInterestPage() {
  return (
    <>
      <CompoundInterestCalculator />
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
    </>
  )
}
