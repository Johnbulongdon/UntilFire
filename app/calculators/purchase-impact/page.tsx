import { Metadata } from 'next'
import Link from 'next/link'
import PurchaseImpactCalculator from './PurchaseImpactCalculator'
import { SITE_URL } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Purchase Impact Calculator — What Does Buying This Really Cost You? | UntilFire',
  description:
    'See the real cost of any purchase: its compound value at your FIRE date and how many days it delays your financial independence. Free, no login required.',
  keywords:
    'purchase opportunity cost calculator, spending impact FIRE, buying vs investing calculator, freedom cost calculator, FIRE delay calculator',
  alternates: { canonical: `${SITE_URL}/calculators/purchase-impact` },
  openGraph: {
    title: 'Purchase Impact Calculator | UntilFire',
    description: 'Enter a price to see how much it would grow by your freedom date — and how many days it delays your retirement.',
    url: `${SITE_URL}/calculators/purchase-impact`,
    siteName: 'UntilFire',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Purchase Impact Calculator | UntilFire',
    description: 'Enter a price to see how much it would grow by your freedom date and how many days it delays your retirement.',
  },
}

const faqs = [
  {
    q: 'How does a purchase delay my FIRE date?',
    a: 'When you spend money instead of investing it, you reduce your current savings. That means compound growth starts from a lower base, so it takes longer to reach your FIRE number. The delay is the difference in time-to-FIRE with and without the purchase removed from your savings.',
  },
  {
    q: 'Why is the future value so much higher than the purchase price?',
    a: 'Compound growth is exponential. A $1,000 purchase 20 years before your FIRE date at 7% annual returns becomes roughly $3,870. The longer your time horizon, the more dramatic the compounding effect.',
  },
  {
    q: 'What return rate should I use?',
    a: 'The S&P 500 has historically returned around 7% annually after inflation. For a conservative estimate use 5–6%; for an optimistic estimate use 8–10%. The default 7% is a widely used real-return assumption for long-term index investing.',
  },
  {
    q: 'Does this mean I should never buy anything?',
    a: 'No. The calculator shows the opportunity cost, not a verdict. Some purchases improve your quality of life, productivity, or income enough to more than offset the delay. The goal is to be aware of the tradeoff, not to avoid all spending.',
  },
]

export default function PurchaseImpactPage() {
  return (
    <>
      <PurchaseImpactCalculator />

      <section style={{ background: '#F7F9FB', padding: '0 24px 72px', fontFamily: "'Manrope', sans-serif" }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'grid', gap: 18 }}>
          <article style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 18, padding: '26px 24px' }}>
            <h2 style={{ margin: '0 0 12px', color: '#064E3B', fontSize: 24, letterSpacing: '-0.03em' }}>
              The real cost of any purchase
            </h2>
            <p style={{ margin: '0 0 12px', color: '#64748B', fontSize: 16, lineHeight: 1.75 }}>
              Every dollar you spend has two costs: the price on the tag, and the compound growth it would have earned between now and your freedom date. This calculator makes both visible so you can make the tradeoff consciously — not accidentally.
            </p>
            <p style={{ margin: 0, color: '#64748B', fontSize: 16, lineHeight: 1.75 }}>
              Start with your{' '}
              <Link href="/fire-calculator" style={{ color: '#059669', fontWeight: 800, textDecoration: 'none' }}>freedom date calculator</Link>{' '}
              to find your FIRE number and timeline, then come back here to test individual purchases against your plan.
            </p>
          </article>

          <article style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 18, padding: '26px 24px' }}>
            <h2 style={{ margin: '0 0 16px', color: '#064E3B', fontSize: 22, letterSpacing: '-0.03em' }}>
              Frequently asked questions
            </h2>
            <div style={{ display: 'grid', gap: 16 }}>
              {faqs.map(faq => (
                <div key={faq.q} style={{ borderTop: '1px solid #E2E8F0', paddingTop: 16 }}>
                  <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#19181E' }}>{faq.q}</h3>
                  <p style={{ margin: 0, color: '#64748B', fontSize: 15, lineHeight: 1.7 }}>{faq.a}</p>
                </div>
              ))}
            </div>
          </article>

          <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {[
              { href: '/calculators/compound-interest', label: 'Compound Interest Calculator' },
              { href: '/calculators/savings-rate',      label: 'Savings Rate Calculator' },
              { href: '/calculators/coast-fire',        label: 'Coast FIRE Calculator' },
              { href: '/fire-calculator',               label: 'Full FIRE Calculator' },
            ].map(link => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  background: '#ffffff', border: '1px solid #E2E8F0',
                  borderRadius: 10, padding: '10px 18px',
                  fontSize: 13, fontWeight: 700, color: '#059669', textDecoration: 'none',
                }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              '@context': 'https://schema.org',
              '@type': 'WebPage',
              name: 'Purchase Impact Calculator',
              description: 'Calculate the compound value of any purchase at your FIRE date and how many days it delays your financial independence.',
              url: `${SITE_URL}/calculators/purchase-impact`,
            },
            {
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: faqs.map(faq => ({
                '@type': 'Question',
                name: faq.q,
                acceptedAnswer: { '@type': 'Answer', text: faq.a },
              })),
            },
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home',        item: `${SITE_URL}/` },
                { '@type': 'ListItem', position: 2, name: 'Calculators', item: `${SITE_URL}/calculators` },
                { '@type': 'ListItem', position: 3, name: 'Purchase Impact', item: `${SITE_URL}/calculators/purchase-impact` },
              ],
            },
          ]),
        }}
      />
    </>
  )
}
