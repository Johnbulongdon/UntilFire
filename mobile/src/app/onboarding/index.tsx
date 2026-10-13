import { router } from 'expo-router'
import { useEffect } from 'react'
import { View } from 'react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button } from '@/components/Button'
import { LogoReveal } from '@/components/LogoReveal'
import { Sunrise } from '@/components/Sunrise'
import { Text } from '@/components/Text'
import { haptic } from '@/lib/haptics'
import { brand } from '@/theme/colors'

/** Welcome (V2): the wordmark, a sun coming up, one punchline, one button. */
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
          <LogoReveal width={220} />
        </Animated.View>

        <Animated.View entering={FadeIn.delay(600).duration(900)}>
          <Sunrise share={1} height={170} sun={brand.sun} horizon={brand.aqua} sky={brand.aqua} />
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
