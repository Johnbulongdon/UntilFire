import AsyncStorage from '@react-native-async-storage/async-storage'
import { nativeBuild, proForSale } from '@/lib/native-build'
import { router, useFocusEffect } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useCallback, useState } from 'react'
import { Alert, Linking, Pressable, Switch, View } from 'react-native'

import { Button } from '@/components/Button'
import { replayTour } from '@/components/GuidedTour'
import { PrimaryButton } from '@/components/PrimaryButton'
import { Row, RowIcon } from '@/components/SettingsRow'
import { Card, Label, Screen } from '@/components/Screen'
import { Text } from '@/components/Text'
import { CURRENCY_NAMES } from '@/engine'
import { currencyFlag } from '@/lib/display-currency'
import { money } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { isLockOn, lockAvailable, setLockOn, unlock } from '@/lib/app-lock'
import { billRemindersOn, setBillReminders } from '@/lib/bill-reminders'
import { setTodayReminder, todayReminderOn } from '@/lib/today-reminder'
import { versionLabel } from '@/lib/update-log'
import { useEditPlan } from '@/lib/useEditPlan'
import { FIRE_QUIZ_KEY } from '@/lib/fire-quiz'
import { getTypeMeta } from '@quiz'
import { rewardEligible } from '@engine/reward-month.ts'
import { supabase } from '@/lib/supabase'
import { useAccount } from '@/state/account'
import { useAuth } from '@/state/auth'
import { usePlan } from '@/state/plan'
import { colors, TAB_COLOR, tabInk } from '@/theme/colors'

const GOAL_LABEL = { 'retire-early': 'Retire early', 'financial-freedom': 'Financial freedom', exploring: 'Just exploring' } as const

