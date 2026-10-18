import AsyncStorage from '@react-native-async-storage/async-storage'
import { Redirect, router } from 'expo-router'
import { useEffect, useState } from 'react'
import { Appearance, Pressable, StyleSheet, View } from 'react-native'
import Svg, { Circle, Defs, Line, LinearGradient as SvgGradient, Path, Rect, Stop } from 'react-native-svg'

import { Button } from '@/components/Button'
import { FreedomLineChart } from '@/components/FreedomLineChart'
import { GuidedTour } from '@/components/GuidedTour'
import { useTourAnchor } from '@/components/tour-anchors'
import { HouseholdCard } from '@/components/HouseholdCard'
import { RecurringTeaser } from '@/components/RecurringCard'
import { Icon } from '@/components/Icon'
import { ProgressTrack, Screen } from '@/components/Screen'
import { Sunny } from '@/components/Sunny'
import { Text } from '@/components/Text'
import { isBrokerageAccount, isRetirementAccount } from '@/lib/balances'
import { money } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { useAccount, type AccountData } from '@/state/account'
import { useAuth } from '@/state/auth'
import { saveFireProfile } from '@/lib/mutations'
import { useFreedom, type Freedom } from '@/state/freedom'
import { useLivePlan } from '@/state/live-plan'
import { everydayByDay, quickFreedom, type NextMove } from '@/engine'
import { usePlan } from '@/state/plan'
import { colors, TAB_COLOR } from '@/theme/colors'
import { splitBudget } from '@/lib/budget-split'
import { unpaid, upcoming } from '@/lib/bills'
import { phoneNextMove, snoozedMoves, snoozeMove } from '@/lib/next-move'
import { spentUSD, toUSD } from '@/state/account'

/**
 * Home (V2, after the October audit; D-89): the freedom date and its path, the
 * one next move, then four round actions, Phantom-style. What's left this
 * month gets a pace line and the next big bill; safety lives in the top bar;
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
      {data && <SavingsGap data={data} />}
      {data && <NextMoveCard data={data} />}
      <Actions signedIn={!!session} />
      {data && <ThisMonth data={data} />}
      {data && <RecurringTeaser data={data} freedom={result} />}
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
  const yearsAway = result.years != null ? Math.round(result.years * 10) / 10 : null
  const date = result.year == null ? '65+ years' : result.date ? result.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : String(result.year)
  const sub = [yearsAway != null ? (yearsAway <= 0 ? 'Now' : yearsAway < 1 ? 'Under a year away' : `${yearsAway.toFixed(1)} years away`) : null, result.ageAtFreedom != null ? `age ${result.ageAtFreedom}` : null].filter(Boolean).join(' · ')
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

/**
 * Onboarding's one savings answer is seeded as cash, so a first connected bank
 * replaces all of it with that bank's cash and the date jumps. When it falls
 * short, say why and where the rest goes. Home only explains; Balances is
 * where it's typed. Gone once something is placed there, or on "That was all".
 */
function SavingsGap({ data }: { data: AccountData }) {
  const { session } = useAuth()
  const { refresh } = useAccount()
  const told = data.profile.onboardingSavings
  const cash = data.plaidAccounts.filter(a => a.type === 'depository').reduce((s, a) => s + (a.balance_current ?? 0), 0)
  const placed = data.typed.k401 + data.typed.rothIRA + data.typed.taxable > 0 || data.plaidAccounts.some(a => isRetirementAccount(a) || isBrokerageAccount(a))
  if (!told || !session || cash <= 0 || placed || cash >= told * 0.9) return null
  const done = () => { haptic.tick(); saveFireProfile(session.user.id, { onboardingSavings: null }).then(() => refresh()).catch(() => {}) }
  return (
    <View className="flex-row items-center gap-3 rounded-3xl p-4" style={{ backgroundColor: panel() }}>
      <Sunny mood="think" size={56} />
      <View className="flex-1 gap-2">
        <Text className="text-[15px] leading-5 text-ink">
          You told us {money(told)} saved, and your bank shows {money(cash)} in cash. If the other {money(told - cash)} is in retirement or investments, add it so your date counts it.
        </Text>
        <View className="flex-row flex-wrap gap-2">
          <Button small label="Add it" onPress={() => { haptic.tick(); router.push('/balances') }} />
          <Button small kind="quiet" label="That was all of it" onPress={done} />
        </View>
      </View>
    </View>
  )
}

/** A soft panel that shows against the page in both themes (surface in light, card in dark). */
const panel = () => (Appearance.getColorScheme() === 'dark' ? colors.card : colors.surface)

const MOVE_ROUTE: Record<NextMove['tab'], '/money/budget' | '/plan/contributions' | '/plan/what-if'> = {
  cashflow: '/money/budget', contributions: '/plan/contributions', 'fire-calculator': '/plan/what-if',
}

