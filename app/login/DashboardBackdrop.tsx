'use client'
import { Card, Icon, Money, Progress } from '@/components/ui'
import type { CalculatorPrefill } from '@/lib/journey'

// A still, blurred glimpse of the dashboard behind the sign-in card, drawn
// from the numbers the visitor just entered so it reads as theirs. Purely
// decorative: hidden from screen readers and never clickable. No motion, so
// it can't compete with the one button on top of it.

const NAV = ['home', 'money', 'plan', 'profile'] as const
const SPEND = [0.52, 0.28, 0.2]
const MONTHS = [0.55, 0.62, 0.48, 0.7, 0.66, 0.74, 0.69, 0.8, 0.77, 0.86, 0.83, 0.95]

/** Yearly balances from today to the freedom year, compounding the monthly savings. */
function projection(p: CalculatorPrefill): number[] {
  const now = new Date().getFullYear()
  const years = Math.max(5, Math.min(45, (p.retireYear ?? now + 25) - now))
  const r = p.realReturn ?? 0.05
  const yearly = (p.monthlySavings ?? 0) * 12
  const out = [p.portfolioBalance ?? 0]
  for (let i = 0; i < years; i++) out.push(out[i] * (1 + r) + yearly)
  return out
}

function PathChart({ points, target }: { points: number[]; target: number }) {
  const w = 640, h = 220
  const top = Math.max(target, points[points.length - 1]) * 1.08 || 1
  const x = (i: number) => (i / (points.length - 1)) * w
  const y = (v: number) => h - (v / top) * h
  const line = points.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: 220, display: 'block' }}>
      {[0.25, 0.5, 0.75].map((g) => (
        <line key={g} x1={0} x2={w} y1={h * g} y2={h * g} stroke="var(--uf-chart-grid)" strokeWidth={1} />
      ))}
      <path d={`${line} L${w},${h} L0,${h} Z`} fill="var(--uf-teal-soft)" />
      <path d={line} fill="none" stroke="var(--uf-chart-1)" strokeWidth={4} strokeLinecap="round" />
      {target > 0 && (
        <line x1={0} x2={w} y1={y(target)} y2={y(target)} stroke="var(--uf-ink-3)" strokeWidth={2} strokeDasharray="8 8" />
      )}
      <circle cx={x(points.length - 1)} cy={y(points[points.length - 1])} r={9} fill="var(--uf-teal)" />
    </svg>
  )
}

function Donut() {
  const c = 2 * Math.PI * 40
  let offset = 0
  return (
    <svg viewBox="0 0 100 100" style={{ width: 120, height: 120 }}>
      {SPEND.map((part, i) => {
        const el = (
          <circle key={i} cx={50} cy={50} r={40} fill="none" strokeWidth={14}
            stroke={`var(--uf-chart-${i + 1})`} strokeDasharray={`${part * c - 2} ${c}`}
            strokeDashoffset={-offset} transform="rotate(-90 50 50)" />
        )
        offset += part * c
        return el
      })}
    </svg>
  )
}

export default function DashboardBackdrop({ prefill }: { prefill: CalculatorPrefill }) {
  const currency = prefill.defaultCurrency ?? 'USD'
  const target = prefill.fireTarget ?? 0
  const balance = prefill.portfolioBalance ?? 0
  const monthly = prefill.monthlySavings ?? 0
  const income = prefill.monthlyIncome ?? 0
  const rate = income > 0 ? Math.round((monthly / income) * 100) : null
  const label: React.CSSProperties = { color: 'var(--uf-ink-3)', marginBottom: 8 }

  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', userSelect: 'none' }}>
      <div style={{ filter: 'blur(3.5px)', opacity: 0.9, transform: 'scale(1.03)', display: 'flex', minHeight: '100%' }}>
        {/* Sidebar, as on the real dashboard */}
        <div style={{ width: 76, flexShrink: 0, borderRight: '1px solid var(--uf-border)', background: 'var(--uf-card)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, paddingTop: 84 }}>
          {NAV.map((n, i) => (
            <span key={n} style={{ color: i === 0 ? 'var(--uf-green)' : 'var(--uf-ink-3)' }}><Icon name={n} size={22} /></span>
          ))}
        </div>

        <div style={{ flex: 1, padding: '28px 32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, alignContent: 'start' }}>
          <Card>
            <div className="uf-t-label" style={label}>Invested</div>
            <Money amount={balance} currency={currency} format="compact" size={30} />
            <Progress value={target > 0 ? balance / target : 0} style={{ marginTop: 14 }} />
          </Card>
          <Card>
            <div className="uf-t-label" style={label}>Saving each month</div>
            <Money amount={monthly} currency={currency} format="compact" size={30} />
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 40, marginTop: 12 }}>
              {MONTHS.map((v, i) => (
                <div key={i} style={{ flex: 1, height: `${v * 100}%`, borderRadius: 4, background: i === MONTHS.length - 1 ? 'var(--uf-chart-1)' : 'var(--uf-teal-soft)' }} />
              ))}
            </div>
          </Card>
          <Card>
            <div className="uf-t-label" style={label}>Savings rate</div>
            <div className="uf-t-data" style={{ fontSize: 30, fontWeight: 700 }}>{rate !== null ? `${rate}%` : '24%'}</div>
            <div className="uf-t-small" style={{ color: 'var(--uf-ink-2)', marginTop: 12 }}>Typical FIRE saver: 25%</div>
          </Card>

          <Card style={{ gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div className="uf-t-label" style={label}>Path to freedom</div>
                <div className="uf-t-h2" style={{ color: 'var(--uf-teal)' }}>{prefill.retireYear ?? '----'}</div>
              </div>
              {target > 0 && <Money amount={target} currency={currency} format="compact" size={18} />}
            </div>
            <PathChart points={projection(prefill)} target={target} />
          </Card>

          <Card>
            <div className="uf-t-label" style={label}>Where it goes</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <Donut />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {['Housing', 'Everyday', 'Bills'].map((t, i) => (
                  <span key={t} className="uf-t-small" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: `var(--uf-chart-${i + 1})` }} />{t}
                  </span>
                ))}
              </div>
            </div>
          </Card>
          <Card>
            <div className="uf-t-label" style={label}>Your next move</div>
            <div className="uf-t-h3">Invest a little more each month</div>
            <div style={{ marginTop: 16, height: 40, borderRadius: 'var(--uf-r-pill)', background: 'var(--uf-green)' }} />
          </Card>
          <Card>
            <div className="uf-t-label" style={label}>Today</div>
            {[0.8, 0.6, 0.7].map((w, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
                <span style={{ width: 18, height: 18, borderRadius: 6, border: '2px solid var(--uf-border-2)' }} />
                <span style={{ height: 10, width: `${w * 100}%`, borderRadius: 5, background: 'var(--uf-border)' }} />
              </div>
            ))}
          </Card>
        </div>
      </div>

      {/* Fades the glimpse into the page ground so the card on top stays the focus. */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at center, var(--uf-ground) 18%, transparent 70%)',
        opacity: 0.75,
      }} />
    </div>
  )
}
