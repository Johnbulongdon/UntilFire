'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'
import type { NetWorthComparison } from '@/lib/net-worth-compare'
import { shareFromComparison, sharePath, sharePct, shareWho } from '@/lib/net-worth-share'

/**
 * Share where you stand, not what you have: the link and its preview image
 * carry the age group and percentage only. Uses the phone's share sheet when
 * there is one, otherwise copies the link.
 */
export default function ShareResult({ comparison }: { comparison: NetWorthComparison }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle')
  const share = shareFromComparison(comparison)
  if (!share) return null

  const onShare = async () => {
    const url = `${window.location.origin}${sharePath(share)}`
    const text = `My net worth is ahead of ${sharePct(share)} of ${shareWho(share)}. How does yours compare?`
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'Net worth by age', text, url })
        return
      } catch (err) {
        // Closing the share sheet is a choice, not a failure.
        if (err instanceof DOMException && err.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`)
      setStatus('copied')
    } catch {
      setStatus('failed')
    }
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--uf-s2)', justifyItems: 'start' }}>
      <Button variant="secondary" onClick={onShare}>Share your result</Button>
      <p className="uf-t-small" role="status" style={{ margin: 0, color: 'var(--uf-ink-3)' }}>
        {status === 'copied'
          ? 'Link copied.'
          : status === 'failed'
            ? 'Couldn’t copy the link. Your browser blocked it.'
            : 'Shares your percentage and age group, never your net worth.'}
      </p>
    </div>
  )
}
