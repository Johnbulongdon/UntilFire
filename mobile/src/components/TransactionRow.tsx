import { router } from 'expo-router'
import { Pressable, View } from 'react-native'

import { moneyExact } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { categoryOf } from '@/lib/money-data'
import { toUSD, type Transaction } from '@/state/account'

import { Text } from './Text'

/** One transaction: category badge, merchant, category, amount. Income in green. */
export function TransactionRow({ t, first }: { t: Transaction; first?: boolean }) {
  const cat = categoryOf(t.category)
  const income = t.transaction_type === 'income'
  const transfer = t.transaction_type === 'transfer'
  const refunded = (t.refund_amount ?? 0) > 0
  const usd = toUSD(Math.max(0, t.amount - (t.refund_amount ?? 0)), t.currency)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Edit this transaction"
      onPress={() => { haptic.tick(); router.push({ pathname: '/transaction', params: { id: t.id } }) }}
      className={`flex-row items-center gap-3 py-3 active:opacity-60 ${first ? '' : 'border-t border-border'}`}
    >
      <View className="h-10 w-10 items-center justify-center rounded-control" style={{ backgroundColor: `${cat.color}22` }}>
        <Text className="text-[18px]">{cat.emoji}</Text>
      </View>
      <View className="flex-1">
        <Text numberOfLines={1} className="text-[15px] font-semibold text-ink">{t.description || cat.label}</Text>
        <Text numberOfLines={1} className="mt-0.5 text-[12px] text-ink-3">
          {transfer ? 'Transfer' : cat.label}{t.sub_category ? ` · ${t.sub_category}` : ''}{refunded ? ' · refunded' : ''}
        </Text>
      </View>
      <Text className={`font-mono text-[15px] ${income ? 'text-pos-ink' : transfer ? 'text-ink-3' : 'text-ink'}`}>
        {income ? '+' : ''}{moneyExact(usd)}
      </Text>
    </Pressable>
  )
}
