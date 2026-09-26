'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui'
import {
  DEFAULT_RETURN_PCT, GROWTH_CHOICES, RECOMMENDED_RETURN_PCT, SP500_THROUGH, SP500_WINDOWS,
} from '@/lib/fire-number'

interface Props {
  /** The growth in use, after inflation, as a percentage (6.9). */
  value: number
  onChange: (pct: number) => void
}

/**
 * "How much will your investments grow?" answered with history instead of a
 * number to take on trust: each choice is a stretch of S&P 500 history, what
 * it returned before and after inflation, and how often any 30 years since
 * 1928 did at least as well. Shorter, recent periods look higher; this shows
 * what that confidence costs. D-24.
 */
export default function GrowthChoicePicker({ value, onChange }: Props) {
  // Two stretches can share a rate (the last 20 and 50 years both round to
  // 8.1%), so remember which one was picked; otherwise the first that matches.
  const [picked, setPicked] = useState<string | null>(null)
  const pickedMatches = GROWTH_CHOICES.some((c) => c.id === picked && c.realPct === value)
  const selectedId = pickedMatches ? picked : GROWTH_CHOICES.find((c) => c.realPct === value)?.id
  const pct = (n: number) => `${n.toFixed(1)}%`
  return (
    <div style={{ display: 'grid', gap: 'var(--uf-s2)' }}>
      <p className="uf-t-small" style={{ margin: 0, color: 'var(--uf-ink-2)' }}>
        Pick the history you want to plan on: the S&amp;P 500 with dividends reinvested, a year, after inflation.
      </p>
      <div role="radiogroup" aria-label="Growth after inflation" style={{ display: 'grid', gap: 'var(--uf-s2)' }}>
        {GROWTH_CHOICES.map((c) => {
          const on = c.id === selectedId
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => { setPicked(c.id); onChange(c.realPct) }}
              style={{
                display: 'grid', gridTemplateColumns: '1fr auto', gap: '2px var(--uf-s3)', textAlign: 'left',
                padding: 'var(--uf-s3)', borderRadius: 'var(--uf-r-control)', cursor: 'pointer', font: 'inherit',
                background: on ? 'var(--uf-green-50)' : 'var(--uf-card)',
                border: on ? '2px solid var(--uf-green)' : '1px solid var(--uf-border)',
                color: 'var(--uf-ink)',
              }}
            >
              <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--uf-s2)' }}>
                <span className="uf-t-body" style={{ fontWeight: 700 }}>{c.label}</span>
                {c.realPct === RECOMMENDED_RETURN_PCT && <Badge tone="positive">Recommended</Badge>}
                {c.realPct === DEFAULT_RETURN_PCT && <Badge tone="muted">Default</Badge>}
              </span>
              <span className="uf-t-data" style={{ fontWeight: 700, fontSize: 16 }}>{pct(c.realPct)}</span>
              <span className="uf-t-small" style={{ color: 'var(--uf-ink-2)' }}>
                {c.span}{c.nominalPct !== null && <> · {pct(c.nominalPct)} before inflation</>}
              </span>
              <span className="uf-t-small" style={{ color: 'var(--uf-ink-3)', textAlign: 'right' }}>a year</span>
              <span className="uf-t-small" style={{ gridColumn: '1 / -1', color: 'var(--uf-ink-2)' }}>
                {c.beatShare === 100
                  ? <>Every 30-year stretch since 1928 did at least this well.</>
                  : c.beatShare === 0
                    ? <>No 30-year stretch since 1928 did this well.</>
                    : <>{c.beatShare}% of 30-year stretches since 1928 did at least this well.</>}
              </span>
            </button>
          )
        })}
      </div>
      <p className="uf-t-small" style={{ margin: 0, color: 'var(--uf-ink-3)' }}>
        From Robert Shiller&apos;s S&amp;P 500 data and BLS inflation, through {SP500_THROUGH}, across {SP500_WINDOWS} thirty-year stretches. History is a guide, not a promise.
      </p>
    </div>
  )
}
