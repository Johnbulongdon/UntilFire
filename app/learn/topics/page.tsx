import Link from 'next/link'
import { learnArticles } from '@/lib/learn'

const TOPIC_GROUPS = [
  {
    title: 'FIRE Basics',
    description: 'Understand the core math behind financial independence, early retirement, and why savings rate matters.',
    articleTitles: [
      'What Is FIRE? Financial Independence, Retire Early Explained',
      'What the 4% Rule Actually Means',
      'Why Savings Rate Matters More Than Income',
      'Compound Interest and FIRE: Why Starting Early Changes Everything',
    ],
    calculatorLinks: [
      { href: '/calculators/4-percent-rule', label: 'FIRE Number Calculator' },
      { href: '/calculators/savings-rate', label: 'Savings Rate Calculator' },
    ],
  },
  {
    title: 'Planning',
    description: 'Compare retirement styles, estimate your number, and test how assumptions change your timeline.',
    articleTitles: [
      'How Much Money Do You Need to Retire?',
      'Coast FIRE vs Full FIRE: Which Path Fits You?',
      'Lean FIRE vs Fat FIRE: Choosing Your Retirement Lifestyle',
      'Barista FIRE: Semi-Retirement and the Middle Path',
      'How FIRE Assumptions Change Your Retirement Date',
    ],
    calculatorLinks: [
      { href: '/calculators/coast-fire', label: 'Coast FIRE Calculator' },
      { href: '/calculators/compound-interest', label: 'Compound Interest Calculator' },
    ],
  },
  {
    title: 'Tax, Accounts, and Risk',
    description: 'Plan around account structure, withdrawal strategy, and the risks that can derail early retirement.',
    articleTitles: [
      'Roth IRA vs 401(k) for Early Retirement: Which Account Wins?',
      'Sequence of Returns Risk: The Retirement Threat Most People Miss',
    ],
    calculatorLinks: [
      { href: '/calculators/apy', label: 'APY Calculator' },
      { href: '/calculators/4-percent-rule', label: 'Safe Withdrawal Calculator' },
    ],
  },
] as const

const topicGroups = TOPIC_GROUPS.map((group) => ({
  ...group,
  articles: group.articleTitles
    .map((title) => learnArticles.find((article) => article.title === title))
    .filter((article): article is NonNullable<typeof article> => Boolean(article)),
}))

export const metadata = {
  title: 'FIRE Topics: Savings Rate, 4% Rule, Coast FIRE, Roth IRA & More | UntilFire',
  description:
    'Browse FIRE topics by concept: savings rate, the 4% rule, Coast FIRE, Barista FIRE, retirement tax strategy, and sequence of returns risk.',
  alternates: {
    canonical: 'https://untilfire.com/learn/topics',
  },
}

export default function TopicsPage() {
  return (
    <main style={{ background: '#F7F9FB', minHeight: '100vh', fontFamily: "'Manrope', sans-serif" }}>
      <nav style={{ borderBottom: '1px solid #E2E8F0', padding: '16px 24px', background: '#ffffff', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <Link href="/" style={{ textDecoration: 'none', fontWeight: 800, fontSize: 18, letterSpacing: '-0.04em', color: '#064E3B' }}>
          Until<span style={{ color: '#20D4BF' }}>Fire</span>
        </Link>
        <Link href="/learn" style={{ color: '#64748B', textDecoration: 'none', fontSize: 14 }}>Learning Hub</Link>
        <Link href="/learn/articles" style={{ color: '#64748B', textDecoration: 'none', fontSize: 14 }}>Articles</Link>
        <Link href="/calculators" style={{ color: '#64748B', textDecoration: 'none', fontSize: 14 }}>Calculators</Link>
      </nav>

      <div style={{ maxWidth: 980, margin: '0 auto', padding: '64px 24px' }}>
        <p style={{ fontSize: 12, color: '#059669', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>Learn</p>
        <h1 style={{ fontSize: 'clamp(36px, 5vw, 52px)', fontWeight: 800, color: '#19181E', letterSpacing: '-0.03em', margin: '0 0 16px' }}>FIRE topics by concept</h1>
        <p style={{ fontSize: 16, color: '#64748B', lineHeight: 1.7, marginBottom: 40 }}>
          Browse the core ideas behind financial independence: savings rate, the 4% rule, Coast FIRE, retirement tax strategy, and sequence of returns risk. Each topic clusters the best supporting guides and calculators.
        </p>

        <div style={{ display: 'grid', gap: 20 }}>
          {topicGroups.map((group) => (
            <section key={group.title} style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 18, padding: '28px 24px' }}>
              <div style={{ marginBottom: 18 }}>
                <h2 style={{ fontSize: 26, fontWeight: 800, color: '#19181E', letterSpacing: '-0.02em', margin: '0 0 8px' }}>{group.title}</h2>
                <p style={{ fontSize: 15, lineHeight: 1.7, color: '#64748B', margin: 0 }}>{group.description}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
                <div>
                  <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#059669' }}>
                    Articles
                  </p>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {group.articles.map((article) => (
                      <Link
                        key={article.slug}
                        href={`/learn/${article.slug}`}
                        style={{ textDecoration: 'none', color: '#19181E', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 16px' }}
                      >
                        <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.4, marginBottom: 4 }}>{article.title}</div>
                        <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>{article.description}</div>
                      </Link>
                    ))}
                  </div>
                </div>

                <div>
                  <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#059669' }}>
                    Related calculators
                  </p>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {group.calculatorLinks.map((calculator) => (
                      <Link
                        key={calculator.href}
                        href={calculator.href}
                        style={{ textDecoration: 'none', color: '#19181E', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 16px', fontWeight: 700 }}
                      >
                        {calculator.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}
