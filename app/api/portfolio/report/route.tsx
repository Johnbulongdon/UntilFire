import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { decodeHoldings, normalizeHoldings } from '@/lib/portfolio/parse'
import { analyzePortfolio } from '@/lib/portfolio/rules'
import { buildDonutSegments, GRADE_COLORS } from '@/lib/portfolio/chart'
import { getFund } from '@/lib/funds/metadata'
import { decodeSeries } from '@/lib/portfolio/metrics'
import { buildLineChartPaths } from '@/lib/portfolio/linechart'

export const runtime = 'edge'

const BG = '#08080e'
const CARD = '#111118'
const BORDER = '#23232d'
const MUTED = '#8a8a99'
const TEAL = '#22d3a5'

const NOTE_COLORS: Record<string, string> = { good: TEAL, warn: '#fbbf24', bad: '#f97316' }

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const holdings = normalizeHoldings(decodeHoldings(searchParams.get('h')).slice(0, 10))

  if (holdings.length === 0) {
    return new ImageResponse(
      <div style={{ width: '100%', height: '100%', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <span style={{ fontSize: 60, fontWeight: 800, color: '#fff' }}>Until</span>
        <span style={{ fontSize: 60, fontWeight: 800, color: TEAL }}>Fire</span>
      </div>,
      { width: 1080, height: 1920 },
    )
  }

  const verdict = analyzePortfolio(holdings)
  const gradeColor = GRADE_COLORS[verdict.grade]
  const R = 150
  const C = 2 * Math.PI * R
  const segments = buildDonutSegments(holdings, C)
  const notes = verdict.notes.slice(0, 3)

  // Performance series (optional — included when result page pre-fetched them).
  const pfSeries = decodeSeries(searchParams.get('pf'))
  const bmSeries = decodeSeries(searchParams.get('bm'))
  const hasPerf = pfSeries.length > 12 && bmSeries.length > 12

  const ret = searchParams.get('ret')
  const sp = searchParams.get('sp')
  const sharpe = searchParams.get('sharpe')
  const sortino = searchParams.get('sortino')
  const dd = searchParams.get('dd')
  const vol = searchParams.get('vol')
  const beta = searchParams.get('beta')
  const alpha = searchParams.get('alpha')
  const yrs = searchParams.get('yrs') ?? '5'

  const chartW = 952
  const chartH = 260
  const chartPaths = hasPerf ? buildLineChartPaths(pfSeries, bmSeries, chartW, chartH, 0, 16) : null

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', background: BG, display: 'flex', flexDirection: 'column', padding: '72px 64px', fontFamily: 'sans-serif', color: '#ffffff' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex' }}>
            <span style={{ fontSize: 34, fontWeight: 800, color: '#fff', letterSpacing: '-1px' }}>Until</span>
            <span style={{ fontSize: 34, fontWeight: 800, color: TEAL, letterSpacing: '-1px' }}>Fire</span>
          </div>
          <span style={{ fontSize: 24, color: MUTED, textTransform: 'uppercase', letterSpacing: '3px' }}>Portfolio Check</span>
        </div>

        {/* Grade hero */}
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 48 }}>
          <div style={{ width: 180, height: 180, borderRadius: 32, border: `6px solid ${gradeColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.02)' }}>
            <span style={{ fontSize: 120, fontWeight: 800, color: gradeColor, lineHeight: 1 }}>{verdict.grade}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 36, flex: 1 }}>
            <span style={{ fontSize: 22, color: MUTED, textTransform: 'uppercase', letterSpacing: '2px' }}>Is this portfolio OK?</span>
            <span style={{ fontSize: 46, fontWeight: 800, color: '#fff', lineHeight: 1.1, marginTop: 8 }}>{verdict.headline}</span>
          </div>
        </div>

        {/* Donut + legend */}
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 48 }}>
          <svg width={380} height={380} viewBox="0 0 380 380" style={{ display: 'block' }}>
            {segments.map((s, i) => (
              <circle key={i} cx={190} cy={190} r={R} fill="none" stroke={s.color} strokeWidth={54}
                strokeDasharray={s.dashArray} strokeDashoffset={s.dashOffset} transform="rotate(-90 190 190)" />
            ))}
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 40, flex: 1 }}>
            {segments.map((s, i) => {
              const fund = getFund(s.ticker)
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ width: 20, height: 20, borderRadius: 5, background: s.color, display: 'flex' }} />
                  <span style={{ fontSize: 28, fontWeight: 700, color: '#fff', marginLeft: 14, width: 120 }}>{s.ticker}</span>
                  <span style={{ fontSize: 28, fontWeight: 700, color: TEAL, width: 80 }}>{Math.round(s.weight)}%</span>
                  <span style={{ fontSize: 22, color: MUTED, flex: 1 }}>{fund ? fund.name : 'Unrecognized'}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Performance chart — rendered when series data is available */}
        {hasPerf && chartPaths ? (
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 44, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: '28px 32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>Portfolio vs S&P 500 — {yrs}Y</span>
              <div style={{ display: 'flex', gap: 28 }}>
                <span style={{ fontSize: 24, fontWeight: 700, color: TEAL }}>{Number(ret) >= 0 ? '+' : ''}{ret}%</span>
                <span style={{ fontSize: 24, color: '#94a3b8' }}>{Number(sp) >= 0 ? '+' : ''}{sp}%</span>
              </div>
            </div>
            <svg width={chartW} height={chartH} viewBox={`0 0 ${chartW} ${chartH}`} style={{ display: 'block' }}>
              <line x1={0} y1={chartPaths.baselineY} x2={chartW} y2={chartPaths.baselineY} stroke={BORDER} strokeWidth={1} strokeDasharray="4 4" />
              <polyline points={chartPaths.benchmarkPoints} fill="none" stroke="#94a3b8" strokeWidth={2} strokeLinejoin="round" />
              <polyline points={chartPaths.portfolioPoints} fill="none" stroke={TEAL} strokeWidth={3} strokeLinejoin="round" />
            </svg>
            {/* Metrics row */}
            <div style={{ display: 'flex', gap: 16, marginTop: 20 }}>
              {[
                { label: 'Alpha', val: alpha },
                { label: 'Beta', val: beta },
                { label: 'Sharpe', val: sharpe },
                { label: 'Sortino', val: sortino },
                { label: 'Drawdown', val: dd ? `${dd}%` : null },
                { label: 'Volatility', val: vol ? `${vol}%` : null },
              ].filter(m => m.val !== null).map((m, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 18, color: MUTED, textTransform: 'uppercase', letterSpacing: '1px' }}>{m.label}</span>
                  <span style={{ fontSize: 30, fontWeight: 800, color: '#fff', marginTop: 4 }}>{m.val}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Adviser notes when no perf data */
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 40, flex: 1 }}>
            {notes.map((n, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 20 }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: NOTE_COLORS[n.kind] ?? MUTED, marginTop: 10, display: 'flex' }} />
                <span style={{ fontSize: 28, color: '#d6d6e0', marginLeft: 18, flex: 1, lineHeight: 1.35 }}>{n.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 32 }}>
          <span style={{ fontSize: 26, color: '#fff', fontWeight: 700 }}>Rate your portfolio free</span>
          <span style={{ fontSize: 26, color: TEAL, fontWeight: 700 }}>untilfire.com →</span>
        </div>
        <span style={{ fontSize: 18, color: MUTED, marginTop: 12 }}>Educational only — not financial advice.</span>
      </div>
    ),
    { width: 1080, height: 1920 },
  )
}
