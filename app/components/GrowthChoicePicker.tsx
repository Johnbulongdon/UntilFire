'use client'

import { useState } from 'react'
import { Badge, SegmentedControl } from '@/components/ui'
import {
  GROWTH_CHOICES, RECOMMENDED_RETURN_PCT, SP500_THROUGH,
} from '@/lib/fire-number'

interface Props {
  /** The growth in use, after inflation, as a percentage (6.9). */
  value: number
  onChange: (pct: number) => void
}

type View = 'after' | 'before'

/**
 * "How much will your investments grow?" answered with history instead of a
 * number to take on trust. Each choice is a stretch of S&P 500 history with
 * the reason its start year matters, what it returned, and how often any 30
 * years since 1928 did at least as well. The view switches between the
 * before-inflation figure an account statement shows and the after-inflation
 * one the freedom date uses, and says why they differ. D-24.
 */
export default function GrowthChoicePicker({ value, onChange }: Props) {
  // Remember the row picked, in case two stretches ever share a rate.
  const [picked, setPicked] = useState<string | null>(null)
  const [view, setView] = useState<View>('after')
  const pickedMatches = GROWTH_CHOICES.some((c) => c.id === picked && c.realPct === value)
  const selectedId = pickedMatches ? picked : GROWTH_CHOICES.find((c) => c.realPct === value)?.id
  const pct = (n: number) => `${n.toFixed(1)}%`
  const full = GROWTH_CHOICES.find((c) => c.id === 'since1928')!

  return (
    <div style={{ display: 'grid', gap: 'var(--uf-s3)' }}>
      <SegmentedControl
        label="Show returns"
        size="sm"
        value={view}
        onChange={setView}
        options={[{ value: 'after', label: 'After inflation' }, { value: 'before', label: 'Before inflation' }]}
      />
      <p className="uf-t-small" style={{ margin: 0, color: 'var(--uf-ink-2)' }}>
        {view === 'before'
          ? <>What an account shows. Prices rose {pct(full.inflationPct)} a year, so {pct(full.nominalPct)} bought {pct(full.realPct)} more.</>
          : <>What your money can buy. Your date uses this.</>}
      </p>
      <div role="radiogroup" aria-label="Growth to plan on" style={{ display: 'grid', gap: 'var(--uf-s2)' }}>
        {GROWTH_CHOICES.map((c) => {
          const on = c.id === selectedId
          const main = view === 'after' ? c.realPct : c.nominalPct
          const approx = c.nominalEstimated && view === 'before' ? '≈' : ''
          const confidence = c.beatShare === 100 ? 'every' : c.beatShare === 0 ? 'none' : `${c.beatShare}%`
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`${c.label}, ${approx}${pct(main)} a year ${view === 'after' ? 'after' : 'before'} inflation. ${confidence} of 30-year stretches since 1928 did at least this well.`}
              onClick={() => { setPicked(c.id); onChange(c.realPct) }}
              style={{
                display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: '4px var(--uf-s3)', textAlign: 'left',
                padding: 'var(--uf-s3)', borderRadius: 'var(--uf-r-control)', cursor: 'pointer', font: 'inherit',
                background: on ? 'var(--uf-green-50)' : 'var(--uf-card)',
                border: on ? '2px solid var(--uf-green)' : '1px solid var(--uf-border)',
                color: 'var(--uf-ink)',
              }}
            >
              <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--uf-s2)' }}>
                <span className="uf-t-body" style={{ fontWeight: 700 }}>{c.label}</span>
                {c.realPct === RECOMMENDED_RETURN_PCT && <Badge tone="positive">Recommended</Badge>}
              </span>
              <Confidence share={c.beatShare} />
              <span className="uf-t-data" style={{ fontWeight: 700, fontSize: 16, minWidth: 52, textAlign: 'right' }}>{approx}{pct(main)}</span>
              {on && (
                <span className="uf-t-small" style={{ gridColumn: '1 / -1', color: 'var(--uf-ink-2)' }}>
                  {c.why}{' '}
                  {[c.span, view === 'after' ? `${c.nominalEstimated ? '≈' : ''}${pct(c.nominalPct)} before inflation` : `${pct(c.realPct)} after inflation`, `${confidence} of 30-year stretches did as well.`].filter(Boolean).join(' · ')}
                </span>
              )}
            </button>
          )
        })}
      </div>
      <p className="uf-t-small" style={{ margin: 0, color: 'var(--uf-ink-3)' }}>
        Dots: how often any 30 years since 1928 did as well. S&amp;P 500 (Shiller) and BLS data to {SP500_THROUGH}.
      </p>
    </div>
  )
}

/** Five dots for how often history did at least this well: a glance, not a sentence. */
function Confidence({ share }: { share: number }) {
  const filled = Math.round(share / 20)
  return (
    <span aria-hidden="true" style={{ display: 'inline-flex', gap: 3 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ width: 7, height: 7, borderRadius: 999, background: i < filled ? 'var(--uf-ink-2)' : 'transparent', border: '1px solid var(--uf-ink-3)' }} />
      ))}
    </span>
  )
}