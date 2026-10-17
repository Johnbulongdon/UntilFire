import AsyncStorage from '@react-native-async-storage/async-storage'
import { Bouncy } from '@/components/Bouncy'
import { Button } from '@/components/Button'
import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, Share, View } from 'react-native'
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { PrimaryButton } from '@/components/PrimaryButton'
import { ProgressBar } from '@/components/ProgressBar'
import { Text } from '@/components/Text'
import { computeAxisLeans, FIRE_AXES, getTypeMeta, QUIZ_QUESTIONS, scoreQuiz, type AxisLetter, type QuizAnswer } from '@quiz'
import { FIRE_QUIZ_KEY } from '@/lib/fire-quiz'
import { haptic } from '@/lib/haptics'
import { Events, track } from '@/lib/analytics'
import { useAuth } from '@/state/auth'
import { useAccount } from '@/state/account'
import { colors, TAB_COLOR } from '@/theme/colors'

/** A picture for each question and for each of its sides, so the screen reads at a glance (Oct 16 2026, the founder). */
const ART: Record<string, { q: string; sides: [string, string] }> = {
  pa1: { q: '🎛️', sides: ['🗺️', '🧭'] }, pa2: { q: '🔀', sides: ['🛠️', '🤔'] },
  se1: { q: '💰', sides: ['🛡️', '🚀'] }, se2: { q: '💵', sides: ['🏦', '📈'] },
  rg1: { q: '🧾', sides: ['✂️', '💼'] }, rg2: { q: '👀', sides: ['🔍', '💡'] },
  bf1: { q: '🏗️', sides: ['🧱', '🕊️'] }, bf2: { q: '⏳', sides: ['🎯', '🌴'] },
}

/**
 * The FIRE type quiz (untilfire.com/fire-type): eight questions on a
 * five-point scale, scored into one of 16 types by the website's own code.
 * The result is about how you think, not a projection input.
 */
