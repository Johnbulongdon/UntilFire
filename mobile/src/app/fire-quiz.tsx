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
import { AXIS_STRENGTHS, AXIS_WATCH_OUTS, computeAxisLeans, FIRE_AXES, getTypeMeta, QUIZ_QUESTIONS, scoreQuiz, type AxisLetter, type QuizAnswer } from '@quiz'
import { FIRE_QUIZ_KEY } from '@/lib/fire-quiz'
import { haptic } from '@/lib/haptics'
import { Events, track } from '@/lib/analytics'
import { useAuth } from '@/state/auth'
import { useAccount } from '@/state/account'
import { colors, TAB_COLOR } from '@/theme/colors'

const SCALE: QuizAnswer[] = [0, 1, 2, 3, 4]
/** Dot sizes down the scale: strong, slight, in between, slight, strong. */
const DOT = [46, 36, 28, 36, 46]
/** A picture for each side of each question, so the answers read at a glance (Oct 16 2026, the founder). */
const ART: Record<string, [string, string]> = {
  pa1: ['🗺️', '🧭'], pa2: ['🛠️', '🤔'], se1: ['🛡️', '🚀'], se2: ['🏦', '📈'],
  rg1: ['✂️', '💼'], rg2: ['🔍', '💡'], bf1: ['🧱', '🕊️'], bf2: ['🎯', '🌴'],
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
  const [leftArt, rightArt] = ART[q.id] ?? ['◀︎', '▶︎']
  const side = (v: QuizAnswer) => (v === 2 ? 'In between' : `${v === 0 || v === 4 ? 'Very much' : 'A little'}: ${v < 2 ? q.leftLabel : q.rightLabel}`)

  return (
    <View style={{ flex: 1, backgroundColor: colors.ground }}>
      {/* Soft shapes behind the questions, in Profile's colour, so the screen isn't only words. */}
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', width: 320, height: 320, borderRadius: 160, top: -90, right: -120, backgroundColor: TAB_COLOR.profile, opacity: 0.08 }} />
        <View style={{ position: 'absolute', width: 260, height: 260, borderRadius: 130, bottom: -80, left: -100, backgroundColor: TAB_COLOR.profile, opacity: 0.06 }} />
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
        <Animated.View key={q.id} entering={FadeInRight.duration(220)} style={{ flex: 1, paddingHorizontal: 24, paddingBottom: insets.bottom + 16, paddingTop: 20 }}>
          <Text className="font-display text-[26px] font-bold leading-8 text-ink">{q.prompt}</Text>
          {/* Two pictured sides and five dots between them: tap the side you lean to, bigger dots mean more. */}
          <View style={{ flex: 1, justifyContent: 'center', gap: 12, paddingTop: 12 }}>
            <Pole art={leftArt} label={q.leftLabel} onPress={() => answer(0)} />
            <View className="items-center" style={{ gap: 8 }}>
              {SCALE.map(v => (
                <Bouncy key={v} accessibilityLabel={side(v)} onPress={() => answer(v)}>
                  <View style={{ width: 64, height: DOT[v] + 4, alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{ width: DOT[v], height: DOT[v], borderRadius: DOT[v] / 2, borderWidth: 3, borderColor: v === 2 ? colors.border2 : TAB_COLOR.profile, backgroundColor: colors.card }} />
                  </View>
                </Bouncy>
              ))}
            </View>
            <Pole art={rightArt} label={q.rightLabel} onPress={() => answer(4)} />
          </View>
        </Animated.View>
      )}
    </View>
  )
}

/** One side of a question: its picture and its words; tapping it is a strong lean. */
function Pole({ art, label, onPress }: { art: string; label: string; onPress: () => void }) {
  return (
    <Bouncy accessibilityLabel={`Very much: ${label}`} onPress={onPress}>
      <View className="flex-row items-center gap-4 rounded-2xl border-2 border-border bg-card px-4 py-3" style={{ borderBottomWidth: 4 }}>
        <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
          <Text className="text-[30px]">{art}</Text>
        </View>
        <Text numberOfLines={2} className="flex-1 text-[16px] font-semibold leading-5 text-ink">{label}</Text>
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
            <View className="mt-1 h-2 rounded-full bg-surface-2">
              <View className="absolute h-3.5 w-3.5 -translate-y-[3px] rounded-full bg-teal" style={{ left: `${Math.min(96, Math.max(0, leans[k] * 100 - 2))}%` }} />
            </View>
          </View>
        ))}
      </View>

      <View className="mt-4 rounded-card border border-border bg-card p-5">
        <Text className="text-[13px] text-ink-3">Strengths</Text>
        {letters.map(l => <Text key={`s${l}`} className="mt-2 text-[14px] leading-5 text-ink">✓ {AXIS_STRENGTHS[l]}</Text>)}
        <Text className="mt-4 text-[13px] text-ink-3">Watch out for</Text>
        {letters.map(l => <Text key={`w${l}`} className="mt-2 text-[14px] leading-5 text-ink">○ {AXIS_WATCH_OUTS[l]}</Text>)}
      </View>

      <View className="mt-6 gap-3">
        <PrimaryButton label="Done" onPress={() => router.back()} />
        <Button kind="quiet" label="Share my type" onPress={() => { Share.share({ message: `I'm ${meta.name} (${code}) on the UntilFire FIRE type quiz. Take it: https://www.untilfire.com/fire-type` }).catch(() => {}) }} />
        <Button kind="quiet" label="Take it again" onPress={onRetake} />
      </View>
    </ScrollView>
  )
}
