'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

const C = {
  bg: '#F7F9FB',
  card: '#ffffff',
  border: '#E2E8F0',
  text: '#19181E',
  muted: '#64748B',
  mutedLight: '#94A3B8',
  accent: '#059669',
  teal: '#20D4BF',
  purple: '#7C3AED',
}

const inputStyle: React.CSSProperties = {
  background: '#ffffff',
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  color: C.text,
  fontSize: 16,
  padding: '11px 14px',
  width: '100%',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  color: C.muted,
  marginBottom: 6,
  display: 'block',
  fontWeight: 500,
}

function fmt(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}k`
  return `$${Math.round(n)}`
}

function fmtFull(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function CoastFireCalculator() {
  const [annualExpenses, setAnnualExpenses] = useState('50000')
  const [currentAge, setCurrentAge] = useState('30')
  const [retireAge, setRetireAge] = useState('65')
  const [currentSavings, setCurrentSavings] = useState('50000')
  const [returnRate, setReturnRate] = useState('7')
  const [withdrawalRate, setWithdrawalRate] = useState('4')

  const result = useMemo(() => {
    const exp = parseFloat(annualExpenses) || 50000
    const age = parseFloat(currentAge) || 30
    const retire = parseFloat(retireAge) || 65
    const saved = parseFloat(currentSavings) || 0
    const r = (parseFloat(returnRate) || 7) / 100
    const wr = (parseFloat(withdrawalRate) || 4) / 100

    const yearsUntilRetire = Math.max(0, retire - age)
    const fireTarget = exp / wr
    const coastNumber = fireTarget / Math.pow(1 + r, yearsUntilRetire)
    const progressPct = coastNumber > 0 ? Math.min((saved / coastNumber) * 100, 100) : 0
    const gap = Math.max(0, coastNumber - saved)
    const alreadyCoast = saved >= coastNumber

    const milestones = []
    for (let y = 0; y <= yearsUntilRetire; y += Math.max(1, Math.floor(yearsUntilRetire / 6))) {
      const age_ = age + y
      if (age_ > retire) break
      const projectedBalance = saved * Math.pow(1 + r, y)
      milestones.push({ year: y, age: age_, balance: projectedBalance })
    }
    if (yearsUntilRetire > 0) {
      milestones.push({ year: yearsUntilRetire, age: retire, balance: saved * Math.pow(1 + r, yearsUntilRetire) })
    }

    return { fireTarget, coastNumber, progressPct, gap, alreadyCoast, yearsUntilRetire, milestones }
  }, [annualExpenses, currentAge, retireAge, currentSavings, returnRate, withdrawalRate])

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: "'Manrope', sans-serif" }}>
      <nav style={{ borderBottom: `1px solid ${C.border}`, padding: '16px 24px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ textDecoration: 'none', fontWeight: 800, fontSize: 18, letterSpacing: '-0.04em', color: '#064E3B' }}>
          Until<span style={{ color: '#20D4BF' }}>Fire</span>
        </Link>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link href="/calculators" style={{ color: C.muted, textDecoration: 'none', fontSize: 14 }}>← All calculators</Link>
          <Link href="/" style={{ color: '#059669', textDecoration: 'none', fontSize: 14, fontWeight: 600, border: '1px solid #059669', padding: '6px 14px', borderRadius: 6 }}>
            FIRE number →
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '48px 24px 80px' }}>
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 12, color: C.purple, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>
            FIRE · Strategy
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 12px', lineHeight: 1.1 }}>
            Coast FIRE Calculator
          </h1>
          <p style={{ fontSize: 16, color: C.muted, margin: 0, lineHeight: 1.7 }}>
            Coast FIRE is the point where you have enough invested that — even if you stop contributing today —
            compound growth will carry you to full retirement by your target age. Find your magic number.
          </p>
        </div>

        {/* Inputs */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '32px', marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <label style={labelStyle}>Annual expenses at retirement ($)</label>
              <input type="number" value={annualExpenses} onChange={e => setAnnualExpenses(e.target.value)} style={inputStyle} min="0" step="1000" />
            </div>
            <div>
              <label style={labelStyle}>Current savings / investments ($)</label>
              <input type="number" value={currentSavings} onChange={e => setCurrentSavings(e.target.value)} style={inputStyle} min="0" step="1000" />
            </div>
            <div>
              <label style={labelStyle}>Current age</label>
              <input type="number" value={currentAge} onChange={e => setCurrentAge(e.target.value)} style={inputStyle} min="18" max="80" />
            </div>
            <div>
              <label style={labelStyle}>Target retirement age</label>
              <input type="number" value={retireAge} onChange={e => setRetireAge(e.target.value)} style={inputStyle} min="30" max="90" />
            </div>
            <div>
              <label style={labelStyle}>Expected annual return (%)</label>
              <input type="number" value={returnRate} onChange={e => setReturnRate(e.target.value)} style={inputStyle} min="1" max="15" step="0.5" />
            </div>
            <div>
              <label style={labelStyle}>Withdrawal rate (%)</label>
              <input type="number" value={withdrawalRate} onChange={e => setWithdrawalRate(e.target.value)} style={inputStyle} min="2" max="6" step="0.5" />
            </div>
          </div>
        </div>

        {/* Result */}
        <div style={{
          background: result.alreadyCoast ? '#ECFDF5' : '#F5F3FF',
          border: `1px solid ${result.alreadyCoast ? '#A7F3D0' : '#DDD6FE'}`,
          borderRadius: 16,
          padding: '28px 32px',
          marginBottom: 24,
        }}>
          {result.alreadyCoast ? (
            <div style={{ marginBottom: 24, padding: '14px 18px', background: '#D1FAE5', border: '1px solid #6EE7B7', borderRadius: 10, color: '#065F46', fontWeight: 700, fontSize: 15 }}>
              You&apos;ve already hit your Coast FIRE number.
              If you stop contributing today, your investments will grow to {fmt(result.fireTarget)} by age {retireAge}.
            </div>
          ) : null}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 6 }}>Coast FIRE number</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: C.purple, letterSpacing: '-0.04em' }}>{fmt(result.coastNumber)}</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{fmtFull(result.coastNumber)}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 6 }}>Full FIRE target</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: C.text, letterSpacing: '-0.04em' }}>{fmt(result.fireTarget)}</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>needed at age {retireAge}</div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: C.muted }}>Progress to Coast FIRE</span>
              <span style={{ fontSize: 13, color: result.alreadyCoast ? C.accent : C.purple, fontWeight: 700 }}>
                {result.progressPct.toFixed(0)}%
              </span>
            </div>
            <div style={{ height: 10, background: '#E2E8F0', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${result.progressPct}%`, background: result.alreadyCoast ? C.accent : C.purple, borderRadius: 999, transition: 'width 0.3s' }} />
            </div>
            {!result.alreadyCoast && (
              <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>
                You need <span style={{ color: C.text, fontWeight: 600 }}>{fmt(result.gap)} more</span> to reach Coast FIRE
              </div>
            )}
          </div>

          {/* Growth milestones */}
          {result.milestones.length > 1 && (
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20 }}>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 12, fontWeight: 600 }}>
                What your current savings grow to (no additional contributions)
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {result.milestones.map(({ age: a, balance }) => (
                  <div key={a} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8 }}>
                    <span style={{ color: C.muted, fontSize: 14 }}>Age {a}</span>
                    <span style={{ color: balance >= result.fireTarget ? C.accent : C.text, fontWeight: 600, fontSize: 14 }}>
                      {fmtFull(balance)}{balance >= result.fireTarget ? ' ✓' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SEO content */}
        <div style={{ color: C.muted, lineHeight: 1.8, fontSize: 15 }}>
          <h2 style={{ color: C.text, fontSize: 20, fontWeight: 700, marginBottom: 12, letterSpacing: '-0.02em' }}>
            What is Coast FIRE?
          </h2>
          <p style={{ marginBottom: 16 }}>
            Coast FIRE is a milestone before full FIRE. Once you hit your Coast number, you have enough invested
            that you can stop making retirement contributions entirely — your money will compound to your full FIRE target
            by your intended retirement age all on its own.
          </p>
          <p style={{ marginBottom: 16 }}>
            <strong style={{ color: C.text }}>Formula:</strong> Coast FIRE = FIRE Target ÷ (1 + r)^years to retirement
          </p>
          <p>
            After reaching Coast FIRE, many people shift to covering just their living expenses — taking lower-stress
            jobs, going part-time, or pursuing passion projects. Your investments do the heavy lifting. This is also
            called &quot;Barista FIRE&quot; or &quot;Slow FIRE.&quot;
          </p>
        </div>
      </div>
    </div>
  )
}
