import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { AppState, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button } from '@/components/Button'
import { Icon } from '@/components/Icon'
import { Text } from '@/components/Text'
import { Events, track } from '@/lib/analytics'
import { moneyExact } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { lastWalletPayment, turnWalletOff, turnWalletOn, walletOn, type LastWalletPayment } from '@/lib/wallet-alerts'
import { brand } from '@/theme/colors'

const PROMISES = [
  { icon: 'checkmark' as const, fallback: '✓', tone: brand.mint, title: 'Only Google Wallet', line: 'Other apps are skipped.' },
  { icon: 'creditcard.fill' as const, fallback: '💳', tone: brand.blue, title: 'Only the payment', line: 'Shop, amount, time.' },
  { icon: 'arrow.uturn.backward' as const, fallback: '↺', tone: brand.lilac, title: 'Off any time', line: 'Profile → Google Pay.' },
]

/**
 * Google Pay on Android (D-142): the plain-English disclosure before Android's
 * notification access page, and the on/off page afterwards. Google Play asks
 * for this screen before the access request.
 */
export default function GooglePay() {
  const [on, setOn] = useState(walletOn())
  const [last, setLast] = useState<LastWalletPayment | null>(null)
  const [asked, setAsked] = useState(false)
  useEffect(() => { lastWalletPayment().then(setLast) }, [])
  // Coming back from Android's page: read the switch again, and close once it's on.
  useEffect(() => {
    const sub = AppState.addEventListener('change', s => {
      if (s !== 'active') return
      const now = walletOn()
      setOn(now)
      if (asked && now) { track(Events.GOOGLE_PAY_TOGGLED, { on: true }); haptic.success(); router.back() }
    })
    return () => sub.remove()
  }, [asked])

  return (
    <SafeAreaView className="flex-1 bg-ground">
      <View className="flex-1 gap-3 px-6 pt-6">
        <View className="h-14 w-14 items-center justify-center rounded-[18px]" style={{ backgroundColor: brand.yellow }}>
          <Icon name="bell.fill" fallback="🔔" size={26} color={brand.deep} />
        </View>
        <Text className="mt-1 font-display text-[26px] font-bold leading-[32px] text-ink">{on ? 'Google Pay is on' : 'Allow Google Wallet alerts'}</Text>
        <Text className="text-[15px] text-ink-2">
          {on
            ? last ? `Last added: ${moneyExact(last.amount)} at ${last.merchant}` : 'Your next tap to pay shows up in Transactions.'
            : '✨ A bonus, not a must. Your numbers get more accurate, so we can help you better.'}
        </Text>
        {PROMISES.map(p => (
          <View key={p.title} className="flex-row items-center gap-3 rounded-card bg-card p-4">
            <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: p.tone }}>
              <Icon name={p.icon} fallback={p.fallback} size={16} color={brand.deep} />
            </View>
            <View className="flex-1">
              <Text className="text-[15px] font-bold text-ink">{p.title}</Text>
              <Text className="text-[13px] text-ink-2">{p.line}</Text>
            </View>
          </View>
        ))}
      </View>
      <View className="gap-3 px-6 pb-4">
        {!on && <Text className="text-center text-[12px] text-ink-3">Next, Android asks you to allow access.</Text>}
        {on
          ? <Button kind="quiet" label="Turn off" onPress={() => { haptic.tick(); turnWalletOff(); setOn(false); track(Events.GOOGLE_PAY_TOGGLED, { on: false }) }} />
          : <Button label="Continue" onPress={() => { haptic.press(); setAsked(true); turnWalletOn(); if (walletOn()) { setOn(true); track(Events.GOOGLE_PAY_TOGGLED, { on: true }); router.back() } }} />}
        <Button kind="quiet" label={on ? 'Done' : 'Not now'} onPress={() => { haptic.tick(); router.back() }} />
      </View>
    </SafeAreaView>
  )
}
