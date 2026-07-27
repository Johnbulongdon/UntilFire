'use client'

import { useEffect, useRef } from 'react'

/**
 * Brand loading splash — plays the logo-reveal video once, then fades to the app.
 *
 * Visibility is decided synchronously by a tiny inline script in the root layout
 * (see app/layout.tsx) which sets `data-splash="1"` on <html> BEFORE first paint
 * when — and only when — the splash should show: the first load of a browser
 * session, and not when the visitor prefers reduced motion. That avoids any
 * flash of the app before the splash appears, and avoids replaying on internal
 * navigations or reloads. This component then plays the video and dismisses it.
 *
 * It always dismisses (video end, tap/scroll/key to skip, or a safety timeout),
 * so it can never trap a visitor away from the freedom-date result.
 */
export default function LoadingSplash() {
  const rootRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const html = document.documentElement
    // The inline head script only sets this when the splash should show.
    if (html.getAttribute('data-splash') !== '1') return

    const el = rootRef.current
    const video = videoRef.current
    let dismissed = false

    const cleanup = () => {
      window.removeEventListener('pointerdown', onSkip)
      window.removeEventListener('keydown', onSkip)
      window.removeEventListener('wheel', onSkip)
    }

    const dismiss = () => {
      if (dismissed) return
      dismissed = true
      el?.classList.add('is-leaving')
      // After the fade, drop the flag so CSS hides it (display:none).
      window.setTimeout(() => html.removeAttribute('data-splash'), 650)
      cleanup()
    }

    const onSkip = () => dismiss()

    // Safety cap: never hold the screen longer than the clip (4s) + a little slack.
    const cap = window.setTimeout(dismiss, 4600)

    if (video) {
      const p = video.play?.()
      if (p && typeof p.catch === 'function') p.catch(dismiss) // autoplay blocked → skip
      video.addEventListener('ended', dismiss, { once: true })
      video.addEventListener('error', dismiss, { once: true })
    } else {
      dismiss()
    }

    window.addEventListener('pointerdown', onSkip)
    window.addEventListener('keydown', onSkip)
    window.addEventListener('wheel', onSkip, { passive: true })

    return () => {
      window.clearTimeout(cap)
      cleanup()
    }
  }, [])

  // Rendered in SSR so it exists on first paint; CSS keeps it hidden unless
  // <html data-splash="1"> (set by the head script). aria-hidden: decorative.
  return (
    <div id="uf-splash" ref={rootRef} aria-hidden="true">
      <video
        ref={videoRef}
        src="/logo/logo-reveal.mp4"
        muted
        playsInline
        autoPlay
        preload="auto"
      />
    </div>
  )
}
