import { View } from 'react-native'

import { useAccount } from '@/state/account'
import { useAuth } from '@/state/auth'

import { Text } from './Text'

function ago(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins} minutes ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

/**
 * One line above an account page when its numbers aren't live: no connection,
 * or the last load failed. Shown by Screen and DetailScreen on pages that pull
 * to refresh, so every account page says the same thing the same way.
 */
export function AccountNotice() {
  const { session } = useAuth()
  const { error, offline, savedAt, data } = useAccount()
  // Before anything has loaded, LoadingState says it in the page itself.
  if (!session || !data || (!offline && !error)) return null
  const text = offline
    ? savedAt ? `You're offline. These are your numbers from ${ago(savedAt)}.` : "You're offline. These are the numbers saved on this phone."
    : error!
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" className="mb-4 flex-row items-center gap-2.5 rounded-2xl bg-surface px-4 py-3">
      <View className={`h-2 w-2 rounded-full ${offline ? 'bg-warn' : 'bg-neg'}`} />
      <Text className="flex-1 text-[14px] leading-5 text-ink-2">{text}</Text>
    </View>
  )
}
