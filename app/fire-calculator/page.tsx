import type { Metadata } from 'next'
import Link from 'next/link'
import { SITE_URL, siteUrl } from '@/lib/site'

const pageUrl = siteUrl('/fire-calculator')

export const metadata: Metadata = {
  title: 'FIRE Calculator - Find When Work Becomes Optional | UntilFire',
  description:
    'Free FIRE calculator for financial independence and early retirement. Estimate your FIRE number, savings rate, Coast FIRE milestone, and monthly moves to retire earlier.',
  keywords:
    'FIRE calculator, financial independence calculator, retire early calculator, FIRE number calculator, how much money do I need to retire, Coast FIRE calculator, savings rate calculator',
  alternates: { canonical: siteUrl('/fire-calculator') },
  openGraph: {
    title: 'FIRE Calculator - Find When Work Becomes Optional | UntilFire',
    description:
      'Estimate your FIRE number, retirement timeline, savings rate, Coast FIRE milestone, and the monthly moves that can make work optional sooner.',
    url: pageUrl,
    siteName: 'UntilFire',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FIRE Calculator | UntilFire',
    description: 'Find your freedom date, your FIRE number, and the monthly moves that bring work-optional life closer.',
  },
}

const calculators = [
  {
    href: '/',
    title: 'Full FIRE date calculator',
    label: 'Best starting point',
    description:
      'Use UntilFire’s main flow to estimate the date work can become optional from income, spending, savings, investments, city, and assumptions.',
  },
  {
    href: '/calculators/4-percent-rule',
    title: 'FIRE number calculator',
    label: 'Retirement target',
    description:
      'Estimate how much you need invested using the 4% rule, 25x expenses, and adjustable withdrawal-rate assumptions.',
  },
  {
    href: '/calculators/coast-fire',
    title: 'Coast FIRE calculator',
    label: 'Compounding milestone',
    description:
      'Find the amount you need saved today for compound growth to carry you toward retirement later, even without new contributions.',
  },
  {
    href: '/calculators/savings-rate',
    title: 'Savings rate calculator',
    label: 'Monthly lever',
    description:
      'Calculate the percentage of income you keep and see why savings rate is often the biggest driver of a FIRE timeline.',
  },
] as const

const steps = [
  {
    title: 'Estimate your FIRE number',
    body: 'A FIRE calculator usually starts with annual spending. Multiply expected retirement spending by 25 for a 4% withdrawal-rate estimate, then adjust for risk tolerance, taxes, healthcare, and location.',
  },
  {
    title: 'Compare your current trajectory',
    body: 'Your retirement date depends on current investments, monthly contributions, savings rate, expected returns, and inflation. Small monthly changes can move the date by years.',
  },
  {
    title: 'Turn the gap into monthly moves',
    body: 'The useful output is not just a giant number. It is the next move: increase savings, lower recurring costs, invest consistently, or choose a timeline where work becomes optional instead of urgent.',
  },
] as const

const faqs = [
  {
    question: 'What is a FIRE calculator?',
    answer:
      'A FIRE calculator estimates when you can reach financial independence and potentially retire early. It usually combines your spending, income, savings rate, investments, expected return, and withdrawal-rate assumptions to estimate your FIRE number and timeline.',
  },
  {
    question: 'How do I calculate my FIRE number?',
    answer:
      'A common shortcut is annual retirement spending multiplied by 25, based on the 4% rule. For example, $60,000 of yearly spending implies a FIRE number near $1.5 million. A more complete calculator should also consider taxes, healthcare, location, inflation, and withdrawal-rate flexibility.',
  },
  {
    question: 'What is the difference between FIRE number and FIRE date?',
    answer:
      'Your FIRE number is the invested amount you are aiming for. Your FIRE date is when your current savings, investment growth, and monthly contributions are projected to reach that number.',
  },
  {
    question: 'Is the 4% rule safe for early retirement?',
    answer:
      'The 4% rule is a helpful starting point, not a guarantee. Early retirees often model lower withdrawal rates such as 3% to 3.5%, flexible spending, taxes, healthcare, market sequence risk, and part-time income before making a decision.',
  },
  {
    question: 'What is Coast FIRE?',
    answer:
      'Coast FIRE is the point where your current investments may grow enough over time to fund traditional retirement later, even if you stop adding new retirement contributions. It can make work feel more optional before full FIRE.',
  },
] as const

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
}

const softwareSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'UntilFire FIRE Calculator',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Any',
  url: pageUrl,
  description:
    'A free FIRE calculator for estimating financial independence, early retirement, FIRE number, savings rate, Coast FIRE milestones, and monthly progress moves.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
}

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: 'FIRE Calculator', item: pageUrl },
  ],
}

export default function FireCalculatorLandingPage() {
  return (
    <>
      <main style={{ background: '#F7F9FB', minHeight: '100vh', color: '#19181E', fontFamily: "'Manrope', sans-serif" }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '56px 24px 88px' }}>
          <nav style={{ fontSize: 13, color: '#94A3B8', marginBottom: 28, display: 'flex', gap: 8 }}>
            <Link href="/" style={{ color: '#64748B', textDecoration: 'none', fontWeight: 700 }}>UntilFire</Link>
            <span>›</span>
            <span style={{ color: '#064E3B', fontWeight: 800 }}>FIRE Calculator</span>
          </nav>

          <header style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(280px, 0.65fr)', gap: 28, alignItems: 'stretch', marginBottom: 34 }}>
            <section style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 24, padding: '34px 30px' }}>
              <p style={{ margin: '0 0 12px', color: '#059669', fontSize: 12, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase' }}>
                FIRE calculator
              </p>
              <h1 style={{ margin: '0 0 18px', fontSize: 'clamp(36px, 5vw, 64px)', lineHeight: 0.98, letterSpacing: '-0.055em', color: '#064E3B' }}>
                Find the date work becomes optional.
              </h1>
              <p style={{ margin: '0 0 24px', maxWidth: 720, color: '#475569', fontSize: 18, lineHeight: 1.75 }}>
                UntilFire is a free financial independence calculator for people who want more than a retirement number. Estimate your FIRE number, your retire early timeline, your Coast FIRE milestone, and the monthly moves that can pull freedom closer.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                <Link href="/?source=fire-calculator" style={{ textDecoration: 'none', background: 'linear-gradient(135deg, #059669, #064E3B)', color: '#ffffff', padding: '14px 20px', borderRadius: 12, fontWeight: 800, fontSize: 15 }}>
                  Calculate my FIRE date
                </Link>
                <Link href="/calculators/4-percent-rule" style={{ textDecoration: 'none', background: '#F0FDF4', color: '#065F46', padding: '14px 20px', borderRadius: 12, fontWeight: 800, fontSize: 15, border: '1px solid #BBF7D0' }}>
                  Find my FIRE number
                </Link>
              </div>
            </section>

            <aside style={{ background: 'linear-gradient(160deg, #064E3B, #047857)', borderRadius: 24, padding: 26, color: '#ffffff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 320 }}>
              <div>
                <p style={{ margin: '0 0 10px', opacity: 0.75, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.3px' }}>
                  What you’ll get
                </p>
                <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 12, fontSize: 15, lineHeight: 1.6 }}>
                  <li>Your FIRE number based on spending</li>
                  <li>Your projected financial independence date</li>
                  <li>Your savings rate and monthly gap</li>
                  <li>Coast FIRE and next-move context</li>
                </ul>
              </div>
              <p style={{ margin: '26px 0 0', color: 'rgba(255,255,255,0.76)', fontSize: 14, lineHeight: 1.7 }}>
                Free, no login required to start. Use the full calculator for the emotional “freedom date,” or the focused tools below for specific FIRE math.
              </p>
            </aside>
          </header>

          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 16, marginBottom: 34 }}>
            {calculators.map((calculator) => (
              <Link key={calculator.href} href={calculator.href} style={{ textDecoration: 'none', background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 18, padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ color: '#059669', fontSize: 11, fontWeight: 800, letterSpacing: '1.4px', textTransform: 'uppercase' }}>{calculator.label}</div>
                <h2 style={{ margin: 0, color: '#19181E', fontSize: 21, lineHeight: 1.2, letterSpacing: '-0.025em' }}>{calculator.title}</h2>
                <p style={{ margin: 0, color: '#64748B', fontSize: 14, lineHeight: 1.7 }}>{calculator.description}</p>
                <div style={{ marginTop: 'auto', color: '#059669', fontSize: 13, fontWeight: 800 }}>Open tool →</div>
              </Link>
            ))}
          </section>

          <section style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 22, padding: '30px 26px', marginBottom: 24 }}>
            <h2 style={{ margin: '0 0 12px', fontSize: 30, lineHeight: 1.15, letterSpacing: '-0.035em', color: '#064E3B' }}>
              How a FIRE calculator works
            </h2>
            <p style={{ margin: '0 0 22px', color: '#64748B', fontSize: 16, lineHeight: 1.8, maxWidth: 820 }}>
              A good retire early calculator connects the classic financial independence formulas with real monthly behavior. The point is not only “how much money do I need to retire?” It is also “what can I change this month?”
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              {steps.map((step, index) => (
                <article key={step.title} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 16, padding: 20 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 12, background: '#D1FAE5', color: '#065F46', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, marginBottom: 12 }}>{index + 1}</div>
                  <h3 style={{ margin: '0 0 8px', fontSize: 19, color: '#19181E', letterSpacing: '-0.02em' }}>{step.title}</h3>
                  <p style={{ margin: 0, color: '#64748B', fontSize: 14, lineHeight: 1.75 }}>{step.body}</p>
                </article>
              ))}
            </div>
          </section>

          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, marginBottom: 24 }}>
            <article style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 18, padding: 24 }}>
              <h2 style={{ margin: '0 0 10px', fontSize: 24, color: '#19181E' }}>Use this if you searched “FIRE number calculator”</h2>
              <p style={{ margin: '0 0 14px', color: '#64748B', lineHeight: 1.75 }}>
                Start with the 4% rule calculator if you want the simplest target: annual spending multiplied by 25. Then come back to the full FIRE calculator to estimate your actual date.
              </p>
              <Link href="/calculators/4-percent-rule" style={{ color: '#059669', textDecoration: 'none', fontWeight: 800 }}>Calculate FIRE number →</Link>
            </article>
            <article style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 18, padding: 24 }}>
              <h2 style={{ margin: '0 0 10px', fontSize: 24, color: '#19181E' }}>Use this if you searched “Coast FIRE calculator”</h2>
              <p style={{ margin: '0 0 14px', color: '#64748B', lineHeight: 1.75 }}>
                Coast FIRE shows whether your current portfolio can compound into enough later. It is useful when you want work to feel less urgent before you reach full financial independence.
              </p>
              <Link href="/calculators/coast-fire" style={{ color: '#059669', textDecoration: 'none', fontWeight: 800 }}>Find Coast FIRE number →</Link>
            </article>
          </section>

          <section style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 22, padding: '30px 26px' }}>
            <h2 style={{ margin: '0 0 18px', fontSize: 30, color: '#064E3B', letterSpacing: '-0.03em' }}>FIRE calculator FAQ</h2>
            <div style={{ display: 'grid', gap: 16 }}>
              {faqs.map((faq) => (
                <article key={faq.question} style={{ borderTop: '1px solid #E2E8F0', paddingTop: 16 }}>
                  <h3 style={{ margin: '0 0 8px', color: '#19181E', fontSize: 19 }}>{faq.question}</h3>
                  <p style={{ margin: 0, color: '#64748B', fontSize: 15, lineHeight: 1.75 }}>{faq.answer}</p>
                </article>
              ))}
            </div>
          </section>

          <section style={{ marginTop: 24, background: '#ECFDF5', border: '1px solid #BBF7D0', borderRadius: 20, padding: '26px 24px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 18 }}>
            <div>
              <h2 style={{ margin: '0 0 6px', color: '#064E3B', fontSize: 24 }}>Ready to find your freedom date?</h2>
              <p style={{ margin: 0, color: '#047857', fontSize: 15 }}>Free, no login. Start with the full calculator, then use the focused tools when you want to pressure-test assumptions. New to the concept? Read <Link href="/learn/what-is-fire-financial-independence-retire-early" style={{ color: '#064E3B', fontWeight: 800, textDecoration: 'none' }}>what FIRE means</Link> first.</p>
            </div>
            <Link href="/?source=fire-calculator-bottom" style={{ textDecoration: 'none', background: '#064E3B', color: '#ffffff', padding: '13px 18px', borderRadius: 12, fontWeight: 800 }}>
              Start free
            </Link>
          </section>
        </div>
      </main>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
    </>
  )
}
