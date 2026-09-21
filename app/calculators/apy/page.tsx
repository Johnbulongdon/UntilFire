import { Metadata } from 'next'
import Link from 'next/link'
import APYCalculator from './APYCalculator'

// Deliberately not indexed. APR/APY conversion is a generic banking tool, not a financial-independence page: it
// ranks 50th to 94th for head terms owned by sites with a thousand referring
// domains, and in three months produced hundreds of impressions and no clicks.
// Left indexed it spends crawl budget and blurs what this site is about, which
// is the one ranking signal a four-month-old domain fully controls. The page
// stays for people who are already here and follow a link to it.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
  title: 'APY Calculator — Convert APR to Annual Percentage Yield | UntilFire',
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
    q: 'How do I convert APY back to APR?',
    a: 'Rearrange the same formula: APR = n \u00d7 ((1 + APY)^(1/n) - 1), where n is the compounding periods per year. A 5.116% APY compounded monthly comes back to 5.00% APR. This matters when a lender quotes APY and you want to compare it against an APR elsewhere.',
  },
  {
    q: 'Which should I compare accounts on, APR or APY?',
    a: 'APY, always, for anything you earn interest on. It is the only figure that accounts for compounding, so it is the only one that makes two accounts comparable. US banks are required to advertise savings accounts in APY for exactly this reason. For borrowing the convention flips: loans are quoted in APR.',
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

      <section style={{ background: 'var(--uf-surface)', padding: '0 24px 72px', fontFamily: "'Manrope', sans-serif" }}>
        {/* minmax(0, 1fr) rather than the default auto: an auto grid track
            sizes to its widest item, so the table's min-content width leaked
            out through the track and stretched every card with it. */}
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 18 }}>
          <article style={{ background: 'var(--uf-card)', border: '1px solid var(--uf-border)', borderRadius: 18, padding: '26px 24px' }}>
            <h2 className="uf-t-h2" style={{ margin: '0 0 12px', color: 'var(--uf-green-900)' }}>
              APY Calculator: Convert APR to Annual Percentage Yield
            </h2>
            <p style={{ margin: '0 0 12px', color: 'var(--uf-ink-2)', fontSize: 16, lineHeight: 1.75 }}>
              APY is your true annual return once compounding is included — always equal to or higher than the stated APR.
              Enter your APR and compounding frequency above to see what your savings actually earn, and compare accounts
              on an apples-to-apples basis.
            </p>
            <p style={{ margin: 0, color: 'var(--uf-ink-2)', fontSize: 16, lineHeight: 1.75 }}>
              For long-term growth, see how a rate compounds over decades with the{' '}
              <Link href="/calculators/compound-interest" style={{ color: 'var(--uf-green)', fontWeight: 800, textDecoration: 'none' }}>compound interest calculator</Link>, or
              turn your returns into a retirement date with the <Link href="/fire-calculator" style={{ color: 'var(--uf-green)', fontWeight: 800, textDecoration: 'none' }}>FIRE calculator</Link>.
            </p>
          </article>
          <article style={{ background: 'var(--uf-card)', border: '1px solid var(--uf-border)', borderRadius: 18, padding: '26px 24px' }}>
            <h2 className="uf-t-h2" style={{ margin: '0 0 12px', color: 'var(--uf-green-900)' }}>APR to APY conversion table</h2>
            <p className="uf-t-body" style={{ margin: '0 0 var(--uf-s3)', color: 'var(--uf-ink-2)', lineHeight: 1.75 }}>
              The same stated rate is worth more the more often it compounds. The gap is small at
              ordinary savings rates — a few hundredths of a percent between monthly and daily —
              but it is the reason two accounts advertising the same APR are not the same account.
            </p>
            {/* minWidth 0 is load-bearing. This article is a CSS grid item, and
                a grid item's default min-width is auto — so without it the
                wrapper widens to fit the table instead of scrolling it, and
                every sibling card stretches to match. At 390px that pushed the
                whole page to 434 and the layout viewport with it. */}
            <div style={{ overflowX: 'auto', minWidth: 0, marginBottom: 'var(--uf-s4)' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 340 }}>
                <thead>
                  <tr>
                    {['APR', 'Compounded annually', 'Compounded monthly', 'Compounded daily'].map((head, i) => (
                      <th key={head} className="uf-t-label" style={{ textAlign: i === 0 ? 'left' : 'right', padding: 'var(--uf-s2)', borderBottom: '1px solid var(--uf-border)', color: 'var(--uf-ink-2)' }}>{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { apr: '3.00%', annual: '3.000%', monthly: '3.042%', daily: '3.045%' },
                    { apr: '4.00%', annual: '4.000%', monthly: '4.074%', daily: '4.081%' },
                    { apr: '4.50%', annual: '4.500%', monthly: '4.594%', daily: '4.602%' },
                    { apr: '5.00%', annual: '5.000%', monthly: '5.116%', daily: '5.127%' },
                    { apr: '5.50%', annual: '5.500%', monthly: '5.641%', daily: '5.654%' },
                    { apr: '6.00%', annual: '6.000%', monthly: '6.168%', daily: '6.183%' },
                  ].map((row) => (
                    <tr key={row.apr}>
                      <td className="uf-t-data" style={{ padding: 'var(--uf-s2)', borderBottom: '1px solid var(--uf-border)', fontWeight: 700 }}>{row.apr}</td>
                      <td className="uf-t-data" style={{ padding: 'var(--uf-s2)', borderBottom: '1px solid var(--uf-border)', textAlign: 'right', color: 'var(--uf-ink-2)' }}>{row.annual}</td>
                      <td className="uf-t-data" style={{ padding: 'var(--uf-s2)', borderBottom: '1px solid var(--uf-border)', textAlign: 'right' }}>{row.monthly}</td>
                      <td className="uf-t-data" style={{ padding: 'var(--uf-s2)', borderBottom: '1px solid var(--uf-border)', textAlign: 'right' }}>{row.daily}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="uf-t-small" style={{ margin: 0, color: 'var(--uf-ink-3)', lineHeight: 1.7 }}>
              Going the other way — APY back to APR — is the same formula rearranged:
              APR = n × ((1 + APY)<sup>1/n</sup> − 1). The calculator above does both.
            </p>
          </article>
          <article style={{ background: 'var(--uf-card)', border: '1px solid var(--uf-border)', borderRadius: 18, padding: '26px 24px' }}>
            <h2 className="uf-t-h2" style={{ margin: '0 0 12px', color: 'var(--uf-green-900)' }}>APY FAQ</h2>
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
