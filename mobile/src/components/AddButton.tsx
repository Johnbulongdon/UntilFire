import { router } from 'expo-router'
import { Platform, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { haptic } from '@/lib/haptics'

import { Bouncy } from './Bouncy'
import { Text } from './Text'

/** The floating + that adds a transaction from anywhere in Money. */
export function AddButton() {
  // iOS 26's tab bar floats over the page, so the button sits above it.
  const insets = useSafeAreaInsets()
  const bottom = Platform.OS === 'ios' ? insets.bottom + 64 : 20
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', right: 20, bottom }}>
      <Bouncy
        accessibilityRole="button"
        accessibilityLabel="Add a transaction"
        onPress={() => { haptic.press(); router.push('/transaction') }}
        scaleTo={0.9}
      >
        <View
          className="h-14 w-14 items-center justify-center rounded-full bg-green"
          style={{ shadowColor: '#78501E', shadowOpacity: 0.2, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } }}
        >
          <Text className="text-[30px] leading-[32px] text-white">+</Text>
        </View>
      </Bouncy>
    </View>
  )
}
