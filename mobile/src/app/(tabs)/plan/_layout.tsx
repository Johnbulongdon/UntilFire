import { Stack } from 'expo-router'

import { colors } from '@/theme/colors'

/** The tab's hub and the pages its cards open, with native push and swipe back. */
export default function HubLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ground } }} />
}