export default function FireQuiz() {
  const [answers, setAnswers] = useState<QuizAnswer[]>([])
  const [rewardUntil, setRewardUntil] = useState<string | null>(null)
  const { session } = useAuth()
  const { refresh } = useAccount()
  const done = answers.length >= QUIZ_QUESTIONS.length
  const i = Math.min(answers.length, QUIZ_QUESTIONS.length - 1)
  const q = QUIZ_QUESTIONS[i]

  const answer = (a: QuizAnswer) => {
    haptic.select()
    const next = [...answers, a]
    setAnswers(next)
    if (next.length === QUIZ_QUESTIONS.length) {
      const code = scoreQuiz(next)
      haptic.success()
      AsyncStorage.setItem(FIRE_QUIZ_KEY, JSON.stringify({ code, name: getTypeMeta(code).name, answers: next })).catch(() => {})
      // A free month of Pro for finishing, once per account (D-79). The site decides who qualifies.
      if (session) fetch('https://www.untilfire.com/api/rewards/quiz-month', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } })
        .then(r => r.json()).then((j: { granted?: boolean; until?: string }) => { if (j.granted && j.until) { setRewardUntil(j.until); track(Events.REWARD_MONTH_GRANTED, { source: 'fire_quiz' }); refresh() } }).catch(() => {})
    }
  }

  const insets = useSafeAreaInsets()
  const art = ART[q.id] ?? { q: '🔥', sides: ['◀︎', '▶︎'] as [string, string] }
  const [l, r] = art.sides

  return (
    <View style={{ flex: 1, backgroundColor: colors.ground }}>
      {/* Soft tilted panels behind the questions, in Profile's colour, so the screen isn't only words. */}
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', width: 300, height: 300, borderRadius: 64, top: -110, right: -120, backgroundColor: TAB_COLOR.profile, opacity: 0.08, transform: [{ rotate: '18deg' }] }} />
        <View style={{ position: 'absolute', width: 240, height: 240, borderRadius: 56, bottom: -90, left: -110, backgroundColor: TAB_COLOR.profile, opacity: 0.06, transform: [{ rotate: '-14deg' }] }} />
      </View>
      {/* Below the status bar and Dynamic Island: a full-screen modal can report no top inset, so keep a floor. */}
      <View className="flex-row items-center gap-4 px-5" style={{ paddingTop: Math.max(insets.top, 44) + 8 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={answers.length && !done ? 'Previous question' : 'Close'} hitSlop={12}
          onPress={() => { haptic.tick(); if (answers.length && !done) setAnswers(a => a.slice(0, -1)); else router.back() }}>
          <Text className="text-[26px] text-ink-3">{answers.length && !done ? '‹' : '×'}</Text>
        </Pressable>
        <View className="flex-1"><ProgressBar step={done ? QUIZ_QUESTIONS.length : answers.length} steps={QUIZ_QUESTIONS.length} /></View>
        <Text className="font-mono text-[13px] text-ink-3">{Math.min(answers.length + 1, QUIZ_QUESTIONS.length)}/{QUIZ_QUESTIONS.length}</Text>
      </View>

      {done ? <Result answers={answers} rewardUntil={rewardUntil} onRetake={() => setAnswers([])} /> : (
        <Animated.View key={q.id} entering={FadeInRight.duration(220)} style={{ flex: 1, paddingHorizontal: 24, paddingBottom: insets.bottom + 16, paddingTop: 16 }}>
          <View style={{ width: 76, height: 76, borderRadius: 22, backgroundColor: TAB_COLOR.profile, alignItems: 'center', justifyContent: 'center' }}>
            <Text className="text-[40px]">{art.q}</Text>
          </View>
          <Text className="mt-4 font-display text-[26px] font-bold leading-8 text-ink">{q.prompt}</Text>
          {/* Five rectangles, one shape: the two pictured sides, and "a little", "both" and "a little" between them. */}
          <View style={{ flex: 1, justifyContent: 'center', gap: 8, paddingTop: 12 }}>
            <Answer art={l} label={q.leftLabel} a11y={`Very much: ${q.leftLabel}`} big onPress={() => answer(0)} />
            <Answer art={l} label="A little more this" a11y={`A little: ${q.leftLabel}`} onPress={() => answer(1)} />
            <Answer art="⚖️" label="Both equally" a11y="In between" onPress={() => answer(2)} />
            <Answer art={r} label="A little more this" a11y={`A little: ${q.rightLabel}`} onPress={() => answer(3)} />
            <Answer art={r} label={q.rightLabel} a11y={`Very much: ${q.rightLabel}`} big onPress={() => answer(4)} />
          </View>
        </Animated.View>
      )}
    </View>
  )
}

/** One answer, always a rounded rectangle: a picture and a few words. The two sides are bigger. */
function Answer({ art, label, a11y, big, onPress }: { art: string; label: string; a11y: string; big?: boolean; onPress: () => void }) {
  const tile = big ? 48 : 34
  return (
    <Bouncy accessibilityLabel={a11y} onPress={onPress}>
      <View className={`flex-row items-center gap-3 rounded-2xl border-2 border-border bg-card px-4 ${big ? 'py-3' : 'py-2'}`} style={{ borderBottomWidth: 4 }}>
        <View style={{ width: tile, height: tile, borderRadius: 12, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
          <Text className={big ? 'text-[28px]' : 'text-[18px]'}>{art}</Text>
        </View>
        <Text numberOfLines={2} className={`flex-1 ${big ? 'text-[16px] font-semibold text-ink' : 'text-[14px] text-ink-2'} leading-5`}>{label}</Text>
      </View>
    </Bouncy>
  )
}

function Result({ answers, rewardUntil, onRetake }: { answers: QuizAnswer[]; rewardUntil: string | null; onRetake: () => void }) {
  const code = scoreQuiz(answers)
  const meta = getTypeMeta(code)
  const leans = computeAxisLeans(answers, code)
  const letters = code.split('') as AxisLetter[]
  return (
    <ScrollView contentContainerClassName="px-6 pb-10 pt-6">
      <Animated.View entering={FadeIn.duration(500)}>
      <View className="items-center">
        <Text className="text-[64px]">{meta.emoji}</Text>
        <Text className="mt-2 text-[12px] font-bold uppercase tracking-[2px] text-ink-3">{code} · {meta.rank} · {meta.rarity} of people</Text>
        <Text className="mt-2 text-center font-display text-[30px] font-bold leading-9 text-ink">{meta.name}</Text>
        <Text className="mt-2 text-center text-[16px] leading-6 text-ink-2">{meta.tagline}</Text>
        <Text className="mt-3 text-center text-[15px] italic text-teal-deep">“{meta.quote}”</Text>
      </View>
      </Animated.View>

      {rewardUntil ? (
        <Animated.View entering={FadeIn.duration(400)} className="mt-6 rounded-card border border-border bg-card p-5">
          <Text className="font-display text-[18px] font-bold text-ink">🎁 You’ve unlocked a free month of Pro</Text>
          <Text className="mt-1 text-[14px] leading-5 text-ink-2">
            Thanks for taking the quiz. Everything in Pro is open until {new Date(rewardUntil).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}. No card, and nothing to cancel.
          </Text>
        </Animated.View>
      ) : null}

      <View className="mt-6 gap-3 rounded-card border border-border bg-card p-5">
        {FIRE_AXES.map((ax, k) => (
          <View key={ax.key}>
            <View className="flex-row justify-between">
              <Text className={`text-[13px] ${letters[k] === ax.leftLetter ? 'font-bold text-ink' : 'text-ink-3'}`}>{ax.left}</Text>
              <Text className={`text-[13px] ${letters[k] === ax.rightLetter ? 'font-bold text-ink' : 'text-ink-3'}`}>{ax.right}</Text>
            </View>
            <View className="mt-1 h-2 rounded-[3px] bg-surface-2">
              <View className="absolute h-3.5 w-2.5 -translate-y-[3px] rounded-[3px] bg-teal" style={{ left: `${Math.min(96, Math.max(0, leans[k] * 100 - 2))}%` }} />
            </View>
          </View>
        ))}
      </View>

      {/* One short line per box, not a paragraph (Oct 16 2026, the founder): the website keeps the long versions. */}
      <Text className="mt-6 text-[13px] font-bold uppercase tracking-[1.5px] text-ink-3">Strengths</Text>
      <View className="mt-2 gap-2">{letters.map(l => <Trait key={`s${l}`} letter={l} line={STRENGTH[l]} />)}</View>
      <Text className="mt-6 text-[13px] font-bold uppercase tracking-[1.5px] text-ink-3">Watch out for</Text>
      <View className="mt-2 gap-2">{letters.map(l => <Trait key={`w${l}`} letter={l} line={WATCH[l]} />)}</View>

      <View className="mt-6 gap-3">
        <PrimaryButton label="Done" onPress={() => router.back()} />
        <Button kind="quiet" label="Share my type" onPress={() => { Share.share({ message: `I'm ${meta.name} (${code}) on the UntilFire FIRE type quiz. Take it: https://www.untilfire.com/fire-type` }).catch(() => {}) }} />
        <Button kind="quiet" label="Take it again" onPress={onRetake} />
      </View>
    </ScrollView>
  )
}

/** The pictures the quiz answers use, one per side of each axis. */
const LETTER_ART: Record<AxisLetter, string> = { P: '🗺️', A: '🧭', S: '🛡️', E: '🚀', R: '✂️', G: '💼', B: '🧱', F: '🕊️' }
const LETTER_NAME = Object.fromEntries(FIRE_AXES.flatMap(a => [[a.leftLetter, a.left], [a.rightLetter, a.right]])) as Record<AxisLetter, string>
/** Short versions of the website's AXIS_STRENGTHS and AXIS_WATCH_OUTS, for a phone. */
const STRENGTH: Record<AxisLetter, string> = {
  P: 'You think in systems and milestones', A: 'You adapt fast when things change', S: 'Steady, low-regret choices that compound',
  E: 'You find the upside and lean in', R: 'You make every dollar work harder', G: 'You grow income, the fastest lever',
  B: 'You build something meaningful', F: 'Freedom first makes every trade-off clear',
}
const WATCH: Record<AxisLetter, string> = {
  P: 'Planning too long before acting', A: 'Changing course too often', S: 'Playing it too safe',
  E: 'Underestimating the downside', R: 'Under-investing in income growth', G: 'Under-protecting what you\'ve built',
  B: 'One more project, never the exit', F: 'Avoiding commitments that compound',
}

/** One strength or watch-out: its picture, the side it comes from, one short line. */
function Trait({ letter, line }: { letter: AxisLetter; line: string }) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
        <Text className="text-[22px]">{LETTER_ART[letter]}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-ink-3">{LETTER_NAME[letter]}</Text>
        <Text className="text-[15px] font-semibold leading-5 text-ink">{line}</Text>
      </View>
    </View>
  )
}
