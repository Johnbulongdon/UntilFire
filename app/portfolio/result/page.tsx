import { Metadata } from 'next'
import Link from 'next/link'
import { decodeHoldings, normalizeHoldings, encodeHoldings } from '@/lib/portfolio/parse'
import { analyzePortfolio } from '@/lib/portfolio/rules'
import { buildDonutSegments, GRADE_COLORS } from '@/lib/portfolio/chart'
import { getFund } from '@/lib/funds/metadata'
import { fetchDailyPrices } from '@/lib/market/stooq'
import { computeMetrics, encodeSeries, type PortfolioMetrics } from '@/lib/portfolio/metrics'
import { buildLineChartPaths } from '@/lib/portfolio/linechart'
import ShareButtons from './ShareButtons'

interface Props {
  searchParams: Promise<{ h?: string }>
}

const BG = '#08080e'
const CARD = '#111118'
const BORDER = '#23232d'
const MUTED = '#8a8a99'
const TEAL = '#22d3a5'
const ORANGE = '#f97316'

const NOTE_COLORS: Record<string, string> = { good: TEAL, warn: '#fbbf24', bad: ORANGE }

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { h = '' } = await searchParams
  const holdings = decodeHoldings(h)
  if (holdings.length === 0) return { title: 'Portfolio Check | UntilFire' }
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

async function fetchMetrics(holdings: ReturnType<typeof normalizeHoldings>): Promise<PortfolioMetrics | null> {
  try {
    const tickers = holdings.map((h) => h.ticker)
    const [benchmarkData, ...tickerData] = await Promise.all([
      fetchDailyPrices('^SPX'),
      ...tickers.map((t) => fetchDailyPrices(t)),
    ])
    const pricesByTicker = new Map(tickers.map((t, i) => [t, tickerData[i]]))
    return computeMetrics(holdings, pricesByTicker, benchmarkData)
  } catch {
    return null
  }
}

