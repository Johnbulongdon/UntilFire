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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'What is compound interest?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Compound interest is interest calculated on both your initial principal and the interest already accumulated. Unlike simple interest, compounding grows exponentially over time. For example, $10,000 invested at 7% grows to $19,672 after 10 years with compound interest, versus $17,000 with simple interest.',
                },
              },
              {
                '@type': 'Question',
                name: 'How does compound interest affect FIRE planning?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Compound interest is the engine behind FIRE (Financial Independence Retire Early). Starting earlier gives your money more time to compound, dramatically shortening the timeline to financial independence. Investing $500/month starting at age 25 instead of 35 can result in more than double the portfolio at retirement due to compounding.',
                },
              },
              {
                '@type': 'Question',
                name: 'What is the Rule of 72?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The Rule of 72 is a quick way to estimate how long it takes to double your money at a given interest rate. Divide 72 by your annual return rate. At 7% returns, your money doubles approximately every 72 ÷ 7 = 10.3 years. At 10% returns, it doubles every 7.2 years.',
                },
              },
            ],
          }),
        }}
      />
    </>
  )
}
