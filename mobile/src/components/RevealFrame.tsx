import type { ReactNode } from 'react'
import {vars} from 'nativewind'
import { View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button } from './Button'
import { Text } from './Text'

/**
 * One reveal page on the warm-yellow brand ground: a small label, the moment
 * itself in the middle, and one button pinned to the footer (V2: one thing per
 * screen). An optional second, quieter button sits under it.
 */
export function RevealFrame({ eyebrow, children, next, onNext, second, overlay }: {
  eyebrow?: string
  /** Drawn over the whole screen, edge to edge (the reveal's confetti). */
  overlay?: ReactNode
  children: ReactNode
  next: string
  onNext: () => void
  second?: { label: string; onPress: () => void }
}) {
  return (
    <SafeAreaView className="flex-1" style={[{backgroundColor:'#FFE58A'},vars({'--uf-card':'255 255 255','--uf-surface':'255 249 218','--uf-ink':'21 23 25','--uf-ink-2':'92 81 48','--uf-ink-3':'92 81 48'})]}>
      <View className="flex-1 px-6 pt-6">
        {eyebrow && <Text className="text-[12px] font-bold uppercase tracking-[2px] text-ink-2">{eyebrow}</Text>}
        <View className="flex-1 justify-center">{children}</View>
      </View>
      <View className="gap-3 px-6 pb-4">
        <Button kind="onAccent" label={next} onPress={onNext} />
        {second && <Button kind="quiet" label={second.label} onPress={second.onPress} />}
      </View>
      {overlay}
    </SafeAreaView>
  )
}
