import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { decodeHoldings, normalizeHoldings } from '@/lib/portfolio/parse'
import { analyzePortfolio } from '@/lib/portfolio/rules'
import { buildDonutSegments, GRADE_COLORS } from '@/lib/portfolio/chart'
import { getFund } from '@/lib/funds/metadata'

export const runtime = 'edge'

const BG = '#08080e'
const CARD = '#111118'
const BORDER = '#23232d'
const MUTED = '#8a8a99'
const TEAL = '#22d3a5'

const NOTE_COLORS: Record<string, string> = {
  good: TEAL,
  warn: '#fbbf24',
  bad: '#f97316',
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const holdings = normalizeHoldings(decodeHoldings(searchParams.get('h')).slice(0, 10))

  if (holdings.length === 0) {
    return new ImageResponse(<EmptyCard />, { width: 1080, height: 1920 })
  }

  const verdict = analyzePortfolio(holdings)
  const gradeColor = GRADE_COLORS[verdict.grade]
  const R = 170
  const C = 2 * Math.PI * R
  const segments = buildDonutSegments(holdings, C)
  const notes = verdict.notes.slice(0, 4)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: BG,
          display: 'flex',
          flexDirection: 'column',
          padding: '72px 64px',
          fontFamily: 'sans-serif',
          color: '#ffffff',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: 34, fontWeight: 800, color: '#ffffff', letterSpacing: '-1px' }}>Until</span>
            <span style={{ fontSize: 34, fontWeight: 800, color: TEAL, letterSpacing: '-1px' }}>Fire</span>
          </div>
          <span style={{ fontSize: 24, color: MUTED, textTransform: 'uppercase', letterSpacing: '3px' }}>
            Portfolio Check
          </span>
        </div>

        {/* Grade hero */}
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 56 }}>
          <div
            style={{
              width: 200,
              height: 200,
              borderRadius: 36,
              border: `6px solid ${gradeColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.02)',
            }}
          >
            <span style={{ fontSize: 130, fontWeight: 800, color: gradeColor, lineHeight: 1 }}>{verdict.grade}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 40, flex: 1 }}>
            <span style={{ fontSize: 26, color: MUTED, textTransform: 'uppercase', letterSpacing: '2px' }}>
              Is this portfolio OK?
            </span>
            <span style={{ fontSize: 50, fontWeight: 800, color: '#ffffff', lineHeight: 1.1, marginTop: 8 }}>
              {verdict.headline}
            </span>
          </div>
        </div>

        {/* Donut + legend */}
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 64 }}>
          <svg width={440} height={440} viewBox="0 0 440 440" style={{ display: 'block' }}>
            {segments.map((s, i) => (
              <circle
                key={i}
                cx={220}
                cy={220}
                r={R}
                fill="none"
                stroke={s.color}
                strokeWidth={62}
                strokeDasharray={s.dashArray}
                strokeDashoffset={s.dashOffset}
                transform="rotate(-90 220 220)"
              />
            ))}
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 48, flex: 1 }}>
            {segments.map((s, i) => {
              const fund = getFund(s.ticker)
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: s.color, display: 'flex' }} />
                  <span style={{ fontSize: 30, fontWeight: 700, color: '#ffffff', marginLeft: 16, width: 130 }}>
                    {s.ticker}
                  </span>
                  <span style={{ fontSize: 30, fontWeight: 700, color: TEAL, width: 90 }}>
                    {Math.round(s.weight)}%
                  </span>
                  <span style={{ fontSize: 22, color: MUTED, flex: 1 }}>{fund ? fund.name : 'Unrecognized'}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Metrics row */}
        <div style={{ display: 'flex', marginTop: 56, gap: 20 }}>
          <Metric label="Stocks / Bonds" value={`${Math.round(verdict.breakdown.equityPct)} / ${Math.round(verdict.breakdown.bondPct + verdict.breakdown.cashPct)}`} />
          <Metric label="International" value={`${Math.round(verdict.breakdown.intlShareOfEquity)}%`} />
          <Metric label="Expense Ratio" value={`${verdict.breakdown.weightedExpenseRatio.toFixed(2)}%`} />
        </div>

        {/* Notes */}
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 48, flex: 1 }}>
          {notes.map((n, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 22 }}>
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: NOTE_COLORS[n.kind] ?? MUTED,
                  marginTop: 12,
                  display: 'flex',
                }}
              />
              <span style={{ fontSize: 30, color: '#d6d6e0', marginLeft: 20, flex: 1, lineHeight: 1.35 }}>{n.text}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 30, color: '#ffffff', fontWeight: 700 }}>Rate your portfolio free</span>
            <span style={{ fontSize: 30, color: TEAL, fontWeight: 700 }}>untilfire.com →</span>
          </div>
          <span style={{ fontSize: 20, color: MUTED, marginTop: 16 }}>
            Educational only — not financial advice.
          </span>
        </div>
      </div>
    ),
    { width: 1080, height: 1920 },
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        background: CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: 20,
        padding: '28px 30px',
      }}
    >
      <span style={{ fontSize: 22, color: MUTED, textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</span>
      <span style={{ fontSize: 48, fontWeight: 800, color: '#ffffff', marginTop: 10 }}>{value}</span>
    </div>
  )
}

function EmptyCard() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: BG,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: 60, fontWeight: 800, color: '#ffffff' }}>Until</span>
        <span style={{ fontSize: 60, fontWeight: 800, color: TEAL }}>Fire</span>
      </div>
      <span style={{ fontSize: 32, color: MUTED, marginTop: 24 }}>Rate your portfolio at untilfire.com</span>
    </div>
  )
}
