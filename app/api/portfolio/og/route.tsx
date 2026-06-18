import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { decodeHoldings, normalizeHoldings } from '@/lib/portfolio/parse'
import { analyzePortfolio } from '@/lib/portfolio/rules'
import { buildDonutSegments, GRADE_COLORS } from '@/lib/portfolio/chart'
import { decodeSeries } from '@/lib/portfolio/metrics'
import { buildLineChartPaths } from '@/lib/portfolio/linechart'

export const runtime = 'edge'

const BG = '#08080e'
const MUTED = '#8a8a99'
const TEAL = '#22d3a5'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const holdings = normalizeHoldings(decodeHoldings(searchParams.get('h')).slice(0, 10))

  if (holdings.length === 0) {
    return new ImageResponse(
      <div style={{ width: '100%', height: '100%', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <span style={{ fontSize: 56, fontWeight: 800, color: '#fff' }}>Until</span>
        <span style={{ fontSize: 56, fontWeight: 800, color: TEAL }}>Fire</span>
      </div>,
      { width: 1200, height: 630 },
    )
  }

  const verdict = analyzePortfolio(holdings)
  const gradeColor = GRADE_COLORS[verdict.grade]
  const R = 100
  const C = 2 * Math.PI * R
  const segments = buildDonutSegments(holdings, C)

  const pfSeries = decodeSeries(searchParams.get('pf'))
  const bmSeries = decodeSeries(searchParams.get('bm'))
  const hasPerf = pfSeries.length > 12 && bmSeries.length > 12

  const ret = searchParams.get('ret')
  const sp = searchParams.get('sp')
  const sharpe = searchParams.get('sharpe')
  const dd = searchParams.get('dd')
  const yrs = searchParams.get('yrs') ?? '5'

  const chartW = 480
  const chartH = 180
  const chartPaths = hasPerf ? buildLineChartPaths(pfSeries, bmSeries, chartW, chartH, 0, 12) : null

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', background: BG, display: 'flex', flexDirection: 'column', padding: '52px 60px', fontFamily: 'sans-serif', color: '#ffffff' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-1px' }}>Until</span>
          <span style={{ fontSize: 26, fontWeight: 800, color: TEAL, letterSpacing: '-1px' }}>Fire</span>
          <span style={{ fontSize: 18, color: MUTED, textTransform: 'uppercase', letterSpacing: '3px', marginLeft: 18 }}>Portfolio Check</span>
        </div>

        <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 40 }}>
          {/* Donut */}
          <svg width={260} height={260} viewBox="0 0 260 260" style={{ display: 'block', flexShrink: 0 }}>
            {segments.map((s, i) => (
              <circle key={i} cx={130} cy={130} r={R} fill="none" stroke={s.color} strokeWidth={38}
                strokeDasharray={s.dashArray} strokeDashoffset={s.dashOffset} transform="rotate(-90 130 130)" />
            ))}
          </svg>

          {/* Grade + headline + perf chart */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <span style={{ fontSize: 100, fontWeight: 800, color: gradeColor, lineHeight: 1 }}>{verdict.grade}</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 20, color: MUTED, textTransform: 'uppercase', letterSpacing: '2px' }}>Is this OK?</span>
                <span style={{ fontSize: 32, fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>{verdict.headline}</span>
              </div>
            </div>

            {hasPerf && chartPaths ? (
              <div style={{ display: 'flex', flexDirection: 'column', marginTop: 14 }}>
                <div style={{ display: 'flex', gap: 24, marginBottom: 8 }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color: TEAL }}>
                    Portfolio {Number(ret) >= 0 ? '+' : ''}{ret}%
                  </span>
                  <span style={{ fontSize: 20, color: '#94a3b8' }}>
                    S&P 500 {Number(sp) >= 0 ? '+' : ''}{sp}% ({yrs}Y)
                  </span>
                  {sharpe && <span style={{ fontSize: 20, color: MUTED }}>Sharpe {sharpe}</span>}
                  {dd && <span style={{ fontSize: 20, color: MUTED }}>DD {dd}%</span>}
                </div>
                <svg width={chartW} height={chartH} viewBox={`0 0 ${chartW} ${chartH}`} style={{ display: 'block' }}>
                  <line x1={0} y1={chartPaths.baselineY} x2={chartW} y2={chartPaths.baselineY} stroke="#23232d" strokeWidth={1} strokeDasharray="4 4" />
                  <polyline points={chartPaths.benchmarkPoints} fill="none" stroke="#94a3b8" strokeWidth={1.5} strokeLinejoin="round" />
                  <polyline points={chartPaths.portfolioPoints} fill="none" stroke={TEAL} strokeWidth={2.5} strokeLinejoin="round" />
                </svg>
              </div>
            ) : (
              <span style={{ fontSize: 20, color: MUTED, marginTop: 12 }}>
                {Math.round(verdict.breakdown.equityPct)}% stocks · {Math.round(verdict.breakdown.intlShareOfEquity)}% intl · {verdict.breakdown.weightedExpenseRatio.toFixed(2)}% fees
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 20, color: MUTED }}>Rate yours free at untilfire.com</span>
          <span style={{ fontSize: 20, color: TEAL, fontWeight: 700 }}>untilfire.com →</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
