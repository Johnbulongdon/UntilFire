'use client'
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import Logo from '@/app/components/Logo'
import { Icon } from '@/components/ui'
import { FreedomCard, GlanceRow, NextMoveCard, UntilPaydayCard } from '@/app/dashboard/HomeCards'
import type { CalculatorPrefill } from '@/lib/journey'
import type { PaydayLine } from '@/lib/payday-line'

// A still, blurred glimpse of the real Home behind the sign-up card, drawn
// with the dashboard's own cards. The visitor's calculator numbers fill the
// freedom card and tiles when they exist; everything else is a sample.
// Purely decorative: hidden from screen readers, never clickable, no motion.

const noop = () => {}
const fmt = (n: number) => (n < 0 ? '−$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US')

/** Yearly balances from today to the freedom year, compounding the monthly savings. */
function projection(p: CalculatorPrefill | null, now: number): { label: string; value: number }[] {
  const years = Math.max(5, Math.min(45, (p?.retireYear ?? now + 15) - now))
  const r = p?.realReturn ?? 0.05
  const yearly = (p?.monthlySavings ?? 2500) * 12
  const out = [{ label: String(now), value: p?.portfolioBalance ?? 121000 }]
  for (let i = 1; i <= years; i++) out.push({ label: String(now + i), value: out[i - 1].value * (1 + r) + yearly })
  return out
}

const PAST = Array.from({ length: 21 }, (_, i) => 3100 - i * 30 - (i > 4 ? 120 : 0) - (i > 12 ? 90 : 0))
const LINE: PaydayLine = {
  span: 31, today: 20, startIso: '2026-10-01', past: PAST,
  dips: [{ day: 5, usd: 120, category: 'Shopping' }],
  bills: [
    { day: 22, usd: 15, before: 2290, description: 'Netflix', category: 'Subscriptions' },
    { day: 26, usd: 45, before: 2275, description: 'Phone', category: 'Phone' },
    { day: 28, usd: 90, before: 2230, description: 'Power', category: 'Utilities' },
    { day: 30, usd: 500, before: 2140, description: 'Rent', category: 'Housing' },
  ],
  end: 1640,
}
const ICONS: Record<string, string> = { Subscriptions: '📺', Phone: '📱', Utilities: '⚡', Housing: '🏠', Shopping: '🛍️' }

export default function HomeBackdrop({ prefill }: { prefill: CalculatorPrefill | null }) {
  const now = new Date().getFullYear()
  const points = projection(prefill, now)
  const year = prefill?.retireYear ?? now + 15
  const yearsAway = Math.max(0, year - now)
  const income = prefill?.monthlyIncome ?? 0
  const rate = income > 0 ? ((prefill?.monthlySavings ?? 0) / income) * 100 : 23

  return (
    <div aria-hidden inert style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', userSelect: 'none', zIndex: 0 }}>
      <div style={{ filter: 'blur(4px)', opacity: 0.9, transform: 'scale(1.02)', display: 'flex', minHeight: '100%' }}>
        <div className="uf-backdrop-side" style={{ width: 248, flexShrink: 0, background: 'var(--uf-surface)', borderRight: '1px solid var(--uf-border)' }}>
          <div style={{ padding: '22px 20px', borderBottom: '1px solid var(--uf-border)' }}><Logo variant="auto" size={22} /></div>
          <nav style={{ padding: '16px 10px', display: 'grid', gap: 2 }}>
            {(['home', 'money', 'plan', 'profile'] as const).map((n, i) => (
              <div key={n} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 8, fontSize: 14, fontWeight: 700,
                border: `1px solid ${i === 0 ? 'var(--uf-green)' : 'transparent'}`,
                background: i === 0 ? 'var(--uf-green-50)' : 'transparent',
                color: i === 0 ? 'var(--uf-green-700)' : 'var(--uf-ink-2)',
              }}>
                <Icon name={n} size={18} />{n[0].toUpperCase() + n.slice(1)}
              </div>
            ))}
          </nav>
        </div>

        <div className="uf-backdrop-main" style={{ flex: 1, padding: '28px 32px', display: 'grid', gap: 16, alignContent: 'start', maxWidth: 1100 }}>
          <FreedomCard dateLabel={String(year)} yearsAway={yearsAway} age={prefill?.currentAge ? prefill.currentAge + yearsAway : null} onOpen={noop}>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={points} margin={{ top: 20, right: 24, bottom: 0, left: 24 }}>
                <XAxis dataKey="label" tick={{ fill: 'var(--uf-ink-3)', fontSize: 12 }} axisLine={{ stroke: 'var(--uf-border)' }} tickLine={false} interval="preserveStartEnd" minTickGap={28} />
                <YAxis hide domain={[0, 'auto']} />
                {prefill?.fireTarget ? <ReferenceLine y={prefill.fireTarget} stroke="var(--uf-ink-3)" strokeDasharray="4 4" /> : null}
                <Area dataKey="value" stroke="var(--uf-teal)" strokeWidth={3} fill="var(--uf-teal-soft)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </FreedomCard>
          <div className="uf-backdrop-two" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <NextMoveCard fmt={fmt} onOpen={noop} onSnooze={noop} move={{
              key: 'backdrop', title: 'Put $300 into your safety pot', payoff: 'A buffer before anything else', door: 'plan', tab: 'contributions', button: 'Open your plan',
              split: [{ label: 'Safety pot', amount: 300 }, { label: '401(k) match', amount: 250 }, { label: 'Invest', amount: 150 }],
            }} />
            <UntilPaydayCard line={LINE} paydayIso="2026-11-01" billCount={4} billTotal={650} icon={(c) => ICONS[c ?? ''] ?? '💳'} fmt={fmt} onOpen={noop} />
          </div>
          <GlanceRow netWorth={prefill?.portfolioBalance ?? 184200} invested={[]} safety={{ months: 4.2, target: 6 }} savingsRate={rate} fmt={fmt} onNetWorth={noop} onSafety={noop} onSavings={noop} />
        </div>
      </div>

      <style>{`
        @media (max-width: 760px) {
          .uf-backdrop-side { display: none; }
          .uf-backdrop-two { grid-template-columns: 1fr !important; }
          .uf-backdrop-main { padding: 20px 16px !important; }
        }
      `}</style>
      {/* Fades the glimpse into the page ground so the card on top stays the focus. */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, var(--uf-ground) 18%, transparent 70%)', opacity: 0.75 }} />
    </div>
  )
}
