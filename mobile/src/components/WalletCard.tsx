import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { Pressable, View } from 'react-native'

import { haptic } from '@/lib/haptics'
import { hideWalletCard, walletAvailable, walletCardHidden, walletOn } from '@/lib/wallet-alerts'
import { brand } from '@/theme/colors'

import { Button } from './Button'
import { Text } from './Text'

/** Transactions, Android only (D-142): offers Google Pay until it's on or turned down twice. */
export function WalletCard() {
  const [show, setShow] = useState(false)
  useFocusEffect(useCallback(() => {
    if (!walletAvailable || walletOn()) { setShow(false); return }
    walletCardHidden().then(h => setShow(!h))
  }, []))
  if (!show) return null
  return (
    <View className="mt-3 gap-2 rounded-card p-4" style={{ backgroundColor: brand.yellow }}>
      <View className="self-start rounded-full px-2.5 py-0.5" style={{ backgroundColor: brand.deep }}>
        <Text className="text-[12px] font-bold" style={{ color: brand.yellow }}>✨ Bonus</Text>
      </View>
      <Text className="font-display text-[20px] font-bold leading-[25px]" style={{ color: brand.deep }}>Add Google Pay payments by themselves</Text>
      <Text className="text-[14px]" style={{ color: '#5C5130' }}>More accurate numbers, so we can help you better.</Text>
      <Button kind="onAccent" label="Turn on" onPress={() => { haptic.press(); router.push('/google-pay') }} />
      <Pressable accessibilityRole="button" hitSlop={8} className="items-center py-2" onPress={() => { haptic.tick(); setShow(false); hideWalletCard() }}>
        <Text className="text-[15px] font-semibold" style={{ color: brand.deep }}>Not now</Text>
      </Pressable>
    </View>
  )
}
