'use client'

import { useId, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui'

interface FactorProps {
  title: string
  /** What the factor means. Behind the "?" so the control leads (design rule 7). */
  hint: string
  /** Our pick, a few words ("3.5%"). Omitted where there's nothing to recommend. */
  recommendation?: string
  /** Why we recommend it. Shown with the hint, behind the "?". */
  recommendationWhy?: string
  /** Set only when the current choice differs from the recommendation. */
  onUseRecommendation?: () => void
  /** True when the recommendation is the current choice; shows a tick. Leave unset for advice with nothing to apply. */
  applied?: boolean
  children: ReactNode
}

/**
 * One factor in a calculator: a title, the control, and our pick in one line.
 * What it means and why we pick what we do are one tap away, not in the way.
 */
export default function Factor({ title, hint, recommendation, recommendationWhy, onUseRecommendation, applied, children }: FactorProps) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <section style={{ display: 'grid', gap: 'var(--uf-s3)', paddingBottom: 'var(--uf-s5)', borderBottom: '1px solid var(--uf-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--uf-s2)' }}>
        <h2 className="uf-t-h3" style={{ margin: 0 }}>{title}</h2>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          aria-label={open ? `Hide what ${title.toLowerCase()} means` : `What ${title.toLowerCase()} means`}
          onClick={() => setOpen((v) => !v)}
          style={{
            width: 32, height: 32, borderRadius: 999, border: '1px solid var(--uf-border-2)', background: open ? 'var(--uf-surface-2)' : 'transparent',
            color: 'var(--uf-ink-2)', font: '700 13px var(--uf-font)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ?
        </button>
      </div>
      {open && (
        <div id={id} className="uf-t-small" style={{ color: 'var(--uf-ink-2)', display: 'grid', gap: 'var(--uf-s2)' }}>
          <p style={{ margin: 0 }}>{hint}</p>
          {recommendationWhy && <p style={{ margin: 0 }}><strong style={{ color: 'var(--uf-ink)' }}>Why we recommend it:</strong> {recommendationWhy}</p>}
        </div>
      )}
      {children}
      {recommendation && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--uf-s2) var(--uf-s3)' }}>
          <span className="uf-t-small" style={{ color: 'var(--uf-ink)' }}><strong>Recommended:</strong> {recommendation}</span>
          {onUseRecommendation
            ? <Button variant="secondary" size="sm" onClick={onUseRecommendation}>Use</Button>
            : applied && <span className="uf-t-small" style={{ color: 'var(--uf-ink-3)' }}>✓ In use</span>}
        </div>
      )}
    </section>
  )
}
