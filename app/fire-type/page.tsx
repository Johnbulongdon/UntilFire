'use client'

import { useEffect, useRef, useState, Suspense, type CSSProperties } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { FireTypeAvatar } from './FireTypeAvatar'
import {
  AXIS_STRENGTHS,
  AXIS_WATCH_OUTS,
  computeAxisLeans,
  FIRE_AXES,
  getTypeMeta,
  isValidFireTypeCode,
  QUIZ_QUESTIONS,
  scoreQuiz,
  type AxisLetter,
  type QuizAnswer,
} from './quiz-data'

const FIRE_TYPE_STORAGE_KEY = 'uf_fire_type_result'

const C = {
  bg: '#F7F9FB',
  card: '#FFFFFF',
  border: '#E2E8F0',
  borderSoft: '#EEF2F4',
  text: '#19181E',
  textStrong: '#003527',
  muted: '#64748B',
  mutedSoft: '#94A3B8',
  accent: '#059669',
  accentDark: '#065F46',
  accentDeep: '#003527',
  teal: '#62FAE3',
  tealSoft: '#ECFDF5',
  cream: '#FBF8EF',
  creamLine: '#E8E1CF',
}

type ResultMeta = {
  code: string
  name: string
  tagline: string
  emoji: string
  quote: string
  archetype: string
  scene: string
  rarity: string
  rank: string
}

function Wordmark({ light = false, size = 22 }: { light?: boolean; size?: number }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 0,
        fontWeight: 800,
        fontSize: size * 0.82,
        letterSpacing: '-0.04em',
        lineHeight: 1,
      }}
    >
      <span style={{ color: light ? '#FFFFFF' : C.textStrong }}>Until</span>
      <span style={{ color: light ? '#FFFFFF' : C.textStrong }}>Fire</span>
    </span>
  )
}

function RarityChip({
  rarity,
  rank,
  dark = false,
}: {
  rarity: string
  rank: string
  dark?: boolean
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        borderRadius: 999,
        padding: '4px 10px',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '1px',
        color: dark ? C.teal : C.accentDark,
        border: `1.5px solid ${dark ? 'rgba(98,250,227,.45)' : 'rgba(6,95,70,.24)'}`,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ fontSize: 9 }}>◆</span>
      TOP {rarity} · {rank}
    </span>
  )
}

function Spectrum({
  left,
  right,
  pos,
  compact = false,
  onDark = false,
}: {
  left: string
  right: string
  pos: number
  compact?: boolean
  onDark?: boolean
}) {
  const leftPole = pos < 0.5
  const labelColor = onDark ? '#bfe9dd' : C.muted
  const activeColor = onDark ? C.teal : C.accentDark
  const trackColor = onDark ? 'rgba(255,255,255,.14)' : '#EAF1ED'
  const thumbFill = onDark ? C.teal : '#FFFFFF'
  const thumbBorder = onDark ? C.accentDeep : C.accent

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: compact ? 5 : 7,
          fontSize: compact ? 11 : 12.5,
          fontWeight: 600,
        }}
      >
        <span style={{ color: leftPole ? activeColor : labelColor, fontWeight: leftPole ? 800 : 600 }}>{left}</span>
        <span style={{ color: !leftPole ? activeColor : labelColor, fontWeight: !leftPole ? 800 : 600 }}>{right}</span>
      </div>
      <div style={{ position: 'relative', height: compact ? 7 : 9, borderRadius: 999, background: trackColor }}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            borderRadius: 999,
            left: leftPole ? 0 : `${pos * 100}%`,
            right: leftPole ? `${(1 - pos) * 100}%` : 0,
            background: onDark ? C.teal : C.accent,
            opacity: onDark ? 0.9 : 1,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: `${pos * 100}%`,
            transform: 'translate(-50%,-50%)',
            width: compact ? 13 : 16,
            height: compact ? 13 : 16,
            borderRadius: '50%',
            background: thumbFill,
            border: `${compact ? 2 : 3}px solid ${thumbBorder}`,
            boxShadow: '0 1px 3px rgba(0,0,0,.18)',
          }}
        />
      </div>
    </div>
  )
}

