import type { Metadata } from 'next'
import Link from 'next/link'
import { Icon, type IconName } from '@/components/ui'
import styles from './CalculatorsHub.module.css'

/**
 * The calculators hub: a signpost, not an article. Calculators are grouped
 * by the question a visitor arrives with, one line each. The calculator
 * pages themselves carry the explanations and rank on their own.
 */
const GROUPS: { title: string; icon: IconName; items: { href: string; name: string; line: string }[] }[] = [
  {
    title: 'When can I retire?',
    icon: 'calendar',
    items: [
      { href: '/fire-calculator', name: 'FIRE Calculator', line: 'Your freedom date and next move.' },
      { href: '/calculators/4-percent-rule', name: 'FIRE Number', line: 'How much you need invested.' },
      { href: '/calculators/coast-fire', name: 'Coast FIRE', line: 'When you can stop saving.' },
      { href: '/calculators/expat-fire', name: 'Expat FIRE', line: 'Where your money goes furthest.' },
    ],
  },
  {
    title: 'Am I on track?',
    icon: 'target',
    items: [
      { href: '/calculators/savings-rate', name: 'Savings Rate', line: 'What your savings rate buys you.' },
      { href: '/calculators/net-worth-by-age', name: 'Net Worth by Age', line: 'How you compare with your age.' },
    ],
  },
  {
    title: 'How will my money grow?',
    icon: 'money',
    items: [
      { href: '/calculators/compound-interest', name: 'Compound Interest', line: 'Growth from monthly investing.' },
      { href: '/calculators/apy', name: 'APY', line: 'Your real yearly yield.' },
      { href: '/calculators/purchase-impact', name: 'Purchase Impact', line: 'What a purchase costs your date.' },
    ],
  },
]

const FAQ = [
  {
    q: 'Which calculator should I use first?',
    a: 'The FIRE Calculator. It gives your freedom date in about a minute. The others answer one narrower question each.',
  },
  {
    q: 'How is Coast FIRE different from regular FIRE?',
    a: 'Regular FIRE means you have enough to stop working now. Coast FIRE means what you already have will grow to that amount by retirement, so you only need to cover today’s spending.',
  },
  {
    q: 'Are these calculators accurate for my situation?',
    a: 'They are estimates from standard assumptions: long-run market growth after inflation and the 4% rule. Your taxes, healthcare and returns will differ, so use them to see what moves your date, not as a promise.',
  },
]

const ALL = GROUPS.flatMap((g) => g.items)

export const metadata: Metadata = {
  title: 'Financial Calculators for FIRE Planning | UntilFire',
  description:
    'Free FIRE calculators for retirement planning, savings rate, Coast FIRE, compound interest, and APY. Use each tool on its own or calculate your full FIRE date.',
  keywords:
    'FIRE calculators, financial calculators, FIRE number calculator, coast FIRE calculator, savings rate calculator, compound interest calculator, APY calculator',
  alternates: { canonical: 'https://www.untilfire.com/calculators' },
  openGraph: {
    title: 'Financial Calculators for FIRE Planning | UntilFire',
    description:
      'Explore free calculators for FIRE planning, retirement math, savings rate, compounding, and Coast FIRE.',
    url: 'https://www.untilfire.com/calculators',
    siteName: 'UntilFire',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Financial Calculators for FIRE Planning | UntilFire',
    description:
      'Explore free calculators for FIRE planning, retirement math, savings rate, compounding, and Coast FIRE.',
  },
}

export default function CalculatorsHubPage() {
  return (
    <>
      <main className={styles.page}>
        <div className={styles.wrap}>
          <header className={styles.hero}>
            <h1 className={`uf-t-display ${styles.title}`} style={{ margin: 0 }}>FIRE calculators</h1>
            <p className="uf-t-lead" style={{ margin: 0, color: 'var(--uf-ink-2)' }}>Free. No sign-up. Pick your question.</p>
          </header>

          {GROUPS.map((group) => (
            <section key={group.title} className={styles.group} aria-labelledby={`g-${group.icon}`}>
              <h2 id={`g-${group.icon}`} className={`uf-t-h2 ${styles.groupTitle}`}>
                <span className={styles.groupIcon}><Icon name={group.icon} size={20} /></span>
                {group.title}
              </h2>
              <div className={styles.grid}>
                {group.items.map((c) => (
                  <Link key={c.href} href={c.href} className={styles.card}>
                    <span className="uf-t-h3">{c.name}</span>
                    <span className="uf-t-small" style={{ color: 'var(--uf-ink-2)' }}>{c.line}</span>
                    <span className={styles.arrow} aria-hidden>→</span>
                  </Link>
                ))}
              </div>
            </section>
          ))}

          <p className={`uf-t-body ${styles.cities}`}>
            Planning around a place? <Link href="/fire-number">FIRE number by city →</Link>
          </p>

          <section className={styles.faq} aria-labelledby="faq">
            <h2 id="faq" className="uf-t-h2" style={{ margin: '0 0 var(--uf-s3)' }}>Questions</h2>
            {FAQ.map((f) => (
              <details key={f.q} className={styles.qa}>
                <summary className="uf-t-h3">{f.q}</summary>
                <p className="uf-t-body" style={{ margin: 'var(--uf-s2) 0 0', color: 'var(--uf-ink-2)' }}>{f.a}</p>
              </details>
            ))}
          </section>
        </div>
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'UntilFire Calculators',
            description:
              'A hub of free FIRE planning calculators including FIRE number, Coast FIRE, savings rate, compound interest, and APY.',
            url: 'https://www.untilfire.com/calculators',
            hasPart: ALL.map((c, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              url: `https://www.untilfire.com${c.href}`,
              name: `${c.name}${c.name.endsWith('Calculator') ? '' : ' Calculator'}`,
            })),
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQ.map((f) => ({
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
