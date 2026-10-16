import { router } from 'expo-router'
import { useState } from 'react'
import { Alert, Pressable, ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button } from '@/components/Button'
import { Row } from '@/components/SettingsRow'
import { Text } from '@/components/Text'
import { Events, track } from '@/lib/analytics'
import { exportEverything, exportTransactions } from '@/lib/export-data'
import { haptic } from '@/lib/haptics'
import { useEditPlan } from '@/lib/useEditPlan'
import { useAuth } from '@/state/auth'
import { colors } from '@/theme/colors'

/**
 * The less common, bigger decisions, one tap below Profile (Oct 16 2026, the
 * founder): export, replay onboarding, and delete account last. One tap in
 * still keeps account deletion easy to find (App Store guideline 5.1.1(v)).
 */
export default function DataAndAccount() {
  const { session } = useAuth()
  const editPlan = useEditPlan()
  const [exporting, setExporting] = useState<'csv' | 'json' | null>(null)

  const doExport = async (kind: 'csv' | 'json') => {
    if (!session) return
    haptic.tick(); setExporting(kind)
    try {
      await (kind === 'csv' ? exportTransactions(session.user.id) : exportEverything(session.user.id))
      track(Events.DATA_EXPORTED, { format: kind })
    }
    catch { Alert.alert('The export didn\'t finish', 'Check your connection and try again.') }
    setExporting(null)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ground }}>
      <View className="flex-row items-center justify-between px-5 pt-4">
        <Pressable accessibilityRole="button" hitSlop={12} onPress={() => { haptic.tick(); router.back() }}><Text className="text-[16px] font-semibold text-ink-2">Done</Text></Pressable>
        <Text className="text-[16px] font-bold text-ink">Data and account</Text>
        <View style={{ width: 52 }} />
      </View>
      <ScrollView contentContainerClassName="gap-4 px-5 pb-10 pt-4">
        <View className="rounded-card border border-border bg-card px-4 pb-3">
          <Row icon="tablecells" fallback="▦" label="Export transactions" value={exporting === 'csv' ? '' : 'CSV'} onPress={() => doExport('csv')} first busy={exporting === 'csv'} />
          <Row icon="square.and.arrow.up" fallback="↑" label="Export everything" value={exporting === 'json' ? '' : 'JSON'} onPress={() => doExport('json')} busy={exporting === 'json'} />
          <Text className="mt-1 text-[12px] text-ink-3">Free, any time, whether or not you're on Pro.</Text>
        </View>
        <View className="rounded-card border border-border bg-card px-4">
          <Row icon="arrow.counterclockwise" fallback="↺" label="Replay onboarding" value="" onPress={() => { router.back(); editPlan(true) }} first />
        </View>
        {session && <Button kind="danger" label="Delete account" onPress={() => { haptic.warn(); router.push('/delete-account') }} />}
      </ScrollView>
    </SafeAreaView>
  )
}
