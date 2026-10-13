import type { ReactNode } from 'react'
import { View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button } from './Button'
import { Text } from './Text'

/**
 * One reveal page on the deep-green brand ground: a small label, the moment
 * itself in the middle, and one button pinned to the footer (V2: one thing per
 * screen). An optional second, quieter button sits under it.
 */
export function RevealFrame({ eyebrow, children, next, onNext, second }: {
  eyebrow?: string
  children: ReactNode
  next: string
  onNext: () => void
  second?: { label: string; onPress: () => void }
}) {
  return (
    <SafeAreaView className="flex-1 bg-brand">
      <View className="flex-1 px-6 pt-6">
        {eyebrow && <Text className="text-[12px] font-bold uppercase tracking-[2px] text-mint">{eyebrow}</Text>}
        <View className="flex-1 justify-center">{children}</View>
      </View>
      <View className="gap-3 px-6 pb-4">
        <Button kind="onDark" label={next} onPress={onNext} />
        {second && <Button kind="onDarkQuiet" label={second.label} onPress={second.onPress} />}
      </View>
    </SafeAreaView>
  )
}
