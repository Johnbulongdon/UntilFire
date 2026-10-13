import AsyncStorage from '@react-native-async-storage/async-storage'
import { Button } from '@/components/Button'
import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, Share, View } from 'react-native'
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { PrimaryButton } from '@/components/PrimaryButton'
import { ProgressBar } from '@/components/ProgressBar'
import { Text } from '@/components/Text'
import { AXIS_STRENGTHS, AXIS_WATCH_OUTS, computeAxisLeans, FIRE_AXES, getTypeMeta, QUIZ_QUESTIONS, scoreQuiz, type AxisLetter, type QuizAnswer } from '@quiz'
import { FIRE_QUIZ_KEY } from '@/lib/fire-quiz'
import { haptic } from '@/lib/haptics'
import { colors } from '@/theme/colors'


const SCALE: { value: QuizAnswer; size: number }[] = [
  { value: 0, size: 40 }, { value: 1, size: 32 }, { value: 2, size: 24 }, { value: 3, size: 32 }, { value: 4, size: 40 },
]

/**
 * The FIRE type quiz (untilfire.com/fire-type): eight questions on a
 * five-point scale, scored into one of 16 types by the website's own code.
 * The result is about how you think, not a projection input.
 */
export default function FireQuiz() {
  const [answers, setAnswers] = useState<QuizAnswer[]>([])
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
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ground }}>
      <View className="flex-row items-center gap-4 px-5 pt-3">
        <Pressable accessibilityRole="button" accessibilityLabel={answers.length && !done ? 'Previous question' : 'Close'} hitSlop={12}
          onPress={() => { haptic.tick(); if (answers.length && !done) setAnswers(a => a.slice(0, -1)); else router.back() }}>
          <Text className="text-[26px] text-ink-3">{answers.length && !done ? '‹' : '×'}</Text>
        </Pressable>
        <View className="flex-1"><ProgressBar step={done ? QUIZ_QUESTIONS.length : answers.length} steps={QUIZ_QUESTIONS.length} /></View>
      </View>

      {done ? <Result answers={answers} onRetake={() => setAnswers([])} /> : (
        <Animated.View key={q.id} entering={FadeInRight.duration(250)} style={{ flex: 1, justifyContent: "space-between", paddingHorizontal: 24, paddingBottom: 32, paddingTop: 40 }}>
          <View>
            <Text className="text-[13px] font-bold uppercase tracking-[2px] text-ink-3">Question {i + 1} of {QUIZ_QUESTIONS.length}</Text>
            <Text className="mt-3 font-display text-[28px] font-bold leading-9 text-ink">{q.prompt}</Text>
          </View>
          <View>
            <View className="flex-row items-center justify-between px-1">
              {SCALE.map(s => (
                <Pressable key={s.value} accessibilityRole="button"
                  accessibilityLabel={s.value === 2 ? 'Neutral' : `${s.value < 2 ? q.leftLabel : q.rightLabel}${s.value === 0 || s.value === 4 ? ', strongly' : ''}`}
                  hitSlop={8} onPress={() => answer(s.value)}
                  className={`items-center justify-center rounded-full border-2 ${s.value < 2 ? 'border-green' : s.value > 2 ? 'border-teal' : 'border-border-2'} active:opacity-60`}
                  style={{ width: s.size, height: s.size }} />
              ))}
            </View>
            <View className="mt-4 flex-row justify-between">
              <Text className="w-[45%] text-[14px] leading-5 text-ink">{q.leftLabel}</Text>
              <Text className="w-[45%] text-right text-[14px] leading-5 text-ink">{q.rightLabel}</Text>
            </View>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  )
}

function Result({ answers, onRetake }: { answers: QuizAnswer[]; onRetake: () => void }) {
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
        <Button kind="quiet" label="Share my type" onPress={() => { Share.share({ message: `I'm ${meta.name} (${code}) on the UntilFire FIRE type quiz. Take it: https://untilfire.com/fire-type` }).catch(() => {}) }} />
        <Button kind="quiet" label="Take it again" onPress={onRetake} />
      </View>
    </ScrollView>
  )
}
