import { router } from 'expo-router'
import { useEffect } from 'react'
import { View } from 'react-native'
import { Text } from '@/components/Text'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { LogoReveal } from '@/components/LogoReveal'
import { PrimaryButton } from '@/components/PrimaryButton'
import { haptic } from '@/lib/haptics'

export default function Welcome() {
  // A soft tap as the sun rises in the logo animation.
  useEffect(() => {
    const t = setTimeout(haptic.tick, 900)
    return () => clearTimeout(t)
  }, [])

  return (
    <SafeAreaView className="flex-1 bg-brand">
      <View className="flex-1 justify-between px-6 pb-4 pt-6">
        <Animated.View entering={FadeIn.duration(300)} style={{ marginTop: 64, alignItems: 'center' }}>
          <LogoReveal />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(1500).duration(700)}>
          <Text className="font-display text-[40px] font-bold leading-[46px] tracking-tight text-white">
            Find the year work becomes optional.
          </Text>
          <Text className="mt-4 text-[17px] leading-7 text-mint">
            A few quick questions, then a plan for your spending and saving built around that date.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(2100).duration(600)} style={{ gap: 16 }}>
          <Text className="text-center text-[14px] text-mint/80">No account needed. Your answers stay on this phone.</Text>
          <PrimaryButton variant="onDark" label="Get started" onPress={() => router.push('/onboarding/goal')} />
        </Animated.View>
      </View>
    </SafeAreaView>
  )
}
