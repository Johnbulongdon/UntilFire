'use client'
import { useState } from 'react'

const TOUR_SLIDES = [
  {
    emoji: "🔥",
    title: "Welcome to UntilFire",
    description: "You're one step closer to Financial Independence. Here's a 30-second tour of what's waiting for you.",
  },
  {
    emoji: "🏠",
    title: "Overview",
    description: "Your financial snapshot. Net worth, FIRE progress, recent transactions, and a personalised setup checklist all in one place.",
  },
  {
    emoji: "💳",
    title: "Cashflow",
    description: "Track every dollar in and out. Add transactions manually or sync your bank, categorise spending, manage recurring bills, and set budgets.",
  },
  {
    emoji: "📈",
    title: "Assets",
    description: "All your accounts in one place — checking, savings, investments. Connect via Plaid or enter manually. Track your emergency fund health and APY.",
  },
  {
    emoji: "🏦",
    title: "Liabilities",
    description: "Track your debts — mortgages, car loans, student loans, and credit cards. See how they affect your net worth.",
  },
  {
    emoji: "🔢",
    title: "FIRE Calculator",
    description: "Calculate your Financial Independence number. Run Monte Carlo simulations to stress-test your plan and compare portfolio strategies side-by-side.",
  },
  {
    emoji: "🎯",
    title: "Goals",
    description: "Set your target retirement age, pick your FIRE style (Lean, Fat, Barista, Coast FIRE), and define what freedom looks like for you.",
  },
  {
    emoji: "📊",
    title: "Reports",
    description: "Visual breakdowns of spending trends, income vs expenses over time, and category-level analysis. See exactly where your money goes.",
  },
  {
    emoji: "📚",
    title: "Learning Hub",
    description: "Guides and frameworks for FIRE concepts — the 4% rule, withdrawal strategies, HYSA vs investing. Learn as you plan.",
  },
  {
    emoji: "⚙️",
    title: "Profile",
    description: "Connect or disconnect bank accounts, switch currencies, manage your subscription, and configure dashboard preferences.",
  },
]

export default function TourModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0)
  const slide = TOUR_SLIDES[step]
  const isLast = step === TOUR_SLIDES.length - 1
  const isIntro = step === 0

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15,23,42,0.6)',
        zIndex: 300,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div style={{
        background: '#fff', borderRadius: 20,
        padding: '36px 32px 28px',
        maxWidth: 460, width: '100%',
        boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ fontSize: 48, textAlign: 'center', marginBottom: 16, lineHeight: 1 }}>
          {slide.emoji}
        </div>

        <h2 style={{
          fontFamily: 'Manrope, sans-serif', fontSize: 22, fontWeight: 800,
          color: '#19181E', textAlign: 'center', margin: '0 0 12px', letterSpacing: '-0.02em',
        }}>
          {slide.title}
        </h2>

        <p style={{
          fontSize: 15, color: '#64748B', lineHeight: 1.7,
          textAlign: 'center', margin: '0 0 28px',
        }}>
          {slide.description}
        </p>

        {/* Dot progress */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 24 }}>
          {TOUR_SLIDES.map((_, i) => (
            <div
              key={i}
              onClick={() => setStep(i)}
              style={{
                width: i === step ? 18 : 7, height: 7,
                borderRadius: 99,
                background: i === step ? '#059669' : '#E2E8F0',
                transition: 'all 0.2s',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            />
          ))}
        </div>

        {/* Nav buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          {!isIntro && (
            <button
              onClick={() => setStep(s => s - 1)}
              style={{
                flex: 1, padding: '11px 0', borderRadius: 10,
                border: '1.5px solid #E2E8F0', background: '#fff',
                color: '#64748B', fontWeight: 700, fontSize: 14,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              ← Back
            </button>
          )}
          <button
            onClick={() => isLast ? onClose() : setStep(s => s + 1)}
            style={{
              flex: 2, padding: '11px 0', borderRadius: 10,
              border: 'none', background: '#059669',
              color: '#fff', fontWeight: 700, fontSize: 14,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {isIntro ? 'Start Tour →' : isLast ? 'Get started →' : 'Next →'}
          </button>
        </div>

        {!isLast && (
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: '#94A3B8',
              fontSize: 13, cursor: 'pointer', marginTop: 14,
              fontFamily: 'inherit', textAlign: 'center' as const,
            }}
          >
            Skip tour
          </button>
        )}
      </div>
    </div>
  )
}
