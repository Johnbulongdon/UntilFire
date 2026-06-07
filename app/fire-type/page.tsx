'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { FireTypeAvatar } from './FireTypeAvatar'
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

function FireTypeQuizInner() {
  const searchParams = useSearchParams()
  const source = searchParams.get('source') ?? undefined
  const sharedType = (searchParams.get('type') ?? '').toUpperCase()

  type Stage = 'intro' | 'quiz' | 'result'
  type ResultOrigin = 'quiz' | 'shared'
  const [stage, setStage] = useState<Stage>('intro')
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<QuizAnswer[]>([])
  const [result, setResult] = useState<{ code: string; name: string; tagline: string; emoji: string; quote: string; archetype: string; scene: string } | null>(null)
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
    const shareUrl = `https://www.untilfire.com/fire-type?type=${encodeURIComponent(result.code)}&source=share`
    const shareText = `${result.emoji} ${result.code} - ${result.name}\n\n"${result.quote}"\n\nFind your FIRE Type:\n${shareUrl}`
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: `${result.code} - ${result.name}`, text: shareText, url: shareUrl })
        trackFireTypeShared({ fireTypeCode: result.code, shareMethod: 'native' })
        return
      } catch {
        // User cancelled or share failed, fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      trackFireTypeShared({ fireTypeCode: result.code, shareMethod: 'clipboard' })
    } catch {
      // clipboard unavailable
    }
  }

  function openSocialShare(platform: 'x' | 'facebook' | 'reddit' | 'linkedin' | 'whatsapp' | 'email') {
    if (!result) return
    const shareUrl = `https://www.untilfire.com/fire-type?type=${encodeURIComponent(result.code)}&source=share`
    const text = `${result.emoji} ${result.code} - ${result.name}\n"${result.quote}"`
    const encodedText = encodeURIComponent(text)
    const encodedUrl = encodeURIComponent(shareUrl)
    const urls = {
      x: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      reddit: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodeURIComponent(`${result.code} - ${result.name}`)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text}\n${shareUrl}`)}`,
      email: `mailto:?subject=${encodeURIComponent(`${result.code} - ${result.name}`)}&body=${encodeURIComponent(`${text}\n\n${shareUrl}`)}`,
    }
    if (platform === 'email') {
      window.location.href = urls.email
      return
    }
    window.open(urls[platform], '_blank', 'noopener,noreferrer,width=620,height=520')
  }

  if (stage === 'intro') {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', fontFamily: "'Manrope', sans-serif" }}>
        <nav style={{ borderBottom: `1px solid ${C.border}`, padding: '16px 24px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Logo variant="light" size={22} />
          </Link>
          <Link href="/" style={{ color: C.accent, textDecoration: 'none', fontSize: 14, fontWeight: 600, border: `1px solid ${C.accent}`, padding: '6px 14px', borderRadius: 6 }}>
            Calculate my FIRE number -&gt;
          </Link>
        </nav>

        <div className="ft-intro-pad" style={{ maxWidth: 560, margin: '0 auto', padding: '64px 24px 80px', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', background: '#ECFDF5', color: C.accent, fontSize: 12, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', padding: '4px 12px', borderRadius: 99, marginBottom: 24 }}>
            2 minutes - No login
          </div>

          <h1 style={{ fontSize: 'clamp(32px, 6vw, 52px)', fontWeight: 800, color: C.text, letterSpacing: '-0.03em', margin: '0 0 16px', lineHeight: 1.1 }}>
            What&apos;s your
            <br />
            <span style={{ color: C.accent }}>FIRE Type?</span>
          </h1>

          <p style={{ fontSize: 17, color: C.muted, lineHeight: 1.7, margin: '0 0 40px', maxWidth: 440, marginLeft: 'auto', marginRight: 'auto' }}>
            Answer 8 quick questions to discover how you naturally think about financial independence, then calculate your real FIRE number.
          </p>

          <button
            onClick={() => setStage('quiz')}
            style={{ background: C.accent, color: '#ffffff', border: 'none', borderRadius: 10, padding: '16px 36px', fontSize: 17, fontWeight: 700, cursor: 'pointer', width: '100%', maxWidth: 360 }}
          >
            Find my FIRE Type -&gt;
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
    const q = QUIZ_QUESTIONS[currentQ]
    const progress = (currentQ / QUIZ_QUESTIONS.length) * 100

    return (
      <div style={{ background: C.bg, minHeight: '100vh', fontFamily: "'Manrope', sans-serif" }}>
        <nav style={{ borderBottom: `1px solid ${C.border}`, padding: '16px 24px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Logo variant="light" size={22} />
          </Link>
          <span style={{ fontSize: 13, color: C.muted }}>Question {currentQ + 1} of {QUIZ_QUESTIONS.length}</span>
        </nav>

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

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.text, maxWidth: '42%', lineHeight: 1.4 }}>{q.leftLabel}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.text, maxWidth: '42%', lineHeight: 1.4, textAlign: 'right' }}>{q.rightLabel}</span>
            </div>

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
                      width: size,
                      height: size,
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
                    onMouseEnter={!isPending ? (e) => {
                      e.currentTarget.style.borderColor = C.accent
                      e.currentTarget.style.background = '#ECFDF5'
                    } : undefined}
                    onMouseLeave={!isPending ? (e) => {
                      e.currentTarget.style.borderColor = C.border
                      e.currentTarget.style.background = '#ffffff'
                    } : undefined}
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
              style={{ marginTop: 20, background: 'none', border: 'none', color: C.muted, fontSize: 13, cursor: 'pointer', padding: '4px 0', fontFamily: "'Manrope', sans-serif" }}
            >
              Back
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

      <div className="ft-result-pad" style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 80px' }}>
        {isSharedResult ? (
          <div style={{ background: '#ECFDF5', border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 18px', marginBottom: 18, color: C.text, textAlign: 'center', lineHeight: 1.6 }}>
            Think this sounds like you? Take the quiz to find your own FIRE Type, or go straight to your FIRE number.
          </div>
        ) : null}

        <div className="ft-result-hero">
          <div className="ft-hero-card">
            <div className="ft-hero-copy">
              <p className="ft-hero-kicker">Your FIRE Type</p>
              <div className="ft-hero-code">{code}</div>
              <p className="ft-hero-name">{result.name}</p>
              <p className="ft-hero-quote">&ldquo;{result.quote}&rdquo;</p>
              <p className="ft-hero-tagline">{result.tagline}</p>
            </div>

            <div className="ft-hero-art">
              <FireTypeAvatar code={code} size={248} />
            </div>

            <div className="ft-hero-brand">untilfire.com/fire-type</div>
          </div>
        </div>

        <div className="ft-profile-card">
          <div className="ft-profile-head">
            <p className="ft-profile-kicker">How You Operate</p>
            <h3 className="ft-profile-title">Your natural strengths and likely friction points</h3>
          </div>
          <div className="ft-profile-grid">
            <div className="ft-profile-column">
              <p className="ft-profile-label ft-profile-label-good">Strengths</p>
              <ul className="ft-profile-list">
                {letters.map((l) => (
                  <li key={l} className="ft-profile-item">
                    <span className="ft-profile-icon ft-profile-icon-good">+</span>
                    <span>{AXIS_STRENGTHS[l]}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="ft-profile-column">
              <p className="ft-profile-label ft-profile-label-watch">Watch-outs</p>
              <ul className="ft-profile-list">
                {letters.map((l) => (
                  <li key={l} className="ft-profile-item">
                    <span className="ft-profile-icon ft-profile-icon-watch">-</span>
                    <span>{AXIS_WATCH_OUTS[l]}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

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
            Now calculate my actual FIRE number -&gt;
          </Link>
        </div>

        <div className="ft-share-box" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 24px', marginBottom: 24, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <p style={{ fontSize: 13, color: C.muted, margin: '0 0 14px' }}>Share your FIRE Type card or send a direct type link</p>
          <button
            onClick={handleShare}
            style={{ background: C.darkGreen, color: C.teal, border: 'none', borderRadius: 8, padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'Manrope', sans-serif", width: '100%' }}
          >
            {copied ? 'Copied to clipboard!' : `${result.emoji} Share my FIRE Type ->`}
          </button>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginTop: 12 }}>
            <button onClick={() => openSocialShare('x')} style={{ background: '#111827', color: '#ffffff', border: 'none', borderRadius: 8, padding: '11px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}>Post on X</button>
            <button onClick={() => openSocialShare('facebook')} style={{ background: '#1877F2', color: '#ffffff', border: 'none', borderRadius: 8, padding: '11px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}>Facebook</button>
            <button onClick={() => openSocialShare('linkedin')} style={{ background: '#0A66C2', color: '#ffffff', border: 'none', borderRadius: 8, padding: '11px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}>LinkedIn</button>
            <button onClick={() => openSocialShare('reddit')} style={{ background: '#FF4500', color: '#ffffff', border: 'none', borderRadius: 8, padding: '11px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}>Reddit</button>
            <button onClick={() => openSocialShare('whatsapp')} style={{ background: '#25D366', color: '#073B1A', border: 'none', borderRadius: 8, padding: '11px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}>WhatsApp</button>
            <button onClick={() => openSocialShare('email')} style={{ background: '#FFF7ED', color: '#9A3412', border: '1px solid #FED7AA', borderRadius: 8, padding: '11px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}>Email</button>
          </div>
        </div>

        <p style={{ fontSize: 12, color: C.muted, textAlign: 'center', lineHeight: 1.7 }}>
          Your FIRE Type is a preference-based personality result, not financial advice. Your actual FIRE path depends on your numbers, calculate your FIRE number next.
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
          to { opacity: 1; transform: translateX(0); }
        }

        .ft-result-hero {
          margin-bottom: 20px;
        }

        .ft-hero-card {
          position: relative;
          overflow: hidden;
          border-radius: 28px;
          padding: 32px;
          background:
            radial-gradient(circle at top left, rgba(34, 211, 165, 0.18), transparent 34%),
            radial-gradient(circle at bottom right, rgba(16, 185, 129, 0.14), transparent 28%),
            linear-gradient(160deg, #083b2b 0%, #0b4d39 52%, #0d5f46 100%);
          box-shadow: 0 28px 70px rgba(8, 36, 28, 0.22);
          display: grid;
          grid-template-columns: minmax(0, 1fr) 280px;
          gap: 24px;
          align-items: end;
        }

        .ft-hero-card::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          border: 1px solid rgba(255, 255, 255, 0.12);
          pointer-events: none;
        }

        .ft-hero-copy {
          position: relative;
          z-index: 1;
          max-width: 420px;
        }

        .ft-hero-kicker,
        .ft-profile-kicker {
          margin: 0 0 10px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .ft-hero-kicker {
          color: rgba(206, 255, 238, 0.78);
        }

        .ft-hero-code {
          margin-left: 0.22em;
          font-family: 'DM Mono', monospace;
          font-size: clamp(52px, 13vw, 88px);
          font-weight: 900;
          line-height: 0.92;
          letter-spacing: 0.22em;
          color: #dffdf3;
          text-shadow: 0 14px 30px rgba(0, 0, 0, 0.18);
        }

        .ft-hero-name {
          margin: 16px 0 0;
          color: #ffffff;
          font-size: clamp(19px, 4vw, 28px);
          font-weight: 800;
          letter-spacing: -0.03em;
        }

        .ft-hero-quote {
          margin: 18px 0 0;
          color: rgba(255, 255, 255, 0.9);
          font-size: 19px;
          line-height: 1.55;
          font-style: italic;
          max-width: 34ch;
        }

        .ft-hero-tagline {
          margin: 16px 0 0;
          color: rgba(224, 247, 240, 0.78);
          font-size: 14px;
          line-height: 1.7;
          max-width: 42ch;
        }

        .ft-hero-art {
          position: relative;
          z-index: 1;
          display: flex;
          justify-content: center;
          align-items: end;
          min-height: 300px;
          padding: 16px 12px 0;
          border-radius: 24px;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02)),
            linear-gradient(180deg, rgba(1, 20, 15, 0.16), rgba(1, 20, 15, 0));
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
        }

        .ft-hero-brand {
          position: absolute;
          right: 26px;
          bottom: 18px;
          z-index: 1;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(219, 247, 238, 0.54);
        }

        .ft-profile-card {
          margin-bottom: 24px;
          border-radius: 22px;
          padding: 24px;
          background: rgba(255, 255, 255, 0.78);
          border: 1px solid rgba(226, 232, 240, 0.95);
          box-shadow: 0 16px 38px rgba(15, 23, 42, 0.06);
          backdrop-filter: blur(12px);
        }

        .ft-profile-head {
          margin-bottom: 18px;
        }

        .ft-profile-kicker {
          color: #059669;
        }

        .ft-profile-title {
          margin: 0;
          color: #111827;
          font-size: 22px;
          line-height: 1.2;
          letter-spacing: -0.03em;
        }

        .ft-profile-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .ft-profile-column {
          border-radius: 18px;
          padding: 18px;
          background: rgba(248, 250, 252, 0.88);
          border: 1px solid rgba(226, 232, 240, 0.9);
        }

        .ft-profile-label {
          margin: 0 0 14px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .ft-profile-label-good {
          color: #047857;
        }

        .ft-profile-label-watch {
          color: #c2410c;
        }

        .ft-profile-list {
          margin: 0;
          padding: 0;
          list-style: none;
          display: grid;
          gap: 12px;
        }

        .ft-profile-item {
          display: grid;
          grid-template-columns: 26px minmax(0, 1fr);
          gap: 10px;
          align-items: start;
          color: #334155;
          font-size: 14px;
          line-height: 1.55;
        }

        .ft-profile-icon {
          width: 26px;
          height: 26px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          font-size: 14px;
          font-weight: 800;
        }

        .ft-profile-icon-good {
          background: #d1fae5;
          color: #047857;
        }

        .ft-profile-icon-watch {
          background: #ffedd5;
          color: #c2410c;
        }

        @media (max-width: 720px) {
          .ft-hero-card {
            grid-template-columns: 1fr;
            padding: 24px;
            gap: 18px;
          }

          .ft-hero-copy {
            max-width: none;
          }

          .ft-hero-quote {
            font-size: 17px;
          }

          .ft-hero-art {
            min-height: 260px;
          }

          .ft-hero-brand {
            position: static;
            margin-top: 2px;
          }

          .ft-profile-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .ft-intro-pad { padding: 40px 16px 60px !important; }
          .ft-quiz-pad { padding: 28px 16px 60px !important; }
          .ft-quiz-card { padding: 24px 18px !important; }
          .ft-result-pad { padding: 32px 16px 60px !important; }
          .ft-profile-card { padding: 18px !important; border-radius: 18px !important; }
          .ft-cta-box { padding: 20px 16px !important; }
          .ft-share-box { padding: 16px !important; }
          .ft-hero-card { padding: 20px 18px !important; border-radius: 20px !important; }
          .ft-hero-art { min-height: 220px; border-radius: 18px; }
          .ft-hero-name { font-size: 20px; }
          .ft-hero-quote { font-size: 16px; }
        }
      `}</style>
      <Suspense>
        <FireTypeQuizInner />
      </Suspense>
    </>
  )
}
