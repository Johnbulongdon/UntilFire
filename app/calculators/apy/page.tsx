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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'What is APY?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'APY (Annual Percentage Yield) is the real rate of return on a savings or investment account, taking into account the effect of compounding interest. Unlike APR, APY reflects how often interest is compounded — daily, monthly, or quarterly — so it gives a more accurate picture of what you actually earn.',
                },
              },
              {
                '@type': 'Question',
                name: 'What is the difference between APR and APY?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'APR (Annual Percentage Rate) is the stated interest rate without factoring in compounding. APY includes the effect of compounding and is always equal to or higher than APR. For example, a 5% APR compounded monthly becomes approximately 5.12% APY. When comparing savings accounts, always compare APY for an accurate comparison.',
                },
              },
              {
                '@type': 'Question',
                name: 'How do I calculate APY from APR?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'APY = (1 + APR/n)^n - 1, where n is the number of compounding periods per year. For monthly compounding (n=12) at 5% APR: APY = (1 + 0.05/12)^12 - 1 = approximately 5.116%.',
                },
              },
            ],
          }),
        }}
      />
    </>
  )
}
