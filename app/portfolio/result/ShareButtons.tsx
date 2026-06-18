'use client'

import { useState } from 'react'

const BORDER = '#23232d'
const TEAL = '#22d3a5'
const BG = '#08080e'

export default function ShareButtons({
  shareSlug,
  reportImageUrl,
  shareText,
}: {
  shareSlug: string // e.g. "h=VTI:60,VXUS:30,BND:10"
  reportImageUrl: string // /api/portfolio/report?h=...
  shareText: string
}) {
  const [copied, setCopied] = useState(false)

  // Built client-side so it includes the real origin.
  const pageUrl = typeof window !== 'undefined' ? `${window.location.origin}/portfolio/result?${shareSlug}` : ''

  async function nativeShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'My UntilFire portfolio check', text: shareText, url: pageUrl })
      } catch {
        /* user cancelled */
      }
    } else {
      copyLink()
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(pageUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }

  const xUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(pageUrl)}`
  const liUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
      <a href={reportImageUrl} download="untilfire-portfolio.png" style={primaryBtn}>
        ⬇ Download image
      </a>
      <button onClick={nativeShare} style={ghostBtn}>
        ↗ Share
      </button>
      <button onClick={copyLink} style={ghostBtn}>
        {copied ? '✓ Copied' : '🔗 Copy link'}
      </button>
      <a href={xUrl} target="_blank" rel="noopener noreferrer" style={ghostBtn}>
        Post on X
      </a>
      <a href={liUrl} target="_blank" rel="noopener noreferrer" style={ghostBtn}>
        LinkedIn
      </a>
    </div>
  )
}

const primaryBtn: React.CSSProperties = {
  background: TEAL,
  color: BG,
  fontWeight: 800,
  fontSize: 15,
  padding: '12px 22px',
  borderRadius: 10,
  border: 'none',
  cursor: 'pointer',
  textDecoration: 'none',
}

const ghostBtn: React.CSSProperties = {
  background: 'transparent',
  color: '#d6d6e0',
  fontWeight: 600,
  fontSize: 15,
  padding: '12px 22px',
  borderRadius: 10,
  border: `1px solid ${BORDER}`,
  cursor: 'pointer',
  textDecoration: 'none',
}