export default async function ResultPage({ searchParams }: Props) {
  const { h = '' } = await searchParams
  const holdings = normalizeHoldings(decodeHoldings(h).slice(0, 10))

  if (holdings.length === 0) {
    return (
      <main style={pageStyle}>
        <div style={{ maxWidth: 720, width: '100%', textAlign: 'center' }}>
          <h1 style={{ fontSize: 32, fontWeight: 800 }}>No portfolio to show</h1>
          <p style={{ color: MUTED, marginTop: 12 }}>Start by entering your holdings.</p>
          <Link href="/portfolio" style={{ color: TEAL, fontWeight: 700 }}>Rate my portfolio →</Link>
        </div>
      </main>
    )
  }

  const [verdict, metrics] = await Promise.all([
    Promise.resolve(analyzePortfolio(holdings)),
    fetchMetrics(holdings),
  ])

  const gradeColor = GRADE_COLORS[verdict.grade]
  const R = 80
  const C = 2 * Math.PI * R
  const segments = buildDonutSegments(holdings, C)

  // Build image URLs — include perf series if available.
  const hEncoded = encodeHoldings(holdings)
  let reportImageUrl = `/api/portfolio/report?h=${encodeURIComponent(hEncoded)}`
  let ogImageUrl = `/api/portfolio/og?h=${encodeURIComponent(hEncoded)}`
  if (metrics) {
    const pfParam = encodeSeries(metrics.portfolioSeries)
    const bmParam = encodeSeries(metrics.benchmarkSeries)
    const metricsParams = `&ret=${metrics.totalReturn}&sp=${metrics.benchmarkReturn}&sharpe=${metrics.sharpe}&sortino=${metrics.sortino}&dd=${metrics.maxDrawdown}&vol=${metrics.volatility}&beta=${metrics.beta}&alpha=${metrics.alpha}&yrs=${metrics.years}`
    const chartParams = `&pf=${encodeURIComponent(pfParam)}&bm=${encodeURIComponent(bmParam)}${metricsParams}`
    reportImageUrl += chartParams
    ogImageUrl += chartParams
  }

  const slug = `h=${encodeHoldings(holdings)}`
  const shareText = metrics
    ? `My portfolio scored ${verdict.grade} on UntilFire — ${metrics.totalReturn > 0 ? '+' : ''}${metrics.totalReturn}% vs S&P 500 ${metrics.benchmarkReturn > 0 ? '+' : ''}${metrics.benchmarkReturn}% (${metrics.years}Y). ${verdict.headline}.`
    : `My portfolio scored ${verdict.grade} on UntilFire — ${verdict.headline}.`

  // Line chart paths (on-page, 680×220 canvas).
  const chartPaths = metrics
    ? buildLineChartPaths(metrics.portfolioSeries, metrics.benchmarkSeries, 680, 200, 0, 12)
    : null

  return (
    <main style={pageStyle}>
      <div style={{ maxWidth: 720, width: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <Link href="/portfolio" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>Until</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: TEAL }}>Fire</span>
          </Link>
          <Link href="/portfolio" style={{ color: MUTED, fontSize: 15, textDecoration: 'none' }}>← Edit holdings</Link>
        </div>

        {/* Verdict */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 24, padding: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ width: 110, height: 110, borderRadius: 22, border: `4px solid ${gradeColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 68, fontWeight: 800, color: gradeColor, lineHeight: 1 }}>{verdict.grade}</span>
            </div>
            <div>
              <p style={{ color: MUTED, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>Is this portfolio OK?</p>
              <h1 style={{ fontSize: 28, fontWeight: 800, margin: '6px 0 0', lineHeight: 1.15 }}>{verdict.headline}</h1>
            </div>
          </div>

          {/* Donut + legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginTop: 32, flexWrap: 'wrap' }}>
            <svg width={200} height={200} viewBox="0 0 200 200">
              {segments.map((s, i) => (
                <circle key={i} cx={100} cy={100} r={R} fill="none" stroke={s.color} strokeWidth={30}
                  strokeDasharray={s.dashArray} strokeDashoffset={s.dashOffset} transform="rotate(-90 100 100)" />
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

          {/* Adviser notes */}
          <div style={{ marginTop: 28 }}>
            {verdict.notes.map((n, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: NOTE_COLORS[n.kind] ?? MUTED, marginTop: 7, flexShrink: 0 }} />
                <span style={{ marginLeft: 14, color: '#d6d6e0', fontSize: 16, lineHeight: 1.4 }}>{n.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Performance section — only shown when Stooq returned data */}
        {metrics && chartPaths ? (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 24, padding: 32, marginTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                Portfolio vs S&amp;P 500 — {metrics.years}Y
              </h2>
              <div style={{ display: 'flex', gap: 20 }}>
                <span style={{ color: TEAL, fontWeight: 700 }}>
                  Portfolio {metrics.totalReturn > 0 ? '+' : ''}{metrics.totalReturn}%
                </span>
                <span style={{ color: '#94a3b8', fontWeight: 600 }}>
                  S&amp;P 500 {metrics.benchmarkReturn > 0 ? '+' : ''}{metrics.benchmarkReturn}%
                </span>
              </div>
            </div>

            {/* Line chart */}
            <svg width="100%" viewBox="0 0 680 200" style={{ display: 'block', overflow: 'visible' }}>
              {/* Baseline at 100 */}
              <line x1={0} y1={chartPaths.baselineY} x2={680} y2={chartPaths.baselineY}
                stroke={BORDER} strokeWidth={1} strokeDasharray="4 4" />
              {/* Benchmark (S&P 500) — muted grey */}
              <polyline points={chartPaths.benchmarkPoints} fill="none" stroke="#94a3b8" strokeWidth={2} strokeLinejoin="round" />
              {/* Portfolio — teal */}
              <polyline points={chartPaths.portfolioPoints} fill="none" stroke={TEAL} strokeWidth={2.5} strokeLinejoin="round" />
              {/* End labels */}
              <text x={672} y={chartPaths.baselineY + 5} fill={MUTED} fontSize={11} textAnchor="end">100</text>
            </svg>

            {/* Metrics grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 24 }}>
              <PerfMetric label="Return" value={`${metrics.totalReturn > 0 ? '+' : ''}${metrics.totalReturn}%`} />
              <PerfMetric label="Alpha" value={`${metrics.alpha > 0 ? '+' : ''}${metrics.alpha}%`} highlight={metrics.alpha > 0} />
              <PerfMetric label="Beta" value={`${metrics.beta}`} />
              <PerfMetric label="Sharpe" value={`${metrics.sharpe}`} />
              <PerfMetric label="Drawdown" value={`${metrics.maxDrawdown}%`} />
              <PerfMetric label="Volatility" value={`${metrics.volatility}%`} />
              <PerfMetric label="Sortino" value={`${metrics.sortino}`} />
              <PerfMetric label="vs S&P 500" value={`${metrics.totalReturn - metrics.benchmarkReturn > 0 ? '+' : ''}${(metrics.totalReturn - metrics.benchmarkReturn).toFixed(2)}%`} highlight={metrics.totalReturn > metrics.benchmarkReturn} />
            </div>
            <p style={{ color: MUTED, fontSize: 12, marginTop: 16, lineHeight: 1.5 }}>
              Trailing {metrics.years}Y backtest, monthly rebalancing to target weights. Source: Stooq. Educational only — past performance does not predict future results.
            </p>
          </div>
        ) : (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 24, padding: 24, marginTop: 20 }}>
            <p style={{ color: MUTED, fontSize: 14, margin: 0 }}>
              Performance data unavailable — price history could not be loaded for one or more tickers. The rules-based analysis above still applies.
            </p>
          </div>
        )}

        {/* Share */}
        <div style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Share your report</h2>
          <ShareButtons shareSlug={slug} reportImageUrl={reportImageUrl} shareText={shareText} />
        </div>

        <p style={{ color: MUTED, fontSize: 13, marginTop: 28, lineHeight: 1.5 }}>
          Educational only — not financial advice.
        </p>
        <Link href="/?source=portfolio-checkup" style={{ color: TEAL, fontWeight: 700, fontSize: 16, marginTop: 8, textDecoration: 'none' }}>
          See when work could become optional for you →
        </Link>
      </div>
    </main>
  )
}

function PerfMetric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ color: MUTED, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4, color: highlight ? TEAL : '#fff' }}>{value}</div>
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
  fontFamily: "'Manrope', system-ui, sans-serif",
}
