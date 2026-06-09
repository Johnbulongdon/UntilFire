import { Metadata } from 'next'
import Link from 'next/link'
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

const faqs = [
  {
    q: 'What is APY?',
    a: 'APY (Annual Percentage Yield) is the real rate of return on a savings or investment account, taking into account the effect of compounding interest. Unlike APR, APY reflects how often interest is compounded — daily, monthly, or quarterly — so it gives a more accurate picture of what you actually earn.',
  },
  {
    q: 'What is the difference between APR and APY?',
    a: 'APR (Annual Percentage Rate) is the stated interest rate without factoring in compounding. APY includes the effect of compounding and is always equal to or higher than APR. For example, a 5% APR compounded monthly becomes approximately 5.12% APY. When comparing savings accounts, always compare APY for an accurate comparison.',
  },
  {
    q: 'How do I calculate APY from APR?',
    a: 'APY = (1 + APR/n)^n - 1, where n is the number of compounding periods per year. For monthly compounding (n=12) at 5% APR: APY = (1 + 0.05/12)^12 - 1 = approximately 5.116%.',
  },
]

export default function APYPage() {
  return (
    <>
      <APYCalculator />

      <section style={{ background: '#F7F9FB', padding: '0 24px 72px', fontFamily: "'Manrope', sans-serif" }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'grid', gap: 18 }}>
          <article style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 18, padding: '26px 24px' }}>
            <h1 style={{ margin: '0 0 12px', color: '#064E3B', fontSize: 28, letterSpacing: '-0.03em' }}>
              APY Calculator: Convert APR to Annual Percentage Yield
            </h1>
            <p style={{ margin: '0 0 12px', color: '#64748B', fontSize: 16, lineHeight: 1.75 }}>
              APY is your true annual return once compounding is included — always equal to or higher than the stated APR.
              Enter your APR and compounding frequency above to see what your savings actually earn, and compare accounts
              on an apples-to-apples basis.
            </p>
            <p style={{ margin: 0, color: '#64748B', fontSize: 16, lineHeight: 1.75 }}>
              For long-term growth, see how a rate compounds over decades with the{' '}
              <Link href="/calculators/compound-interest" style={{ color: '#059669', fontWeight: 800, textDecoration: 'none' }}>compound interest calculator</Link>, or
              turn your returns into a retirement date with the <Link href="/fire-calculator" style={{ color: '#059669', fontWeight: 800, textDecoration: 'none' }}>FIRE calculator</Link>.
            </p>
          </article>
          <article style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 18, padding: '26px 24px' }}>
            <h2 style={{ margin: '0 0 12px', color: '#064E3B', fontSize: 24 }}>APY FAQ</h2>
            {faqs.map((f) => (
              <div key={f.q} style={{ marginBottom: 14 }}>
                <h3 style={{ margin: '0 0 8px', color: '#19181E', fontSize: 18 }}>{f.q}</h3>
                <p style={{ margin: 0, color: '#64748B', lineHeight: 1.75 }}>{f.a}</p>
              </div>
            ))}
          </article>
        </div>
      </section>

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
            mainEntity: faqs.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          }),
        }}
      />
    </>
  )
}
