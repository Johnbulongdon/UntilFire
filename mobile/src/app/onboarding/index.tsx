import { router } from 'expo-router'
import { useEffect } from 'react'
import { View } from 'react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button } from '@/components/Button'
import { Sunny } from '@/components/Sunny'
import { Text } from '@/components/Text'
import { haptic } from '@/lib/haptics'

/** Welcome (V2): the wordmark (without the logo's own sun, so there is one sun), Sunny coming up, one punchline, one button. */
export default function Welcome() {
  // A soft tap as the sun rises.
  useEffect(() => {
    const t = setTimeout(haptic.tick, 900)
    return () => clearTimeout(t)
  }, [])

  return (
    <SafeAreaView className="flex-1 bg-brand">
      <View className="flex-1 justify-between px-6 pb-4 pt-6">
        <Animated.View entering={FadeIn.duration(300)} style={{ alignItems: 'center', marginTop: 24 }}>
          <Text className="font-display text-[30px] font-bold tracking-tight text-white">UntilFire</Text>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(600).duration(900)}>
          <View style={{ alignItems: 'center' }}><Sunny mood="rise" size={190} /></View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(1300).duration(700)}>
          <Text className="font-display text-[42px] font-bold leading-[48px] tracking-tight text-white">
            Find the year work becomes optional.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(1800).duration(600)}>
          <Button kind="onDark" label="Get started" onPress={() => router.push('/onboarding/goal')} />
        </Animated.View>
      </View>
    </SafeAreaView>
  )
}
