'use client'

import { useState } from 'react'
import { Badge, SegmentedControl } from '@/components/ui'
import {
  DEFAULT_RETURN_PCT, GROWTH_CHOICES, RECOMMENDED_RETURN_PCT, SP500_THROUGH, SP500_WINDOWS,
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
      <p className="uf-t-small" style={{ margin: 0, color: 'var(--uf-ink-2)' }}>
        Pick the history you want to plan on: the S&amp;P 500 with dividends reinvested. Where it starts changes the answer.
      </p>
      <SegmentedControl
        label="Show returns"
        size="sm"
        value={view}
        onChange={setView}
        options={[{ value: 'after', label: 'After inflation' }, { value: 'before', label: 'Before inflation' }]}
      />
      <p className="uf-t-small" style={{ margin: 0, color: 'var(--uf-ink-2)', background: 'var(--uf-surface)', border: '1px solid var(--uf-border)', borderRadius: 'var(--uf-r-control)', padding: 'var(--uf-s3)' }}>
        {view === 'before'
          ? <>This is what an account statement shows. But prices rose about {pct(full.inflationPct)} a year since 1928, so {pct(full.nominalPct)} on paper bought only {pct(full.realPct)} more each year.</>
          : <>What your money can buy, after rising prices. {pct(full.nominalPct)} on paper since 1928 was {pct(full.realPct)} after {pct(full.inflationPct)} inflation. Your freedom date uses this, so every amount stays in today&apos;s dollars.</>}
      </p>
      <div role="radiogroup" aria-label="Growth to plan on" style={{ display: 'grid', gap: 'var(--uf-s2)' }}>
        {GROWTH_CHOICES.map((c) => {
          const on = c.id === selectedId
          const main = view === 'after' ? c.realPct : c.nominalPct
          const other = view === 'after'
            ? `${c.nominalEstimated ? '≈' : ''}${pct(c.nominalPct)} before inflation`
            : `${pct(c.realPct)} after ${c.nominalEstimated ? '≈' : ''}${pct(c.inflationPct)} inflation`
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
              <span className="uf-t-data" style={{ fontWeight: 700, fontSize: 16 }}>
                {c.nominalEstimated && view === 'before' ? '≈' : ''}{pct(main)}
              </span>
              <span className="uf-t-small" style={{ gridColumn: '1 / -1', color: 'var(--uf-ink-2)' }}>{c.why}</span>
              <span className="uf-t-small" style={{ gridColumn: '1 / -1', color: 'var(--uf-ink-3)' }}>
                {c.span} · {other} · {c.beatShare === 100
                  ? 'every 30-year stretch since 1928 did at least this well'
                  : c.beatShare === 0
                    ? 'no 30-year stretch since 1928 did this well'
                    : `${c.beatShare}% of 30-year stretches since 1928 did at least this well`}
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
