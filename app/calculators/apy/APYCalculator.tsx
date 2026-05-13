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

const FREQUENCIES = [
  { label: 'Daily (365×/year)', n: 365 },
  { label: 'Monthly (12×/year)', n: 12 },
  { label: 'Quarterly (4×/year)', n: 4 },
  { label: 'Semi-annually (2×/year)', n: 2 },
  { label: 'Annually (1×/year)', n: 1 },
]

function fmt(n: number, decimals = 2) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: decimals,
  }).format(n)
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

export default function APYCalculator() {
  const [apr, setApr] = useState('5.00')
  const [freqIndex, setFreqIndex] = useState(1)
  const [principal, setPrincipal] = useState('10000')

  const { apy, monthlyRate, growthRows } = useMemo(() => {
    const r = parseFloat(apr) / 100 || 0
    const n = FREQUENCIES[freqIndex].n
    const p = parseFloat(principal) || 10000

    const apy = Math.pow(1 + r / n, n) - 1
    const monthlyRate = Math.pow(1 + apy, 1 / 12) - 1

    const growthRows = [1, 3, 5, 10].map((years) => ({
      years,
      balance: p * Math.pow(1 + apy, years),
      gained: p * Math.pow(1 + apy, years) - p,
    }))

    return { apy, monthlyRate, growthRows }
  }, [apr, freqIndex, principal])

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: "'Manrope', sans-serif" }}>
      <nav style={{
        borderBottom: `1px solid ${C.border}`,
        padding: '16px 24px',
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Link href="/" style={{ textDecoration: 'none', fontWeight: 800, fontSize: 18, letterSpacing: '-0.04em', color: '#064E3B' }}>
          Until<span style={{ color: '#20D4BF' }}>Fire</span>
        </Link>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link href="/calculators" style={{ color: C.muted, textDecoration: 'none', fontSize: 14 }}>
            ← All calculators
          </Link>
          <Link href="/" style={{ color: '#059669', textDecoration: 'none', fontSize: 14, fontWeight: 600, border: '1px solid #059669', padding: '6px 14px', borderRadius: 6 }}>
            FIRE number →
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '48px 24px 80px' }}>
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 12, color: C.teal, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>
            Savings · Banking
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 12px', lineHeight: 1.1 }}>
            APY Calculator
          </h1>
          <p style={{ fontSize: 16, color: C.muted, margin: 0, lineHeight: 1.7 }}>
            APR (the rate banks advertise) and APY (what you actually earn) are different.
            Compounding turns your APR into a higher effective yield. Use this calculator
            to see your real annual return and project your savings growth.
          </p>
        </div>

        {/* Calculator card */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '32px', marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'grid', gap: 20 }}>
            <div>
              <label style={labelStyle}>Annual Percentage Rate (APR) %</label>
              <input type="number" value={apr} onChange={(e) => setApr(e.target.value)} step="0.01" min="0" max="100" style={inputStyle} placeholder="5.00" />
            </div>
            <div>
              <label style={labelStyle}>Compounding frequency</label>
              <select value={freqIndex} onChange={(e) => setFreqIndex(Number(e.target.value))} style={{ ...inputStyle, cursor: 'pointer' }}>
                {FREQUENCIES.map((f, i) => (
                  <option key={f.n} value={i}>{f.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Starting balance ($)</label>
              <input type="number" value={principal} onChange={(e) => setPrincipal(e.target.value)} step="100" min="0" style={inputStyle} placeholder="10,000" />
            </div>
          </div>
        </div>

        {/* Results */}
        <div style={{
          background: '#ECFDF5',
          border: '1px solid #A7F3D0',
          borderRadius: 16,
          padding: '28px 32px',
          marginBottom: 24,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>
            <div>
              <div style={{ fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 6 }}>Your APY</div>
              <div style={{ fontSize: 40, fontWeight: 800, color: C.accent, letterSpacing: '-0.04em' }}>
                {(apy * 100).toFixed(3)}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 6 }}>Effective monthly rate</div>
              <div style={{ fontSize: 40, fontWeight: 800, color: C.accent, letterSpacing: '-0.04em' }}>
                {(monthlyRate * 100).toFixed(3)}%
              </div>
            </div>
          </div>

          {/* Growth table */}
          <div style={{ borderTop: `1px solid #A7F3D0`, paddingTop: 20 }}>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 12, fontWeight: 600 }}>
              Growth of {fmt(parseFloat(principal) || 10000, 0)}
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {growthRows.map(({ years, balance, gained }) => (
                <div key={years} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  background: '#ffffff',
                  border: '1px solid #E2E8F0',
                  borderRadius: 8,
                }}>
                  <span style={{ color: C.muted, fontSize: 14 }}>{years} year{years !== 1 ? 's' : ''}</span>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: C.text, fontWeight: 700, fontSize: 16 }}>{fmt(balance, 0)}</span>
                    <span style={{ color: C.accent, fontSize: 13, marginLeft: 10 }}>+{fmt(gained, 0)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Explanation */}
        <div style={{ color: C.muted, lineHeight: 1.8, fontSize: 15 }}>
          <h2 style={{ color: C.text, fontSize: 20, fontWeight: 700, marginBottom: 12, letterSpacing: '-0.02em' }}>
            APR vs APY — what&apos;s the difference?
          </h2>
          <p style={{ marginBottom: 16 }}>
            <strong style={{ color: C.text }}>APR (Annual Percentage Rate)</strong> is the simple interest rate a bank advertises.
            <strong style={{ color: C.text }}> APY (Annual Percentage Yield)</strong> is what you actually earn once compounding is factored in.
            The more frequently interest compounds, the higher your APY relative to your APR.
          </p>
          <p style={{ marginBottom: 16 }}>
            <strong style={{ color: C.text }}>Formula:</strong> APY = (1 + APR/n)ⁿ − 1, where n is the number of compounding periods per year.
          </p>
          <p>
            For FIRE planning, high-yield savings accounts and money market funds use daily or monthly compounding.
            Even a small difference in APY compounds significantly over years — which is why this number matters more than the advertised APR.
          </p>
        </div>
      </div>
    </div>
  )
}
