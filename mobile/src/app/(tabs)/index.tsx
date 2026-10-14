import AsyncStorage from '@react-native-async-storage/async-storage'
import { Redirect, router } from 'expo-router'
import { useEffect, useState } from 'react'
import { Appearance, Pressable, StyleSheet, View } from 'react-native'
import Svg, { Defs, LinearGradient as SvgGradient, Rect, Stop } from 'react-native-svg'

import { Button } from '@/components/Button'
import { FreedomLineChart } from '@/components/FreedomLineChart'
import { GuidedTour } from '@/components/GuidedTour'
import { useTourAnchor } from '@/components/tour-anchors'
import { HouseholdCard } from '@/components/HouseholdCard'
import { Icon } from '@/components/Icon'
import { ProgressTrack, Screen } from '@/components/Screen'
import { Sunny } from '@/components/Sunny'
import { Text } from '@/components/Text'
import { money } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { monthSpend, thisMonth } from '@/lib/money-data'
import { useAccount, type AccountData } from '@/state/account'
import { useAuth } from '@/state/auth'
import { useFreedom, type Freedom } from '@/state/freedom'
import { useLivePlan } from '@/state/live-plan'
import { quickFreedom } from '@/engine'
import { usePlan } from '@/state/plan'
import { colors, TAB_COLOR } from '@/theme/colors'

/**
 * Home (V2, after the October audit): the freedom date and its path, then four
 * round actions, Phantom-style. Budget left and safety live in the top bar;
 * Today is pinned above the tabs. Home interprets; it owns no inputs
 * (docs/design/app-structure.md).
 */
export default function Home() {
  const { plan } = useLivePlan()
  const result = useFreedom()
  const { session } = useAuth()
  const { data, loading, refresh } = useAccount()
  if (!plan || !result) return <Redirect href="/onboarding" />

  return (
    <Screen tab="home" flat hideTitle title="Home" refreshing={loading && !!data} onRefresh={data ? refresh : undefined}>
      <Hero result={result} />
      <DateMoved result={result} />
      <Actions signedIn={!!session} />
      {data && <ThisMonth data={data} />}
      {data && <NextGoal data={data} />}
      {data && <HouseholdCard />}
      <GuidedTour />
    </Screen>
  )
}

/**
 * The hero (Home option A, October 2026): the freedom date and its path in one
 * deep-teal card with white text, so the date reads as the headline of the app.
 * Option B, a sunrise scene, is kept in mind for later.
 */
