import { Metadata } from 'next'
import Link from 'next/link'
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
      <section style={{ background: '#F7F9FB', padding: '0 24px 72px', fontFamily: "'Manrope', sans-serif" }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'grid', gap: 18 }}>
          <article style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 18, padding: '26px 24px' }}>
            <h2 style={{ margin: '0 0 12px', color: '#064E3B', fontSize: 28, letterSpacing: '-0.03em' }}>
              How to use this Coast FIRE calculator
            </h2>
            <p style={{ margin: '0 0 12px', color: '#64748B', fontSize: 16, lineHeight: 1.75 }}>
              Coast FIRE estimates the amount you need invested today so growth can do the remaining retirement work by your target age. It is not full financial independence yet; it is the milestone where future retirement contributions may become optional.
            </p>
            <p style={{ margin: 0, color: '#64748B', fontSize: 16, lineHeight: 1.75 }}>
              Use this page after the <Link href="/fire-calculator" style={{ color: '#059669', fontWeight: 800, textDecoration: 'none' }}>FIRE calculator</Link> if you want to compare full FIRE with a more flexible milestone. Then pressure-test your final target with the <Link href="/calculators/4-percent-rule" style={{ color: '#059669', fontWeight: 800, textDecoration: 'none' }}>FIRE number calculator</Link>.
            </p>
          </article>
          <article style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 18, padding: '26px 24px' }}>
            <h2 style={{ margin: '0 0 12px', color: '#064E3B', fontSize: 24 }}>Coast FIRE FAQ</h2>
            <h3 style={{ margin: '0 0 8px', color: '#19181E', fontSize: 18 }}>Is Coast FIRE the same as Barista FIRE?</h3>
            <p style={{ margin: '0 0 14px', color: '#64748B', lineHeight: 1.75 }}>No. Coast FIRE means existing investments can grow enough for retirement later. Barista FIRE usually means you still work part time to cover current expenses before full retirement.</p>
            <h3 style={{ margin: '0 0 8px', color: '#19181E', fontSize: 18 }}>What inputs matter most?</h3>
            <p style={{ margin: 0, color: '#64748B', lineHeight: 1.75 }}>Current portfolio, target retirement age, expected return, inflation, future annual spending, and withdrawal rate drive the estimate. Small assumption changes can move the Coast FIRE number materially.</p>
          </article>
        </div>
      </section>
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
