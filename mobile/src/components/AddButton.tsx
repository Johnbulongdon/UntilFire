import { router } from 'expo-router'
import { View } from 'react-native'

import { haptic } from '@/lib/haptics'

import { Bouncy } from './Bouncy'
import { Text } from './Text'

/** The floating + that adds a transaction from anywhere in Money. */
export function AddButton() {
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', right: 20, bottom: 20 }}>
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
          <Text className="text-[30px] leading-[32px] text-card">+</Text>
        </View>
      </Bouncy>
    </View>
  )
}
