import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { PrimaryButton } from '@/components/PrimaryButton'
import { Text } from '@/components/Text'
import { isPlausibleEmail } from '@/engine'
import { haptic } from '@/lib/haptics'
import { useAccount } from '@/state/account'
import { useAuth } from '@/state/auth'
import { colors } from '@/theme/colors'

const SITE = 'https://www.untilfire.com'

interface Member { userId: string; email: string | null; displayName: string | null; role: 'owner' | 'member'; isYou: boolean }
interface HouseholdView {
  householdId: string | null
  members: Member[]
  pendingInvite: { email: string; expiresAt: string } | null
  incomingInvite: { token: string; fromName: string | null; fromEmail: string | null } | null
}

const labelFor = (m: Member) => m.displayName?.trim() || m.email || 'Your partner'

/**
 * Household, in Profile (the website's HouseholdSection): invite a partner,
 * accept an invitation, or disconnect, through the website's household API.
 * Each keeps their own account; neither can change the other's numbers.
 */
export default function Household() {
  const { session } = useAuth()
  const { refresh: refreshAccount } = useAccount()
  const [view, setView] = useState<HouseholdView | null>(null)
  const [failed, setFailed] = useState(false)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  const call = useCallback(async (path: string, body?: unknown) => {
    if (!session) throw new Error('Sign in again to continue.')
    const res = await fetch(`${SITE}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok) throw new Error((json.error as string) ?? 'Something went wrong.')
    return json
  }, [session])

  const load = useCallback(async () => {
    setFailed(false)
    try { setView((await call('/api/household/status')) as unknown as HouseholdView) }
    catch { setFailed(true) }
  }, [call])
  useFocusEffect(useCallback(() => { load() }, [load]))

  const run = async (kind: string, fn: () => Promise<unknown>, after?: () => void) => {
    setBusy(kind); setError('')
    try { await fn(); haptic.success(); after?.(); await load(); refreshAccount() }
    catch (e) { haptic.warn(); setError(e instanceof Error ? e.message : 'Something went wrong.') }
    setBusy(null)
  }

  const partner = view?.members.find(m => !m.isYou)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ground }}>
      <View className="flex-row items-center justify-between px-5 pt-4">
        <Pressable accessibilityRole="button" hitSlop={12} onPress={() => { haptic.tick(); router.back() }}><Text className="text-[16px] font-semibold text-ink-2">Done</Text></Pressable>
        <Text className="text-[16px] font-bold text-ink">Household</Text>
        <View style={{ width: 52 }} />
      </View>
      <ScrollView contentContainerClassName="gap-4 px-5 pb-10 pt-5" keyboardShouldPersistTaps="handled">
        {error ? <Text className="text-[14px] text-neg-ink">{error}</Text> : null}

        {!view ? (
          failed ? (
            <Pressable accessibilityRole="button" onPress={() => { haptic.tick(); load() }} className="rounded-card bg-surface p-5">
              <Text className="text-[15px] text-ink">Couldn't load your household. <Text className="font-bold text-pos-ink">Try again</Text></Text>
            </Pressable>
          ) : <View className="items-center py-10"><ActivityIndicator color={colors.green} /></View>
        ) : partner ? (
          <View className="rounded-card border border-border bg-card p-5">
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-1">
                <Text private className="text-[16px] font-bold text-ink">{labelFor(partner)}</Text>
                {partner.email && partner.displayName ? <Text className="text-[12px] text-ink-3">{partner.email}</Text> : null}
              </View>
              <View className="rounded-full bg-green-50 px-2.5 py-0.5"><Text className="text-[12px] font-bold text-pos-ink">Connected</Text></View>
            </View>
            <Text className="mt-2 text-[13px] leading-5 text-ink-3">You can each see the other's numbers. Neither of you can change the other's.</Text>
            <Pressable accessibilityRole="button" disabled={busy === 'disconnect'} className="mt-4 self-start"
              onPress={() => {
                haptic.warn()
                Alert.alert(`Disconnect from ${labelFor(partner)}?`, "You'll both stop seeing each other's numbers straight away. Nobody's own data is deleted.", [
                  { text: 'Keep connected', style: 'cancel' },
                  { text: 'Disconnect', style: 'destructive', onPress: () => run('disconnect', () => call('/api/household/disconnect', {})) },
                ])
              }}>
              <Text className="text-[15px] font-semibold text-neg-ink">{busy === 'disconnect' ? 'Disconnecting…' : 'Disconnect'}</Text>
            </Pressable>
          </View>
        ) : view.incomingInvite ? (
          <View className="rounded-card border border-border bg-card p-5">
            <Text className="text-[15px] leading-6 text-ink-2">
              <Text className="font-bold text-ink">{view.incomingInvite.fromName || view.incomingInvite.fromEmail || 'Someone'}</Text> invited you to share a household.
              You'll each keep your own account and see each other's numbers.
            </Text>
            <View className="mt-4">
              <PrimaryButton label={busy === 'accept' ? 'Joining…' : 'Accept invitation'} disabled={busy === 'accept'}
                onPress={() => run('accept', () => call('/api/household/accept', { token: view.incomingInvite!.token }))} />
            </View>
          </View>
        ) : view.pendingInvite ? (
          <View className="rounded-card border border-border bg-card p-5">
            <View className="flex-row items-center justify-between gap-3">
              <Text className="flex-1 text-[15px] text-ink">{view.pendingInvite.email}</Text>
              <View className="rounded-full bg-warn-bg px-2.5 py-0.5"><Text className="text-[12px] font-bold text-warn">Invited</Text></View>
            </View>
            <Text className="mt-2 text-[13px] leading-5 text-ink-3">
              Waiting for them to accept. The link expires {new Date(view.pendingInvite.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}.
            </Text>
            <Pressable accessibilityRole="button" disabled={busy === 'revoke'} className="mt-4 self-start" onPress={() => run('revoke', () => call('/api/household/revoke', {}))}>
              <Text className="text-[15px] font-semibold text-ink-2">{busy === 'revoke' ? 'Cancelling…' : 'Cancel invitation'}</Text>
            </Pressable>
          </View>
        ) : (
          <View className="rounded-card border border-border bg-card p-5">
            <Text className="text-[15px] leading-6 text-ink-2">
              Planning with a partner? Invite them and you'll each keep your own account, plus one shared view of where the two of you are heading.
            </Text>
            <TextInput accessibilityLabel="Partner's email" value={email} onChangeText={setEmail} placeholder="their@email.com" placeholderTextColor={colors.ink3}
              autoCapitalize="none" autoCorrect={false} keyboardType="email-address"
              className="mt-4 rounded-control border-2 border-border-2 bg-ground px-4 py-3 text-[16px] text-ink" style={{ fontFamily: 'Manrope_500Medium' }} />
            <View className="mt-3">
              <PrimaryButton label={busy === 'invite' ? 'Sending…' : 'Send invitation'} disabled={busy === 'invite' || !isPlausibleEmail(email.trim())}
                onPress={() => run('invite', () => call('/api/household/invite', { email: email.trim() }), () => setEmail(''))} />
            </View>
            <Text className="mt-3 text-[12px] leading-4 text-ink-3">They'll get an email with a link. Nothing is shared until they accept, and either of you can disconnect at any time.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
