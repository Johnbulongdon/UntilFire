'use client'

import type { ReactNode } from 'react'
import { Button } from '@/components/ui'

interface FactorProps {
  title: string
  hint: string
  /** What we'd pick and why. Omitted where there's nothing to recommend. */
  recommendation?: string
  /** Set only when the current choice differs from the recommendation. */
  onUseRecommendation?: () => void
  children: ReactNode
}

/**
 * One factor in the FIRE number: what it is, the control, and our
 * recommendation, so the reader knows what they're choosing and whether to.
 */
export default function Factor({ title, hint, recommendation, onUseRecommendation, children }: FactorProps) {
  return (
    <section style={{ display: 'grid', gap: 'var(--uf-s3)', paddingBottom: 'var(--uf-s5)', borderBottom: '1px solid var(--uf-border)' }}>
      <div>
        <h2 className="uf-t-h3" style={{ margin: '0 0 var(--uf-s1)' }}>{title}</h2>
        <p className="uf-t-small" style={{ margin: 0, color: 'var(--uf-ink-2)' }}>{hint}</p>
      </div>
      {children}
      {recommendation && (
        <div style={{ background: 'var(--uf-surface)', border: '1px solid var(--uf-border)', borderRadius: 'var(--uf-r-control)', padding: 'var(--uf-s3)', display: 'grid', gap: 'var(--uf-s2)', justifyItems: 'start' }}>
          <p className="uf-t-small" style={{ margin: 0, color: 'var(--uf-ink)' }}>
            <strong>Recommended: </strong>{recommendation}
          </p>
          {onUseRecommendation
            ? <Button variant="secondary" size="sm" onClick={onUseRecommendation}>Use recommended</Button>
            : <span className="uf-t-small" style={{ color: 'var(--uf-ink-3)' }}>✓ Using the recommendation</span>}
        </div>
      )}
    </section>
  )
}
