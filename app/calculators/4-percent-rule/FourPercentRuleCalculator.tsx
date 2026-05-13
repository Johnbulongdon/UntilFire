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

function fmt(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}k`
  return `$${Math.round(n)}`
}

function fmtFull(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

const RATES = [
  { rate: 3.0, label: '3.0%', note: 'Very conservative · 33× expenses' },
  { rate: 3.5, label: '3.5%', note: 'Conservative · 28.6× expenses' },
  { rate: 4.0, label: '4.0%', note: 'Standard · 25× expenses · Trinity Study' },
  { rate: 4.5, label: '4.5%', note: 'Moderate · 22.2× expenses' },
  { rate: 5.0, label: '5.0%', note: 'Aggressive · 20× expenses' },
]

const MONTHLY_CATEGORIES = [
  { label: 'Housing (rent/mortgage)', key: 'housing', default: 1800 },
  { label: 'Food & groceries', key: 'food', default: 600 },
  { label: 'Transport', key: 'transport', default: 400 },
  { label: 'Health & insurance', key: 'health', default: 300 },
  { label: 'Entertainment & travel', key: 'entertainment', default: 400 },
  { label: 'Everything else', key: 'other', default: 500 },
]

export default function FourPercentRuleCalculator() {
  const [mode, setMode] = useState<'simple' | 'detailed'>('simple')
  const [annualExpenses, setAnnualExpenses] = useState('60000')
  const [selectedRate, setSelectedRate] = useState(4.0)
  const [currentSavings, setCurrentSavings] = useState('0')
  const [categories, setCategories] = useState<Record<string, string>>(
    Object.fromEntries(MONTHLY_CATEGORIES.map(c => [c.key, String(c.default)]))
  )

  const { fireNumber, gap, progressPct, rateTable, monthlyBudget } = useMemo(() => {
    const monthlyBudget = Object.values(categories).reduce((s, v) => s + (parseFloat(v) || 0), 0)
    const exp = mode === 'detailed' ? monthlyBudget * 12 : (parseFloat(annualExpenses) || 60000)
    const saved = parseFloat(currentSavings) || 0

    const fireNumber = exp / (selectedRate / 100)
    const gap = Math.max(0, fireNumber - saved)
    const progressPct = fireNumber > 0 ? Math.min((saved / fireNumber) * 100, 100) : 0

    const rateTable = RATES.map(({ rate, label, note }) => ({
      rate,
      label,
      note,
      fireNumber: exp / (rate / 100),
      isSelected: rate === selectedRate,
    }))

    return { fireNumber, gap, progressPct, rateTable, monthlyBudget }
  }, [annualExpenses, selectedRate, currentSavings, categories, mode])

  const exp = mode === 'detailed' ? monthlyBudget * 12 : (parseFloat(annualExpenses) || 60000)

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: "'Manrope', sans-serif" }}>
      <nav style={{ borderBottom: `1px solid ${C.border}`, padding: '16px 24px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ textDecoration: 'none', fontWeight: 800, fontSize: 18, letterSpacing: '-0.04em', color: '#064E3B' }}>
          Until<span style={{ color: '#20D4BF' }}>Fire</span>
        </Link>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link href="/calculators" style={{ color: C.muted, textDecoration: 'none', fontSize: 14 }}>← All calculators</Link>
          <Link href="/" style={{ color: '#059669', textDecoration: 'none', fontSize: 14, fontWeight: 600, border: '1px solid #059669', padding: '6px 14px', borderRadius: 6 }}>
            FIRE date →
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 80px' }}>
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 12, color: C.accent, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>
            FIRE · Retirement
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 12px', lineHeight: 1.1 }}>
            FIRE Number Calculator
          </h1>
          <p style={{ fontSize: 16, color: C.muted, margin: 0, lineHeight: 1.7 }}>
            Your FIRE number is how much you need invested to retire — calculated using the safe withdrawal rate.
            The standard is 4% (from the 1998 Trinity Study), meaning 25× your annual expenses.
            Adjust the rate below to see how it shifts your target.
          </p>
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 2, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 4, marginBottom: 24, width: 'fit-content' }}>
          {(['simple', 'detailed'] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} style={{
              padding: '8px 20px',
              borderRadius: 7,
              border: 'none',
              background: mode === m ? C.accent : 'transparent',
              color: mode === m ? '#ffffff' : C.muted,
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              fontFamily: "'Manrope', sans-serif",
            }}>
              {m === 'simple' ? 'Simple' : 'Itemised budget'}
            </button>
          ))}
        </div>

        {/* Inputs */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '32px', marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          {mode === 'simple' ? (
            <div style={{ display: 'grid', gap: 20 }}>
              <div>
                <label style={labelStyle}>Annual expenses in retirement ($)</label>
                <input type="number" value={annualExpenses} onChange={e => setAnnualExpenses(e.target.value)} style={inputStyle} min="0" step="1000" />
              </div>
              <div>
                <label style={labelStyle}>Current savings / investments ($)</label>
                <input type="number" value={currentSavings} onChange={e => setCurrentSavings(e.target.value)} style={inputStyle} min="0" step="1000" />
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ fontSize: 14, color: C.muted, marginBottom: 4 }}>Monthly expenses in retirement</div>
              {MONTHLY_CATEGORIES.map((cat) => (
                <div key={cat.key} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <label style={{ ...labelStyle, margin: 0, flex: 1, minWidth: 180 }}>{cat.label}</label>
                  <div style={{ position: 'relative', width: 160 }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none' }}>$</span>
                    <input
                      type="number"
                      value={categories[cat.key]}
                      onChange={e => setCategories(prev => ({ ...prev, [cat.key]: e.target.value }))}
                      style={{ ...inputStyle, paddingLeft: 24, width: '100%' }}
                      min="0"
                      step="50"
                    />
                  </div>
                </div>
              ))}
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: C.muted, fontSize: 14, fontWeight: 600 }}>Monthly total</span>
                <span style={{ color: C.text, fontWeight: 700, fontSize: 18 }}>{fmtFull(monthlyBudget)}</span>
              </div>
              <div style={{ marginTop: 8 }}>
                <label style={labelStyle}>Current savings / investments ($)</label>
                <input type="number" value={currentSavings} onChange={e => setCurrentSavings(e.target.value)} style={inputStyle} min="0" step="1000" />
              </div>
            </div>
          )}
        </div>

        {/* Primary result */}
        <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 16, padding: '28px 32px', marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 6 }}>
                Your FIRE number at {selectedRate}%
              </div>
              <div style={{ fontSize: 44, fontWeight: 800, color: C.accent, letterSpacing: '-0.04em' }}>{fmt(fireNumber)}</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{fmtFull(fireNumber)}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 6 }}>
                Annual spending covered
              </div>
              <div style={{ fontSize: 44, fontWeight: 800, color: C.text, letterSpacing: '-0.04em' }}>{fmtFull(exp)}</div>
            </div>
          </div>

          {/* Progress */}
          {parseFloat(currentSavings) > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: C.muted }}>Progress to FIRE</span>
                <span style={{ fontSize: 13, color: C.accent, fontWeight: 700 }}>{progressPct.toFixed(1)}%</span>
              </div>
              <div style={{ height: 10, background: '#D1FAE5', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progressPct}%`, background: C.accent, borderRadius: 999 }} />
              </div>
              {gap > 0 && (
                <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>
                  <span style={{ color: C.text, fontWeight: 600 }}>{fmt(gap)}</span> to go
                </div>
              )}
            </div>
          )}

          {/* Rate comparison table */}
          <div style={{ borderTop: '1px solid #A7F3D0', paddingTop: 20 }}>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 14, fontWeight: 600 }}>
              Compare withdrawal rates — click to select
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {rateTable.map(({ rate, label, note, fireNumber: fn, isSelected }) => (
                <button key={rate} onClick={() => setSelectedRate(rate)} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: isSelected ? '#D1FAE5' : '#ffffff',
                  border: isSelected ? '1px solid #6EE7B7' : '1px solid #E2E8F0',
                  borderRadius: 8,
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  fontFamily: "'Manrope', sans-serif",
                }}>
                  <div>
                    <span style={{ color: isSelected ? C.accent : C.text, fontWeight: isSelected ? 700 : 500, fontSize: 15 }}>
                      {label}
                    </span>
                    <span style={{ color: C.muted, fontSize: 12, marginLeft: 10 }}>{note}</span>
                  </div>
                  <span style={{ color: isSelected ? C.accent : C.text, fontWeight: 700, fontSize: 16 }}>{fmt(fn)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SEO content */}
        <div style={{ color: C.muted, lineHeight: 1.8, fontSize: 15 }}>
          <h2 style={{ color: C.text, fontSize: 20, fontWeight: 700, marginBottom: 12, letterSpacing: '-0.02em' }}>
            What is the 4% rule?
          </h2>
          <p style={{ marginBottom: 16 }}>
            The 4% rule (also called the safe withdrawal rate, or SWR) comes from the 1998 Trinity Study.
            Researchers found that a 4% annual withdrawal from a diversified portfolio survived 30+ years
            in 96% of historical market scenarios, including the Great Depression and 1970s stagflation.
          </p>
          <p style={{ marginBottom: 16 }}>
            <strong style={{ color: C.text }}>Your FIRE number = Annual expenses ÷ Withdrawal rate</strong>
            <br />
            At 4%, that&apos;s 25× your annual spending. At 3%, it&apos;s 33×. At 5%, it&apos;s 20×.
          </p>
          <p>
            Early retirees (before 65) typically use 3–3.5% for extra safety — your portfolio needs to last
            40–50 years, not 30. The 4% rule was designed for traditional 30-year retirements starting around age 65.
          </p>
        </div>
      </div>
    </div>
  )
}
