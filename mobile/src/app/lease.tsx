import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Icon } from '@/components/Icon'
import { PrimaryButton } from '@/components/PrimaryButton'
import { Text } from '@/components/Text'
import { DEFAULT_NOTICE_DAYS, isoDay } from '@/engine'
import { haptic } from '@/lib/haptics'
import { saveLease } from '@/lib/mutations'
import { useAccount } from '@/state/account'
import { useAuth } from '@/state/auth'
import { colors } from '@/theme/colors'

const NOTICE = [30, 60, 90]
const RISES: { label: string; pct: number | null }[] = [{ label: 'None', pct: 0 }, { label: '3%', pct: 3 }, { label: '5%', pct: 5 }, { label: 'Not sure', pct: null }]

/** A year from today, at the month's end: where most leases land when people don't know the exact day. */
const guessEnd = () => { const d = new Date(); d.setMonth(d.getMonth() + 13, 0); return isoDay(d) }

/** Three questions about the lease on a Rent bill (?bill=) or from a Rent transaction (?tx=). */
export default function LeaseSheet() {
  const { bill: billId, tx } = useLocalSearchParams<{ bill?: string; tx?: string }>()
  const { session } = useAuth()
  const { data, refresh } = useAccount()
  const bill = billId ? data?.bills.find(b => b.id === billId) : undefined
  const from = tx ? data?.transactions.find(t => t.id === tx) : undefined

  const [ends, setEnds] = useState(bill?.lease_ends_on ?? guessEnd())
  const [notice, setNotice] = useState(bill?.lease_notice_days ?? DEFAULT_NOTICE_DAYS)
  const [rise, setRise] = useState<number | null>(bill?.lease_ends_on ? bill.lease_rise_pct : 0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const shift = (days: number, months = 0) => {
    const d = new Date(`${ends}T00:00:00`)
    d.setMonth(d.getMonth() + months); d.setDate(d.getDate() + days)
    haptic.tick(); setEnds(isoDay(d))
  }

  const save = async () => {
    if (!session || (!bill && !from)) return
    setBusy(true); setError('')
    const lease = { ends_on: ends, notice_days: notice, rise_pct: rise }
    const problem = await saveLease(session.user.id, lease, bill ? { billId: bill.id }
      : { from: { description: from!.description ?? 'Rent', amount: from!.amount, currency: from!.currency, date: from!.date } })
    if (problem) { setBusy(false); haptic.warn(); setError(problem); return }
    haptic.success()
    await refresh()
    router.back()
  }

  return (
    <SafeAreaView className="flex-1 bg-ground">
      <View className="flex-row items-center justify-between px-5 pt-2">
        <Text className="font-display text-[28px] text-ink">Your lease</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={12} onPress={() => { haptic.tick(); router.back() }}
          className="h-11 w-11 items-center justify-center rounded-control border border-border bg-card">
          <Icon name="xmark" size={18} color={colors.ink} fallback="✕" />
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="px-5 pb-6 pt-5" contentContainerStyle={{ gap: 16 }}>
        <Box icon="calendar" fallback="📅" label="Ends">
          <View className="flex-row items-center justify-between rounded-control bg-surface px-2 py-2">
            <Pressable accessibilityRole="button" accessibilityLabel="A month earlier" hitSlop={8} onPress={() => shift(0, -1)} className="px-2"><Text className="text-[15px] text-ink-2">«</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="A day earlier" hitSlop={8} onPress={() => shift(-1)} className="px-2"><Text className="text-[20px] text-ink">‹</Text></Pressable>
            <Text className="font-mono text-[16px] text-ink">{new Date(`${ends}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="A day later" hitSlop={8} onPress={() => shift(1)} className="px-2"><Text className="text-[20px] text-ink">›</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="A month later" hitSlop={8} onPress={() => shift(0, 1)} className="px-2"><Text className="text-[15px] text-ink-2">»</Text></Pressable>
          </View>
        </Box>
        <Box icon="bell" fallback="🔔" label="Notice to give">
          <View className="flex-row" style={{ gap: 8 }}>
            {NOTICE.map(d => <Choice key={d} label={`${d} days`} active={notice === d} onPress={() => setNotice(d)} />)}
          </View>
        </Box>
        <Box icon="chart.line.uptrend.xyaxis" fallback="📈" label="Rent rise at renewal">
          <View className="flex-row" style={{ gap: 8 }}>
            {RISES.map(r => <Choice key={r.label} label={r.label} active={rise === r.pct} onPress={() => setRise(r.pct)} />)}
          </View>
        </Box>
        {error ? <Text className="text-[14px] text-neg-ink">{error}</Text> : null}
      </ScrollView>

      <View className="px-5 pb-4">
        {busy ? <View className="h-14 items-center justify-center"><ActivityIndicator color={colors.green} /></View>
          : <PrimaryButton label="Save" onPress={save} disabled={!session || (!bill && !from)} />}
      </View>
    </SafeAreaView>
  )
}

function Box({ icon, fallback, label, children }: { icon: string; fallback: string; label: string; children: React.ReactNode }) {
  return (
    <View className="rounded-card border border-border bg-card p-5" style={{ gap: 12 }}>
      <View className="flex-row items-center" style={{ gap: 10 }}>
        <Icon name={icon as never} size={20} color={colors.ink} fallback={fallback} />
        <Text className="text-[15px] font-bold text-ink">{label}</Text>
      </View>
      {children}
    </View>
  )
}

function Choice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => { haptic.select(); onPress() }}
      className={`h-12 flex-1 items-center justify-center rounded-control border-2 ${active ? 'border-green bg-green-50' : 'border-border bg-card'}`}>
      <Text className={`text-[14px] font-semibold ${active ? 'text-green-700' : 'text-ink'}`}>{label}</Text>
    </Pressable>
  )
}
