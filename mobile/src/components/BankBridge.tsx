import { router } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useState } from 'react'
import { Alert, View } from 'react-native'

import { proForSale } from '@/lib/native-build'
import { haptic } from '@/lib/haptics'
import { connectBankNative, plaidNativeAvailable, type BankFound } from '@/lib/plaid-native'
import { useAccount } from '@/state/account'
import { useAuth } from '@/state/auth'
import { colors } from '@/theme/colors'

import { BankWorking } from './BankWorking'
import { Button } from './Button'
import { Text } from './Text'

// TEMPORARY bridge (founder's call, 13 Oct 2026): in Expo Go, connecting a
// bank happens on untilfire.com, because Plaid's native Link needs the app's
// own build (and so the Apple developer account). In the app's own build the
// native flow below takes over by itself. Remove the website branch once the
// app ships through its own builds; it goes against the "every feature native
// in the app" rule on purpose, for now.
const CONNECT_URL = 'https://www.untilfire.com/dashboard?tab=assets'

/**
 * "Connect a bank". Native Plaid Link in the app's own build; in Expo Go, the
 * website's Plaid flow in the phone's browser. Either way the bank lands in
 * the same account, and the app reloads so it shows here and in Today.
 */
export function BankBridge({ another, compact }: { another?: boolean; compact?: boolean }) {
  const { data, refresh } = useAccount()
  const { session } = useAuth()
  const [busy, setBusy] = useState(false)
  // Linking a bank, shown working: the bank's name while it imports, then what it found.
  const [working, setWorking] = useState<{ name: string; result: BankFound | null } | null>(null)
  const native = plaidNativeAvailable()
  // Free stops at one bank: say so before the connect flow, not as an error after it.
  const needsPro = !!another && !!data && !data.pro

  const open = async () => {
    if (needsPro) {
      haptic.tick()
      if (proForSale) router.push({ pathname: '/pro', params: { from: 'bank_limit' } })
      else Alert.alert('One bank on the free plan', 'Free includes one connected bank.')
      return
    }
    if (native && session) {
      setBusy(true)
      const result = await connectBankNative(session.access_token, (name, found) => setWorking({ name, result: found }))
      setBusy(false)
      if (result === null) refresh()
      else { setWorking(null); if (result !== 'cancelled') { haptic.warn(); Alert.alert(result) } }
      return
    }
    await WebBrowser.openBrowserAsync(CONNECT_URL, { controlsColor: colors.green }).catch(() => {})
    refresh()
  }
  return (
    <View className="gap-2">
      {working && <BankWorking name={working.name} result={working.result} onClose={() => setWorking(null)} />}
      <Button small={compact} kind={another ? 'quiet' : 'primary'} busy={busy}
        label={busy ? 'Connecting…' : needsPro ? (proForSale ? 'More banks with Pro' : 'One bank on the free plan') : another ? 'Connect another bank' : 'Connect a bank'} onPress={open} />
      {!another && (
        <Text className="text-[13px] leading-5 text-ink-3">
          {native
            ? 'Securely with Plaid. UntilFire never sees your bank login.'
            : 'Opens untilfire.com to connect securely with Plaid. Sign in there with this account; your banks then show up here.'}
        </Text>
      )}
    </View>
  )
}
