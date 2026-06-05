'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/app/components/Logo'
import {
  QUIZ_QUESTIONS,
  scoreQuiz,
  getTypeMeta,
  isValidFireTypeCode,
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
  const sharedType = (searchParams.get('type') ?? '').toUpperCase()

  type Stage = 'intro' | 'quiz' | 'result'
  type ResultOrigin = 'quiz' | 'shared'
  const [stage, setStage] = useState<Stage>('intro')
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<QuizAnswer[]>([])
  const [result, setResult] = useState<{ code: string; name: string; tagline: string; emoji: string; quote: string } | null>(null)
  const [resultOrigin, setResultOrigin] = useState<ResultOrigin>('quiz')
  const [copied, setCopied] = useState(false)
  const [pendingAnswer, setPendingAnswer] = useState<QuizAnswer | null>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    if (!isValidFireTypeCode(sharedType)) return
    const meta = getTypeMeta(sharedType)
    setResult({ code: sharedType, ...meta })
    setResultOrigin('shared')
    setStage('result')
    setAnswers([])
    setCurrentQ(0)
    setPendingAnswer(null)
  }, [sharedType])

  // Fire completed event once when result mounts from a real quiz completion.
  useEffect(() => {
    if (stage === 'result' && result && resultOrigin === 'quiz') {
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
  }, [stage, result, resultOrigin, source])

  function handleAnswer(position: QuizAnswer) {
    if (pendingAnswer !== null) return
    if (!startedRef.current) {
      startedRef.current = true
      trackFireTypeStarted({ source })
    }
    setPendingAnswer(position)
    setTimeout(() => {
      setPendingAnswer(null)
      const next = [...answers, position]
      if (next.length < QUIZ_QUESTIONS.length) {
        setAnswers(next)
        setCurrentQ(next.length)
      } else {
        const code = scoreQuiz(next)
        const meta = getTypeMeta(code)
        setAnswers(next)
        setResult({ code, ...meta })
        setResultOrigin('quiz')
        setStage('result')
      }
    }, 280)
  }

  function handleBack() {
    if (pendingAnswer !== null) return
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
    const text = `${result.emoji} ${result.code} — ${result.name}\n\n"${result.quote}"\n\nFind your FIRE Type:\nhttps://www.untilfire.com/fire-type`
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
          <div key={currentQ} className="ft-quiz-card" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '36px 28px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', animation: 'ft-slide-in 0.22s ease-out' }}>
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
                const isSelected = pendingAnswer === pos
                const isPending = pendingAnswer !== null
                return (
                  <button
                    key={pos}
                    onClick={() => handleAnswer(pos)}
                    title={(['Strongly', 'Slightly', 'Neutral', 'Slightly', 'Strongly'] as const)[pos]}
                    style={{
                      width: size, height: size,
                      borderRadius: '50%',
                      border: `2px solid ${isSelected ? C.accent : C.border}`,
                      background: isSelected ? C.accent : '#ffffff',
                      cursor: isPending ? 'default' : 'pointer',
                      transition: 'all 0.15s',
                      flexShrink: 0,
                      padding: 0,
                      fontFamily: "'Manrope', sans-serif",
                      transform: isSelected ? 'scale(1.18)' : 'scale(1)',
                      pointerEvents: isPending ? 'none' : 'auto',
                    }}
                    onMouseEnter={!isPending ? (e) => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.background = '#ECFDF5' } : undefined}
                    onMouseLeave={!isPending ? (e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = '#ffffff' } : undefined}
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
  const ctaHref = `/?source=fire-type-result&type=${code}&start=onboarding`
  const isSharedResult = resultOrigin === 'shared'
  // Derive 4 axis letters from the code for composable copy
  const letters = code.split('') as AxisLetter[]

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: "'Manrope', sans-serif" }}>
      <nav style={{ borderBottom: `1px solid ${C.border}`, padding: '16px 24px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <Logo variant="light" size={22} />
        </Link>
        <button
          onClick={() => { setStage('quiz'); setAnswers([]); setCurrentQ(0); setResult(null); setResultOrigin('quiz'); startedRef.current = false }}
          style={{ background: 'none', border: 'none', color: C.muted, fontSize: 13, cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}
        >
          {isSharedResult ? 'Take the quiz' : 'Retake quiz'}
        </button>
      </nav>

      <div className="ft-result-pad" style={{ maxWidth: 600, margin: '0 auto', padding: '48px 24px 80px' }}>
        {isSharedResult ? (
          <div style={{ background: '#ECFDF5', border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 18px', marginBottom: 18, color: C.text, textAlign: 'center', lineHeight: 1.6 }}>
            Think this sounds like you? Take the quiz to find your own FIRE Type, or go straight to your FIRE number.
          </div>
        ) : null}
        {/* Shareable identity card */}
        <div className="ft-share-card" style={{
          background: C.darkGreen, borderRadius: 20, padding: '40px 32px 32px',
          textAlign: 'center', marginBottom: 24,
        }}>
          {/* Character figure */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <div style={{
              width: 130, height: 130, borderRadius: '50%',
              border: '2px solid rgba(34,211,165,0.45)',
              overflow: 'hidden',
              background: 'rgba(34,211,165,0.07)',
              boxShadow: '0 0 0 8px rgba(34,211,165,0.06), 0 0 40px rgba(34,211,165,0.2)',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.dicebear.com/9.x/notionists/svg?seed=${code}&backgroundColor=transparent`}
                alt=""
                width={130}
                height={130}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          </div>
          {/* Code */}
          <div style={{
            display: 'inline-block', color: C.teal,
            fontSize: 'clamp(32px, 9vw, 48px)', fontWeight: 800,
            letterSpacing: 'clamp(4px, 2vw, 10px)', fontFamily: 'DM Mono, monospace',
            marginBottom: 12, lineHeight: 1,
          }}>
            {code}
          </div>
          {/* Type name */}
          <h1 style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', margin: '0 0 16px', lineHeight: 1.2 }}>
            {result.name}
          </h1>
          {/* Shareable quote */}
          <p style={{
            fontSize: 15, color: C.teal, fontStyle: 'italic', fontWeight: 600,
            margin: '0 0 20px', lineHeight: 1.5,
          }}>
            &ldquo;{result.quote}&rdquo;
          </p>
          {/* Divider + tagline */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16 }}>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, margin: 0 }}>
              {result.tagline}
            </p>
          </div>
          {/* Branding */}
          <div style={{ marginTop: 20, fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
            untilfire.com/fire-type
          </div>
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
          {isSharedResult ? (
            <button
              onClick={() => { setStage('quiz'); setAnswers([]); setCurrentQ(0); setResult(null); setResultOrigin('quiz'); startedRef.current = false }}
              style={{ display: 'inline-block', background: 'rgba(255,255,255,0.12)', color: '#ffffff', textDecoration: 'none', borderRadius: 10, padding: '14px 28px', fontSize: 15, fontWeight: 700, width: '100%', boxSizing: 'border-box', border: '1px solid rgba(255,255,255,0.18)', marginBottom: 12, fontFamily: "'Manrope', sans-serif", cursor: 'pointer' }}
            >
              Take the quiz to find my type
            </button>
          ) : null}
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
          <p style={{ fontSize: 13, color: C.muted, margin: '0 0 12px' }}>Screenshot the card above or share your type link</p>
          <button
            onClick={handleShare}
            style={{ background: C.darkGreen, color: C.teal, border: 'none', borderRadius: 8, padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'Manrope', sans-serif", width: '100%' }}
          >
            {copied ? '✓ Copied to clipboard!' : `${result.emoji} Share my FIRE Type →`}
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
        @keyframes ft-slide-in {
          from { opacity: 0; transform: translateX(28px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @media (max-width: 480px) {
          .ft-intro-pad { padding: 40px 16px 60px !important; }
          .ft-quiz-pad { padding: 28px 16px 60px !important; }
          .ft-quiz-card { padding: 24px 18px !important; }
          .ft-result-pad { padding: 32px 16px 60px !important; }
          .ft-result-strengths { padding: 18px 16px !important; }
          .ft-cta-box { padding: 20px 16px !important; }
          .ft-share-box { padding: 16px !important; }
          .ft-share-card { padding: 32px 20px 24px !important; border-radius: 16px !important; }
        }
      `}</style>
      <Suspense>
        <FireTypeQuizInner />
      </Suspense>
    </>
  )
}
