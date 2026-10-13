import { router } from 'expo-router'
import { Platform, Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { haptic } from '@/lib/haptics'
import { compactMoney } from '@/lib/format'
import { monthSpend, thisMonth } from '@/lib/money-data'
import { monthCount, todayItems } from '@/lib/today'
import { useAccount, type AccountData } from '@/state/account'
import { useFreedom } from '@/state/freedom'
import { TAB_COLOR, type TabKey } from '@/theme/colors'

import { Icon } from './Icon'
import { Text } from './Text'

type SymbolName = Parameters<typeof Icon>[0]['name']

const NEED_KEYS = ['housing', 'food', 'transport', 'healthcare']

/** Months of essential spending the cash covers, as Home's Safety tile works it out. */
export function safetyMonths(data: AccountData): number | null {
  const needsBudget = NEED_KEYS.reduce((s, k) => s + (data.budget[k] ?? 0), 0)
  const needs = needsBudget > 0 ? needsBudget : Object.values(data.budget).reduce((s, v) => s + v, 0) * 0.6
  return needs > 0 ? data.balances.cashSavings / needs : null
}

/**
 * The top bar on every tab (V2): three small bright chips, not a heavy band.
 * Freedom date, what's left of this month's budget, and months of safety. Each
 * opens the page behind it. Chips without data stay hidden.
 */
export function TopBar({ tab }: { tab: TabKey }) {
  const { data } = useAccount()
  const f = useFreedom()
  const tint = TAB_COLOR[tab]
  const budget = data ? Object.values(data.budget).reduce((s, v) => s + v, 0) : 0
  const left = data && budget > 0 ? budget - monthSpend(data.transactions, thisMonth()).total : null
  const safety = data ? safetyMonths(data) : null
  const date = f?.year == null ? null : f.date ? f.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : String(f.year)
  return (
    <View className="flex-row items-center gap-2 px-5 pb-2 pt-1">
      {date && <Chip tint={tint} icon="sunrise.fill" fallback="☀" label={date} a11y={`Free in ${date}`} onPress={() => router.push('/plan/freedom')} />}
      {left != null && <Chip tint={tint} icon="creditcard.fill" fallback="$" label={`${compactMoney(Math.abs(left))} ${left < 0 ? 'over' : 'left'}`} a11y={`Budget: ${compactMoney(Math.abs(left))} ${left < 0 ? 'over' : 'left'} this month`} onPress={() => router.push('/money/budget')} />}
      {safety != null && <Chip tint={tint} icon="shield.lefthalf.filled" fallback="◆" label={`${safety.toFixed(1)} mo`} a11y={`Safety: ${safety.toFixed(1)} months of essentials`} onPress={() => router.push('/money/net-worth')} />}
    </View>
  )
}

function Chip({ tint, icon, fallback, label, a11y, onPress }: { tint: string; icon: SymbolName; fallback: string; label: string; a11y: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={a11y} onPress={() => { haptic.tick(); onPress() }}>
      {({ pressed }) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: tint, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, opacity: pressed ? 0.8 : 1 }}>
          <Icon name={icon} fallback={fallback} size={13} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF' }} className="font-mono text-[13px] font-semibold">{label}</Text>
        </View>
      )}
    </Pressable>
  )
}

/** Room the pinned Today bar takes, so a page's last row isn't hidden under it. */
export const TODAY_BAR_SPACE = 84

/**
 * Today, always in reach (D-73): pinned just above the tab bar on every tab,
 * never at the top of Home. Signed out there is no list, so nothing shows.
 */
export function TodayBar() {
  const { data } = useAccount()
  const insets = useSafeAreaInsets()
  if (!data) return null
  const { day, items } = todayItems(data, data.profile.today)
  // All caught up: the bar steps aside until something new arrives (founder's call).
  if (items.length === 0) return null
  const finished = data.profile.today.done.includes(day)
  const count = monthCount(data.profile.today.done)
  const left = items.length
  // iOS 26's tab bar floats over the page, so the bar sits just above it.
  const bottom = Platform.OS === 'ios' ? insets.bottom + 62 : 12
  const label = left === 0 ? 'All caught up' : finished ? `${left} new since you finished` : `Today · ${left} to do`
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 12, right: 12, bottom }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}. ${count.done} of ${count.of} days this month`} onPress={() => { haptic.press(); router.push('/today') }}
        style={{ backgroundColor: TAB_COLOR.home, borderRadius: 20, paddingLeft: 16, paddingRight: 8, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 10,
          shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } }}>
        <Icon name={left === 0 ? 'checkmark.circle.fill' : 'sun.max.fill'} fallback={left === 0 ? '✓' : '☀'} size={20} color="#FFFFFF" />
        <View className="flex-1">
          <Text style={{ color: '#FFFFFF' }} className="text-[15px] font-extrabold">{label}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.8)' }} className="font-mono text-[11px]">{count.done} of {count.of} days this month</Text>
        </View>
        {left > 0 && (
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 14, borderBottomWidth: 4, borderBottomColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 16, paddingVertical: 8 }}>
            <Text style={{ color: TAB_COLOR.home }} className="text-[15px] font-extrabold">Start</Text>
          </View>
        )}
      </Pressable>
    </View>
  )
}
