import { Metadata } from 'next'
import APYCalculator from './APYCalculator'

export const metadata: Metadata = {
  title: 'APY Calculator -Convert APR to Annual Percentage Yield | UntilFire',
  description:
    'Free APY calculator. Enter your APR and compounding frequency to get your true annual percentage yield. See exactly how much your savings will grow over 1, 5, and 10 years.',
  keywords:
    'APY calculator, annual percentage yield calculator, APR to APY, APY vs APR, compounding interest calculator, savings account calculator',
  alternates: { canonical: 'https://www.untilfire.com/calculators/apy' },
  openGraph: {
    title: 'APY Calculator | UntilFire',
    description: 'Convert APR to APY. See your true annual return after compounding.',
    url: 'https://www.untilfire.com/calculators/apy',
    siteName: 'UntilFire',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'APY Calculator | UntilFire',
    description: 'Convert APR to APY. See your true annual return after compounding.',
  },
}

export default function APYPage() {
  return (
    <>
      <APYCalculator />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'APY Calculator',
            description: 'Free APY calculator -convert APR to annual percentage yield with any compounding frequency.',
            url: 'https://www.untilfire.com/calculators/apy',
            applicationCategory: 'FinanceApplication',
            operatingSystem: 'Any',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
            breadcrumb: {
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.untilfire.com' },
                { '@type': 'ListItem', position: 2, name: 'Calculators', item: 'https://www.untilfire.com/calculators' },
                { '@type': 'ListItem', position: 3, name: 'APY Calculator', item: 'https://www.untilfire.com/calculators/apy' },
              ],
            },
          }),
        }}
      />
    </>
  )
}