function Hero({ result }: { result: Freedom }) {
  const yearsAway = result.years != null ? Math.ceil(result.years) : null
  const date = result.year == null ? '65+ years' : result.date ? result.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : String(result.year)
  const sub = [yearsAway != null ? (yearsAway === 0 ? 'Now' : yearsAway === 1 ? '1 year away' : `${yearsAway} years away`) : null, result.ageAtFreedom != null ? `age ${result.ageAtFreedom}` : null].filter(Boolean).join(' · ')
  return (
    <View {...useTourAnchor('hero')} style={{ borderRadius: 28, overflow: 'hidden', backgroundColor: TAB_COLOR.home }}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
        <Defs>
          <SvgGradient id="hero" x1="0" y1="0" x2="0.4" y2="1">
            <Stop offset="0" stopColor="#0E9C86" />
            <Stop offset="1" stopColor="#06412F" />
          </SvgGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill="url(#hero)" />
      </Svg>
      <View style={{ padding: 18, paddingBottom: 14 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Free in ${date}. Open your freedom date`} onPress={() => { haptic.tick(); router.push('/plan/freedom') }}>
          <Text style={{ color: 'rgba(255,255,255,0.8)' }} className="text-[12px] font-bold uppercase tracking-[2px]">Free in</Text>
          <Text style={{ color: '#FFFFFF' }} className="font-display text-[50px] font-bold leading-[56px] tracking-tight">{date}</Text>
          {!!sub && <Text style={{ color: 'rgba(255,255,255,0.85)' }} className="text-[15px]">{sub}</Text>}
        </Pressable>
        <View className="mt-4"><FreedomLineChart f={result} onDark /></View>
      </View>
    </View>
  )
}

/**
 * Once, when signing in moves the date: onboarding's quick estimate becomes the
 * full plan (real balances, tax, city), so say why rather than let it jump.
 */
function DateMoved({ result }: { result: Freedom }) {
  const { plan: answers } = usePlan()
  const from = result.source === 'account' && answers ? quickFreedom(answers).year : null
  const to = result.year
  const key = 'date-moved-seen'
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (from == null || to == null || from === to) { setShow(false); return }
    AsyncStorage.getItem(key).then(v => setShow(v !== '1')).catch(() => {})
  }, [from, to, key])
  if (!show) return null
  return (
    <View className="flex-row items-center gap-3 rounded-3xl p-4" style={{ backgroundColor: panel() }}>
      <Sunny mood="think" size={56} />
      <View className="flex-1 gap-2">
        <Text className="text-[15px] leading-5 text-ink">
          Your date moved from {from} to {to}. It now uses your accounts, tax and city, not just your first answers.
        </Text>
        <Button small kind="quiet" style={{ alignSelf: 'flex-start' }} label="Got it" onPress={() => { AsyncStorage.setItem(key, '1').catch(() => {}); setShow(false) }} />
      </View>
    </View>
  )
}

/** A soft panel that shows against the page in both themes (surface in light, card in dark). */
const panel = () => (Appearance.getColorScheme() === 'dark' ? colors.card : colors.surface)

/** This month in one bar: what's left of the budget, and how far through the month you are. */
function ThisMonth({ data }: { data: AccountData }) {
  const budget = Object.values(data.budget).reduce((a, v) => a + v, 0)
  if (budget <= 0) return null
  const { total } = monthSpend(data.transactions, thisMonth())
  const left = budget - total
  const now = new Date()
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`This month: ${money(Math.abs(left))} ${left < 0 ? 'over' : 'left'}. Open your budget`} onPress={() => { haptic.tick(); router.push('/money/budget') }}
      className="gap-2 rounded-3xl p-4 active:opacity-80" style={{ backgroundColor: panel() }}>
      <View className="flex-row items-baseline justify-between">
        <Text className="text-[16px] font-bold text-ink">This month</Text>
        <Text className={`font-mono text-[16px] ${left < 0 ? 'text-neg-ink' : 'text-ink'}`}>{money(Math.abs(left))} {left < 0 ? 'over' : 'left'}</Text>
      </View>
      <View className="h-2.5 overflow-hidden rounded-full bg-surface-2">
        <View className={`h-full rounded-full ${left < 0 ? 'bg-neg' : total / budget > now.getDate() / days ? 'bg-warn' : 'bg-green'}`} style={{ width: `${Math.min(1, total / budget) * 100}%` }} />
      </View>
      <View className="flex-row justify-between">
        <Text className="text-[13px] text-ink-2">Spent {money(total)} of {money(budget)}</Text>
        <Text className="text-[13px] text-ink-2">Day {now.getDate()} of {days}</Text>
      </View>
    </Pressable>
  )
}

/** The goal you're closest to finishing, as one bar. */
function NextGoal({ data }: { data: AccountData }) {
  const g = data.goals
    .filter(x => x.target_amount > 0 && x.current_saved < x.target_amount)
    .sort((a, b) => b.current_saved / b.target_amount - a.current_saved / a.target_amount)[0]
  if (!g) return null
  const share = g.current_saved / g.target_amount
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${g.name}: ${Math.round(share * 100)}% saved. Open goals`} onPress={() => { haptic.tick(); router.push('/plan/goals') }}
      className="gap-2 rounded-3xl p-4 active:opacity-80" style={{ backgroundColor: panel() }}>
      <View className="flex-row items-baseline justify-between">
        <Text numberOfLines={1} className="flex-1 pr-3 text-[16px] font-bold text-ink">{g.emoji ?? '🎯'} {g.name}</Text>
        <Text className="font-mono text-[16px] text-ink">{Math.round(share * 100)}%</Text>
      </View>
      <ProgressTrack share={share} />
      <Text className="text-[13px] text-ink-2">{money(g.current_saved)} of {money(g.target_amount)}</Text>
    </Pressable>
  )
}

type SymbolName = Parameters<typeof Icon>[0]['name']

/** Four round actions, like Phantom's row under the balance: the things people do most. */
function Actions({ signedIn }: { signedIn: boolean }) {
  const go = (to: Parameters<typeof router.push>[0]) => () => { haptic.press(); router.push(to) }
  const items: { label: string; icon: SymbolName; fallback: string; onPress: () => void }[] = [
    { label: 'Add', icon: 'plus', fallback: '+', onPress: signedIn ? go('/transaction') : go('/sign-in') },
    // Budget replaced Review (Oct 2026): Today already does the reviewing every day.
    { label: 'Budget', icon: 'chart.pie.fill', fallback: '◔', onPress: signedIn ? go('/money/budget') : go('/sign-in') },
    { label: 'Invest', icon: 'arrow.up.right', fallback: '↗', onPress: go('/plan/contributions') },
    { label: 'What if', icon: 'wand.and.stars', fallback: '?', onPress: go('/plan/what-if') },
  ]
  return (
    <View {...useTourAnchor('actions')} className="flex-row justify-between px-1">
      {items.map(a => (
        <Pressable key={a.label} accessibilityRole="button" accessibilityLabel={a.label} onPress={a.onPress} className="items-center gap-2" style={{ width: 72 }}>
          {({ pressed }) => (
            <>
              <View style={{
                width: 60, height: 60, borderRadius: 30, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center',
                borderBottomWidth: pressed ? 0 : 4, borderBottomColor: 'rgba(0,0,0,0.28)', marginTop: pressed ? 4 : 0,
              }}>
                <Icon name={a.icon} fallback={a.fallback} size={24} color={colors.card} />
              </View>
              <Text className="text-[13px] font-bold text-ink">{a.label}</Text>
            </>
          )}
        </Pressable>
      ))}
    </View>
  )
}
