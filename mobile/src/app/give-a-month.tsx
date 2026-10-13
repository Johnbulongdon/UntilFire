import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, Share, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { PrimaryButton } from '@/components/PrimaryButton'
import { Text } from '@/components/Text'
import { haptic } from '@/lib/haptics'
import { useAuth } from '@/state/auth'
import { colors } from '@/theme/colors'

/**
 * Give a month, get a month (D-27, the website's GiveAMonthCard): your own
 * link from /api/referrals/friend. Friends who sign up through it get a longer
 * trial; you get a month when one subscribes.
 */
export default function GiveAMonth() {
  const { session } = useAuth()
  const [link, setLink] = useState<{ url: string; monthsEarned: number } | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!session) return
    fetch('https://untilfire.com/api/referrals/friend', { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(d => setLink({ url: `https://www.untilfire.com/r/${d.code}`, monthsEarned: d.monthsEarned ?? 0 }))
      .catch(() => setFailed(true))
  }, [session])

  const share = async () => {
    if (!link) return
    haptic.tick()
    await Share.share({ message: `I'm using UntilFire to see when work becomes optional. Try it with my link and get a longer free trial: ${link.url}` }).catch(() => {})
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ground }}>
      <View className="flex-row items-center justify-between px-5 pt-4">
        <Pressable accessibilityRole="button" hitSlop={12} onPress={() => { haptic.tick(); router.back() }}><Text className="text-[16px] font-semibold text-ink-2">Done</Text></Pressable>
        <Text className="text-[16px] font-bold text-ink">Give a month</Text>
        <View style={{ width: 52 }} />
      </View>
      <View className="flex-1 px-6 pt-10">
        <Text className="text-[48px]">🎁</Text>
        <Text className="mt-3 font-display text-[28px] font-bold leading-9 text-ink">Give a month, get a month</Text>
        <Text className="mt-2 text-[16px] leading-6 text-ink-2">Friends who join through your link get a longer free trial. When one of them subscribes, you get a month free.</Text>
        <View className="mt-6 rounded-card border border-border bg-card p-4">
          {link ? (
            <>
              <Text selectable className="font-mono text-[15px] text-ink">{link.url.replace('https://', '')}</Text>
              {link.monthsEarned > 0 && <Text className="mt-2 text-[13px] font-semibold text-pos-ink">{link.monthsEarned === 1 ? '1 free month earned' : `${link.monthsEarned} free months earned`}</Text>}
            </>
          ) : failed ? (
            <Text className="text-[14px] text-neg-ink">Couldn't get your link. Check your connection and try again.</Text>
          ) : <ActivityIndicator color={colors.green} />}
        </View>
        <View className="mt-6"><PrimaryButton label="Share my link" onPress={share} disabled={!link} /></View>
      </View>
    </SafeAreaView>
  )
}
