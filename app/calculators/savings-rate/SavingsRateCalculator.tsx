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

function yearsToFIRE(sr: number, annualReturn = 0.07, currentSavings = 0, annualIncome = 100000): number {
  if (sr <= 0) return Infinity
  if (sr >= 1) return 0
  const monthlyReturn = annualReturn / 12
  const monthlySavings = (annualIncome * sr) / 12
  const annualExpenses = annualIncome * (1 - sr)
  const fireTarget = annualExpenses * 25

  let balance = currentSavings
  for (let month = 0; month < 1200; month++) {
    balance += monthlySavings
    balance *= 1 + monthlyReturn
    if (balance >= fireTarget) return month / 12
  }
  return Infinity
}

const BENCHMARK_RATES = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7]

export default function SavingsRateCalculator() {
  const [income, setIncome] = useState('80000')
  const [expenses, setExpenses] = useState('50000')
  const [currentSavings, setCurrentSavings] = useState('20000')

  const { sr, monthlySaved, annualSaved, years, table } = useMemo(() => {
    const inc = parseFloat(income) || 0
    const exp = parseFloat(expenses) || 0
    const saved = parseFloat(currentSavings) || 0

    const annualSaved = Math.max(0, inc - exp)
    const monthlySaved = annualSaved / 12
    const sr = inc > 0 ? annualSaved / inc : 0

    const years = yearsToFIRE(sr, 0.07, saved, inc)

    const table = BENCHMARK_RATES.map((rate) => ({
      rate,
      years: yearsToFIRE(rate, 0.07, saved, inc),
      isYours: Math.abs(rate - sr) < 0.025,
    }))

    return { sr, monthlySaved, annualSaved, years, table }
  }, [income, expenses, currentSavings])

  const fmtYrs = (y: number) =>
    y === Infinity ? '50+ yrs' : y < 1 ? 'Already FIRE!' : `${y.toFixed(1)} yrs`

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
          <div style={{ fontSize: 12, color: C.accent, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>
            FIRE · Core
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 12px', lineHeight: 1.1 }}>
            Savings Rate Calculator
          </h1>
          <p style={{ fontSize: 16, color: C.muted, margin: 0, lineHeight: 1.7 }}>
            Your savings rate — the percentage of take-home pay you save — is the single
            most powerful variable in FIRE planning. More than your salary, your investment
            choices, or your city. See yours and how it maps to a retirement timeline.
          </p>
        </div>

        {/* Inputs */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '32px', marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'grid', gap: 20 }}>
            <div>
              <label style={labelStyle}>Annual take-home income (after tax, $)</label>
              <input type="number" value={income} onChange={e => setIncome(e.target.value)} style={inputStyle} min="0" step="1000" />
            </div>
            <div>
              <label style={labelStyle}>Annual expenses ($)</label>
              <input type="number" value={expenses} onChange={e => setExpenses(e.target.value)} style={inputStyle} min="0" step="1000" />
            </div>
            <div>
              <label style={labelStyle}>Current savings / investments ($)</label>
              <input type="number" value={currentSavings} onChange={e => setCurrentSavings(e.target.value)} style={inputStyle} min="0" step="1000" />
            </div>
          </div>
        </div>

        {/* Primary result */}
        <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 16, padding: '28px 32px', marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 28 }}>
            <div>
              <div style={{ fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 6 }}>Your savings rate</div>
              <div style={{ fontSize: 44, fontWeight: 800, color: C.accent, letterSpacing: '-0.04em' }}>{Math.round(sr * 100)}%</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 6 }}>Monthly saved</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: C.text, letterSpacing: '-0.04em' }}>
                ${Math.round(monthlySaved).toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 6 }}>Years to FIRE</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#047857', letterSpacing: '-0.04em' }}>{fmtYrs(years)}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>7% return, 4% withdrawal</div>
            </div>
          </div>

          {/* Rate vs years table */}
          <div style={{ borderTop: '1px solid #A7F3D0', paddingTop: 20 }}>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 14, fontWeight: 600 }}>
              How savings rate shifts your FIRE date
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              {table.map(({ rate, years: y, isYours }) => (
                <div key={rate} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  background: isYours ? '#D1FAE5' : '#ffffff',
                  border: isYours ? '1px solid #6EE7B7' : '1px solid #E2E8F0',
                  borderRadius: 8,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: isYours ? C.accent : C.muted, fontWeight: isYours ? 700 : 400, fontSize: 15, width: 36 }}>
                      {Math.round(rate * 100)}%
                    </span>
                    {isYours && <span style={{ fontSize: 11, color: C.accent, fontWeight: 700, letterSpacing: '1px' }}>← YOU</span>}
                  </div>
                  <span style={{ color: isYours ? C.accent : C.text, fontWeight: isYours ? 700 : 500, fontSize: 15 }}>
                    {fmtYrs(y)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SEO content */}
        <div style={{ color: C.muted, lineHeight: 1.8, fontSize: 15 }}>
          <h2 style={{ color: C.text, fontSize: 20, fontWeight: 700, marginBottom: 12, letterSpacing: '-0.02em' }}>
            Why savings rate matters more than income
          </h2>
          <p style={{ marginBottom: 16 }}>
            At a 10% savings rate, you need to work 43 years to retire. At 50%, you need just 17 years.
            At 75%, just 7 years. The relationship is non-linear — small increases in savings rate compress your
            timeline dramatically, especially as you approach 50%.
          </p>
          <p style={{ marginBottom: 16 }}>
            This is based on the &quot;shockingly simple math&quot; behind FIRE from Mr. Money Mustache:
            your years to retirement is determined entirely by your savings rate and expected investment returns.
            Your income level cancels out — a doctor saving 10% has the same FIRE timeline as a teacher saving 10%.
          </p>
          <p>
            The 4% rule (safe withdrawal rate) is used here to calculate your FIRE target: 25× your annual expenses.
            Investment returns are modeled at 7% annually (inflation-adjusted S&P 500 historical average).
          </p>
        </div>
      </div>
    </div>
  )
}
