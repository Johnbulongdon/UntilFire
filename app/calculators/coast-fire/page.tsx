import { Metadata } from 'next'
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
    </>
  )
}
