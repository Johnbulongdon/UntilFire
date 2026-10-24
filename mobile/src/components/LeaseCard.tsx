import { router } from 'expo-router'
import { Pressable, View } from 'react-native'

import { Button } from '@/components/Button'
import { Icon } from '@/components/Icon'
import { Text } from '@/components/Text'
import { daysUntil, isoDay, leaseProgress, noticeDeadline } from '@/engine'
import { haptic } from '@/lib/haptics'
import type { Bill } from '@/state/account'
import { colors } from '@/theme/colors'

const short = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

/**
 * The lease on a Rent bill or transaction (lib/lease.ts). Without a lease it
 * offers one, once, in a green box; with one it shows the days left to decide
 * and the year so far. Only shown for things tagged Housing › Rent.
 */
export function LeaseCard({ bill, txId }: { bill?: Bill; txId?: string }) {
  const open = () => { haptic.tick(); router.push(bill ? `/lease?bill=${bill.id}` : `/lease?tx=${txId}`) }

  if (!bill?.lease_ends_on) {
    return (
      <View className="mt-5 rounded-card border border-green-100 bg-green-50 p-5" style={{ gap: 12 }}>
        <View className="h-12 w-12 items-center justify-center rounded-control bg-card">
          <Icon name="doc.text" size={24} color={colors.green} fallback="📄" />
        </View>
        <Text className="font-display text-[20px] text-ink">When does your lease end?</Text>
        <Text className="text-[15px] text-ink-2">We'll remind you before the notice deadline.</Text>
        <Button label="Add lease" onPress={open} />
      </View>
    )
  }

  const today = isoDay(new Date())
  const lease = { ends_on: bill.lease_ends_on, notice_days: bill.lease_notice_days }
  const deadline = noticeDeadline(lease)
  const left = daysUntil(deadline, today)
  const done = Math.round(leaseProgress(lease, today) * 100)
  const mark = Math.round(leaseProgress({ ends_on: bill.lease_ends_on }, deadline) * 100)

  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Edit lease" onPress={open} className="mt-5" style={{ gap: 12 }}>
      <View className={`rounded-card border p-5 ${left >= 0 ? 'border-sun bg-warn-bg' : 'border-border bg-card'}`}>
        <Text className="text-[14px] font-bold text-ink-2">{left >= 0 ? `Decide by ${short(deadline)}` : `Lease ends ${short(bill.lease_ends_on)}`}</Text>
        <Text className="mt-1 font-mono text-[36px] text-ink">
          {left >= 0 ? `${left} ${left === 1 ? 'day' : 'days'}` : `${Math.max(0, daysUntil(bill.lease_ends_on, today))} days left`}
        </Text>
      </View>
      <View className="rounded-card border border-border bg-card p-5">
        <View className="h-2.5 rounded-full bg-surface-2">
          <View className="h-2.5 rounded-full bg-ink" style={{ width: `${done}%` }} />
          <View className="absolute -top-1 h-[18px] w-[18px] rounded-md border-[3px] border-card bg-warn" style={{ left: `${mark}%`, marginLeft: -9 }} />
        </View>
        <View className="mt-3 flex-row justify-between">
          <Text className="text-[13px] text-ink-2">Today</Text>
          <Text className="text-[13px] font-bold text-ink-2">Notice {short(deadline)}</Text>
          <Text className="text-[13px] text-ink-2">Ends {short(bill.lease_ends_on)}</Text>
        </View>
      </View>
    </Pressable>
  )
}
