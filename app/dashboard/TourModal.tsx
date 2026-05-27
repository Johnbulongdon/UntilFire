'use client'
import { useState, useEffect } from 'react'

const TOUR_SLIDES = [
  { tabKey: null,              emoji: "🔥", title: "Welcome to UntilFire",  description: "Let's take a 30-second look at what you can do. Use the arrows or click any dot to jump around." },
  { tabKey: "overview",        emoji: "🏠", title: "Home",                  description: "Your financial snapshot — net worth, FIRE progress bar, recent transactions, and a personalised setup checklist to get you started." },
  { tabKey: "cashflow",        emoji: "💳", title: "Money",                 description: "Everything about your cash flow: income, expenses, and budgets on the Cashflow tab; all your accounts and net worth on Assets; debts on Liabilities; and spending trends on Reports." },
  { tabKey: "fire-calculator", emoji: "📅", title: "Freedom",               description: "Your freedom date lives here. Run your FIRE calculation, stress-test with Monte Carlo, set your goals and FIRE style, and explore the Learning Hub for guides on the 4% rule, withdrawal strategies, and more." },
  { tabKey: "profile",         emoji: "⚙️", title: "Profile",               description: "Connect bank accounts via Plaid, switch currencies, manage your Pro subscription, and configure your FIRE assumptions." },
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
    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
      {TOUR_SLIDES.map((_, i) => (
        <div
          key={i}
          onClick={() => setStep(i)}
          style={{
            width: i === step ? 14 : 6, height: 6,
            borderRadius: 99,
            background: i === step ? '#059669' : '#E2E8F0',
            transition: 'all 0.2s',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  )

  return (
    <>
      {/* Dark overlay — click to dismiss */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', zIndex: 290 }}
      />

      {/* Spotlight halo around active tab */}
      {rect && (
        <div style={{
          position: 'fixed',
          top: rect.top - 4,
          left: rect.left - 4,
          width: rect.width + 8,
          height: rect.height + 8,
          borderRadius: 10,
          boxShadow: '0 0 0 9999px rgba(15,23,42,0.65), 0 0 0 3px #059669',
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
          <div style={{
            background: '#fff', borderRadius: 20,
            padding: '36px 32px 28px',
            maxWidth: 420, width: '100%',
            boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
            pointerEvents: 'auto',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ fontSize: 48, textAlign: 'center', marginBottom: 16 }}>{slide.emoji}</div>
            <h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 22, fontWeight: 800, color: '#19181E', textAlign: 'center', margin: '0 0 12px', letterSpacing: '-0.02em' }}>
              {slide.title}
            </h2>
            <p style={{ fontSize: 15, color: '#64748B', lineHeight: 1.7, textAlign: 'center', margin: '0 0 24px' }}>
              {slide.description}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
              {dots}
            </div>
            <button
              onClick={() => setStep(1)}
              style={{ padding: '12px 0', borderRadius: 10, border: 'none', background: '#059669', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Start Tour →
            </button>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: 13, cursor: 'pointer', marginTop: 12, fontFamily: 'inherit', textAlign: 'center' as const }}
            >
              Skip tour
            </button>
          </div>
        </div>
      )}

      {/* Spotlight tooltip for tab steps */}
      {!isIntro && (
        <div style={{
          ...effectiveTooltipStyle,
          zIndex: 300,
          background: '#fff',
          borderRadius: 14,
          padding: '18px 18px 14px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.20)',
        }}>
          {/* Arrow pointing left toward the sidebar tab (desktop) */}
          {tooltipStyle && !isMobileNav && (
            <div style={{ position: 'absolute', left: -8, top: '38%', width: 0, height: 0, borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderRight: '8px solid #fff' }} />
          )}
          {/* Arrow pointing down toward the bottom nav tab (mobile) */}
          {tooltipStyle && isMobileNav && (
            <div style={{ position: 'absolute', bottom: -8, left: 28, width: 0, height: 0, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: '8px solid #fff' }} />
          )}

          <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 8 }}>
            {step} OF {TOUR_SLIDES.length - 1}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 20 }}>{slide.emoji}</span>
            <h3 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 15, fontWeight: 800, color: '#19181E', margin: 0 }}>
              {slide.title}
            </h3>
          </div>

          <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.65, margin: '0 0 14px' }}>
            {slide.description}
          </p>

          <div style={{ marginBottom: 12 }}>{dots}</div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setStep(s => s - 1)}
              style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: '1.5px solid #E2E8F0', background: '#fff', color: '#64748B', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              ← Back
            </button>
            <button
              onClick={() => isLast ? onClose() : setStep(s => s + 1)}
              style={{ flex: 2, padding: '8px 0', borderRadius: 8, border: 'none', background: '#059669', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {isLast ? 'Get started →' : 'Next →'}
            </button>
          </div>

          {!isLast && (
            <button
              onClick={onClose}
              style={{ display: 'block', margin: '10px auto 0', background: 'none', border: 'none', color: '#94A3B8', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Skip tour
            </button>
          )}
        </div>
      )}
    </>
  )
}