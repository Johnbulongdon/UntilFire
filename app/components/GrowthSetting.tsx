'use client'

import { useState } from 'react'
import GrowthChoicePicker from '@/app/components/GrowthChoicePicker'
import { CAUTIOUS_RETURN_PCT, RECOMMENDED_RETURN_PCT } from '@/lib/fire-number'

interface Props {
  /** Growth after inflation, as a percentage (6.9). */
  value: number
  onChange: (pct: number) => void
}

/**
 * The growth assumption in one line, with the history behind a "Change" tap:
 * the same pattern as the free result, so a calculator's inputs and its answer
 * stay on one phone screen (design rule 7).
 */
export default function GrowthSetting({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const note = value === RECOMMENDED_RETURN_PCT ? ', recommended' : value === CAUTIOUS_RETURN_PCT ? ', cautious' : ''
  return (
    <div style={{ display: 'grid', gap: 'var(--uf-s3)' }}>
      <p className="uf-t-body" style={{ margin: 0, color: 'var(--uf-ink-2)' }}>
        <b style={{ color: 'var(--uf-ink)' }}>{value}% growth</b> a year after inflation{note}.{' '}
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          style={{ background: 'none', border: 'none', padding: 0, color: 'var(--uf-green)', font: 'inherit', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}
        >
          {open ? 'Done' : 'Change'}
        </button>
      </p>
      {open && <GrowthChoicePicker value={value} onChange={onChange} />}
    </div>
  )
}
