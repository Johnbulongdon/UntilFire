import { router } from 'expo-router'
import { Pressable, ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Text } from '@/components/Text'
import { haptic } from '@/lib/haptics'
import { UPDATE_LOG, versionLabel } from '@/lib/update-log'
import { colors } from '@/theme/colors'

/** Profile › Version: which build this phone runs, and what changed in each release. */
export default function UpdateLog() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ground }}>
      <View className="flex-row items-center justify-between px-5 pt-4">
        <Pressable accessibilityRole="button" hitSlop={12} onPress={() => { haptic.tick(); router.back() }}><Text className="text-[16px] font-semibold text-ink-2">Done</Text></Pressable>
        <Text className="text-[16px] font-bold text-ink">What's new</Text>
        <View style={{ width: 52 }} />
      </View>
      <ScrollView contentContainerClassName="gap-4 px-5 pb-10 pt-4">
        <View className="rounded-card border border-border bg-card px-4 py-3">
          <Text className="text-[12px] text-ink-3">This phone runs</Text>
          <Text className="font-mono text-[16px] text-ink">{versionLabel()}</Text>
        </View>
        {UPDATE_LOG.map(entry => (
          <View key={entry.version} className="gap-2 rounded-card border border-border bg-card px-4 py-3">
            <View className="flex-row items-baseline justify-between">
              <Text className="font-mono text-[15px] font-semibold text-ink">{entry.version}</Text>
              <Text className="font-mono text-[12px] text-ink-3">{entry.date}</Text>
            </View>
            {entry.changes.map(change => <Text key={change} className="text-[14px] text-ink-2">• {change}</Text>)}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}