function SurfaceCard({
  children,
  style,
  highlight = false,
}: {
  children: React.ReactNode
  style?: CSSProperties
  highlight?: boolean
}) {
  return (
    <div
      style={{
        background: C.card,
        borderRadius: 16,
        padding: 24,
        border: `1px solid ${highlight ? 'rgba(6,95,70,.24)' : C.border}`,
        boxShadow: '0 1px 4px rgba(0,0,0,.06)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '2px',
        textTransform: 'uppercase',
        color: C.accent,
        marginBottom: 14,
      }}
    >
      {children}
    </div>
  )
}

// F · Poster — clean white share card: gray eyebrow, big green code,
// dark-green name, large full-figure character art (uncropped), italic quote, brand mark.
function PosterCard({
  result,
  cardRef,
}: {
  result: ResultMeta
  cardRef?: React.RefObject<HTMLDivElement | null>
}) {
  return (
    <div
      ref={cardRef}
      style={{
        background: '#FFFFFF',
        borderRadius: 22,
        padding: '36px 30px 26px',
        color: C.text,
        textAlign: 'center',
        border: `1px solid ${C.border}`,
        maxWidth: 380,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 15.5, color: C.muted, letterSpacing: '.2px', whiteSpace: 'nowrap' }}>
        Your FIRE type is
      </div>
      <div style={{ fontWeight: 800, fontSize: 54, letterSpacing: '3px', color: C.accent, marginTop: 14, lineHeight: 1 }}>
        {result.code}
      </div>
      <div style={{ fontWeight: 800, fontSize: 25, color: '#064E3B', marginTop: 12, letterSpacing: '-0.3px', lineHeight: 1.1 }}>
        {result.name}
      </div>

      <div
        style={{
          width: '100%',
          height: 288,
          marginTop: 20,
          borderRadius: 14,
          overflow: 'hidden',
          background: '#FFFFFF',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <FireTypeAvatar code={result.code} size={216} />
      </div>

      <div
        style={{
          fontStyle: 'italic',
          fontSize: 17,
          fontWeight: 500,
          color: C.mutedSoft,
          marginTop: 22,
          lineHeight: 1.4,
          maxWidth: '90%',
        }}
      >
        <span style={{ color: '#CBD5E1', fontSize: 22, verticalAlign: '-2px', marginRight: 2 }}>“</span>
        {result.quote}
        <span style={{ color: '#CBD5E1', fontSize: 22, verticalAlign: '-6px', marginLeft: 2 }}>”</span>
      </div>

      <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
        <svg width={36} height={36} viewBox="0 0 1024 1024" style={{ borderRadius: 9, display: 'block', flexShrink: 0 }} aria-hidden>
          <rect width="1024" height="1024" rx="180" fill="#003527" />
          <path d="M 252 620 A 260 260 0 0 1 772 620 Z" fill="#20D4BF" />
          <rect x="100" y="615" width="824" height="14" rx="7" fill="#62FAE3" />
          <line x1="325.6" y1="397.9" x2="287.0" y2="351.9" stroke="#62FAE3" strokeWidth="16" strokeLinecap="round" />
          <line x1="412.8" y1="347.5" x2="392.3" y2="291.1" stroke="#62FAE3" strokeWidth="16" strokeLinecap="round" />
          <line x1="512" y1="330" x2="512" y2="270" stroke="#62FAE3" strokeWidth="16" strokeLinecap="round" />
          <line x1="611.2" y1="347.5" x2="631.7" y2="291.1" stroke="#62FAE3" strokeWidth="16" strokeLinecap="round" />
          <line x1="698.4" y1="397.9" x2="737.0" y2="351.9" stroke="#62FAE3" strokeWidth="16" strokeLinecap="round" />
        </svg>
        <Wordmark size={20} />
      </div>
    </div>
  )
}

function useDownloadState(timeout = 1800) {
  const [label, setLabel] = useState<'idle' | 'working' | 'done' | 'error'>('idle')

  useEffect(() => {
    if (label === 'done' || label === 'error') {
      const id = window.setTimeout(() => setLabel('idle'), timeout)
      return () => window.clearTimeout(id)
    }
  }, [label, timeout])

  return { label, setLabel }
}

function FireTypeQuizInner() {
  const searchParams = useSearchParams()
  const source = searchParams.get('source') ?? undefined
  const sharedType = (searchParams.get('type') ?? '').toUpperCase()

  type Stage = 'intro' | 'quiz' | 'result'
  type ResultOrigin = 'quiz' | 'shared'

  const [stage, setStage] = useState<Stage>('intro')
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<QuizAnswer[]>([])
  const [result, setResult] = useState<ResultMeta | null>(null)
  const [leans, setLeans] = useState<number[]>([0.5, 0.5, 0.5, 0.5])
  const [resultOrigin, setResultOrigin] = useState<ResultOrigin>('quiz')
  const [copied, setCopied] = useState(false)
  const [pendingAnswer, setPendingAnswer] = useState<QuizAnswer | null>(null)
  const startedRef = useRef(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const downloadState = useDownloadState()

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

  useEffect(() => {
    if (stage !== 'result' || !result || resultOrigin !== 'quiz') return
    try {
      localStorage.setItem(
        FIRE_TYPE_STORAGE_KEY,
        JSON.stringify({
          code: result.code,
          name: result.name,
          generatedAt: new Date().toISOString(),
          source,
        }),
      )
    } catch {
      // Ignore storage failures.
    }
  }, [stage, result, resultOrigin, source])

  function handleAnswer(position: QuizAnswer) {
    if (pendingAnswer !== null) return
    startedRef.current = true
    setPendingAnswer(position)
    window.setTimeout(() => {
      setPendingAnswer(null)
      const next = [...answers, position]
      if (next.length < QUIZ_QUESTIONS.length) {
        setAnswers(next)
        setCurrentQ(next.length)
        return
      }

      const code = scoreQuiz(next)
      const meta = getTypeMeta(code)
      setAnswers(next)
      setResult({ code, ...meta })
      setLeans(computeAxisLeans(next, code))
      setResultOrigin('quiz')
      setStage('result')
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

  function shareText(meta: ResultMeta) {
    return `${meta.emoji} ${meta.code} — ${meta.name}\n\n"${meta.quote}"\n\nFind your FIRE Type:\nhttps://www.untilfire.com/fire-type`
  }

  async function handleShare() {
    if (!result) return
    const text = shareText(result)

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ text })
        return
      } catch {
        // Fall back to clipboard.
      }
    }

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  async function handleDownloadCard() {
    const node = cardRef.current
    if (!node || typeof window === 'undefined') return

    downloadState.setLabel('working')

    try {
      const rect = node.getBoundingClientRect()
      const width = Math.ceil(rect.width)
      const height = Math.ceil(rect.height)
      const scale = Math.min(2, window.devicePixelRatio || 1.5)

      const clone = node.cloneNode(true) as HTMLElement
      clone.style.margin = '0'
      clone.style.width = `${width}px`
      clone.style.height = `${height}px`

      const wrapper = document.createElement('div')
      wrapper.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml')
      wrapper.style.width = `${width}px`
      wrapper.style.height = `${height}px`
      wrapper.style.display = 'block'
      wrapper.appendChild(clone)

      const serialized = new XMLSerializer().serializeToString(wrapper)
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width * scale}" height="${height * scale}" viewBox="0 0 ${width} ${height}">
          <foreignObject width="100%" height="100%">${serialized}</foreignObject>
        </svg>
      `
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(blob)

      try {
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image()
          img.onload = () => resolve(img)
          img.onerror = reject
          img.src = url
        })

        const canvas = document.createElement('canvas')
        canvas.width = width * scale
        canvas.height = height * scale

        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Canvas context unavailable')

        ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
        const pngUrl = canvas.toDataURL('image/png')

        const link = document.createElement('a')
        link.href = pngUrl
        link.download = `untilfire-${result?.code.toLowerCase() ?? 'fire-type'}-card.png`
        link.click()
        downloadState.setLabel('done')
      } finally {
        URL.revokeObjectURL(url)
      }
    } catch {
      downloadState.setLabel('error')
    }
  }

  if (stage === 'intro') {
    return (
      <div style={{ background: C.bg, minHeight: '100vh' }}>
        <nav
          style={{
            borderBottom: `1px solid ${C.border}`,
            padding: '16px 24px',
            background: C.card,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Wordmark size={22} />
          </Link>
          <Link
            href="/"
            style={{
              color: C.accent,
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 600,
              border: `1px solid ${C.accent}`,
              padding: '6px 14px',
              borderRadius: 8,
            }}
          >
            Calculate my FIRE number →
          </Link>
        </nav>

        <div className="ft-intro-pad" style={{ maxWidth: 560, margin: '0 auto', padding: '64px 24px 80px', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-block',
              background: C.tealSoft,
              color: C.accent,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              padding: '4px 12px',
              borderRadius: 999,
              marginBottom: 24,
            }}
          >
            2 minutes · No login
          </div>

          <h1
            style={{
              fontSize: 'clamp(32px, 6vw, 52px)',
              fontWeight: 800,
              color: C.text,
              letterSpacing: '-0.03em',
              margin: '0 0 16px',
              lineHeight: 1.1,
            }}
          >
            What&apos;s your
            <br />
            <span style={{ color: C.accent }}>FIRE Type?</span>
          </h1>

          <p
            style={{
              fontSize: 17,
              color: C.muted,
              lineHeight: 1.7,
              margin: '0 0 40px',
              maxWidth: 440,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            Answer 8 quick questions to discover how you naturally think about financial independence, then calculate your real FIRE number.
          </p>

          <button
            onClick={() => setStage('quiz')}
            style={{
              background: C.accent,
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 10,
              padding: '16px 36px',
              fontSize: 17,
              fontWeight: 700,
              cursor: 'pointer',
              width: '100%',
              maxWidth: 360,
            }}
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

  if (stage === 'quiz') {
    const question = QUIZ_QUESTIONS[currentQ]
    const progress = (currentQ / QUIZ_QUESTIONS.length) * 100

    return (
      <div style={{ background: C.bg, minHeight: '100vh' }}>
        <nav
          style={{
            borderBottom: `1px solid ${C.border}`,
            padding: '16px 24px',
            background: C.card,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Wordmark size={22} />
          </Link>
          <span style={{ fontSize: 13, color: C.muted }}>
            Question {currentQ + 1} of {QUIZ_QUESTIONS.length}
          </span>
        </nav>

        <div style={{ height: 3, background: C.border }}>
          <div style={{ height: '100%', width: `${progress}%`, background: C.teal, transition: 'width 0.3s' }} />
        </div>

        <div className="ft-quiz-pad" style={{ maxWidth: 560, margin: '0 auto', padding: '48px 24px 80px' }}>
          <div
            key={currentQ}
            className="ft-quiz-card"
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: '36px 28px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              animation: 'ft-slide-in 0.22s ease-out',
            }}
          >
            <p style={{ fontSize: 12, fontWeight: 700, color: C.teal, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 16 }}>
              Question {currentQ + 1} of {QUIZ_QUESTIONS.length}
            </p>
            <h2 style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 800, color: C.text, letterSpacing: '-0.02em', margin: '0 0 28px', lineHeight: 1.3 }}>
              {question.prompt}
            </h2>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.text, maxWidth: '42%', lineHeight: 1.4 }}>{question.leftLabel}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.text, maxWidth: '42%', lineHeight: 1.4, textAlign: 'right' }}>{question.rightLabel}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
              {([0, 1, 2, 3, 4] as QuizAnswer[]).map((position) => {
                const size = position === 2 ? 36 : position === 1 || position === 3 ? 42 : 48
                const isSelected = pendingAnswer === position
                const isPending = pendingAnswer !== null

                return (
                  <button
                    key={position}
                    onClick={() => handleAnswer(position)}
                    title={(['Strongly', 'Slightly', 'Neutral', 'Slightly', 'Strongly'] as const)[position]}
                    style={{
                      width: size,
                      height: size,
                      borderRadius: '50%',
                      border: `2px solid ${isSelected ? C.accent : C.border}`,
                      background: isSelected ? C.accent : C.card,
                      cursor: isPending ? 'default' : 'pointer',
                      transition: 'all 0.15s',
                      flexShrink: 0,
                      padding: 0,
                      transform: isSelected ? 'scale(1.18)' : 'scale(1)',
                      pointerEvents: isPending ? 'none' : 'auto',
                    }}
                    onMouseEnter={
                      !isPending
                        ? (event) => {
                            event.currentTarget.style.borderColor = C.accent
                            event.currentTarget.style.background = C.tealSoft
                          }
                        : undefined
                    }
                    onMouseLeave={
                      !isPending
                        ? (event) => {
                            event.currentTarget.style.borderColor = C.border
                            event.currentTarget.style.background = C.card
                          }
                        : undefined
                    }
                  />
                )
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ fontSize: 11, color: C.muted }}>Strongly</span>
              <span style={{ fontSize: 11, color: C.muted }}>Neutral</span>
              <span style={{ fontSize: 11, color: C.muted }}>Strongly</span>
            </div>

            <button
              onClick={handleBack}
              style={{
                marginTop: 20,
                background: 'none',
                border: 'none',
                color: C.muted,
                fontSize: 13,
                cursor: 'pointer',
                padding: '4px 0',
              }}
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!result) return null

  const code = result.code
  const ctaHref = `/?source=fire-type-result&type=${code}&start=onboarding`
  const isSharedResult = resultOrigin === 'shared'
  const letters = code.split('') as AxisLetter[]

  function retake() {
    setStage('quiz')
    setAnswers([])
    setCurrentQ(0)
    setResult(null)
    setResultOrigin('quiz')
    startedRef.current = false
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text }}>
      <nav
        style={{
          height: 56,
          borderBottom: `1px solid ${C.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 22px',
          background: C.card,
          gap: 12,
        }}
      >
        <Link href="/" style={{ textDecoration: 'none' }}>
          <Wordmark size={18} />
        </Link>
        <button
          onClick={retake}
          style={{
            background: 'none',
            border: 'none',
            color: C.muted,
            fontSize: 13,
            cursor: 'pointer',
            padding: 0,
            fontWeight: 600,
          }}
        >
          {isSharedResult ? 'Take the quiz' : 'Retake quiz'}
        </button>
      </nav>

      <div
        style={{
          padding: '30px 22px 8px',
          background: 'radial-gradient(80% 46% at 50% 0%, rgba(6,95,70,.07), transparent 70%)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 12, letterSpacing: '2px', textTransform: 'uppercase', color: C.accent, marginBottom: 18 }}>
          {isSharedResult ? 'Their FIRE type' : 'You got your FIRE type'}
        </div>

        {isSharedResult ? (
          <div
            style={{
              background: C.tealSoft,
              border: '1px solid rgba(6,95,70,.16)',
              borderRadius: 14,
              padding: '14px 18px',
              color: C.accentDark,
              lineHeight: 1.6,
              maxWidth: 420,
              margin: '0 auto 18px',
            }}
          >
            Think this sounds like you? Take the quiz to find your own FIRE Type.
          </div>
        ) : null}

        <div style={{ maxWidth: 380, margin: '0 auto' }}>
          <PosterCard result={result} cardRef={cardRef} />
        </div>

        <div className="ft-hero-btns" style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 22, paddingBottom: 8, flexWrap: 'wrap' }}>
          <button
            onClick={handleDownloadCard}
            style={{
              fontWeight: 700,
              fontSize: 14,
              color: '#FFFFFF',
              background: C.accentDark,
              border: 'none',
              borderRadius: 10,
              padding: '11px 20px',
              cursor: 'pointer',
              minWidth: 150,
            }}
          >
            {downloadState.label === 'working'
              ? 'Rendering...'
              : downloadState.label === 'done'
                ? 'Downloaded'
                : downloadState.label === 'error'
                  ? 'Try again'
                  : 'Download card'}
          </button>
          <button
            onClick={handleShare}
            style={{
              fontWeight: 700,
              fontSize: 14,
              color: C.accentDark,
              background: 'transparent',
              border: `1.5px solid ${C.accentDark}`,
              borderRadius: 10,
              padding: '11px 20px',
              cursor: 'pointer',
              minWidth: 150,
            }}
          >
            {copied ? 'Copied' : 'Share my type'}
          </button>
          {isSharedResult ? (
            <button
              onClick={retake}
              style={{
                fontWeight: 700,
                fontSize: 14,
                color: C.textStrong,
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: '11px 20px',
                cursor: 'pointer',
              }}
            >
              Take the quiz
            </button>
          ) : null}
        </div>
      </div>

      <div className="ft-result-body" style={{ maxWidth: 560, margin: '0 auto', padding: '26px 22px 30px' }}>
        <SurfaceCard style={{ marginBottom: 18 }}>
          <SectionEyebrow>How you scored — the four axes</SectionEyebrow>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {FIRE_AXES.map((axis, index) => (
              <Spectrum key={axis.key} left={axis.left} right={axis.right} pos={leans[index]} />
            ))}
          </div>
        </SurfaceCard>

        <div className="ft-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
          <SurfaceCard highlight>
            <SectionEyebrow>★ Your strengths</SectionEyebrow>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 11 }}>
              {letters.map((letter) => (
                <li key={letter} style={{ display: 'flex', gap: 9, fontSize: 13.5, lineHeight: 1.45, color: C.text }}>
                  <span style={{ color: C.accent, fontWeight: 800, flexShrink: 0 }}>{letter}</span>
                  <span>{AXIS_STRENGTHS[letter]}</span>
                </li>
              ))}
            </ul>
          </SurfaceCard>
          <SurfaceCard>
            <SectionEyebrow>⚠ Watch-outs</SectionEyebrow>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 11 }}>
              {letters.map((letter) => (
                <li key={letter} style={{ display: 'flex', gap: 9, fontSize: 13.5, lineHeight: 1.45, color: C.muted }}>
                  <span style={{ color: C.mutedSoft, fontWeight: 800, flexShrink: 0 }}>{letter}</span>
                  <span>{AXIS_WATCH_OUTS[letter]}</span>
                </li>
              ))}
            </ul>
          </SurfaceCard>
        </div>

        <div
          style={{
            background: C.accentDeep,
            borderRadius: 16,
            padding: '26px 24px',
            textAlign: 'center',
            color: '#FFFFFF',
            marginBottom: 18,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 11, letterSpacing: '2px', color: C.teal, textTransform: 'uppercase' }}>How rare you are</div>
          <div style={{ fontWeight: 800, fontSize: 52, letterSpacing: '-1px', lineHeight: 1.05, marginTop: 6 }}>{result.rarity}</div>
          <div style={{ fontSize: 14, color: '#cfeee4', marginTop: 2 }}>of UntilFire quiz-takers share your type · {result.rank}</div>
        </div>

        <SurfaceCard style={{ background: C.cream, border: `1px solid ${C.creamLine}`, marginBottom: 16, textAlign: 'center' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 10px' }}>Your next FIRE move</p>
          <p style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-0.4px', color: C.textStrong, margin: '0 0 8px' }}>Now turn your type into a number.</p>
          <p style={{ fontSize: 14, color: C.muted, margin: '0 0 20px', lineHeight: 1.6 }}>
            See the real FIRE number behind the way you think.
          </p>
          {isSharedResult ? (
            <button
              onClick={retake}
              style={{
                display: 'block',
                background: C.card,
                color: C.textStrong,
                borderRadius: 10,
                padding: '14px 28px',
                fontSize: 15,
                fontWeight: 700,
                width: '100%',
                boxSizing: 'border-box',
                border: `1px solid ${C.border}`,
                marginBottom: 12,
                cursor: 'pointer',
              }}
            >
              Take the quiz to find my type
            </button>
          ) : null}
          <Link
            href={ctaHref}
            style={{
              display: 'block',
              background: C.accentDark,
              color: '#FFFFFF',
              textDecoration: 'none',
              borderRadius: 10,
              padding: '14px 28px',
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            Calculate my actual FIRE number →
          </Link>
        </SurfaceCard>

        <p style={{ fontSize: 12, color: C.muted, textAlign: 'center', lineHeight: 1.7 }}>
          Your FIRE Type is a preference-based personality result, not financial advice. Your actual FIRE path depends on your numbers — calculate your FIRE number next.
        </p>
      </div>

      <div
        style={{
          borderTop: `1px solid ${C.border}`,
          padding: '16px 22px',
          textAlign: 'center',
          fontSize: 10.5,
          letterSpacing: '1px',
          color: C.mutedSoft,
        }}
      >
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
          to { opacity: 1; transform: translateX(0); }
        }
        @media (max-width: 520px) {
          .ft-intro-pad { padding: 40px 16px 60px !important; }
          .ft-quiz-pad { padding: 28px 16px 60px !important; }
          .ft-quiz-card { padding: 24px 18px !important; }
          .ft-result-body { padding: 20px 16px 50px !important; }
          .ft-hero-btns { flex-direction: column; align-items: stretch !important; padding: 0 16px 8px !important; }
          .ft-2col { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <Suspense>
        <FireTypeQuizInner />
      </Suspense>
    </>
  )
}
