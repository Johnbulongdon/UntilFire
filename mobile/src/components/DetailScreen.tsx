import { router } from 'expo-router'
import type { ReactNode } from 'react'
import { Pressable, RefreshControl, ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { haptic } from '@/lib/haptics'
import { colors } from '@/theme/colors'

import { AccountNotice } from './AccountNotice'
import { TODAY_BAR_SPACE } from './TabChrome'
import { Text } from './Text'

/** A page one tap below a hub: a back link to the hub, a Fraunces title, scrolling content. */
export function DetailScreen({ back, title, subtitle, children, refreshing, onRefresh }: {
  back: string
  title: string
  subtitle?: string
  children: ReactNode
  refreshing?: boolean
  onRefresh?: () => void
}) {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-ground">
      <View className="px-5 pt-2">
        <Pressable accessibilityRole="button" accessibilityLabel={`Back to ${back}`} hitSlop={12} onPress={() => { haptic.tick(); router.back() }}>
          <Text className="text-[16px] font-semibold text-pos-ink">‹ {back}</Text>
        </Pressable>
      </View>
      <ScrollView
        contentContainerClassName="px-5 pb-12"
        // Detail pages sit inside the tabs, so the last row clears the Today bar and tab bar, as Screen does.
        contentContainerStyle={{ paddingBottom: TODAY_BAR_SPACE + 96 }}
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.green} /> : undefined}
      >
        <View className="pb-4 pt-2">
          <Text className="font-display text-[30px] font-bold tracking-tight text-ink">{title}</Text>
          {subtitle ? <Text className="mt-1 text-[15px] text-ink-2">{subtitle}</Text> : null}
        </View>
        {onRefresh ? <AccountNotice /> : null}
        <View className="gap-4">{children}</View>
      </ScrollView>
    </SafeAreaView>
  )
}
