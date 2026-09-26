import { Metadata } from 'next'
import Link from 'next/link'
import SavingsRateCalculator from './SavingsRateCalculator'

export const metadata: Metadata = {
  // Page one (7.6) with no clicks: say what the answer looks like. 50% is 15
  // years from zero at the recommended 6.9% (yearsToTarget), and
  // test:fire-number checks both figures against it.
  title: 'Savings Rate Calculator: Save 50%, Retire in 15 Years | UntilFire',
  description:
    'Save 10% and FIRE takes about 42 years; save 50% and it takes 15. Enter your take-home pay and spending to see your savings rate and years to FIRE. Free, no signup.',
  keywords:
    'savings rate calculator, FIRE savings rate, how long to retire calculator, financial independence calculator, savings percentage calculator, how much to save to retire',
  alternates: { canonical: 'https://www.untilfire.com/calculators/savings-rate' },
  openGraph: {
    title: 'Savings Rate Calculator | UntilFire',
    description: 'Find your savings percentage and compare estimated years to financial independence. Free, no signup required.',
    url: 'https://www.untilfire.com/calculators/savings-rate',
    siteName: 'UntilFire',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Savings Rate Calculator | UntilFire',
    description: 'Find your savings percentage and compare estimated years to financial independence. Free, no signup required.',
  },
}

const faqs = [
  {
    q: 'What is a savings rate?',
    a: 'Your savings rate is the percentage of your take-home income that you save or invest each month. It is calculated as monthly savings divided by monthly take-home income. A higher savings rate means you can retire earlier because you accumulate wealth faster and also prove you can live on less.',
  },
  {
    q: 'What savings rate do I need to retire early?',
    a: 'There is no single required savings rate. Compare the rates in the calculator using your current investments and income. Its estimates assume a constant 7% annual real return, applied monthly, and a target of 25 times annual expenses (a 4% withdrawal assumption). Different starting balances, returns, spending or withdrawal rates change the timeline; the results are estimates, not guaranteed retirement dates.',
  },
  {
    q: 'Does savings rate or income matter more for FIRE?',
    a: 'Both matter. Saving a larger share of income increases contributions and reduces the spending your portfolio must support. With no starting investments and the same return and withdrawal assumptions, equal savings rates produce the same modeled timeline regardless of salary. Once you include an existing portfolio, its size relative to your spending also matters.',
  },
  {
    q: 'How do I calculate my savings rate?',
    a: 'Savings rate = ((take-home income − expenses) ÷ take-home income) × 100. Use the same period for both figures. For example, $5,000 of monthly take-home income minus $3,500 of monthly expenses leaves $1,500, a 30% savings rate. This calculator takes annual figures, so enter $60,000 of income and $42,000 of expenses for that example.',
  },
  {
    q: 'Should I use monthly or annual income?',
    a: 'The inputs on this page are annual. Multiply regular monthly take-home income and expenses by 12, or total the last 12 months if they vary. Keep income and expenses on the same basis; do not compare annual income with monthly expenses.',
  },
  {
    q: 'How should I treat payroll retirement contributions?',
    a: 'This tool measures the surplus left from take-home pay after expenses. Retirement contributions already deducted from your paycheck are not included in that surplus. Do not add them only to savings while leaving the income denominator unchanged. An existing retirement account balance can be included in current savings and investments; modeling future payroll contributions separately needs a more detailed plan.',
  },
]

export default function SavingsRatePage() {
  return (
    <>
      <SavingsRateCalculator />

      <section style={{ background: 'var(--uf-surface)', padding: '0 24px 72px', fontFamily: "'Manrope', sans-serif" }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'grid', gap: 18 }}>
          <article style={{ background: 'var(--uf-card)', border: '1px solid var(--uf-border)', borderRadius: 18, padding: '26px 24px' }}>
            <h2 style={{ margin: '0 0 12px', color: 'var(--uf-green-900)', fontSize: 28, letterSpacing: '-0.03em' }}>
              How to calculate your savings rate
            </h2>
            <p style={{ margin: '0 0 12px', color: 'var(--uf-ink-2)', fontSize: 16, lineHeight: 1.75 }}>
              Subtract expenses from take-home income, divide the difference by take-home income,
              then multiply by 100. For example, $60,000 of annual take-home income and $42,000 of
              expenses leave $18,000 to save: a 30% savings rate, or $1,500 per month.
              Enter your own annual figures above, then compare the estimated timelines at different savings rates.
            </p>
            <p style={{ margin: 0, color: 'var(--uf-ink-2)', fontSize: 16, lineHeight: 1.75 }}>
              Turn your savings rate into a full timeline with the <Link href="/fire-calculator" style={{ color: 'var(--uf-green)', fontWeight: 800, textDecoration: 'none' }}>FIRE calculator</Link>, or
              size your end goal with the <Link href="/calculators/4-percent-rule" style={{ color: 'var(--uf-green)', fontWeight: 800, textDecoration: 'none' }}>FIRE number calculator</Link>. To go deeper, read{' '}
              <Link href="/learn/why-savings-rate-matters-more-than-income" style={{ color: 'var(--uf-green)', fontWeight: 800, textDecoration: 'none' }}>why savings rate matters more than income</Link>.
            </p>
          </article>
          <article style={{ background: 'var(--uf-card)', border: '1px solid var(--uf-border)', borderRadius: 18, padding: '26px 24px' }}>
            <h2 style={{ margin: '0 0 12px', color: 'var(--uf-green-900)', fontSize: 24 }}>Savings rate FAQ</h2>
            {faqs.map((f) => (
              <div key={f.q} style={{ marginBottom: 14 }}>
                <h3 style={{ margin: '0 0 8px', color: 'var(--uf-ink)', fontSize: 18 }}>{f.q}</h3>
                <p style={{ margin: 0, color: 'var(--uf-ink-2)', lineHeight: 1.75 }}>{f.a}</p>
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
