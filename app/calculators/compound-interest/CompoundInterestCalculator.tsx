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

function fmt(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}k`
  return `$${Math.round(n)}`
}

function fmtFull(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
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

export default function CompoundInterestCalculator() {
  const [principal, setPrincipal] = useState('10000')
  const [monthly, setMonthly] = useState('500')
  const [rate, setRate] = useState('7')
  const [years, setYears] = useState('20')

  const { finalBalance, totalContributions, totalPrincipal, gains, milestones } = useMemo(() => {
    const p = parseFloat(principal) || 0
    const m = parseFloat(monthly) || 0
    const r = (parseFloat(rate) || 7) / 100 / 12
    const n = (parseFloat(years) || 20) * 12

    const finalBalance = p * Math.pow(1 + r, n) + m * (Math.pow(1 + r, n) - 1) / r
    const totalContributions = m * n
    const totalPrincipal = p + totalContributions
    const gains = finalBalance - totalPrincipal

    const yrs = parseInt(years) || 20
    const milestones = Array.from({ length: Math.min(yrs, 40) }, (_, i) => {
      const y = i + 1
      const months = y * 12
      const bal = p * Math.pow(1 + r, months) + m * (Math.pow(1 + r, months) - 1) / r
      const contrib = p + m * months
      return { year: y, balance: bal, contributions: contrib, gains: bal - contrib }
    })

    return { finalBalance, totalContributions, totalPrincipal, gains, milestones }
  }, [principal, monthly, rate, years])

  const maxBalance = milestones.length > 0 ? milestones[milestones.length - 1].balance : 1

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

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 80px' }}>
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 12, color: C.accent, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>
            Investing · Growth
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 12px', lineHeight: 1.1 }}>
            Compound Interest Calculator
          </h1>
          <p style={{ fontSize: 16, color: C.muted, margin: 0, lineHeight: 1.7 }}>
            Compound interest is the foundation of FIRE. See how your starting balance and
            monthly contributions snowball over time — and how much of your final wealth
            comes from growth rather than what you put in.
          </p>
        </div>

        {/* Inputs */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '32px', marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <label style={labelStyle}>Starting balance ($)</label>
              <input type="number" value={principal} onChange={e => setPrincipal(e.target.value)} style={inputStyle} min="0" step="1000" />
            </div>
            <div>
              <label style={labelStyle}>Monthly contribution ($)</label>
              <input type="number" value={monthly} onChange={e => setMonthly(e.target.value)} style={inputStyle} min="0" step="100" />
            </div>
            <div>
              <label style={labelStyle}>Annual return rate (%)</label>
              <input type="number" value={rate} onChange={e => setRate(e.target.value)} style={inputStyle} min="0" max="30" step="0.5" />
              <div style={{ fontSize: 12, color: C.mutedLight, marginTop: 4 }}>Historical S&P 500 avg: ~7% (inflation-adjusted)</div>
            </div>
            <div>
              <label style={labelStyle}>Time horizon (years)</label>
              <input type="number" value={years} onChange={e => setYears(e.target.value)} style={inputStyle} min="1" max="60" step="1" />
            </div>
          </div>
        </div>

        {/* Result summary */}
        <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 16, padding: '28px 32px', marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 28 }}>
            <div>
              <div style={{ fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 6 }}>Final balance</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: C.accent, letterSpacing: '-0.04em' }}>{fmt(finalBalance)}</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{fmtFull(finalBalance)}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 6 }}>Total invested</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: C.text, letterSpacing: '-0.04em' }}>{fmt(totalPrincipal)}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 6 }}>Investment gains</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#047857', letterSpacing: '-0.04em' }}>{fmt(gains)}</div>
              <div style={{ fontSize: 13, color: C.accent, marginTop: 2 }}>
                {totalPrincipal > 0 ? `${Math.round((gains / totalPrincipal) * 100)}% of what you put in` : ''}
              </div>
            </div>
          </div>

          {/* Bar chart */}
          <div style={{ borderTop: '1px solid #A7F3D0', paddingTop: 20 }}>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 14, fontWeight: 600 }}>Growth over time</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {milestones.filter((_, i) => {
                const totalYears = milestones.length
                if (totalYears <= 10) return true
                if (totalYears <= 20) return i % 2 === 1
                return i % 4 === 3
              }).map(({ year, balance, contributions }) => {
                const contribPct = Math.min((contributions / maxBalance) * 100, 100)
                const balancePct = Math.min((balance / maxBalance) * 100, 100)
                return (
                  <div key={year} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, color: C.muted, width: 36, flexShrink: 0, textAlign: 'right' }}>yr {year}</span>
                    <div style={{ flex: 1, position: 'relative', height: 20, borderRadius: 4, background: '#D1FAE5', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${balancePct}%`, background: 'rgba(5,150,105,0.25)', borderRadius: 4 }} />
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${contribPct}%`, background: 'rgba(5,150,105,0.55)', borderRadius: 4 }} />
                    </div>
                    <span style={{ fontSize: 12, color: C.text, width: 64, flexShrink: 0, textAlign: 'right', fontWeight: 600 }}>{fmt(balance)}</span>
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: 'rgba(5,150,105,0.55)' }} />
                <span style={{ fontSize: 12, color: C.muted }}>Contributions</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: 'rgba(5,150,105,0.25)' }} />
                <span style={{ fontSize: 12, color: C.muted }}>Investment gains</span>
              </div>
            </div>
          </div>
        </div>

        {/* SEO content */}
        <div style={{ color: C.muted, lineHeight: 1.8, fontSize: 15 }}>
          <h2 style={{ color: C.text, fontSize: 20, fontWeight: 700, marginBottom: 12, letterSpacing: '-0.02em' }}>
            How compound interest works
          </h2>
          <p style={{ marginBottom: 16 }}>
            Compound interest means you earn returns not just on your original investment, but also on all the
            returns you&apos;ve already earned. The longer you stay invested, the more your gains compound on themselves.
          </p>
          <p style={{ marginBottom: 16 }}>
            <strong style={{ color: C.text }}>Formula:</strong> A = P(1 + r/n)^(nt) + PMT × [(1 + r/n)^(nt) − 1] / (r/n)
            <br />where P is principal, r is annual rate, n is compounding periods per year, t is years, PMT is monthly contribution.
          </p>
          <p>
            For FIRE planning, the 7% figure (inflation-adjusted historical S&P 500 average) is the standard assumption.
            Starting early matters more than saving more — 10 extra years of compounding often outperforms doubling your monthly contribution.
          </p>
        </div>
      </div>
    </div>
  )
}
