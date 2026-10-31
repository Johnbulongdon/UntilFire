import { brand } from '@/theme/colors'
import { router } from 'expo-router'
import { useRef } from 'react'
import { Pressable, View } from 'react-native'

import { moneyExact } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { categoryOf, needOf } from '@/lib/money-data'
import { toUSD, type Transaction } from '@/state/account'

import { CategoryGlyph } from './Icon'
import { Text } from './Text'

/**
 * One transaction: category badge, merchant, category, need or want (D-106), amount. Income in green.
 * In select mode a tap ticks the row instead of opening it; a long press
 * starts select mode with this row ticked.
 */
export function TransactionRow({ t, first, selecting, selected, onToggle, onLongPress }: {
  t: Transaction; first?: boolean
  selecting?: boolean; selected?: boolean; onToggle?: () => void; onLongPress?: () => void
}) {
  const cat = categoryOf(t.category)
  const income = t.transaction_type === 'income'
  const transfer = t.transaction_type === 'transfer'
  const refunded = (t.refund_amount ?? 0) > 0
  // A long press ends with the finger lifting, which React Native can report as a
  // tap once the row has switched into select mode. Swallow that one release.
  const held = useRef(false)
  const usd = toUSD(Math.max(0, t.amount - (t.refund_amount ?? 0)), t.currency)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={selecting ? undefined : 'Edit this transaction'}
      accessibilityState={selecting ? { checked: !!selected } : undefined}
      onPress={() => {
        if (held.current) { held.current = false; return }
        haptic.tick()
        if (selecting) onToggle?.(); else router.push({ pathname: '/transaction', params: { id: t.id } })
      }}
      onLongPress={onLongPress ? () => { held.current = true; haptic.select(); onLongPress() } : undefined}
      onPressIn={() => { held.current = false }}
      className={`flex-row items-center gap-3 py-3 active:opacity-60 ${first ? '' : 'border-t border-border'}`}
    >
      {selecting && (
        <View className={`h-6 w-6 items-center justify-center rounded-full border-2 ${selected ? 'border-green bg-green' : 'border-border-2'}`}>
          {selected ? <Text className="text-[13px] font-bold text-white">✓</Text> : null}
        </View>
      )}
      <View className="h-10 w-10 items-center justify-center rounded-control" style={{ backgroundColor: cat.color }}>
        <CategoryGlyph cat={cat} size={22} color={brand.deep} />
      </View>
      <View className="flex-1">
        <Text private numberOfLines={1} className="text-[15px] font-semibold text-ink">{t.description || cat.label}</Text>
        <Text numberOfLines={1} className="mt-0.5 text-[12px] text-ink-3">
          {transfer ? 'Transfer' : cat.label}{t.sub_category ? ` · ${t.sub_category}` : ''}{t.transaction_type === 'expense' ? (needOf(t) === 'need' ? ' · Need' : ' · Want') : ''}{refunded ? ' · refunded' : ''}
        </Text>
      </View>
      <Text className={`font-mono text-[15px] ${income ? 'text-pos-ink' : transfer ? 'text-ink-3' : 'text-ink'}`}>
        {income ? '+' : ''}{moneyExact(usd)}
      </Text>
    </Pressable>
  )
}
