import { Redirect } from 'expo-router'
import { useAppearance } from '@/state/appearance'
import { NativeTabs } from 'expo-router/unstable-native-tabs'

import { useAuth } from '@/state/auth'
import { usePlan } from '@/state/plan'
import { colors } from '@/theme/colors'

/** The system tab bar, with the website's mobile nav: Home, Money, Plan, Profile. */
export default function TabsLayout() {
  // Wait for the saved plan before deciding, so a cold start never flashes onboarding.
  const { plan, ready } = usePlan()
  const auth = useAuth()
  useAppearance() // re-renders the tab bar in the new theme's colours
  if (!ready || !auth.ready) return null
  // Signed out (or never signed in): the welcome screen, with sign up and log in (Oct 16 2026).
  if (!plan || !auth.session) return <Redirect href="/onboarding" />

  return (
    <NativeTabs tintColor={colors.green}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="money">
        <NativeTabs.Trigger.Icon sf={{ default: 'creditcard', selected: 'creditcard.fill' }} md="payments" />
        <NativeTabs.Trigger.Label>Money</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="plan">
        <NativeTabs.Trigger.Icon sf={{ default: 'sunrise', selected: 'sunrise.fill' }} md="flag" />
        <NativeTabs.Trigger.Label>Plan</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} md="person" />
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  )
}
