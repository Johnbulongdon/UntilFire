import type { ReactNode } from 'react'
import { RefreshControl, ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AccountNotice } from './AccountNotice'
import { Text } from './Text'
import { colors } from '@/theme/colors'

/** A tab's page: a Fraunces title over scrolling cards on the warm ground. */
export function Screen({ title, subtitle, children, refreshing, onRefresh }: {
  title: string
  subtitle?: string
  children: ReactNode
  /** Pull to refresh, when the page shows account data. */
  refreshing?: boolean
  onRefresh?: () => void
}) {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-ground">
      <ScrollView
        contentContainerClassName="px-5 pb-12"
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.green} /> : undefined}
      >
        <View className="pb-4 pt-3">
          <Text className="font-display text-[34px] font-bold tracking-tight text-ink">{title}</Text>
          {subtitle ? <Text className="mt-1 text-[15px] text-ink-2">{subtitle}</Text> : null}
        </View>
        {onRefresh ? <AccountNotice /> : null}
        <View className="gap-4">{children}</View>
      </ScrollView>
    </SafeAreaView>
  )
}

/**
 * The website's Card (components/ui/Card.tsx): warm card on a warm border,
 * 20px radius, a faint warm shadow. `soft` is the inset surface.
 */
export function Card({ children, soft }: { children: ReactNode; soft?: boolean }) {
  return (
    <View
      className={`rounded-card p-5 ${soft ? 'bg-surface' : 'border border-border bg-card'}`}
      style={soft ? undefined : { shadowColor: '#78501E', shadowOpacity: 0.06, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } }}
    >
      {children}
    </View>
  )
}

/** A small muted label, like the website's uf-t-small headings. */
export function Label({ children }: { children: ReactNode }) {
  return <Text className="text-[13px] text-ink-3">{children}</Text>
}

/** A teal bar filled to `share` (0–1): progress toward freedom, and nothing else. */
export function ProgressTrack({ share, height = 8 }: { share: number; height?: number }) {
  const pct = Math.max(0, Math.min(1, share)) * 100
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }} className="overflow-hidden rounded-full bg-surface-2" style={{ height }}>
      <View className="h-full rounded-full bg-teal" style={{ width: `${pct}%` }} />
    </View>
  )
}
