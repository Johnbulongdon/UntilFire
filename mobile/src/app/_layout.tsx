import '../global.css'

import { DMMono_400Regular, DMMono_500Medium } from '@expo-google-fonts/dm-mono'
import { Fraunces_400Regular, Fraunces_500Medium, Fraunces_600SemiBold, Fraunces_700Bold } from '@expo-google-fonts/fraunces'
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope'
import { useFonts } from 'expo-font'
import { Stack, usePathname, type ErrorBoundaryProps } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useColorScheme, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'

import { cancelMonthlyCheckIn } from '@/lib/reminders'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

import { AccountProvider } from '@/state/account'
import { AuthProvider } from '@/state/auth'
import { PlanProvider } from '@/state/plan'
import { colors, setPalette, themeVars } from '@/theme/colors'
import { Events, track } from '@/lib/analytics'
import { reportError, withCrashReporting } from '@/lib/crash-reporting'
import { AppLock } from '@/components/AppLock'
import { NotificationTaps } from '@/components/NotificationTaps'
import { UpdateGate } from '@/components/UpdateGate'
import { EmptyState } from '@/components/EmptyState'

SplashScreen.preventAutoHideAsync().catch(() => {})

/** A screen that throws shows this and can try again, instead of closing the app (App Store readiness, Oct 2026). */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => { reportError(error) }, [error])
  return (
    <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.ground }}>
      <EmptyState mood="quiet" title="Something went wrong" body="Your money and plan are safe. Try again." action={{ label: 'Try again', onPress: () => { retry() } }} />
    </View>
  )
}

function RootLayout() {
  // The website's three faces: Fraunces display, Manrope body, DM Mono numbers.
  const [loaded, error] = useFonts({
    Fraunces_400Regular, Fraunces_500Medium, Fraunces_600SemiBold, Fraunces_700Bold,
    Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold,
    DMMono_400Regular, DMMono_500Medium,
  })
  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {})
  }, [loaded, error])
  // The monthly check-in gave way to the daily Today reminder (D-73); stop any still scheduled.
  useEffect(() => { cancelMonthlyCheckIn().catch(() => {}) }, [])
  // Light or dark follows the phone. The palette is set before anything renders with it.
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  setPalette(scheme)
  if (!loaded && !error) return null

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.ground }}>
      {/* The theme's CSS variables, which every className colour reads (tailwind.config.js). */}
      <View style={[{ flex: 1 }, themeVars[scheme]]}>
      <AuthProvider>
      <PlanProvider>
        <AccountProvider>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <ScreenViews />
        <NotificationTaps />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ground } }}>
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
          <Stack.Screen name="sign-in" options={{ presentation: 'modal' }} />
          <Stack.Screen name="save-plan" options={{ animation: 'fade' }} />
          <Stack.Screen name="transaction" options={{ presentation: 'modal' }} />
          <Stack.Screen name="budget-edit" options={{ presentation: 'modal' }} />
          <Stack.Screen name="spending-accounts" options={{ presentation: 'modal' }} />
          <Stack.Screen name="shared-accounts" options={{ presentation: 'modal' }} />
          <Stack.Screen name="bill" options={{ presentation: 'modal' }} />
          <Stack.Screen name="lease" options={{ presentation: 'modal' }} />
          <Stack.Screen name="needs-wants" options={{ presentation: 'modal' }} />
          <Stack.Screen name="balances" options={{ presentation: 'modal' }} />
          <Stack.Screen name="mortgage" options={{ presentation: 'modal' }} />
          <Stack.Screen name="income-edit" options={{ presentation: 'modal' }} />
          <Stack.Screen name="category" options={{ presentation: 'modal' }} />
          <Stack.Screen name="merge-category" options={{ presentation: 'modal' }} />
          <Stack.Screen name="contribution-edit" options={{ presentation: 'modal' }} />
          <Stack.Screen name="goal" options={{ presentation: 'modal' }} />
          <Stack.Screen name="assumptions" options={{ presentation: 'modal' }} />
          <Stack.Screen name="plan-goal" options={{ presentation: 'modal' }} />
          <Stack.Screen name="data-account" options={{ presentation: 'modal' }} />
          <Stack.Screen name="update-log" options={{ presentation: 'modal' }} />
          <Stack.Screen name="delete-account" options={{ presentation: 'modal' }} />
          <Stack.Screen name="feedback" options={{ presentation: 'modal' }} />
          <Stack.Screen name="name" options={{ presentation: 'modal' }} />
          <Stack.Screen name="currency" options={{ presentation: 'modal' }} />
          <Stack.Screen name="import" options={{ presentation: 'modal' }} />
          <Stack.Screen name="household" options={{ presentation: 'modal' }} />
          <Stack.Screen name="home-layout" options={{ presentation: 'modal' }} />
          <Stack.Screen name="give-a-month" options={{ presentation: 'modal' }} />
          <Stack.Screen name="review" options={{ presentation: 'modal' }} />
          <Stack.Screen name="today" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="pro" options={{ presentation: 'modal' }} />
          <Stack.Screen name="fire-quiz" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="character-lab" options={{ presentation: 'modal' }} />
        </Stack>
        <AppLock />
        <UpdateGate />
        </AccountProvider>
      </PlanProvider>
      </AuthProvider>
      </View>
    </GestureHandlerRootView>
  )
}

/** One event per screen, by route (no ids or amounts in it). */
function ScreenViews() {
  const path = usePathname()
  useEffect(() => { track(Events.SCREEN_VIEWED, { screen: path }) }, [path])
  return null
}

export default withCrashReporting(RootLayout)
