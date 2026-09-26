'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Field, Input } from '@/components/ui'
import { fireNumber } from '@/lib/fire-number'
import { formatMoney } from '@/lib/money'
import styles from './Article.module.css'

/**
 * The definition made concrete: a year of spending in, the plain 25× FIRE
 * number out. The full calculator names the other factors (tax, other
 * income, the withdrawal rate), so this stays one input.
 */
export default function FireNumberQuick() {
  const [raw, setRaw] = useState('50000')
  const spending = Number(raw)
  const valid = raw.trim() !== '' && Number.isFinite(spending) && spending >= 0
  const result = valid ? fireNumber({ annualSpending: spending }) : null

  return (
    <aside
      aria-label="Your FIRE number"
      className="ph-no-capture"
      style={{
        background: 'var(--uf-surface)', border: '1px solid var(--uf-border)', borderRadius: 18,
        padding: 'var(--uf-s5)', margin: 'var(--uf-s4) 0 var(--uf-s5)', display: 'grid', gap: 'var(--uf-s4)',
      }}
    >
      <Field label="What you spend in a year (USD)" htmlFor="fire-quick-spending" hint="Everything: housing, food, travel, insurance.">
        <Input
          id="fire-quick-spending" numeric type="number" inputMode="decimal" min={0} step={1000}
          value={raw} onChange={(e) => setRaw(e.target.value)}
        />
      </Field>
      <div>
        <div className="uf-t-label" style={{ color: 'var(--uf-ink-2)', marginBottom: 'var(--uf-s1)' }}>Your FIRE number</div>
        <div className="uf-t-data" aria-live="polite" style={{ fontSize: 32, fontWeight: 700, color: 'var(--uf-ink)' }}>
          {result ? formatMoney(Math.round(result.fireNumber)) : '—'}
        </div>
        <p className="uf-t-small" style={{ margin: 'var(--uf-s1) 0 0', color: 'var(--uf-ink-2)' }}>
          25 × your yearly spending, from the 4% rule. Taxes, a pension or part-time income change it.
        </p>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--uf-s3)', alignItems: 'center' }}>
        <Link
          href="/?source=learn-fire-meaning"
          className={`uf-t-body ${styles.primaryLink}`}
          style={{ display: 'inline-flex', alignItems: 'center', background: 'var(--uf-green)', padding: '0 var(--uf-s5)', borderRadius: 999, fontWeight: 700, textDecoration: 'none' }}
        >
          When could you reach it? →
        </Link>
        <Link href="/calculators/4-percent-rule" className="uf-t-body" style={{ color: 'var(--uf-green)', fontWeight: 700 }}>
          Adjust tax and other income
        </Link>
      </div>
    </aside>
  )
}
