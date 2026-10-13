import { router } from 'expo-router'
import { useEffect, type ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native'
import { Text } from './Text'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { haptic } from '@/lib/haptics'

import { Button } from './Button'
import { PrimaryButton } from './PrimaryButton'
import { ProgressBar } from './ProgressBar'
import { Events, track } from '@/lib/analytics'

/** One onboarding question: progress, the question, its input, and a pinned Continue. */
export function QuestionScreen(props: {
  step: number
  steps: number
  title: string
  hint?: string
  children: ReactNode
  /** Omit for screens that move on as soon as an option is tapped. */
  cta?: string
  onNext?: () => void
  canContinue?: boolean
  skipLabel?: string
  onSkip?: () => void
  /** For screens with their own drag (the globe): the page itself doesn't scroll. */
  noScroll?: boolean
}) {
  useEffect(() => { track(Events.ONBOARDING_STEP_VIEWED, { step: props.step, steps: props.steps }) }, [props.step, props.steps])
  return (
    <SafeAreaView className="flex-1 bg-ground">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="flex-row items-center gap-4 px-5 pt-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={12}
            onPress={() => { haptic.tick(); router.back() }}
          >
            <Text className="text-[30px] leading-[32px] text-ink-3">‹</Text>
          </Pressable>
          <ProgressBar step={props.step} steps={props.steps} />
        </View>

        <ScrollView className="flex-1" contentContainerClassName="px-6 pt-8 pb-6" contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" scrollEnabled={!props.noScroll}>
          <Animated.View entering={FadeInDown.duration(320)}>
            <Text className="font-display text-[30px] font-bold leading-9 tracking-tight text-ink">{props.title}</Text>
            {!!props.hint && <Text className="mt-3 text-base leading-6 text-ink-2">{props.hint}</Text>}
          </Animated.View>
          {/* Answers sit mid-screen, in reach of a thumb holding the phone one-handed (a globe screen fills the space itself). */}
          <Animated.View entering={FadeInDown.delay(90).duration(320)} style={props.noScroll ? { marginTop: 20 } : { flex: 1, justifyContent: 'center', paddingVertical: 24 }}>
            {props.children}
          </Animated.View>
        </ScrollView>

        {(props.cta || props.onSkip) && (
          <View className="gap-3 px-6 pb-4">
            {props.cta && props.onNext && (
              <PrimaryButton label={props.cta} onPress={props.onNext} disabled={!props.canContinue} />
            )}
            {props.onSkip && <Button kind="quiet" label={props.skipLabel ?? 'Skip'} onPress={props.onSkip} />}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
