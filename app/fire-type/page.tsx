'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { FireTypeAvatar } from './FireTypeAvatar'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/app/components/Logo'
import {
  QUIZ_QUESTIONS,
  FIRE_AXES,
  scoreQuiz,
  getTypeMeta,
  isValidFireTypeCode,
  AXIS_STRENGTHS,
  AXIS_WATCH_OUTS,
  computeAxisLeans,
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

// Light palette — intro + quiz stages
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

// Spectrum slider — on-dark only (used in Trading Card and below-fold axis display)
function Spectrum({ left, right, pos, compact = false }: { left: string; right: string; pos: number; compact?: boolean }) {
  const leftPole = pos < 0.5
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: compact ? 5 : 7, fontFamily: "'Manrope', sans-serif", fontSize: compact ? 11 : 12.5, fontWeight: 600 }}>
        <span style={{ color: leftPole ? '#62FAE3' : '#bfe9dd', fontWeight: leftPole ? 800 : 600 }}>{left}</span>
        <span style={{ color: !leftPole ? '#62FAE3' : '#bfe9dd', fontWeight: !leftPole ? 800 : 600 }}>{right}</span>
      </div>
      <div style={{ position: 'relative', height: compact ? 7 : 9, borderRadius: 999, background: 'rgba(255,255,255,.14)' }}>
        <div style={{
          position: 'absolute', top: 0, bottom: 0, borderRadius: 999,
          left: leftPole ? 0 : `${pos * 100}%`,
          right: leftPole ? `${(1 - pos) * 100}%` : 0,
          background: '#62FAE3', opacity: 0.9,
        }} />
        <div style={{
          position: 'absolute', top: '50%', left: `${pos * 100}%`,
          transform: 'translate(-50%,-50%)',
          width: compact ? 13 : 16, height: compact ? 13 : 16,
          borderRadius: '50%', background: '#62FAE3',
          border: `${compact ? 2 : 3}px solid #003527`,
          boxShadow: '0 1px 3px rgba(0,0,0,.25)',
        }} />
      </div>
    </div>
  )
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
  const [result, setResult] = useState<{ code: string; name: string; tagline: string; emoji: string; quote: string; archetype: string; scene: string; rarity: string; rank: string } | null>(null)
  const [leans, setLeans] = useState<number[]>([0.5, 0.5, 0.5, 0.5])
  const [resultOrigin, setResultOrigin] = useState<ResultOrigin>('quiz')
  const [copied, setCopied] = useState(false)
  const [pendingAnswer, setPendingAnswer] = useState<QuizAnswer | null>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    if (!isValidFireTypeCode(sharedType)) return
    const meta = getTypeMeta(sharedType)
    setResult({ code: sharedType, ...meta })
    setLeans(computeAxisLeans([], sharedType))
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
        setLeans(computeAxisLeans(next, code))
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

  // ── Intro ────────────────────────────────────────────────────────
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

  // ── Quiz ─────────────────────────────────────────────────────────
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

  // ── Result ──────────────────────────────────────────────────────────
  if (!result) return null

  const code = result.code
  const ctaHref = `/?source=fire-type-result&type=${code}&start=onboarding`
  const isSharedResult = resultOrigin === 'shared'
  const letters = code.split('') as AxisLetter[]
  const { rarity, rank } = result

  function retake() {
    setStage('quiz')
    setAnswers([])
    setCurrentQ(0)
    setResult(null)
    setResultOrigin('quiz')
    startedRef.current = false
  }

  return (
    <div style={{ background: '#001f15', minHeight: '100vh', fontFamily: "'Manrope', sans-serif" }}>

      {/* Dark nav */}
      <nav style={{ borderBottom: '1px solid rgba(255,255,255,.1)', padding: '16px 24px', background: 'rgba(0,0,0,.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <Logo variant="dark" size={22} />
        </Link>
        <button
          onClick={retake}
          style={{ background: 'none', border: 'none', color: '#bfe9dd', fontSize: 13, cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}
        >
          {isSharedResult ? 'Take the quiz' : 'Retake quiz'}
        </button>
      </nav>

      {/* Hero */}
      <div style={{ background: 'radial-gradient(80% 50% at 50% 0%, rgba(6,95,70,.4), transparent 70%)', padding: '30px 22px 8px', textAlign: 'center' }}>
        <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: '2px', textTransform: 'uppercase', color: '#62FAE3', marginBottom: 18 }}>
          {isSharedResult ? 'Their FIRE Type' : 'You got your FIRE type'}
        </div>

        {isSharedResult ? (
          <div style={{
            background: 'rgba(98,250,227,.08)', border: '1px solid rgba(98,250,227,.25)',
            borderRadius: 14, padding: '14px 18px', marginBottom: 18,
            color: '#bfe9dd', lineHeight: 1.6, maxWidth: 380, margin: '0 auto 18px',
          }}>
            Think this sounds like you? Take the quiz to find your own FIRE Type.
          </div>
        ) : null}

        {/* ── Trading Card ── */}
        <div style={{
          background: 'linear-gradient(160deg,#0a4332 0%, #003527 55%, #04261c 100%)',
          borderRadius: 18, padding: 9, color: '#fff', position: 'relative', overflow: 'hidden',
          boxShadow: '0 24px 54px rgba(0,32,21,.5)', maxWidth: 380, margin: '0 auto',
        }}>
          {/* holo edge */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 18, padding: 2, pointerEvents: 'none',
            background: 'linear-gradient(130deg,#62FAE3,#20D4BF 30%,#0a4332 50%,#62FAE3 78%,#34D399)',
            WebkitMask: 'linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            opacity: 0.85,
          } as React.CSSProperties} />

          <div style={{ border: '1px solid rgba(98,250,227,.35)', borderRadius: 12, padding: '13px 14px 14px' }}>
            {/* header: code badge + rank / rarity */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{
                fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: '3px',
                background: 'rgba(98,250,227,.14)', border: '1px solid rgba(98,250,227,.4)',
                borderRadius: 8, padding: '3px 10px', color: '#62FAE3',
              }}>{code}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: '1px', color: '#62FAE3' }}>
                <span style={{ fontSize: 13 }}>◆</span>{rank} · {rarity}
              </span>
            </div>

            {/* avatar art frame */}
            <div style={{
              marginTop: 11, borderRadius: 10, overflow: 'hidden', height: 180,
              position: 'relative',
              background: 'radial-gradient(120% 90% at 50% 0%, #065F46 0%, #003527 70%)',
              border: '1px solid rgba(98,250,227,.18)',
              display: 'flex', justifyContent: 'center', alignItems: 'flex-end',
            }}>
              <div style={{
                position: 'absolute', inset: 0, opacity: 0.5, pointerEvents: 'none',
                backgroundImage: 'linear-gradient(rgba(98,250,227,.10) 1px,transparent 1px),linear-gradient(90deg,rgba(98,250,227,.10) 1px,transparent 1px)',
                backgroundSize: '22px 22px',
              }} />
              <FireTypeAvatar code={code} size={160} />
            </div>

            {/* name + archetype */}
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: 21, lineHeight: 1.1 }}>{result.name}</div>
              <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '1.5px', color: '#62FAE3', textTransform: 'uppercase' }}>{result.archetype}</div>
            </div>

            {/* stat line — 4 spectrum sliders */}
            <div style={{ marginTop: 13, background: 'rgba(0,0,0,.22)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, padding: '12px 12px 13px', display: 'flex', flexDirection: 'column', gap: 11 }}>
              {FIRE_AXES.map((ax, i) => (
                <Spectrum key={ax.key} left={ax.left} right={ax.right} pos={leans[i]} compact />
              ))}
            </div>

            {/* card footer */}
            <div style={{ marginTop: 11, display: 'flex', justifyContent: 'space-between', fontSize: 9.5, letterSpacing: '1.5px', color: '#7fc3b2', fontWeight: 700 }}>
              <span>UNTILFIRE · COLLECTIBLE</span><span>SERIES I</span>
            </div>
          </div>
        </div>

        {/* share / action buttons */}
        <div className="ft-hero-btns" style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 22, paddingBottom: 8 }}>
          <button
            onClick={handleShare}
            style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: 14, color: '#001f15', background: '#62FAE3', border: 'none', borderRadius: 10, padding: '11px 22px', cursor: 'pointer' }}
          >
            {copied ? '✓ Copied!' : '↗ Share my type'}
          </button>
          {isSharedResult ? (
            <button
              onClick={retake}
              style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: 14, color: '#fff', background: 'transparent', border: '1.5px solid rgba(255,255,255,.3)', borderRadius: 10, padding: '11px 22px', cursor: 'pointer' }}
            >
              Take the quiz
            </button>
          ) : null}
        </div>
      </div>

      {/* Below-fold body */}
      <div className="ft-result-body" style={{ maxWidth: 560, margin: '0 auto', padding: '26px 22px 30px' }}>

        {/* 4-axis spectrums */}
        <div style={{ background: 'rgba(255,255,255,.04)', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,.10)', marginBottom: 18 }}>
          <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', color: '#62FAE3', marginBottom: 14 }}>
            How you scored — the four axes
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {FIRE_AXES.map((ax, i) => (
              <Spectrum key={ax.key} left={ax.left} right={ax.right} pos={leans[i]} />
            ))}
          </div>
        </div>

        {/* 2-col strengths + watch-outs */}
        <div className="ft-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
          <div style={{ background: 'rgba(255,255,255,.04)', borderRadius: 16, padding: 24, border: '1px solid rgba(98,250,227,.3)' }}>
            <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', color: '#62FAE3', marginBottom: 14 }}>★ Your strengths</div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 11 }}>
              {letters.map(l => (
                <li key={l} style={{ display: 'flex', gap: 9, fontSize: 13.5, lineHeight: 1.45, color: '#dff3ec' }}>
                  <span style={{ color: '#62FAE3', fontWeight: 800, flexShrink: 0 }}>{l}</span>
                  <span>{AXIS_STRENGTHS[l]}</span>
                </li>
              ))}
            </ul>
          </div>
          <div style={{ background: 'rgba(255,255,255,.04)', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,.10)' }}>
            <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', color: '#62FAE3', marginBottom: 14 }}>⚠ Watch-outs</div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 11 }}>
              {letters.map(l => (
                <li key={l} style={{ display: 'flex', gap: 9, fontSize: 13.5, lineHeight: 1.45, color: '#bfe9dd' }}>
                  <span style={{ color: '#7fc3b2', fontWeight: 800, flexShrink: 0 }}>{l}</span>
                  <span>{AXIS_WATCH_OUTS[l]}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Rarity band */}
        <div style={{ background: '#003527', borderRadius: 16, padding: '26px 24px', textAlign: 'center', color: '#fff', marginBottom: 18 }}>
          <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '2px', color: '#62FAE3', textTransform: 'uppercase' }}>How rare you are</div>
          <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: 52, letterSpacing: '-1px', lineHeight: 1.05, marginTop: 6 }}>{rarity}</div>
          <div style={{ fontSize: 14, color: '#cfeee4', marginTop: 2 }}>of UntilFIRE quiz-takers share your type · {rank}</div>
        </div>

        {/* CTA */}
        <div className="ft-cta-box" style={{ background: '#064E3B', borderRadius: 16, padding: '28px 24px', marginBottom: 16, textAlign: 'center' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#62FAE3', textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 10px' }}>Your next FIRE move</p>
          <p style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: '-0.4px', color: '#fff', margin: '0 0 8px' }}>Now turn your type into a number.</p>
          <p style={{ fontSize: 14, color: '#bfe9dd', margin: '0 0 20px', lineHeight: 1.6 }}>
            See the real FIRE number behind the way you think.
          </p>
          {isSharedResult ? (
            <button
              onClick={retake}
              style={{ display: 'block', background: 'rgba(255,255,255,.10)', color: '#ffffff', borderRadius: 10, padding: '14px 28px', fontSize: 15, fontWeight: 700, width: '100%', boxSizing: 'border-box', border: '1px solid rgba(255,255,255,.20)', marginBottom: 12, fontFamily: "'Manrope', sans-serif", cursor: 'pointer' }}
            >
              Take the quiz to find my type
            </button>
          ) : null}
          <Link
            href={ctaHref}
            onClick={() => trackFireTypeCtaClicked({ fireTypeCode: code, source })}
            style={{ display: 'block', background: '#62FAE3', color: '#001f15', textDecoration: 'none', borderRadius: 10, padding: '14px 28px', fontSize: 15, fontWeight: 700 }}
          >
            Calculate my actual FIRE number →
          </Link>
        </div>

        <p style={{ fontSize: 12, color: '#7fc3b2', textAlign: 'center', lineHeight: 1.7 }}>
          Your FIRE Type is a preference-based personality result, not financial advice. Your actual FIRE path depends on your numbers — calculate your FIRE number next.
        </p>
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,.1)', padding: '16px 22px', textAlign: 'center', fontFamily: "'Manrope', sans-serif", fontSize: 10.5, letterSpacing: '1px', color: '#7fc3b2' }}>
        © 2026 UNTILFIRE · FINANCIAL INDEPENDENCE THROUGH TRUSTED GROWTH
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
        @media (max-width: 520px) {
          .ft-intro-pad { padding: 40px 16px 60px !important; }
          .ft-quiz-pad { padding: 28px 16px 60px !important; }
          .ft-quiz-card { padding: 24px 18px !important; }
          .ft-result-body { padding: 20px 16px 50px !important; }
          .ft-cta-box { padding: 20px 16px !important; }
          .ft-hero-btns { flex-direction: column; align-items: center; padding: 0 16px 8px !important; }
          .ft-2col { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <Suspense>
        <FireTypeQuizInner />
      </Suspense>
    </>
  )
}
