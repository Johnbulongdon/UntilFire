'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/app/components/Logo'
import {
  QUIZ_QUESTIONS,
  scoreQuiz,
  getTypeMeta,
  AXIS_STRENGTHS,
  AXIS_WATCH_OUTS,
  type AxisLetter,
  type QuizAnswer,
} from './quiz-data'
import {
  trackFireTypeStarted,
  trackFireTypeCompleted,
  trackFireTypeShared,
  trackFireTypeCtaClicked,
} from '@/lib/analytics'

const FIRE_TYPE_STORAGE_KEY = 'uf_fire_type_result'

const C = {
  bg: '#F7F9FB',
  card: '#ffffff',
  border: '#E2E8F0',
  text: '#19181E',
  muted: '#64748B',
  accent: '#059669',
  teal: '#22D3A5',
  darkGreen: '#064E3B',
}

// Inner component that uses useSearchParams
function FireTypeQuizInner() {
  const searchParams = useSearchParams()
  const source = searchParams.get('source') ?? undefined

  type Stage = 'intro' | 'quiz' | 'result'
  const [stage, setStage] = useState<Stage>('intro')
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<QuizAnswer[]>([])
  const [result, setResult] = useState<{ code: string; name: string; tagline: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const startedRef = useRef(false)

  // Fire completed event once when result mounts
  useEffect(() => {
    if (stage === 'result' && result) {
      trackFireTypeCompleted({ fireTypeCode: result.code, source })
      try {
        localStorage.setItem(
          FIRE_TYPE_STORAGE_KEY,
          JSON.stringify({ code: result.code, name: result.name, generatedAt: new Date().toISOString(), source }),
        )
      } catch {
        // localStorage may be unavailable
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, result])

  function handleAnswer(position: QuizAnswer) {
    // Fire started on first answer (confirms real engagement)
    if (!startedRef.current) {
      startedRef.current = true
      trackFireTypeStarted({ source })
    }

    const next = [...answers, position]
    if (next.length < QUIZ_QUESTIONS.length) {
      setAnswers(next)
      setCurrentQ(next.length)
    } else {
      const code = scoreQuiz(next)
      const meta = getTypeMeta(code)
      setAnswers(next)
      setResult({ code, ...meta })
      setStage('result')
    }
  }

  function handleBack() {
    if (currentQ === 0) {
      setStage('intro')
      return
    }
    const prev = answers.slice(0, currentQ - 1)
    setAnswers(prev)
    setCurrentQ(currentQ - 1)
  }

  async function handleShare() {
    if (!result) return
    const text = `I got ${result.code} — ${result.name} on UntilFire.\n\nFind your FIRE Type:\nhttps://untilfire.com/fire-type`
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ text })
        trackFireTypeShared({ fireTypeCode: result.code, shareMethod: 'native' })
        return
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      trackFireTypeShared({ fireTypeCode: result.code, shareMethod: 'clipboard' })
    } catch {
      // clipboard also unavailable
    }
  }

  // ── Intro ────────────────────────────────────────────────────────────────
  if (stage === 'intro') {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', fontFamily: "'Manrope', sans-serif" }}>
        <nav style={{ borderBottom: `1px solid ${C.border}`, padding: '16px 24px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Logo variant="light" size={22} />
          </Link>
          <Link href="/" style={{ color: C.accent, textDecoration: 'none', fontSize: 14, fontWeight: 600, border: `1px solid ${C.accent}`, padding: '6px 14px', borderRadius: 6 }}>
            Calculate my FIRE number →
          </Link>
        </nav>

        <div className="ft-intro-pad" style={{ maxWidth: 560, margin: '0 auto', padding: '64px 24px 80px', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', background: '#ECFDF5', color: C.accent, fontSize: 12, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', padding: '4px 12px', borderRadius: 99, marginBottom: 24 }}>
            2 minutes · No login
          </div>

          <h1 style={{ fontSize: 'clamp(32px, 6vw, 52px)', fontWeight: 800, color: C.text, letterSpacing: '-0.03em', margin: '0 0 16px', lineHeight: 1.1 }}>
            What&apos;s your<br /><span style={{ color: C.accent }}>FIRE Type?</span>
          </h1>

          <p style={{ fontSize: 17, color: C.muted, lineHeight: 1.7, margin: '0 0 40px', maxWidth: 440, marginLeft: 'auto', marginRight: 'auto' }}>
            Answer 8 quick questions to discover how you naturally think about financial independence — then calculate your real FIRE number.
          </p>

          <button
            onClick={() => setStage('quiz')}
            style={{ background: C.accent, color: '#ffffff', border: 'none', borderRadius: 10, padding: '16px 36px', fontSize: 17, fontWeight: 700, cursor: 'pointer', width: '100%', maxWidth: 360 }}
          >
            Find my FIRE Type →
          </button>

          <p style={{ marginTop: 20, fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
            Preference-based personality result, not financial advice.
          </p>

          <div style={{ marginTop: 48, display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
            {[
              { stat: '16', label: 'FIRE Types' },
              { stat: '8', label: 'Questions' },
              { stat: 'Free', label: 'No login' },
            ].map(({ stat, label }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: C.text }}>{stat}</div>
                <div style={{ fontSize: 13, color: C.muted }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Quiz ─────────────────────────────────────────────────────────────────
  if (stage === 'quiz') {
    const q = QUIZ_QUESTIONS[currentQ]
    const progress = ((currentQ) / QUIZ_QUESTIONS.length) * 100

    return (
      <div style={{ background: C.bg, minHeight: '100vh', fontFamily: "'Manrope', sans-serif" }}>
        <nav style={{ borderBottom: `1px solid ${C.border}`, padding: '16px 24px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Logo variant="light" size={22} />
          </Link>
          <span style={{ fontSize: 13, color: C.muted }}>Question {currentQ + 1} of {QUIZ_QUESTIONS.length}</span>
        </nav>

        {/* Progress bar */}
        <div style={{ height: 3, background: C.border }}>
          <div style={{ height: '100%', width: `${progress}%`, background: C.teal, transition: 'width 0.3s' }} />
        </div>

        <div className="ft-quiz-pad" style={{ maxWidth: 560, margin: '0 auto', padding: '48px 24px 80px' }}>
          <div className="ft-quiz-card" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '36px 28px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: C.teal, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 16 }}>
              Question {currentQ + 1} of {QUIZ_QUESTIONS.length}
            </p>
            <h2 style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 800, color: C.text, letterSpacing: '-0.02em', margin: '0 0 28px', lineHeight: 1.3 }}>
              {q.prompt}
            </h2>

            {/* Pole labels */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.text, maxWidth: '42%', lineHeight: 1.4 }}>{q.leftLabel}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.text, maxWidth: '42%', lineHeight: 1.4, textAlign: 'right' }}>{q.rightLabel}</span>
            </div>

            {/* 5 circles — outer larger (strong), center smaller (neutral) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
              {([0, 1, 2, 3, 4] as QuizAnswer[]).map((pos) => {
                const size = pos === 2 ? 36 : pos === 1 || pos === 3 ? 42 : 48
                return (
                  <button
                    key={pos}
                    onClick={() => handleAnswer(pos)}
                    title={(['Strongly', 'Slightly', 'Neutral', 'Slightly', 'Strongly'] as const)[pos]}
                    style={{
                      width: size, height: size,
                      borderRadius: '50%',
                      border: `2px solid ${C.border}`,
                      background: '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      flexShrink: 0,
                      padding: 0,
                      fontFamily: "'Manrope', sans-serif",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.background = '#ECFDF5' }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = '#ffffff' }}
                  />
                )
              })}
            </div>

            {/* Scale labels */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ fontSize: 11, color: C.muted }}>Strongly</span>
              <span style={{ fontSize: 11, color: C.muted }}>Neutral</span>
              <span style={{ fontSize: 11, color: C.muted }}>Strongly</span>
            </div>

            <button
              onClick={handleBack}
              style={{ marginTop: 20, background: 'none', border: 'none', color: C.muted, fontSize: 13, cursor: 'pointer', padding: '4px 0', fontFamily: "'Manrope', sans-serif" }}
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Result ────────────────────────────────────────────────────────────────
  if (!result) return null

  const code = result.code
  const ctaHref = `/?source=fire-type-result&type=${code}`
  // Derive 4 axis letters from the code for composable copy
  const letters = code.split('') as AxisLetter[]

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: "'Manrope', sans-serif" }}>
      <nav style={{ borderBottom: `1px solid ${C.border}`, padding: '16px 24px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <Logo variant="light" size={22} />
        </Link>
        <button
          onClick={() => { setStage('intro'); setAnswers([]); setCurrentQ(0); setResult(null); startedRef.current = false }}
          style={{ background: 'none', border: 'none', color: C.muted, fontSize: 13, cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}
        >
          Retake quiz
        </button>
      </nav>

      <div className="ft-result-pad" style={{ maxWidth: 600, margin: '0 auto', padding: '48px 24px 80px' }}>
        {/* Code badge */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-block', background: C.darkGreen, color: C.teal, fontSize: 'clamp(28px, 8vw, 42px)', fontWeight: 800, letterSpacing: 'clamp(2px, 1.5vw, 6px)', padding: '14px clamp(16px, 6vw, 32px)', borderRadius: 14, fontFamily: 'DM Mono, monospace', marginBottom: 16 }}>
            {code}
          </div>
          <h1 style={{ fontSize: 'clamp(24px, 4vw, 34px)', fontWeight: 800, color: C.text, letterSpacing: '-0.03em', margin: '0 0 10px' }}>
            {result.name}
          </h1>
          <p style={{ fontSize: 16, color: C.muted, lineHeight: 1.7, margin: 0, maxWidth: 460, marginLeft: 'auto', marginRight: 'auto' }}>
            {result.tagline}
          </p>
        </div>

        {/* Strengths */}
        <div className="ft-result-strengths" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '24px', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 14, margin: '0 0 14px' }}>Your strengths</p>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 10 }}>
            {letters.map((l) => (
              <li key={l} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, color: C.text, lineHeight: 1.5 }}>
                <span style={{ color: C.accent, fontWeight: 700, flexShrink: 0 }}>✓</span>
                {AXIS_STRENGTHS[l]}
              </li>
            ))}
          </ul>
        </div>

        {/* Watch-outs */}
        <div className="ft-result-strengths" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '24px', marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#D97706', textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 14px' }}>Watch-outs</p>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 10 }}>
            {letters.map((l) => (
              <li key={l} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, color: C.text, lineHeight: 1.5 }}>
                <span style={{ color: '#D97706', fontWeight: 700, flexShrink: 0 }}>→</span>
                {AXIS_WATCH_OUTS[l]}
              </li>
            ))}
          </ul>
        </div>

        {/* Next move CTA */}
        <div className="ft-cta-box" style={{ background: C.darkGreen, borderRadius: 16, padding: '28px 24px', marginBottom: 16, textAlign: 'center' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: C.teal, textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 10px' }}>Your next FIRE move</p>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.85)', margin: '0 0 20px', lineHeight: 1.6 }}>
            Calculate your actual FIRE number and see which lever gets you there fastest.
          </p>
          <Link
            href={ctaHref}
            onClick={() => trackFireTypeCtaClicked({ fireTypeCode: code, source })}
            style={{ display: 'inline-block', background: C.teal, color: C.darkGreen, textDecoration: 'none', borderRadius: 10, padding: '14px 28px', fontSize: 15, fontWeight: 700, width: '100%', boxSizing: 'border-box' }}
          >
            Now calculate my actual FIRE number →
          </Link>
        </div>

        {/* Share */}
        <div className="ft-share-box" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 24px', marginBottom: 24, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <p style={{ fontSize: 14, color: C.muted, margin: '0 0 14px' }}>Share your FIRE Type</p>
          <button
            onClick={handleShare}
            style={{ background: '#ffffff', border: `1.5px solid ${C.border}`, borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 700, color: C.text, cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}
          >
            {copied ? '✓ Copied!' : `Share ${code} — ${result.name}`}
          </button>
        </div>

        <p style={{ fontSize: 12, color: C.muted, textAlign: 'center', lineHeight: 1.7 }}>
          Your FIRE Type is a preference-based personality result, not financial advice. Your actual FIRE path depends on your numbers — calculate your FIRE number next.
        </p>
      </div>
    </div>
  )
}

export default function FireTypePage() {
  return (
    <>
      <style>{`
        @media (max-width: 480px) {
          .ft-intro-pad { padding: 40px 16px 60px !important; }
          .ft-quiz-pad { padding: 28px 16px 60px !important; }
          .ft-quiz-card { padding: 24px 18px !important; }
          .ft-result-pad { padding: 32px 16px 60px !important; }
          .ft-result-strengths { padding: 18px 16px !important; }
          .ft-cta-box { padding: 20px 16px !important; }
          .ft-share-box { padding: 16px !important; }
        }
      `}</style>
      <Suspense>
        <FireTypeQuizInner />
      </Suspense>
    </>
  )
}
