import { Metadata } from 'next'
import Link from 'next/link'
import { decodeHoldings, normalizeHoldings, encodeHoldings } from '@/lib/portfolio/parse'
import { analyzePortfolio } from '@/lib/portfolio/rules'
import { buildDonutSegments, GRADE_COLORS } from '@/lib/portfolio/chart'
import { getFund } from '@/lib/funds/metadata'
import ShareButtons from './ShareButtons'

interface Props {
  searchParams: Promise<{ h?: string }>
}

const BG = '#08080e'
const CARD = '#111118'
const BORDER = '#23232d'
const MUTED = '#8a8a99'
const TEAL = '#22d3a5'

const NOTE_COLORS: Record<string, string> = { good: TEAL, warn: '#fbbf24', bad: '#f97316' }

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { h = '' } = await searchParams
  const holdings = decodeHoldings(h)
  if (holdings.length === 0) {
    return { title: 'Portfolio Check | UntilFire' }
  }
  const verdict = analyzePortfolio(holdings)
  const ogUrl = `/api/portfolio/og?h=${encodeURIComponent(h)}`
  const title = `Portfolio grade ${verdict.grade}: ${verdict.headline} | UntilFire`
  const description = `${verdict.headline}. Rate your own portfolio free — diversification, fees, and home bias in seconds.`
  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: ogUrl, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, description, images: [ogUrl] },
  }
}

export default async function ResultPage({ searchParams }: Props) {
  const { h = '' } = await searchParams
  const holdings = normalizeHoldings(decodeHoldings(h).slice(0, 10))

  if (holdings.length === 0) {
    return (
      <main style={pageStyle}>
        <div style={{ maxWidth: 680, width: '100%', textAlign: 'center' }}>
          <h1 style={{ fontSize: 32, fontWeight: 800 }}>No portfolio to show</h1>
          <p style={{ color: MUTED, marginTop: 12 }}>Start by entering your holdings.</p>
          <Link href="/portfolio" style={{ color: TEAL, fontWeight: 700 }}>
            Rate my portfolio →
          </Link>
        </div>
      </main>
    )
  }

  const verdict = analyzePortfolio(holdings)
  const gradeColor = GRADE_COLORS[verdict.grade]
  const R = 80
  const C = 2 * Math.PI * R
  const segments = buildDonutSegments(holdings, C)
  const slug = `h=${encodeHoldings(holdings)}`
  const reportImageUrl = `/api/portfolio/report?h=${encodeURIComponent(encodeHoldings(holdings))}`
  const shareText = `My portfolio scored a ${verdict.grade} on UntilFire — ${verdict.headline}.`

  return (
    <main style={pageStyle}>
      <div style={{ maxWidth: 680, width: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <Link href="/portfolio" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>Until</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: TEAL }}>Fire</span>
          </Link>
          <Link href="/portfolio" style={{ color: MUTED, fontSize: 15, textDecoration: 'none' }}>
            ← Edit holdings
          </Link>
        </div>

        {/* Verdict card */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 24, padding: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div
              style={{
                width: 110,
                height: 110,
                borderRadius: 22,
                border: `4px solid ${gradeColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 68, fontWeight: 800, color: gradeColor, lineHeight: 1 }}>{verdict.grade}</span>
            </div>
            <div>
              <p style={{ color: MUTED, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>
                Is this portfolio OK?
              </p>
              <h1 style={{ fontSize: 28, fontWeight: 800, margin: '6px 0 0', lineHeight: 1.15 }}>{verdict.headline}</h1>
            </div>
          </div>

          {/* Donut + legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginTop: 32, flexWrap: 'wrap' }}>
            <svg width={200} height={200} viewBox="0 0 200 200">
              {segments.map((s, i) => (
                <circle
                  key={i}
                  cx={100}
                  cy={100}
                  r={R}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={30}
                  strokeDasharray={s.dashArray}
                  strokeDashoffset={s.dashOffset}
                  transform="rotate(-90 100 100)"
                />
              ))}
            </svg>
            <div style={{ flex: 1, minWidth: 220 }}>
              {segments.map((s, i) => {
                const fund = getFund(s.ticker)
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '5px 0' }}>
                    <div style={{ width: 14, height: 14, borderRadius: 4, background: s.color, flexShrink: 0 }} />
                    <span style={{ fontWeight: 700, marginLeft: 12, width: 76 }}>{s.ticker}</span>
                    <span style={{ color: TEAL, fontWeight: 700, width: 52 }}>{Math.round(s.weight)}%</span>
                    <span style={{ color: MUTED, fontSize: 13, flex: 1 }}>{fund ? fund.name : 'Unrecognized'}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Metrics */}
          <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
            <MiniMetric label="Stocks / Bonds" value={`${Math.round(verdict.breakdown.equityPct)} / ${Math.round(verdict.breakdown.bondPct + verdict.breakdown.cashPct)}`} />
            <MiniMetric label="International" value={`${Math.round(verdict.breakdown.intlShareOfEquity)}%`} />
            <MiniMetric label="Fees" value={`${verdict.breakdown.weightedExpenseRatio.toFixed(2)}%`} />
          </div>

          {/* Notes */}
          <div style={{ marginTop: 28 }}>
            {verdict.notes.map((n, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: NOTE_COLORS[n.kind] ?? MUTED, marginTop: 7, flexShrink: 0 }} />
                <span style={{ marginLeft: 14, color: '#d6d6e0', fontSize: 16, lineHeight: 1.4 }}>{n.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Share */}
        <div style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Share your report</h2>
          <ShareButtons shareSlug={slug} reportImageUrl={reportImageUrl} shareText={shareText} />
        </div>

        {/* Disclaimer + CTA */}
        <p style={{ color: MUTED, fontSize: 13, marginTop: 28, lineHeight: 1.5 }}>
          Educational only — not financial advice. Analysis is rules-based on the holdings you entered.
        </p>
        <Link
          href="/?source=portfolio-checkup"
          style={{ color: TEAL, fontWeight: 700, fontSize: 16, marginTop: 8, textDecoration: 'none' }}
        >
          See when work could become optional for you →
        </Link>
      </div>
    </main>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, background: BG, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ color: MUTED, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>{value}</div>
    </div>
  )
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: BG,
  color: '#fff',
  display: 'flex',
  justifyContent: 'center',
  padding: '64px 24px',
  fontFamily: "'DM Sans', system-ui, sans-serif",
}
