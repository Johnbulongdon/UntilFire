import { router } from 'expo-router'
import { useState } from 'react'
import { Alert, Pressable, ScrollView, Switch, View } from 'react-native'
import Animated, { LinearTransition } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Text } from '@/components/Text'
import { HOME_CARDS, normaliseLayout, setCard, type DashboardLayout } from '@/engine'
import { haptic } from '@/lib/haptics'
import { APP_HOME_CARDS } from '@/lib/home-cards'
import { saveHomeLayout } from '@/lib/mutations'
import { useAccount } from '@/state/account'
import { useAuth } from '@/state/auth'
import { colors } from '@/theme/colors'

const drawn = (id: string) => (APP_HOME_CARDS as readonly string[]).includes(id)

/**
 * Edit Home (the website's customise panel): turn cards on or off and move
 * them up or down. Saved to the account, so Home matches on the website.
 * Cards only the website draws keep their places untouched.
 */
export default function HomeLayout() {
  const { session } = useAuth()
  const { data, refresh } = useAccount()
  const [layout, setLayout] = useState<DashboardLayout | null>(data ? (data.homeLayout ?? normaliseLayout(null)) : null)
  const [saving, setSaving] = useState(false)
  if (!layout) return null
  const shown = layout.cards.filter(c => drawn(c.id))

  // Swap with the next card the app draws, skipping website-only ones between.
  const move = (id: string, dir: -1 | 1) => {
    const i = shown.findIndex(c => c.id === id), j = i + dir
    if (j < 0 || j >= shown.length) return
    haptic.tick()
    const cards = [...layout.cards]
    const a = cards.findIndex(c => c.id === id), b = cards.findIndex(c => c.id === shown[j].id)
    ;[cards[a], cards[b]] = [cards[b], cards[a]]
    setLayout({ cards })
  }

  const save = async () => {
    if (!session) return
    setSaving(true)
    const problem = await saveHomeLayout(session.user.id, layout)
    setSaving(false)
    if (problem) { haptic.warn(); Alert.alert(problem); return }
    haptic.success(); await refresh(); router.back()
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ground }}>
      <View className="flex-row items-center justify-between px-5 pt-4">
        <Pressable accessibilityRole="button" hitSlop={12} onPress={() => { haptic.tick(); router.back() }}><Text className="text-[16px] font-semibold text-ink-2">Cancel</Text></Pressable>
        <Text className="text-[16px] font-bold text-ink">Edit Home</Text>
        <Pressable accessibilityRole="button" hitSlop={12} disabled={saving} onPress={save}><Text className="text-[16px] font-bold text-pos-ink">{saving ? 'Saving…' : 'Save'}</Text></Pressable>
      </View>
      <ScrollView contentContainerClassName="px-5 pb-10 pt-5">
        <Text className="mb-3 text-[13px] leading-5 text-ink-3">Choose what Home shows and in what order. It's saved to your account, so untilfire.com matches.</Text>
        <View className="rounded-card border border-border bg-card px-4">
          {shown.map((c, i) => {
            const def = HOME_CARDS.find(d => d.id === c.id)!
            return (
              <Animated.View key={c.id} layout={LinearTransition.duration(180)}>
              <View className={`flex-row items-center gap-3 py-3 ${i ? 'border-t border-border' : ''}`}>
                <View className="gap-1">
                  <Pressable accessibilityRole="button" accessibilityLabel={`Move ${def.label} up`} hitSlop={4} disabled={i === 0} onPress={() => move(c.id, -1)}>
                    <Text className={`text-[14px] ${i === 0 ? 'text-border-2' : 'text-ink-2'}`}>▲</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Move ${def.label} down`} hitSlop={4} disabled={i === shown.length - 1} onPress={() => move(c.id, 1)}>
                    <Text className={`text-[14px] ${i === shown.length - 1 ? 'text-border-2' : 'text-ink-2'}`}>▼</Text>
                  </Pressable>
                </View>
                <View className="flex-1">
                  <Text className={`text-[15px] font-semibold ${c.visible ? 'text-ink' : 'text-ink-3'}`}>{def.label}</Text>
                  <Text className="text-[12px] leading-4 text-ink-3">{def.hint}</Text>
                </View>
                <Switch accessibilityLabel={`Show ${def.label}`} value={c.visible} disabled={def.required}
                  onValueChange={v => { haptic.select(); setLayout(setCard(layout, c.id, { visible: v })) }}
                  trackColor={{ true: colors.green, false: colors.border2 }} />
              </View>
              </Animated.View>
            )
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
