import { router, useFocusEffect } from 'expo-router'
import { Button } from '@/components/Button'
import { useCallback, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, TextInput, View } from 'react-native'

import { SheetFrame } from '@/components/SheetFrame'
import { Text } from '@/components/Text'
import { Events, track } from '@/lib/analytics'
import { haptic } from '@/lib/haptics'
import { supabase } from '@/lib/supabase'
import { useAccount } from '@/state/account'
import { useAuth } from '@/state/auth'
import { usePlan } from '@/state/plan'
import { colors } from '@/theme/colors'

const SITE = 'https://untilfire.com'

interface Bank { id: string; institution_name: string | null }
interface Checklist { subscription: boolean; banks: Bank[] }

/**
 * Delete the account from inside the app (App Store guideline 5.1.1(v)),
 * through the website's own endpoint. Before the button unlocks, the person
 * cancels a renewing Pro subscription and disconnects every bank themselves
 * (lib/account-deletion.ts); the server refuses otherwise. Then they type
 * their email, and the account, transactions and plan go for good.
 */
export default function DeleteAccount() {
  const { session, signOut } = useAuth()
  const { clearPlan } = usePlan()
  const { refresh } = useAccount()
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [checklist, setChecklist] = useState<Checklist | null>(null)
  const [checkFailed, setCheckFailed] = useState(false)
  const [working, setWorking] = useState<string | null>(null)
  const email = session?.user.email ?? ''
  const matches = !!email && confirm.trim().toLowerCase() === email.toLowerCase()
  const auth = session ? { authorization: `Bearer ${session.access_token}` } : undefined

  const check = useCallback(async () => {
    if (!session) return
    setCheckFailed(false)
    try {
      const headers = { authorization: `Bearer ${session.access_token}` }
      const [itemsRes, statusRes] = await Promise.all([
        fetch(`${SITE}/api/plaid/items`, { headers }),
        fetch(`${SITE}/api/user/delete`, { headers }),
      ])
      if (!itemsRes.ok) throw new Error('items')
      const banks = ((await itemsRes.json()).items ?? []) as Bank[]
      let subscription: boolean
      if (statusRes.ok) {
        // The server asks Stripe, so a subscription already set to end doesn't block.
        subscription = !!(await statusRes.json()).blockers?.subscription
      } else {
        // Before the website has the check: any Pro subscription row counts.
        const { data } = await supabase.from('subscriptions').select('plan, stripe_subscription_id').eq('user_id', session.user.id).maybeSingle()
        subscription = !!data?.stripe_subscription_id && data.plan === 'pro'
      }
      setChecklist({ subscription, banks })
    } catch {
      setCheckFailed(true)
    }
  }, [session])

  // Checked again whenever this screen comes back into view.
  useFocusEffect(useCallback(() => { check() }, [check]))

  const disconnect = (bank: Bank) => {
    const name = bank.institution_name ?? 'this bank'
    haptic.warn()
    Alert.alert(`Disconnect ${name}?`, 'UntilFire stops reading this bank. Transactions already imported stay until the account is deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect', style: 'destructive', onPress: async () => {
          if (!auth) return
          setWorking(bank.id)
          const res = await fetch(`${SITE}/api/plaid/disconnect`, {
            method: 'DELETE', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify({ item_id: bank.id }),
          }).catch(() => null)
          setWorking(null)
          if (!res?.ok) {
            const body = res ? await res.json().catch(() => ({})) : {}
            haptic.warn()
            Alert.alert('Not disconnected', (body as { error?: string }).error ?? 'Check your connection and try again.')
            return
          }
          haptic.success()
          setChecklist(c => (c ? { ...c, banks: c.banks.filter(b => b.id !== bank.id) } : c))
          refresh()
        },
      },
    ])
  }

  const ready = !!checklist && !checklist.subscription && checklist.banks.length === 0

  const remove = async () => {
    if (!session || !matches || !ready) return
    haptic.warn()
    setBusy(true); setError('')
    const res = await fetch(`${SITE}/api/user/delete`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${session.access_token}` },
    }).catch(() => null)
    if (!res || !res.ok) {
      const body = res ? await res.json().catch(() => ({})) : {}
      setBusy(false)
      setError((body as { error?: string }).error || 'Couldn\'t delete the account. Check your connection and try again.')
      if (res?.status === 409) check()
      return
    }
    track(Events.ACCOUNT_DELETED)
    await signOut()
    await clearPlan()
    router.dismissAll()
    router.replace('/onboarding')
  }

  return (
    <SheetFrame title="Delete account" saveLabel="Delete my account" onSave={remove} canSave={matches && ready} busy={busy} error={error}>
      <Text className="text-[16px] leading-6 text-ink">
        This removes your UntilFire account, your transactions, budget, goals and plan, on the app and on untilfire.com. It can't be undone.
      </Text>

      <Text className="mb-2 mt-6 text-[13px] text-ink-3">First</Text>
      <View className="rounded-card border border-border bg-card px-4">
        {!checklist ? (
          checkFailed ? (
            <Pressable accessibilityRole="button" onPress={() => { haptic.tick(); check() }} className="py-4">
              <Text className="text-[15px] text-ink">Couldn't check your account. <Text className="font-bold text-pos-ink">Try again</Text></Text>
            </Pressable>
          ) : (
            <View className="flex-row items-center gap-3 py-4"><ActivityIndicator color={colors.green} /><Text className="text-[15px] text-ink-2">Checking your subscription and banks…</Text></View>
          )
        ) : (
          <>
            <Step done={!checklist.subscription} first
              label={checklist.subscription ? 'Cancel Pro in Profile on untilfire.com, on a computer or in your phone\'s browser' : 'No subscription will charge you again'}
              action={checklist.subscription ? { label: 'Check again', onPress: () => { haptic.tick(); setChecklist(null); check() }, busy: false } : undefined} />
            {checklist.banks.length === 0
              ? <Step done label="No banks connected" />
              : checklist.banks.map(b => (
                <Step key={b.id} done={false} label={`Disconnect ${b.institution_name ?? 'bank'}`}
                  action={{ label: 'Disconnect', onPress: () => disconnect(b), busy: working === b.id }} />
              ))}
          </>
        )}
      </View>

      <Text className={`mb-2 mt-6 text-[13px] ${ready ? 'text-ink-3' : 'text-border-2'}`}>Then type {email} to confirm</Text>
      <View>
        <TextInput
          accessibilityLabel="Type your email to confirm"
          editable={ready}
          className="rounded-control border-2 border-border-2 bg-card px-4 py-3.5 text-[16px] text-ink"
          style={{ fontFamily: 'Manrope_500Medium', opacity: ready ? 1 : 0.5 }}
          placeholder={email}
          placeholderTextColor={colors.border2}
          autoCapitalize="none"
          keyboardType="email-address"
          value={confirm}
          onChangeText={setConfirm}
        />
      </View>
    </SheetFrame>
  )
}

function Step({ done, label, action, first }: { done: boolean; label: string; first?: boolean; action?: { label: string; onPress: () => void; busy: boolean } }) {
  return (
    <View className={`flex-row items-center gap-3 py-3.5 ${first ? '' : 'border-t border-border'}`}>
      <Text accessibilityLabel={done ? 'Done' : 'To do'} className={`text-[16px] ${done ? 'text-pos-ink' : 'text-ink-3'}`}>{done ? '✓' : '○'}</Text>
      <Text className={`flex-1 text-[15px] ${done ? 'text-ink-2' : 'text-ink'}`}>{label}</Text>
      {action && (action.busy
        ? <ActivityIndicator color={colors.green} />
        : <Button small kind="quiet" label={action.label} onPress={action.onPress} />)}
    </View>
  )
}
