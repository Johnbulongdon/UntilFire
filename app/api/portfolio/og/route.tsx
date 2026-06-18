import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { decodeHoldings, normalizeHoldings } from '@/lib/portfolio/parse'
import { analyzePortfolio } from '@/lib/portfolio/rules'
import { buildDonutSegments, GRADE_COLORS } from '@/lib/portfolio/chart'

export const runtime = 'edge'

const BG = '#08080e'
const MUTED = '#8a8a99'
const TEAL = '#22d3a5'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const holdings = normalizeHoldings(decodeHoldings(searchParams.get('h')).slice(0, 10))

  if (holdings.length === 0) {
    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
          <span style={{ fontSize: 56, fontWeight: 800, color: '#fff' }}>Until</span>
          <span style={{ fontSize: 56, fontWeight: 800, color: TEAL }}>Fire</span>
        </div>
      ),
      { width: 1200, height: 630 },
    )
  }

  const verdict = analyzePortfolio(holdings)
  const gradeColor = GRADE_COLORS[verdict.grade]
  const R = 110
  const C = 2 * Math.PI * R
  const segments = buildDonutSegments(holdings, C)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: BG,
          display: 'flex',
          flexDirection: 'column',
          padding: '56px 64px',
          fontFamily: 'sans-serif',
          color: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-1px' }}>Until</span>
          <span style={{ fontSize: 28, fontWeight: 800, color: TEAL, letterSpacing: '-1px' }}>Fire</span>
          <span style={{ fontSize: 20, color: MUTED, textTransform: 'uppercase', letterSpacing: '3px', marginLeft: 20 }}>
            Portfolio Check
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          {/* Donut */}
          <svg width={280} height={280} viewBox="0 0 280 280" style={{ display: 'block' }}>
            {segments.map((s, i) => (
              <circle
                key={i}
                cx={140}
                cy={140}
                r={R}
                fill="none"
                stroke={s.color}
                strokeWidth={42}
                strokeDasharray={s.dashArray}
                strokeDashoffset={s.dashOffset}
                transform="rotate(-90 140 140)"
              />
            ))}
          </svg>

          {/* Grade + headline */}
          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 56, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: 120, fontWeight: 800, color: gradeColor, lineHeight: 1 }}>{verdict.grade}</span>
              <span style={{ fontSize: 26, color: MUTED, marginLeft: 24, textTransform: 'uppercase', letterSpacing: '2px' }}>
                Is this portfolio OK?
              </span>
            </div>
            <span style={{ fontSize: 42, fontWeight: 800, color: '#fff', marginTop: 12, lineHeight: 1.1 }}>
              {verdict.headline}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 24, color: '#d6d6e0' }}>
            {Math.round(verdict.breakdown.equityPct)}% stocks · {Math.round(verdict.breakdown.intlShareOfEquity)}% intl · {verdict.breakdown.weightedExpenseRatio.toFixed(2)}% fees
          </span>
          <span style={{ fontSize: 24, color: TEAL, fontWeight: 700 }}>Rate yours free →</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
