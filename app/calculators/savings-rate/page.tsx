import { Metadata } from 'next'
import Link from 'next/link'
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

const faqs = [
  {
    q: 'What is a savings rate?',
    a: 'Your savings rate is the percentage of your take-home income that you save or invest each month. It is calculated as monthly savings divided by monthly take-home income. A higher savings rate means you can retire earlier because you accumulate wealth faster and also prove you can live on less.',
  },
  {
    q: 'What savings rate do I need to retire early?',
    a: 'The higher your savings rate, the faster you reach financial independence. Saving 10% takes roughly 40 years. Saving 25% takes about 32 years. Saving 50% takes around 17 years. Saving 65%+ can get you to FIRE in under 10 years. The exact timeline also depends on your starting portfolio and investment returns.',
  },
  {
    q: 'Does savings rate or income matter more for FIRE?',
    a: 'Savings rate matters more than income for FIRE timelines. Someone earning $60,000 and saving 50% will reach financial independence far sooner than someone earning $150,000 and saving 10%. Income helps, but the percentage you keep — not the dollar amount you earn — is the primary driver of your FIRE date.',
  },
  {
    q: 'How do I calculate my savings rate?',
    a: 'Savings rate = (monthly savings ÷ monthly take-home income) × 100. Monthly savings includes retirement contributions (401k, IRA), taxable investing, and any other money you put aside. Take-home income is after tax. If you save $1,500 per month and take home $5,000, your savings rate is 30%.',
  },
]

export default function SavingsRatePage() {
  return (
    <>
      <SavingsRateCalculator />

      <section style={{ background: '#F7F9FB', padding: '0 24px 72px', fontFamily: "'Manrope', sans-serif" }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'grid', gap: 18 }}>
          <article style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 18, padding: '26px 24px' }}>
            <h1 style={{ margin: '0 0 12px', color: '#064E3B', fontSize: 28, letterSpacing: '-0.03em' }}>
              Savings Rate Calculator: The #1 Lever in FIRE
            </h1>
            <p style={{ margin: '0 0 12px', color: '#64748B', fontSize: 16, lineHeight: 1.75 }}>
              Your savings rate — the share of take-home pay you invest each month — does more to set your retirement
              date than your income. Save 10% and financial independence is decades away; save 50% and it can arrive in
              under 20 years. Use the calculator above to find your rate, then see how raising it pulls your freedom date closer.
            </p>
            <p style={{ margin: 0, color: '#64748B', fontSize: 16, lineHeight: 1.75 }}>
              Turn your savings rate into a full timeline with the <Link href="/fire-calculator" style={{ color: '#059669', fontWeight: 800, textDecoration: 'none' }}>FIRE calculator</Link>, or
              size your end goal with the <Link href="/calculators/4-percent-rule" style={{ color: '#059669', fontWeight: 800, textDecoration: 'none' }}>FIRE number calculator</Link>. To go deeper, read{' '}
              <Link href="/learn/why-savings-rate-matters-more-than-income" style={{ color: '#059669', fontWeight: 800, textDecoration: 'none' }}>why savings rate matters more than income</Link>.
            </p>
          </article>
          <article style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 18, padding: '26px 24px' }}>
            <h2 style={{ margin: '0 0 12px', color: '#064E3B', fontSize: 24 }}>Savings rate FAQ</h2>
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
