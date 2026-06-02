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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'What is a savings rate?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Your savings rate is the percentage of your take-home income that you save or invest each month. It is calculated as monthly savings divided by monthly take-home income. A higher savings rate means you can retire earlier because you accumulate wealth faster and also prove you can live on less.',
                },
              },
              {
                '@type': 'Question',
                name: 'What savings rate do I need to retire early?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The higher your savings rate, the faster you reach financial independence. Saving 10% takes roughly 40 years. Saving 25% takes about 32 years. Saving 50% takes around 17 years. Saving 65%+ can get you to FIRE in under 10 years. The exact timeline also depends on your starting portfolio and investment returns.',
                },
              },
              {
                '@type': 'Question',
                name: 'Does savings rate or income matter more for FIRE?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Savings rate matters more than income for FIRE timelines. Someone earning $60,000 and saving 50% will reach financial independence far sooner than someone earning $150,000 and saving 10%. Income helps, but the percentage you keep — not the dollar amount you earn — is the primary driver of your FIRE date.',
                },
              },
              {
                '@type': 'Question',
                name: 'How do I calculate my savings rate?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Savings rate = (monthly savings ÷ monthly take-home income) × 100. Monthly savings includes retirement contributions (401k, IRA), taxable investing, and any other money you put aside. Take-home income is after tax. If you save $1,500 per month and take home $5,000, your savings rate is 30%.',
                },
              },
            ],
          }),
        }}
      />
    </>
  )
}
