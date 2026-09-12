import { Metadata } from 'next';
import Link from 'next/link';
import ExpatFireCalculator from './ExpatFireCalculator';

export const metadata: Metadata = {
  title: 'Expat FIRE Calculator — Retire Early by Moving Abroad | UntilFire',
  description:
    'Spin the globe to find cities where your savings unlocks early retirement. See your FIRE date, FIRE number, and monthly cost savings for 392 cities worldwide. Free geo-arbitrage calculator.',
  keywords:
    'expat FIRE calculator, geo arbitrage FIRE, retire abroad calculator, retire early move abroad, cheapest cities to retire, international FIRE calculator, cost of living retirement calculator',
  alternates: { canonical: 'https://www.untilfire.com/calculators/expat-fire' },
  openGraph: {
    title: 'Expat FIRE Calculator | UntilFire',
    description: 'Find cities where you could retire years sooner. 392 cities. Free, no login.',
    url: 'https://www.untilfire.com/calculators/expat-fire',
    siteName: 'UntilFire',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Expat FIRE Calculator | UntilFire',
    description: 'Spin the globe to find cities where your savings unlocks early retirement.',
  },
};

export default function ExpatFirePage() {
  return (
    <>
      <ExpatFireCalculator />

      <section style={{ background: 'var(--uf-surface)', padding: '0 24px 72px', fontFamily: "'Manrope', sans-serif" }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'grid', gap: 18, paddingTop: 48 }}>

          <article style={{ background: 'var(--uf-card)', border: '1px solid var(--uf-border)', borderRadius: 18, padding: '26px 24px' }}>
            <h2 style={{ margin: '0 0 12px', color: 'var(--uf-green-900)', fontSize: 28, letterSpacing: '-0.03em', fontFamily: 'Fraunces, Georgia, serif', fontWeight: 800 }}>
              What is geo-arbitrage FIRE?
            </h2>
            <p style={{ margin: '0 0 12px', color: 'var(--uf-ink-2)', fontSize: 16, lineHeight: 1.75 }}>
              Geo-arbitrage is the strategy of moving to a lower cost-of-living location to stretch your savings further. In a FIRE context it has two effects: your existing portfolio may already cover expenses in a cheaper city (you could be FIRE-ready now), and your monthly savings rate goes further because you need a smaller portfolio to replace a lower cost of living.
            </p>
            <p style={{ margin: 0, color: 'var(--uf-ink-2)', fontSize: 16, lineHeight: 1.75 }}>
              The calculator uses the 4% safe withdrawal rule (FIRE number = annual expenses × 25) and your current monthly savings to project years-to-FIRE for each of 392 cities worldwide. Use the <Link href="/fire-calculator" style={{ color: 'var(--uf-green)', fontWeight: 700, textDecoration: 'none' }}>full FIRE calculator</Link> to get a more detailed plan including your monthly move recommendations.
            </p>
          </article>

          <article style={{ background: 'var(--uf-card)', border: '1px solid var(--uf-border)', borderRadius: 18, padding: '26px 24px' }}>
            <h2 style={{ margin: '0 0 16px', color: 'var(--uf-green-900)', fontSize: 24, fontFamily: 'Fraunces, Georgia, serif', fontWeight: 800 }}>
              Expat FIRE FAQ
            </h2>

            <h3 style={{ margin: '0 0 8px', color: 'var(--uf-ink)', fontSize: 18, fontWeight: 700 }}>What do the colours mean?</h3>
            <p style={{ margin: '0 0 18px', color: 'var(--uf-ink-2)', lineHeight: 1.75 }}>
              <strong style={{ color: 'var(--uf-teal)' }}>Green</strong> — your current portfolio already meets the FIRE number for that city (portfolio ≥ annual expenses × 25). You could retire there now.{' '}
              <strong style={{ color: '#f59e0b' }}>Yellow</strong> — Barista FIRE territory: your portfolio covers roughly half the full FIRE number, meaning a small part-time income bridges the gap.{' '}
              <strong style={{ color: 'var(--uf-neg)' }}>Red</strong> — not yet, but spinning to cheaper cities will shrink the gap significantly.
            </p>

            <h3 style={{ margin: '0 0 8px', color: 'var(--uf-ink)', fontSize: 18, fontWeight: 700 }}>Does this account for taxes?</h3>
            <p style={{ margin: '0 0 18px', color: 'var(--uf-ink-2)', lineHeight: 1.75 }}>
              The cost-of-living figures include estimated local taxes and living costs for each city. They do not account for your home-country tax obligations on foreign income or portfolio withdrawals — those vary by citizenship and require professional tax advice specific to your situation.
            </p>

            <h3 style={{ margin: '0 0 8px', color: 'var(--uf-ink)', fontSize: 18, fontWeight: 700 }}>What about visas and healthcare?</h3>
            <p style={{ margin: '0 0 18px', color: 'var(--uf-ink-2)', lineHeight: 1.75 }}>
              The calculator focuses on cost of living and FIRE math. Visa eligibility, healthcare costs, and quality of life factors are outside its scope. Countries like Portugal, Mexico, Thailand, and Malaysia have established retirement or passive-income visa programmes worth researching once you have shortlisted destinations.
            </p>

            <h3 style={{ margin: '0 0 8px', color: 'var(--uf-ink)', fontSize: 18, fontWeight: 700 }}>Which cities tend to unlock FIRE the fastest?</h3>
            <p style={{ margin: 0, color: 'var(--uf-ink-2)', lineHeight: 1.75 }}>
              Southeast Asian cities (Chiang Mai, Bali, Hanoi, Phnom Penh), parts of Latin America (Medellín, Playa del Carmen, Montevideo), and Southern/Eastern Europe (Lisbon, Porto, Split, Tbilisi) consistently appear in the green or yellow zone for savers with US or Western European incomes. The calculator shows you exactly where your numbers land.
            </p>
          </article>

        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'Expat FIRE Calculator',
            description: 'Find cities worldwide where your savings unlocks early retirement using geo-arbitrage.',
            url: 'https://www.untilfire.com/calculators/expat-fire',
            applicationCategory: 'FinanceApplication',
            operatingSystem: 'Web',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          }),
        }}
      />
    </>
  );
}