/** About you and the account, not the money (docs/design/app-structure.md rule 4). */
export default function Profile() {
  const { plan, clearPlan } = usePlan()
  const { session, signOut } = useAuth()
  const { data } = useAccount()
  const editPlan = useEditPlan()
  const [billsOn, setBillsOn] = useState(false)
  const [todayOn, setTodayOn] = useState(false)
  const [quiz, setQuiz] = useState<{ code: string; name: string } | null>(null)
  const [rewardOpen, setRewardOpen] = useState(false)
  const [lockOn, setLockState] = useState(false)
  const [lockInfo, setLockInfo] = useState<{ ok: boolean; label: string }>({ ok: false, label: 'Face ID' })

  useFocusEffect(useCallback(() => {
    billRemindersOn().then(setBillsOn)
    todayReminderOn().then(setTodayOn)
    AsyncStorage.getItem(FIRE_QUIZ_KEY).then(r => setQuiz(r ? JSON.parse(r) : null)).catch(() => {})
    isLockOn().then(setLockState)
    lockAvailable().then(setLockInfo).catch(() => {})
  }, []))
  // The quiz's free month (D-79) is offered only to accounts the site would still give it to.
  const userId = session?.user.id
  useFocusEffect(useCallback(() => {
    if (!userId) { setRewardOpen(false); return }
    Promise.all([
      supabase.from('subscriptions').select('status, source, stripe_subscription_id, apple_original_transaction_id').eq('user_id', userId).maybeSingle(),
      supabase.from('profiles').select('reward_month_at').eq('user_id', userId).maybeSingle(),
    ]).then(([sub, prof]) => setRewardOpen(!sub.error && !prof.error && rewardEligible(sub.data, prof.data?.reward_month_at ?? null)))
      .catch(() => setRewardOpen(false))
  }, [userId]))
  if (!plan) return null


  // Turning the lock on or off asks for Face ID first, so someone holding an unlocked phone can't switch it off.
  const toggleLock = async (on: boolean) => {
    haptic.select()
    if (!(await unlock().catch(() => false))) return
    await setLockOn(on); setLockState(on)
  }

  const open = (url: string) => { WebBrowser.openBrowserAsync(url, { controlsColor: colors.green }).catch(() => {}) }

  return (
    <Screen tab="profile" flat hideTitle title="Profile">
      {/* The type comes only from the finished quiz; until then, ask for it (and name the free month when it's still on offer). */}
      <Pressable accessibilityRole="button" accessibilityLabel={quiz ? `Your FIRE type: ${quiz.name}. Retake the quiz` : `Find your FIRE type. Take the 8-question quiz${rewardOpen ? ' and get 1 month of Pro free' : ''}`}
        onPress={() => { haptic.tick(); router.push('/fire-quiz') }} className="flex-row items-center gap-4 active:opacity-70">
        <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: TAB_COLOR.profile, alignItems: 'center', justifyContent: 'center' }}>
          <Text className="text-[36px]">{quiz ? getTypeMeta(quiz.code).emoji : '🧬'}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-[12px] font-bold uppercase tracking-[1.5px] text-ink-3">Your FIRE type</Text>
          <Text style={{ color: tabInk('profile') }} className="font-display text-[30px] font-bold leading-9 tracking-tight">{quiz ? quiz.name : 'Find yours'}</Text>
          <Text className="text-[13px] text-ink-2">{quiz ? 'Retake the quiz' : 'Take the 8-question quiz'}</Text>
          {!quiz && rewardOpen && (
            <View className="mt-2 self-start rounded-[10px] bg-surface-2 px-2.5 py-1">
              <Text className="text-[13px] font-semibold text-ink">🎁 Finish it, get 1 month of Pro free</Text>
            </View>
          )}
        </View>
        <Text className="text-[18px] text-ink-3">›</Text>
      </Pressable>

      {session ? (
        <Card>
          <Label>Account</Label>
          <Row icon="envelope.fill" fallback="@" label="Email" value={session.user.email ?? ''} first />
          {(proForSale || data?.pro) && <Row icon="star.fill" fallback="★" label="UntilFire Pro" value={data?.pro ? 'On' : 'See plans'} onPress={() => router.push({ pathname: '/pro', params: { from: 'profile' } })} />}
          <Row icon="person.fill" fallback="☺" label="Name" value={data?.displayName || 'Add'} onPress={() => router.push('/name')} />
          <Row icon="house.fill" fallback="⌂" label="Household" value="" onPress={() => router.push('/household')} />
          {/* Its reward is a longer web trial, which App Review reads as paying outside Apple (3.1.1); hidden in the App Store build. */}
          {!nativeBuild && <Row icon="gift.fill" fallback="🎁" label="Give a month, get a month" value="" onPress={() => router.push('/give-a-month')} />}
          <Row icon="dollarsign.circle.fill" fallback="$" label="Currency" value={data ? `${currencyFlag(data.currency)}  ${CURRENCY_NAMES[data.currency] ?? data.currency}` : '…'} onPress={() => router.push('/currency')} />
        </Card>
      ) : (
        <Card soft>
          <Text className="text-[16px] font-semibold text-ink">Sign in to your UntilFire account</Text>
          <Text className="mt-1 text-[14px] leading-5 text-ink-2">
            Use the same account as untilfire.com to bring in your transactions, budget and net worth.
          </Text>
          <View className="mt-4"><PrimaryButton label="Sign in" onPress={() => router.push('/sign-in')} /></View>
        </Card>
      )}

      {!session && (
        <Card>
          <View className="flex-row justify-between">
            <Label>Your answers</Label>
            <Button small kind="quiet" label="Update" onPress={() => editPlan()} />
          </View>
          <Row label="Goal" value={plan.goal ? GOAL_LABEL[plan.goal] : 'Not set'} first />
          <Row label="City" value={plan.city?.name ?? 'Not set'} />
          <Row label="Take-home" value={`${money(plan.monthlyIncome)}/mo`} />
          <Row label="Spending" value={`${money(plan.monthlySpending)}/mo`} />
          <Row label="Invested" value={money(plan.invested)} />
          <Row label="Age" value={plan.age != null ? String(plan.age) : 'Not set'} />
        </Card>
      )}

      <Card>
        <Label>Settings</Label>
        {session && (
          <View className="flex-row items-center justify-between gap-3 py-3">
            <RowIcon name="bell.fill" fallback="!" />
            <View className="flex-1 pr-3">
              <Text className="text-[15px] text-ink">Today reminder</Text>
              <Text className="text-[12px] text-ink-3">9pm on days you haven't finished</Text>
            </View>
            <Switch accessibilityLabel="Today reminder" value={todayOn} trackColor={{ true: colors.green, false: colors.border2 }}
              onValueChange={async on => {
                haptic.select()
                const ok = await setTodayReminder(on, data?.profile.today.done ?? [])
                if (on && !ok) Alert.alert('Notifications are off', 'Turn on notifications for this app in Settings to get the reminder.')
                setTodayOn(ok)
              }} />
          </View>
        )}
        {session && (
          <View className="flex-row items-center justify-between gap-3 border-t border-border py-3">
            <RowIcon name="calendar" fallback="▦" />
            <View className="flex-1 pr-3">
              <Text className="text-[15px] text-ink">Bill and payday reminders</Text>
              <Text className="text-[12px] text-ink-3">The evening before a bill, the morning of payday</Text>
            </View>
            <Switch accessibilityLabel="Bill and payday reminders" value={billsOn} trackColor={{ true: colors.green, false: colors.border2 }}
              onValueChange={async on => {
                haptic.select()
                const ok = await setBillReminders(on, data?.bills ?? [])
                if (on && !ok) Alert.alert('Notifications are off', 'Turn on notifications for this app in Settings to get bill reminders.')
                setBillsOn(ok)
              }} />
          </View>
        )}
        {lockInfo.ok && (
          <View className="flex-row items-center justify-between gap-3 border-t border-border py-3">
            <RowIcon name="faceid" fallback="◉" />
            <View className="flex-1 pr-3">
              <Text className="text-[15px] text-ink">Lock with {lockInfo.label}</Text>
              <Text className="text-[12px] text-ink-3">Asks each time you open the app</Text>
            </View>
            <Switch accessibilityLabel={`Lock with ${lockInfo.label}`} value={lockOn} onValueChange={toggleLock} trackColor={{ true: colors.green, false: colors.border2 }} />
          </View>
        )}
        <Row icon="map.fill" fallback="◎" label="Show the tour" value="" onPress={async () => { await replayTour(); router.navigate('/') }} />
        {/* A design comparison, not for App Review or customers. */}
        {__DEV__ && <Row label="Character preview" value="" onPress={() => router.push('/character-lab')} />}
      </Card>

      <Card>
        <Label>Help</Label>
        <Row icon="bubble.left.fill" fallback="✎" label="Send feedback" value="" onPress={() => router.push('/feedback')} first />
        <Row icon="questionmark.circle.fill" fallback="?" label="Email support" value="hello@untilfire.com" onPress={() => Linking.openURL('mailto:hello@untilfire.com')} />
        <Row icon="lock.fill" fallback="🔒" label="Privacy policy" value="" onPress={() => open('https://www.untilfire.com/privacy')} />
        <Row icon="doc.text.fill" fallback="≡" label="Terms of use" value="" onPress={() => open('https://www.untilfire.com/terms')} />
      </Card>

      {session && (
        <Card>
          <Row icon="externaldrive.fill" fallback="▤" label="Data and account" value="" onPress={() => router.push('/data-account')} first />
          <Text className="mt-1 text-[12px] text-ink-3">Export your data, replay onboarding or delete your account.</Text>
        </Card>
      )}

      {session ? (
        <Button kind="quiet" label="Sign out" onPress={() => {
          haptic.warn()
          Alert.alert('Sign out?', 'Your onboarding answers stay on this phone.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign out', style: 'destructive', onPress: () => { signOut() } },
          ])
        }} />
      ) : (
        <Button kind="danger" label="Start over" onPress={() => {
          haptic.warn()
          Alert.alert('Start over?', 'This clears your answers from this phone.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Start over', style: 'destructive', onPress: async () => { await clearPlan(); router.replace('/onboarding') } },
          ])
        }} />
      )}

      <Pressable accessibilityRole="button" accessibilityLabel={`Version ${versionLabel()}, see what's new`} hitSlop={8} onPress={() => { haptic.tick(); router.push('/update-log') }} className="items-center py-2">
        <Text className="font-mono text-[12px] text-ink-3">Version {versionLabel()} · What's new</Text>
      </Pressable>
    </Screen>
  )
}
