'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'
import { freedomSharePath, freedomShareText } from '@/lib/freedom-share'
import { trackFreedomYearShared } from '@/lib/analytics'

/**
 * Share the freedom year, not the numbers behind it (D-98). Uses the phone's
 * share sheet when there is one, otherwise copies the link.
 */
export default function ShareFreedomYear({ year }: { year: number }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle')

  const onShare = async () => {
    const url = `${window.location.origin}${freedomSharePath(year)}`
    const text = freedomShareText(year)
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: `Free in ${year}`, text, url })
        trackFreedomYearShared({ shareMethod: 'native' })
        return
      } catch (err) {
        // Closing the share sheet is a choice, not a failure.
        if (err instanceof DOMException && err.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`)
      setStatus('copied')
      trackFreedomYearShared({ shareMethod: 'clipboard' })
    } catch {
      setStatus('failed')
    }
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--uf-s2)', justifyItems: 'center' }}>
      <Button variant="secondary" onClick={onShare}>Share my freedom year</Button>
      <p className="uf-t-small" role="status" style={{ margin: 0, color: 'var(--uf-ink-3)' }}>
        {status === 'copied'
          ? 'Link copied.'
          : status === 'failed'
            ? 'Couldn’t copy the link. Your browser blocked it.'
            : 'Shares the year only, never your money.'}
      </p>
    </div>
  )
}
