import { router, useFocusEffect } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { BankBridge } from '@/components/BankBridge'
import { Button } from '@/components/Button'
import { Icon } from '@/components/Icon'
import { Text } from '@/components/Text'
import { haptic } from '@/lib/haptics'
import { walletOn } from '@/lib/wallet-alerts'
import { useAccount } from '@/state/account'
import { freedomFor, planFromDraft, usePlan } from '@/state/plan'
import { brand } from '@/theme/colors'

/**
 * The last step of Android setup (D-142, John's pick): after the freedom year,
 * connect the bank and Google Pay so the year stays true. Everything here can
 * be skipped, and both stay on offer later (Money, Transactions, Profile).
 */
export default function Connect() {
  const { data } = useAccount()
  const { plan: saved, draft } = usePlan()
  const year = useMemo(() => freedomFor(saved ?? planFromDraft(draft)).year, [saved, draft])
  const [gpay, setGpay] = useState(walletOn())
  useFocusEffect(useCallback(() => { setGpay(walletOn()) }, []))
  const bank = (data?.plaidAccounts.length ?? 0) > 0
  const done = () => { haptic.press(); router.replace('/(tabs)') }

  return (
    <SafeAreaView className="flex-1 bg-ground">
      <ScrollView contentContainerClassName="gap-3 px-6 pb-6 pt-6">
        <View className="rounded-card p-4" style={{ backgroundColor: brand.yellow }}>
          <Text className="text-[13px] font-semibold" style={{ color: '#5C5130' }}>Your freedom year</Text>
          <Text className="font-display text-[36px] font-extrabold" style={{ color: brand.deep }}>{year ?? '65+ yrs'}</Text>
        </View>
        <Text className="mt-2 font-display text-[24px] font-bold leading-[30px] text-ink">Keep it true with real numbers</Text>
        <Text className="text-[15px] text-ink-2">Connect once. Your date updates by itself.</Text>

        <View className="gap-3 rounded-card bg-card p-4">
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: brand.blue }}>
              <Icon name="building.columns.fill" fallback="🏦" size={20} color={brand.deep} />
            </View>
            <View className="flex-1">
              <Text className="text-[16px] font-bold text-ink">Your bank</Text>
              <Text className="text-[13px] text-ink-2">{bank ? '✓ Connected' : 'Payments and bills'}</Text>
            </View>
          </View>
          {!bank && <BankBridge compact />}
        </View>

        <Pressable accessibilityRole="button" onPress={() => { haptic.tick(); router.push('/google-pay') }}
          className="min-h-[72px] flex-row items-center gap-3 rounded-card bg-card p-4 active:opacity-70">
          <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: brand.yellow }}>
            <Icon name="iphone" fallback="📲" size={20} color={brand.deep} />
          </View>
          <View className="flex-1">
            <Text className="text-[16px] font-bold text-ink">Google Pay</Text>
            <Text className="text-[13px] text-ink-2">{gpay ? '✓ On' : '✨ Bonus · better help'}</Text>
          </View>
          {!gpay && <Text className="text-[15px] font-bold text-ink">Turn on ›</Text>}
        </Pressable>
      </ScrollView>
      <View className="px-6 pb-4">
        {bank || gpay
          ? <Button label="Continue" onPress={done} />
          : <Button kind="quiet" label="Skip for now" onPress={done} />}
      </View>
    </SafeAreaView>
  )
}
