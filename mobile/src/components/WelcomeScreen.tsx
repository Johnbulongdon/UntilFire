import { Image, ScrollView, StyleSheet, useWindowDimensions } from 'react-native'
import Animated, { FadeIn, FadeInDown, ReduceMotion } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { colors } from '@/theme/colors'
import { Button } from './Button'
import { Text } from './Text'

/** Public welcome artwork. These figures are examples, never account data. */
export function WelcomeScreen({ onGetStarted, onSignIn }: {
  onGetStarted: () => void
  onSignIn: () => void
}) {
  const { width, height } = useWindowDimensions()
  const artworkHeight = (Math.min(width, 480) - 48) * 1330 / 1182
  const compact = height < 760
  const light = colors.ink === '#151719'
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.ground }]}>
      <ScrollView
        contentContainerStyle={[styles.content, compact && styles.compact]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View entering={FadeIn.duration(220).reduceMotion(ReduceMotion.System)}>
          <Image
            source={light ? require('../../assets/brand-logo.png') : require('../../assets/brand-logo-white.png')}
            style={styles.logo}
            resizeMode="contain"
            alt="UntilFire"
            accessibilityLabel="UntilFire"
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(60).duration(280).reduceMotion(ReduceMotion.System)} style={styles.copy}>
          <Text accessibilityRole="header" style={[styles.title, compact && styles.compactTitle, { color: colors.ink }]}>
            {'Make room\nfor more life.'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.ink2 }]}>
            Your money today. Your freedom ahead.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(320).reduceMotion(ReduceMotion.System)} style={styles.preview}>
          <Image
            source={require('../../assets/welcome/product-preview.png')}
            style={[styles.artwork, { height: artworkHeight }]}
            resizeMode="contain"
            alt="Illustrative example: work optional in June 2043 and 1,347 dollars left until payday."
            accessibilityRole="image"
            accessibilityLabel="Illustrative example plan: work becomes optional in June 2043; 1,347 dollars left until payday after bills and everyday costs. These are example figures, not your results."
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(180).duration(280).reduceMotion(ReduceMotion.System)} style={styles.actions}>
          <Button label="Get started" onPress={onGetStarted} />
          <Button kind="soft" label="I already have an account" onPress={onSignIn} />
          <Text style={[styles.reassurance, { color: colors.ink2 }]}>
            No bank connection needed to start.
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
    gap: 24,
  },
  compact: { paddingTop: 20, paddingBottom: 16, gap: 18 },
  logo: { width: 176, height: 32 },
  copy: { gap: 12 },
  title: { fontFamily: 'Inter', fontSize: 40, lineHeight: 44, fontWeight: '800', letterSpacing: -1.4 },
  compactTitle: { fontSize: 36, lineHeight: 40 },
  subtitle: { fontFamily: 'Inter', fontSize: 15, lineHeight: 22, fontWeight: '400' },
  // The example illustration keeps its approved light palette in either theme.
  preview: { alignItems: 'center' },
  artwork: { width: '100%' },
  actions: { gap: 10 },
  reassurance: { fontFamily: 'Inter', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 6, fontWeight: '400' },
})