/** The one next move (D-89), the website's rule: over budget, then no budget, then the contribution ladder. "Not now" puts it off a week. */
function NextMoveCard({ data }: { data: AccountData }) {
  const [snoozed, setSnoozed] = useState<Set<string> | null>(null)
  useEffect(() => { snoozedMoves().then(setSnoozed).catch(() => setSnoozed(new Set())) }, [])
  if (!snoozed) return null
  const move = phoneNextMove(data, snoozed)
  if (!move) return null
  const later = () => { haptic.tick(); snoozeMove(move.key).catch(() => {}); setSnoozed(new Set([...snoozed, move.key])) }
  return (
    <View className="gap-3 rounded-3xl p-4" style={{ backgroundColor: panel() }}>
      <View className="flex-row items-center justify-between">
        <Text className="text-[12px] font-bold uppercase tracking-[1.5px] text-ink-3">Your next move</Text>
        <Text className="text-[13px] font-bold" style={{ color: colors.green }}>{move.door === 'plan' ? 'Plan ›' : 'Money ›'}</Text>
      </View>
      <Text className="text-[18px] font-bold leading-6 text-ink">{move.title}</Text>
      {!!move.payoff && (
        <View className="self-start rounded-full px-2.5 py-1" style={{ backgroundColor: colors.tealSoft }}>
          <Text className="text-[12px] font-bold" style={{ color: colors.tealDeep }}>{move.payoff}</Text>
        </View>
      )}
      <View className="flex-row items-center gap-2">
        <Button small label={move.button} onPress={() => { haptic.press(); router.push(MOVE_ROUTE[move.tab]) }} />
        <Button small kind="quiet" label="Not now" onPress={later} />
      </View>
    </View>
  )
}

/**
 * What's left of the everyday budget (bills set aside, lib/budget-split), a
 * pace line of spending so far against an even pace (D-89, the website's
 * rule in lib/everyday-left), and the next big bill.
 */
function ThisMonth({ data }: { data: AccountData }) {
  const { everydayBudget: budget, everydaySpent: total, left } = splitBudget(data)
  const [w, setW] = useState(0)
  if (budget <= 0) return null
  const now = new Date()
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const soFar = everydayByDay({
    bills: data.bills.filter(b => b.transaction_type === 'expense').map(b => ({ ...b, usd: Math.abs(toUSD(b.amount, b.currency)) })),
    monthRows: data.transactions.filter(t => t.date.startsWith(month)).map(t => ({ ...t, usd: spentUSD(t) })),
    spreadCategories: data.profile.spreadCategories ?? [],
    days: now.getDate(),
  })
  const even = budget * (now.getDate() / days)
  const pace = Math.abs(total - even) <= budget * 0.05 ? 'On pace' : total < even ? 'A bit ahead of pace' : 'Spending faster than pace'
  const big = unpaid(upcoming(data.bills, 30), data.bills, data.transactions)
    .filter(e => e.type === 'expense').sort((a, b) => a.amount - b.amount)[0]
  const H = 44
  const top = Math.max(budget, total) * 1.05
  const px = (i: number) => (days > 1 ? (i / (days - 1)) * w : 0)
  const py = (v: number) => H - (v / top) * H
  const path = soFar.map((v, i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(' ')
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Left this month: ${money(Math.abs(left))} ${left < 0 ? 'over' : 'left'}. ${pace}. Open your budget`} onPress={() => { haptic.tick(); router.push('/money/budget') }}
      className="gap-2 rounded-3xl p-4 active:opacity-80" style={{ backgroundColor: panel() }}>
      <View className="flex-row items-center justify-between">
        <Text className="text-[12px] font-bold uppercase tracking-[1.5px] text-ink-3">Left this month</Text>
        <Text className="text-[13px] font-bold" style={{ color: colors.green }}>Money ›</Text>
      </View>
      <View className="flex-row items-center gap-4">
        <Text className={`font-mono text-[28px] ${left < 0 ? 'text-neg-ink' : 'text-ink'}`}>{money(Math.abs(left))}{left < 0 ? ' over' : ''}</Text>
        <View className="flex-1" style={{ height: H }} onLayout={e => setW(e.nativeEvent.layout.width)}>
          {w > 0 && (
            <Svg width={w} height={H} style={{ overflow: 'visible' }}>
              <Line x1={0} y1={H} x2={w} y2={py(budget)} stroke={colors.border} strokeWidth={2} strokeDasharray="4 5" />
              {soFar.length > 0 && <Path d={path} fill="none" stroke={colors.ink} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />}
              {soFar.length > 0 && <Circle cx={px(soFar.length - 1)} cy={py(soFar[soFar.length - 1])} r={4} fill={colors.ink} />}
            </Svg>
          )}
        </View>
      </View>
      <Text className="text-[13px] text-ink-2">
        {pace}{big ? ` · ${big.description} ${money(-big.amount)} on ${new Date(`${big.iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
      </Text>
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
