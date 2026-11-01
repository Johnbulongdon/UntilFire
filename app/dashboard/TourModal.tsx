'use client'
import { useState, useEffect } from 'react'
import { Button, Icon, type IconName } from '@/components/ui'
import Logo from '@/app/components/Logo'

// Names match the menus (docs/design/app-structure.md), and only features that exist.
const TOUR_SLIDES: { tabKey: string | null; icon: IconName | null; title: string; description: string }[] = [
  { tabKey: null,              icon: null, title: "Welcome to UntilFire",  description: "A 30-second look around. Use the arrows or tap a dot to jump." },
  { tabKey: "overview",        icon: "home", title: "Home",                  description: "Your freedom date, progress toward your FIRE number, and the one move that helps most right now." },
  { tabKey: "cashflow",        icon: "money", title: "Money",                 description: "Transactions, a calendar of payments, categories and budgets; Net Worth, Debts and Insights for the bigger picture." },
  { tabKey: "fire-calculator", icon: "plan", title: "Plan",                  description: "Your freedom date and the assumptions behind it, plus What if, Goals, Contributions, Explore and Learn." },
  { tabKey: "profile",         icon: "profile", title: "Profile",               description: "Your account, currency, Pro subscription, household and FIRE type." },
]

export default function TourModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const slide = TOUR_SLIDES[step]
  const isLast = step === TOUR_SLIDES.length - 1
  const isIntro = step === 0

  useEffect(() => {
    if (!slide.tabKey) { setRect(null); return }
    const measure = () => {
      const el = document.querySelector(`[data-tour-item="${slide.tabKey}"]`)
      setRect(el ? el.getBoundingClientRect() : null)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [step, slide.tabKey])

  // Mobile bottom nav: tab is in the bottom ~35% of the viewport
  const isMobileNav = rect ? rect.top > window.innerHeight * 0.65 : false

  const tooltipStyle: React.CSSProperties | null = rect ? (isMobileNav ? {
    position: 'fixed',
    left: Math.max(8, Math.min(rect.left - 16, window.innerWidth - 316)),
    bottom: window.innerHeight - rect.top + 12,
    width: 300,
  } : {
    position: 'fixed',
    left: rect.right + 16,
    top: Math.max(8, Math.min(rect.top + rect.height / 2 - 120, window.innerHeight - 300)),
    width: 288,
  }) : null

  const effectiveTooltipStyle: React.CSSProperties = tooltipStyle ?? {
    position: 'fixed',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: 300,
  }

  const dots = (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {TOUR_SLIDES.map((_, i) => (
        <button
          key={i}
          type="button"
          aria-label={`Go to step ${i + 1}`}
          aria-current={i === step ? 'step' : undefined}
          onClick={() => setStep(i)}
          style={{
            width: i === step ? 16 : 6, height: 6, padding: 0, border: 'none',
            borderRadius: 'var(--uf-r-pill)',
            background: i === step ? 'var(--uf-ink)' : 'var(--uf-border-2)',
            transition: 'width var(--uf-dur-2) var(--uf-ease)',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  )

  const card: React.CSSProperties = {
    background: 'var(--uf-card)', color: 'var(--uf-ink)', border: '1px solid var(--uf-border)', boxShadow: 'var(--uf-e3)',
  }

  return (
    <>
      {/* Dark overlay — click to dismiss */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: rect ? 'transparent' : 'var(--uf-scrim)', zIndex: 290 }}
      />

      {/* Spotlight around the active tab: the scrim is the shadow, the ring is freedom yellow */}
      {rect && (
        <div style={{
          position: 'fixed',
          top: rect.top - 4,
          left: rect.left - 4,
          width: rect.width + 8,
          height: rect.height + 8,
          borderRadius: 'var(--uf-r-control)',
          boxShadow: '0 0 0 9999px var(--uf-scrim), 0 0 0 3px var(--uf-yellow)',
          zIndex: 291,
          pointerEvents: 'none',
        }} />
      )}

      {/* Intro slide — centered welcome card */}
      {isIntro && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16, pointerEvents: 'none',
        }}>
          <div role="dialog" aria-modal="true" aria-labelledby="uf-tour-title" style={{
            ...card, borderRadius: 'var(--uf-r-modal)',
            padding: '32px 28px 24px',
            maxWidth: 420, width: '100%',
            pointerEvents: 'auto',
            display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
          }}>
            <div style={{ marginBottom: 20 }}><Logo variant="auto" size={26} /></div>
            <h2 id="uf-tour-title" className="uf-t-h2" style={{ margin: '0 0 8px' }}>
              {slide.title}
            </h2>
            <p className="uf-t-body" style={{ color: 'var(--uf-ink-2)', margin: '0 0 20px' }}>
              {slide.description}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
              {dots}
            </div>
            <Button variant="primary" size="lg" fullWidth onClick={() => setStep(1)}>
              Start tour →
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} style={{ marginTop: 8 }}>
              Skip tour
            </Button>
          </div>
        </div>
      )}

      {/* Spotlight tooltip for tab steps */}
      {!isIntro && (
        <div role="dialog" aria-modal="true" aria-labelledby="uf-tour-step-title" style={{
          ...effectiveTooltipStyle,
          ...card,
          zIndex: 300,
          borderRadius: 'var(--uf-r-card)',
          padding: '18px 18px 14px',
        }}>
          {/* Arrow pointing left toward the sidebar tab (desktop) */}
          {tooltipStyle && !isMobileNav && (
            <div style={{ position: 'absolute', left: -8, top: '38%', width: 0, height: 0, borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderRight: '8px solid var(--uf-card)' }} />
          )}
          {/* Arrow pointing down toward the bottom nav tab (mobile) */}
          {tooltipStyle && isMobileNav && (
            <div style={{ position: 'absolute', bottom: -8, left: 28, width: 0, height: 0, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: '8px solid var(--uf-card)' }} />
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            {slide.icon && (
              <span aria-hidden style={{ width: 32, height: 32, borderRadius: 'var(--uf-r-pill)', background: 'var(--uf-yellow)', color: 'var(--uf-on-accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name={slide.icon} size={17} />
              </span>
            )}
            <h3 id="uf-tour-step-title" className="uf-t-h3" style={{ margin: 0, flex: 1 }}>
              {slide.title}
            </h3>
            <span style={{ fontSize: 12, color: 'var(--uf-ink-3)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {step} of {TOUR_SLIDES.length - 1}
            </span>
          </div>

          <p className="uf-t-small" style={{ color: 'var(--uf-ink-2)', margin: '0 0 14px' }}>
            {slide.description}
          </p>

          <div style={{ marginBottom: 14 }}>{dots}</div>

          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm" onClick={() => setStep(s => s - 1)} style={{ flex: 1 }}>
              ← Back
            </Button>
            <Button variant="primary" size="sm" onClick={() => isLast ? onClose() : setStep(s => s + 1)} style={{ flex: 2 }}>
              {isLast ? 'Get started →' : 'Next →'}
            </Button>
          </div>

          {!isLast && (
            <Button variant="ghost" size="sm" onClick={onClose} style={{ display: 'flex', margin: '6px auto 0' }}>
              Skip tour
            </Button>
          )}
        </div>
      )}
    </>
  )
}
