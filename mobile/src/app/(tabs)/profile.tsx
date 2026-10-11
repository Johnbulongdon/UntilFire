import { router, useFocusEffect } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useCallback, useState } from 'react'
import { ActivityIndicator, Alert, Linking, Pressable, Switch, View } from 'react-native'

import { Bouncy } from '@/components/Bouncy'
import { PersonalityAvatar } from '@/components/PersonalityAvatar'
import { PrimaryButton } from '@/components/PrimaryButton'
import { Card, Label, Screen } from '@/components/Screen'
import { Text } from '@/components/Text'
import { CURRENCY_NAMES } from '@/engine'
import { exportEverything, exportTransactions } from '@/lib/export-data'
import { money } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { isLockOn, lockAvailable, setLockOn, unlock } from '@/lib/app-lock'
import { cancelMonthlyCheckIn, isCheckInScheduled, scheduleMonthlyCheckIn } from '@/lib/reminders'
import { useEditPlan } from '@/lib/useEditPlan'
import { useAccount } from '@/state/account'
import { useAuth } from '@/state/auth'
import { personalityFor, usePlan } from '@/state/plan'
import { colors } from '@/theme/colors'
import { Events, track } from '@/lib/analytics'

const GOAL_LABEL = { 'retire-early': 'Retire early', 'financial-freedom': 'Financial freedom', exploring: 'Just exploring' } as const

/** About you and the account, not the money (docs/design/app-structure.md rule 4). */
export default function Profile() {
  const { plan, clearPlan } = usePlan()
  const { session, signOut } = useAuth()
  const { data } = useAccount()
  const editPlan = useEditPlan()
  const [reminder, setReminder] = useState(false)
  const [lockOn, setLockState] = useState(false)
  const [lockInfo, setLockInfo] = useState<{ ok: boolean; label: string }>({ ok: false, label: 'Face ID' })
  const [exporting, setExporting] = useState<'csv' | 'json' | null>(null)

  useFocusEffect(useCallback(() => {
    isCheckInScheduled().then(setReminder)
    isLockOn().then(setLockState)
    lockAvailable().then(setLockInfo).catch(() => {})
  }, []))
  if (!plan) return null
  const type = personalityFor(plan)

  const toggleReminder = async (on: boolean) => {
    haptic.select()
    track(Events.REMINDER_TOGGLED, { on })
    if (on) {
      const ok = await scheduleMonthlyCheckIn()
      if (!ok) Alert.alert('Notifications are off', 'Turn on notifications for this app in Settings to get the monthly check-in.')
      setReminder(ok)
    } else { await cancelMonthlyCheckIn(); setReminder(false) }
  }

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
    <Screen title="Profile">
      <Card>
        <View className="items-center">
          <PersonalityAvatar profile={type} size={96} />
          <Text className="mt-3 text-[12px] font-bold uppercase tracking-[2px] text-ink-3">Your FIRE type</Text>
          <Text className="mt-1 font-display text-[26px] font-bold text-ink">{type.name}</Text>
          <Text className="mt-0.5 text-[14px] text-ink-2">{type.headline}</Text>
          <Text className="mt-3 text-center text-[15px] leading-6 text-ink">{type.blurb}</Text>
        </View>
      </Card>

      {session ? (
        <Card>
          <Label>Account</Label>
          <Row label="Email" value={session.user.email ?? ''} first />
          <Row label="Name" value={data?.displayName || 'Add'} onPress={() => router.push('/name')} />
          <Row label="Household" value="" onPress={() => router.push('/household')} />
          <Row label="Currency" value={data ? `${CURRENCY_NAMES[data.currency] ?? data.currency}` : '…'} onPress={() => router.push('/currency')} />
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
            <Bouncy onPress={() => { haptic.tick(); editPlan() }} hitSlop={8}><Text className="text-[13px] font-bold text-pos-ink">Update</Text></Bouncy>
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
        <View className="flex-row items-center justify-between py-3">
          <View className="flex-1 pr-3">
            <Text className="text-[15px] text-ink">Monthly check-in reminder</Text>
            <Text className="text-[12px] text-ink-3">On the 1st at 9am</Text>
          </View>
          <Switch accessibilityLabel="Monthly check-in reminder" value={reminder} onValueChange={toggleReminder} trackColor={{ true: colors.green, false: colors.border2 }} />
        </View>
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
        <Row label="Privacy policy" value="" onPress={() => open('https://untilfire.com/privacy')} />
        <Row label="Terms of use" value="" onPress={() => open('https://untilfire.com/terms')} />
      </Card>

      {session ? (
        <Pressable accessibilityRole="button" onPress={() => { haptic.warn(); router.push('/delete-account') }} className="items-center py-2">
          <Text className="text-[15px] font-semibold text-neg-ink">Delete account</Text>
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            haptic.warn()
            Alert.alert('Start over?', 'This clears your answers from this phone.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Start over', style: 'destructive', onPress: async () => { await clearPlan(); router.replace('/onboarding') } },
            ])
          }}
          className="items-center py-2"
        >
          <Text className="text-[15px] font-semibold text-neg-ink">Start over</Text>
        </Pressable>
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
