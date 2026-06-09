'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Logo from '@/app/components/Logo'
import { calcPurchaseImpact, formatDelay, formatFV } from '@/lib/purchase-impact'

const C = {
  bg: '#F7F9FB',
  card: '#ffffff',
  border: '#E2E8F0',
  text: '#19181E',
  muted: '#64748B',
  accent: '#059669',
  orange: '#f97316',
}

const inputStyle: React.CSSProperties = {
  background: C.card,
  border: `1.5px solid ${C.border}`,
  borderRadius: 10,
  color: C.text,
  fontSize: 16,
  padding: '11px 14px',
  width: '100%',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: "'Manrope', sans-serif",
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: C.muted,
  marginBottom: 6,
  display: 'block',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
}

export default function PurchaseImpactCalculator() {
  const [price,    setPrice]    = useState('1000')
  const [savings,  setSavings]  = useState('50000')
  const [monthly,  setMonthly]  = useState('1000')
  const [target,   setTarget]   = useState('1000000')
  const [rate,     setRate]     = useState('7')

  const result = useMemo(() => {
    const p  = parseFloat(price)
    const s  = parseFloat(savings)
    const m  = parseFloat(monthly)
    const t  = parseFloat(target)
    const r  = parseFloat(rate) / 100
    if ([p, s, m, t, r].some(v => isNaN(v) || v < 0)) return null
    return calcPurchaseImpact(p, s, m, t, r)
  }, [price, savings, monthly, target, rate])

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: "'Manrope', sans-serif" }}>
      {/* Nav */}
      <nav style={{ borderBottom: `1px solid ${C.border}`, background: C.card }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 24 }}>
          <Link href="/" style={{ textDecoration: 'none', color: C.accent }}>
            <Logo variant="dark" size={24} />
          </Link>
          <Link href="/calculators" style={{ fontSize: 13, color: C.muted, textDecoration: 'none', fontWeight: 600 }}>
            ← All calculators
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px 80px' }}>
        <header style={{ marginBottom: 36 }}>
          <p style={{ fontSize: 12, color: C.accent, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 10px' }}>
            Purchase Impact
          </p>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 800, color: C.text, margin: '0 0 12px', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
            What does this purchase really cost you?
          </h1>
          <p style={{ fontSize: 16, color: C.muted, maxWidth: 560, lineHeight: 1.7, margin: 0 }}>
            Every purchase has a hidden cost — the compound growth you give up and the freedom days it takes from you. Enter a price and your FIRE profile to see the real cost.
          </p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 24, alignItems: 'start' }}>
          {/* Inputs */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Purchase price — prominent */}
            <div>
              <label style={{ ...labelStyle, color: C.accent }}>Purchase price</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 22, fontWeight: 800, color: C.muted }}>$</span>
                <input
                  type="number"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="0"
                  style={{ ...inputStyle, paddingLeft: 36, fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px' }}
                />
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: `1px solid ${C.border}`, margin: '4px 0' }} />
            <p style={{ fontSize: 12, color: C.muted, margin: 0, fontWeight: 600 }}>Your FIRE profile</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>Current savings</label>
                <input type="number" value={savings} onChange={e => setSavings(e.target.value)} style={inputStyle} placeholder="50000" />
              </div>
              <div>
                <label style={labelStyle}>Monthly contribution</label>
                <input type="number" value={monthly} onChange={e => setMonthly(e.target.value)} style={inputStyle} placeholder="1000" />
              </div>
              <div>
                <label style={labelStyle}>FIRE target ($)</label>
                <input type="number" value={target} onChange={e => setTarget(e.target.value)} style={inputStyle} placeholder="1000000" />
              </div>
              <div>
                <label style={labelStyle}>Expected return (%)</label>
                <input type="number" value={rate} onChange={e => setRate(e.target.value)} style={inputStyle} placeholder="7" step="0.1" min="0" max="30" />
              </div>
            </div>
          </div>

          {/* Results */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {result ? (
              <>
                <div style={{ background: '#001f3f', borderRadius: 18, padding: '28px 28px' }}>
                  <div style={{ fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', fontWeight: 700, marginBottom: 8 }}>
                    Worth at your freedom date
                  </div>
                  <div style={{ fontSize: 'clamp(36px, 6vw, 52px)', fontWeight: 800, color: '#62FAE3', fontFamily: 'Manrope, sans-serif', letterSpacing: '-2px', lineHeight: 1 }}>
                    {formatFV(result.futureValue)}
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 10, lineHeight: 1.6 }}>
                    ${parseFloat(price || '0').toLocaleString()} compounded at {rate}%/yr for {(result.baselineMonths / 12).toFixed(1)} years
                  </div>
                </div>

                <div style={{ background: '#3b0000', borderRadius: 18, padding: '28px 28px' }}>
                  <div style={{ fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', fontWeight: 700, marginBottom: 8 }}>
                    Freedom delayed by
                  </div>
                  <div style={{ fontSize: 'clamp(36px, 6vw, 52px)', fontWeight: 800, color: '#FCA5A5', fontFamily: 'Manrope, sans-serif', letterSpacing: '-2px', lineHeight: 1 }}>
                    {formatDelay(result.delayDays)}
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 10, lineHeight: 1.6 }}>
                    {result.delayDays === 1 ? 'That\'s 1 day later' : `That\'s ${result.delayDays} days later`} — every dollar left invested keeps compounding
                  </div>
                </div>

                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: '20px 24px' }}>
                  <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7 }}>
                    <strong style={{ color: C.text }}>Want a personalised calculation?</strong> Log in to UntilFire and this tool fills from your real savings, contribution, and FIRE target automatically.
                  </div>
                  <Link href="/dashboard" style={{ display: 'inline-block', marginTop: 12, background: C.accent, color: '#fff', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                    Use with my profile →
                  </Link>
                </div>
              </>
            ) : (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: '48px 28px', textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>🛒</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>
                  Enter a price to see the impact
                </div>
                <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.7 }}>
                  Type any purchase price on the left and the compound value and freedom delay appear instantly.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
