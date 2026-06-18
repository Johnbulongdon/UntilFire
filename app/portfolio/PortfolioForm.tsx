'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { parseHoldingsText, encodeHoldings } from '@/lib/portfolio/parse'
import { getFund } from '@/lib/funds/metadata'

const BG = '#08080e'
const CARD = '#111118'
const BORDER = '#23232d'
const MUTED = '#8a8a99'
const TEAL = '#22d3a5'

const EXAMPLES: { label: string; value: string }[] = [
  { label: 'Three-fund', value: 'VTI 60%, VXUS 30%, BND 10%' },
  { label: 'S&P 500 only', value: 'VOO 100%' },
  { label: 'Aggressive global', value: 'VTI 50, VXUS 20, AVUV 15, AVDV 10, AVEM 5' },
]

export default function PortfolioForm() {
  const router = useRouter()
  const [text, setText] = useState('')

  const parsed = useMemo(() => parseHoldingsText(text), [text])
  const total = Math.round(parsed.totalWeight)
  const hasHoldings = parsed.holdings.length > 0
  const weightOk = total >= 95 && total <= 105

  function analyze() {
    if (!hasHoldings) return
    const h = encodeHoldings(parsed.holdings)
    router.push(`/portfolio/result?h=${encodeURIComponent(h)}`)
  }

  return (
    <div style={{ maxWidth: 640, width: '100%', display: 'flex', flexDirection: 'column' }}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'Type your holdings, e.g.\nVTI 60%\nVXUS 30%\nBND 10%'}
        rows={6}
        spellCheck={false}
        style={{
          width: '100%',
          background: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 14,
          color: '#fff',
          fontSize: 18,
          padding: '18px 20px',
          fontFamily: 'inherit',
          resize: 'vertical',
          outline: 'none',
        }}
      />

      {/* Examples */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
        <span style={{ color: MUTED, fontSize: 14, alignSelf: 'center' }}>Try:</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex.label}
            onClick={() => setText(ex.value)}
            style={{
              background: 'transparent',
              border: `1px solid ${BORDER}`,
              color: '#d6d6e0',
              borderRadius: 999,
              padding: '6px 14px',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            {ex.label}
          </button>
        ))}
      </div>

      {/* Live preview */}
      {hasHoldings && (
        <div style={{ marginTop: 20, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '16px 20px' }}>
          {parsed.holdings.map((h) => {
            const fund = getFund(h.ticker)
            return (
              <div key={h.ticker} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: 16, width: 80 }}>{h.ticker}</span>
                  <span style={{ color: fund ? MUTED : '#f97316', fontSize: 14 }}>
                    {fund ? fund.name : 'Unrecognized ticker'}
                  </span>
                </div>
                <span style={{ color: TEAL, fontWeight: 700, fontSize: 16 }}>{Math.round(h.weight)}%</span>
              </div>
            )
          })}
          <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: 8, paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: MUTED, fontSize: 14 }}>Total weight</span>
            <span style={{ color: weightOk ? TEAL : '#fbbf24', fontWeight: 700, fontSize: 16 }}>
              {total}%{weightOk ? '' : ' · will be normalized to 100%'}
            </span>
          </div>
        </div>
      )}

      {parsed.errors.length > 0 && text.trim() !== '' && (
        <div style={{ marginTop: 12, color: '#fbbf24', fontSize: 14 }}>
          {parsed.errors.slice(0, 3).map((e, i) => (
            <div key={i}>{e}</div>
          ))}
        </div>
      )}

      <button
        onClick={analyze}
        disabled={!hasHoldings}
        style={{
          marginTop: 24,
          background: hasHoldings ? TEAL : '#1c1c26',
          color: hasHoldings ? BG : MUTED,
          fontWeight: 800,
          fontSize: 18,
          padding: '16px 32px',
          borderRadius: 12,
          border: 'none',
          cursor: hasHoldings ? 'pointer' : 'not-allowed',
        }}
      >
        Rate my portfolio →
      </button>
      <p style={{ color: MUTED, fontSize: 13, marginTop: 14 }}>
        No login. Educational only — not financial advice.
      </p>
    </div>
  )
}
