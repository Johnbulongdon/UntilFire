import { router } from 'expo-router'
import { Pressable, View } from 'react-native'

import { haptic } from '@/lib/haptics'
import { reviewCounts } from '@/lib/review'
import type { Transaction } from '@/state/account'

import { Text } from './Text'

/**
 * The website's review bar (ReviewPill): how many of the rows in view are
 * filed (a category and need or want) and how many still need you. Tapping
 * the second half opens Review for exactly those months.
 */
export function ReviewBar({ rows, months }: { rows: Transaction[]; months: string[] }) {
  const { filed, need } = reviewCounts(rows)
  if (filed + need === 0) return null
  return (
    <View className="mt-3 h-11 flex-row overflow-hidden rounded-full" style={{ gap: need && filed ? 3 : 0 }}>
      {filed > 0 && (
        <View className="flex-row items-center gap-1.5 bg-surface-2 px-4" style={{ flex: filed, minWidth: 96 }}>
          <Text className="font-mono text-[15px] font-bold text-ink">{filed}</Text>
          <Text numberOfLines={1} className="text-[13px] text-ink-2">filed ✓</Text>
        </View>
      )}
      {need > 0 && (
        <Pressable accessibilityRole="button" accessibilityLabel={`${need} need you. Review`}
          onPress={() => { haptic.tick(); router.push({ pathname: '/review', params: { months: months.join(',') } }) }}
          className="flex-row items-center justify-between gap-2 bg-ink px-4 active:opacity-80" style={{ flex: Math.max(need, filed * 0.6), minWidth: 190 }}>
          <Text numberOfLines={1} className="text-[13px] text-ground"><Text className="font-mono text-[15px] font-bold text-ground">{need}</Text> need you</Text>
          <Text numberOfLines={1} className="text-[13px] font-bold text-ground">Review ›</Text>
        </Pressable>
      )}
    </View>
  )
}
