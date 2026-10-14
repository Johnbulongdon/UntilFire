import { router } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useEffect, useState } from 'react'
import { Alert, Linking, Pressable, ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button } from '@/components/Button'
import { Icon } from '@/components/Icon'
import { Text } from '@/components/Text'
import { buyPro, iapAvailable, PENDING, loadProPrices, restorePro, type ProPlan, type ProPrice } from '@/lib/apple-iap'
import { haptic } from '@/lib/haptics'
import { useAccount } from '@/state/account'
import { useAuth } from '@/state/auth'
import { colors, TAB_COLOR } from '@/theme/colors'

type SymbolName = Parameters<typeof Icon>[0]['name']

// The website's Pro promise (app/dashboard/UpgradeModal.tsx): only what Pro actually unlocks.
const FEATURES: { icon: SymbolName; fallback: string; title: string; detail: string }[] = [
  { icon: 'building.columns.fill', fallback: '▥', title: 'Unlimited bank connections', detail: 'Free stops at one. Pro has no limit.' },
  { icon: 'sun.max.fill', fallback: '☀', title: 'Payday and big-spend checks', detail: 'Today tells you what is safe to invest, and when one spend tips a budget.' },
  { icon: 'square.stack.3d.up.fill', fallback: '▤', title: 'Every account in one place', detail: 'All your banks behind one freedom date, not just the first.' },
]
// Shown in Expo Go, where there is no StoreKit. The website's prices (lib/pricing.ts).
const FALLBACK: Record<ProPlan, string> = { monthly: '$9', yearly: '$79' }

/**
 * UntilFire Pro (D-75): bought through Apple in the app. In Expo Go the screen
 * and its buttons are here to see; buying works in the App Store version.
 */
export default function Pro() {
  const { session } = useAuth()
  const { data, refresh } = useAccount()
  const [prices, setPrices] = useState<ProPrice[]>([])
  const [plan, setPlan] = useState<ProPlan>('yearly')
  const [busy, setBusy] = useState(false)

  useEffect(() => { loadProPrices().then(setPrices).catch(() => {}) }, [])
  const price = (p: ProPlan) => prices.find(x => x.plan === p)?.price ?? FALLBACK[p]
  // In the App Store build, buy only at Apple's own price, never the website's fallback.
  const waiting = iapAvailable() && prices.length === 0

  const buy = async () => {
    if (!session) { router.push('/sign-in'); return }
    if (!iapAvailable()) { Alert.alert('Coming with the App Store version', 'Buying Pro works in the App Store version of UntilFire.'); return }
    setBusy(true)
    const result = await buyPro(plan, session.access_token)
    setBusy(false)
    if (result === null) { haptic.success(); await refresh(); router.back() }
    else if (result === PENDING) Alert.alert(result)
    else if (result !== 'cancelled') { haptic.warn(); Alert.alert(result) }
  }
  const restore = async () => {
    if (!session) { router.push('/sign-in'); return }
    setBusy(true)
    const problem = await restorePro(session.access_token)
    setBusy(false)
    if (problem) Alert.alert(problem)
    else { haptic.success(); await refresh() }
  }
  const open = (path: string) => { WebBrowser.openBrowserAsync(`https://www.untilfire.com${path}`, { controlsColor: colors.green }).catch(() => {}) }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ground }}>
      <View className="flex-row justify-end px-5 pt-2">
        <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={12} onPress={() => { haptic.tick(); router.back() }}>
          <Icon name="xmark" fallback="✕" size={20} color={colors.ink3} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24, gap: 22 }}>
        <View className="gap-2">
          <Text className="text-[12px] font-bold uppercase tracking-[2px] text-ink-3">UntilFire Pro</Text>
          <Text className="font-display text-[34px] font-bold leading-10 text-ink">Every account. One freedom date.</Text>
        </View>
        <View className="gap-4">
          {FEATURES.map(f => (
            <View key={f.title} className="flex-row gap-4">
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: TAB_COLOR.profile, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={f.icon} fallback={f.fallback} size={20} color="#FFFFFF" />
              </View>
              <View className="flex-1">
                <Text className="text-[16px] font-bold text-ink">{f.title}</Text>
                <Text className="text-[14px] leading-5 text-ink-2">{f.detail}</Text>
              </View>
            </View>
          ))}
        </View>

        {data?.pro ? (
          <View className="gap-3">
            <Text className="text-[17px] font-bold text-ink">You're on Pro. Thank you.</Text>
            <Button kind="quiet" label="Manage your subscription" onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions').catch(() => {})} />
          </View>
        ) : (
          <View className="flex-row gap-3">
            {(['yearly', 'monthly'] as ProPlan[]).map(p => {
              const on = plan === p
              return (
                <Pressable key={p} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => { haptic.select(); setPlan(p) }} style={{ flex: 1 }}>
                  <View style={{ borderRadius: 18, borderWidth: 2, borderColor: on ? colors.green : colors.border2, borderBottomWidth: 5, padding: 14, backgroundColor: colors.card, gap: 2 }}>
                    <Text className="text-[13px] font-bold uppercase tracking-[1px] text-ink-3">{p === 'yearly' ? 'Yearly' : 'Monthly'}</Text>
                    <Text className="font-mono text-[22px] text-ink">{waiting ? '…' : price(p)}</Text>
                    <Text className="text-[12px] text-ink-2">{p === 'yearly' ? 'a year, best value' : 'a month'}</Text>
                  </View>
                </Pressable>
              )
            })}
          </View>
        )}
      </ScrollView>
      {!data?.pro && (
        <View className="gap-3 px-6 pb-3">
          <Button label={busy ? 'One moment…' : waiting ? "Loading Apple's prices…" : `Get Pro for ${price(plan)} ${plan === 'yearly' ? 'a year' : 'a month'}`} disabled={busy || waiting} onPress={buy} />
          <Button kind="quiet" label="Restore purchases" disabled={busy} onPress={restore} />
          <Text className="text-center text-[11px] leading-4 text-ink-3">
            Billed by Apple to your Apple ID. Renews automatically until you turn it off in Settings at least a day before it renews.
          </Text>
          <View className="flex-row justify-center gap-2">
            <Button small kind="quiet" label="Terms" onPress={() => open('/terms')} />
            <Button small kind="quiet" label="Privacy" onPress={() => open('/privacy')} />
          </View>
        </View>
      )}
    </SafeAreaView>
  )
}
