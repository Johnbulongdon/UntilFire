import AsyncStorage from '@react-native-async-storage/async-storage'
import { nativeBuild } from '@/lib/native-build'
import { router, useFocusEffect } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useCallback, useState } from 'react'
import { ActivityIndicator, Alert, Linking, Pressable, Switch, View } from 'react-native'

import { Button } from '@/components/Button'
import { replayTour } from '@/components/GuidedTour'
import { PersonalityAvatar } from '@/components/PersonalityAvatar'
import { PrimaryButton } from '@/components/PrimaryButton'
import { Card, Label, Screen } from '@/components/Screen'
import { Text } from '@/components/Text'
import { CURRENCY_NAMES } from '@/engine'
import { currencyFlag } from '@/lib/display-currency'
import { exportEverything, exportTransactions } from '@/lib/export-data'
import { money } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { isLockOn, lockAvailable, setLockOn, unlock } from '@/lib/app-lock'
import { billRemindersOn, setBillReminders } from '@/lib/bill-reminders'
import { setTodayReminder, todayReminderOn } from '@/lib/today-reminder'
import { useEditPlan } from '@/lib/useEditPlan'
import { FIRE_QUIZ_KEY } from '@/lib/fire-quiz'
import { getTypeMeta } from '@quiz'
import { useAccount } from '@/state/account'
import { useAuth } from '@/state/auth'
import { personalityFor, usePlan } from '@/state/plan'
import { colors, TAB_COLOR, tabInk } from '@/theme/colors'
import { Events, track } from '@/lib/analytics'

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
  const [lockOn, setLockState] = useState(false)
  const [lockInfo, setLockInfo] = useState<{ ok: boolean; label: string }>({ ok: false, label: 'Face ID' })
  const [exporting, setExporting] = useState<'csv' | 'json' | null>(null)

  useFocusEffect(useCallback(() => {
    billRemindersOn().then(setBillsOn)
    todayReminderOn().then(setTodayOn)
    AsyncStorage.getItem(FIRE_QUIZ_KEY).then(r => setQuiz(r ? JSON.parse(r) : null)).catch(() => {})
    isLockOn().then(setLockState)
    lockAvailable().then(setLockInfo).catch(() => {})
  }, []))
  if (!plan) return null
  const type = personalityFor(plan)


  // Turning the lock on or off asks for Face ID first, so someone holding an unlocked phone can't switch it off.
  const toggleLock = async (on: boolean) => {
    haptic.select()
    if (!(await unlock().catch(() => false))) return
    await setLockOn(on); setLockState(on)
  }

  const doExport = async (kind: 'csv' | 'json') => {
    if (!session) return
    haptic.tick(); setExporting(kind)
    try {
      await (kind === 'csv' ? exportTransactions(session.user.id) : exportEverything(session.user.id))
      track(Events.DATA_EXPORTED, { format: kind })
    }
    catch { Alert.alert('The export didn\'t finish', 'Check your connection and try again.') }
    setExporting(null)
  }

  const open = (url: string) => { WebBrowser.openBrowserAsync(url, { controlsColor: colors.green }).catch(() => {}) }

  return (
    <Screen tab="profile" title="Profile">
      {/* One type only (V2): the quiz result once taken, else the type from your answers. */}
      <Pressable accessibilityRole="button" accessibilityLabel={`Your FIRE type: ${quiz ? quiz.name : type.name}. ${quiz ? 'Retake the quiz' : 'Take the quiz'}`} onPress={() => { haptic.tick(); router.push('/fire-quiz') }}
        className="flex-row items-center gap-4 active:opacity-70">
        {quiz ? (
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: TAB_COLOR.profile, alignItems: 'center', justifyContent: 'center' }}>
            <Text className="text-[28px]">{getTypeMeta(quiz.code).emoji}</Text>
          </View>
        ) : <PersonalityAvatar profile={type} size={56} />}
        <View className="flex-1">
          <Text className="text-[12px] font-bold uppercase tracking-[1.5px] text-ink-3">Your FIRE type</Text>
          <Text style={{ color: tabInk('profile') }} className="font-display text-[22px] font-bold">{quiz ? quiz.name : type.name}</Text>
          <Text className="text-[13px] text-ink-2">{quiz ? 'Retake the quiz' : 'Take the 8-question quiz'}</Text>
        </View>
        <Text className="text-[18px] text-ink-3">›</Text>
      </Pressable>

      {session ? (
        <Card>
          <Label>Account</Label>
          <Row label="Email" value={session.user.email ?? ''} first />
          <Row label="UntilFire Pro" value={data?.pro ? 'On' : 'See plans'} onPress={() => router.push('/pro')} />
          <Row label="Name" value={data?.displayName || 'Add'} onPress={() => router.push('/name')} />
          <Row label="Household" value="" onPress={() => router.push('/household')} />
          {/* Its reward is a longer web trial, which App Review reads as paying outside Apple (3.1.1); hidden in the App Store build. */}
          {!nativeBuild && <Row label="Give a month, get a month" value="" onPress={() => router.push('/give-a-month')} />}
          <Row label="Currency" value={data ? `${currencyFlag(data.currency)}  ${CURRENCY_NAMES[data.currency] ?? data.currency}` : '…'} onPress={() => router.push('/currency')} />
          <Row label="Sign out" value="" onPress={() => {
            haptic.warn()
            Alert.alert('Sign out?', 'Your onboarding answers stay on this phone.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign out', style: 'destructive', onPress: () => { signOut() } },
            ])
          }} />
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
          <View className="flex-row items-center justify-between py-3">
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
          <View className="flex-row items-center justify-between border-t border-border py-3">
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
          <View className="flex-row items-center justify-between border-t border-border py-3">
            <View className="flex-1 pr-3">
              <Text className="text-[15px] text-ink">Lock with {lockInfo.label}</Text>
              <Text className="text-[12px] text-ink-3">Asks each time you open the app</Text>
            </View>
            <Switch accessibilityLabel={`Lock with ${lockInfo.label}`} value={lockOn} onValueChange={toggleLock} trackColor={{ true: colors.green, false: colors.border2 }} />
          </View>
        )}
        <Row label="Replay onboarding" value="" onPress={() => editPlan(true)} />
        <Row label="Show the tour" value="" onPress={async () => { await replayTour(); router.navigate('/') }} />
        {/* A design comparison, not for App Review or customers. */}
        {__DEV__ && <Row label="Character preview" value="" onPress={() => router.push('/character-lab')} />}
      </Card>

      {session && (
        <Card>
          <Label>Your data</Label>
          <Row label="Export transactions" value={exporting === 'csv' ? '' : 'CSV'} onPress={() => doExport('csv')} first busy={exporting === 'csv'} />
          <Row label="Export everything" value={exporting === 'json' ? '' : 'JSON'} onPress={() => doExport('json')} busy={exporting === 'json'} />
          <Text className="mt-1 text-[12px] text-ink-3">Free, any time, whether or not you're on Pro.</Text>
        </Card>
      )}

      <Card>
        <Label>Help</Label>
        <Row label="Send feedback" value="" onPress={() => router.push('/feedback')} first />
        <Row label="Email support" value="hello@untilfire.com" onPress={() => Linking.openURL('mailto:hello@untilfire.com')} />
        <Row label="Privacy policy" value="" onPress={() => open('https://www.untilfire.com/privacy')} />
        <Row label="Terms of use" value="" onPress={() => open('https://www.untilfire.com/terms')} />
      </Card>

      {session ? (
        <Button kind="danger" label="Delete account" onPress={() => { haptic.warn(); router.push('/delete-account') }} />
      ) : (
        <Button kind="danger" label="Start over" onPress={() => {
          haptic.warn()
          Alert.alert('Start over?', 'This clears your answers from this phone.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Start over', style: 'destructive', onPress: async () => { await clearPlan(); router.replace('/onboarding') } },
          ])
        }} />
      )}
    </Screen>
  )
}

function Row({ label, value, onPress, first, busy }: { label: string; value: string; onPress?: () => void; first?: boolean; busy?: boolean }) {
  const body = (
    <View className={`flex-row items-center justify-between gap-3 py-3 ${first ? '' : 'border-t border-border'}`}>
      <Text className="text-[15px] text-ink">{label}</Text>
      <View className="flex-1 flex-row items-center justify-end gap-1.5">
        {busy ? <ActivityIndicator color={colors.green} /> : <Text numberOfLines={1} className="text-[14px] text-ink-2">{value}</Text>}
        {onPress ? <Text className="text-[16px] text-ink-3">›</Text> : null}
      </View>
    </View>
  )
  return onPress ? <Pressable accessibilityRole="button" onPress={() => { haptic.tick(); onPress() }}>{body}</Pressable> : body
}
