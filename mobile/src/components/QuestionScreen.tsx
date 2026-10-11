import { router } from 'expo-router'
import { useEffect, type ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native'
import { Text } from './Text'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { haptic } from '@/lib/haptics'

import { PrimaryButton } from './PrimaryButton'
import { ProgressBar } from './ProgressBar'
import { Events, track } from '@/lib/analytics'

/** One onboarding question: progress, the question, its input, and a pinned Continue. */
export function QuestionScreen(props: {
  step: number
  steps: number
  title: string
  hint: string
  children: ReactNode
  /** Omit for screens that move on as soon as an option is tapped. */
  cta?: string
  onNext?: () => void
  canContinue?: boolean
  skipLabel?: string
  onSkip?: () => void
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

        <ScrollView className="flex-1" contentContainerClassName="px-6 pt-8 pb-6" keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeInDown.duration(420).springify().damping(18)}>
            <Text className="font-display text-[30px] font-bold leading-9 tracking-tight text-ink">{props.title}</Text>
            <Text className="mt-3 text-base leading-6 text-ink-2">{props.hint}</Text>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(110).duration(420).springify().damping(18)} style={{ marginTop: 32 }}>
            {props.children}
          </Animated.View>
        </ScrollView>

        {(props.cta || props.onSkip) && (
          <View className="gap-3 px-6 pb-4">
            {props.cta && props.onNext && (
              <PrimaryButton label={props.cta} onPress={props.onNext} disabled={!props.canContinue} />
            )}
            {props.onSkip && (
              <Pressable accessibilityRole="button" onPress={() => { haptic.tick(); props.onSkip!() }} className="items-center py-2">
                <Text className="text-[15px] text-ink-2">{props.skipLabel}</Text>
              </Pressable>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
