import AsyncStorage from '@react-native-async-storage/async-storage'
import { Redirect, router } from 'expo-router'
import { useEffect, useState } from 'react'
import { Appearance, Pressable, StyleSheet, View } from 'react-native'
import Svg, { Circle, Defs, Line, LinearGradient as SvgGradient, Path, Pattern, Rect, Stop } from 'react-native-svg'

import { Button } from '@/components/Button'
import { FreedomLineChart } from '@/components/FreedomLineChart'
import { GuidedTour } from '@/components/GuidedTour'
import { useTourAnchor } from '@/components/tour-anchors'
import { HouseholdCard } from '@/components/HouseholdCard'
import { RecurringTeaser } from '@/components/RecurringCard'
import { CategoryGlyph, Icon } from '@/components/Icon'
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
import { everydayByDay, guessBillCategory, isCounted, isoDay, paydayLine, quickFreedom, type NextMove } from '@/engine'
import { usePlan } from '@/state/plan'
import { colors, TAB_COLOR } from '@/theme/colors'
import { splitBudget } from '@/lib/budget-split'
import { freeUntilPayday, unpaid, upcoming } from '@/lib/bills'
import { phoneNextMove, snoozedMoves, snoozeMove } from '@/lib/next-move'
import { spentUSD, toUSD } from '@/state/account'
import { expenseCategories } from '@/lib/custom-categories'

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
      {data && (freeUntilPayday(data) ? <UntilPayday data={data} /> : <ThisMonth data={data} />)}
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

const signed = (n: number) => `${n < 0 ? '−' : ''}${money(Math.abs(n))}`
const dayLabel = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

/**
 * Until payday (D-90), the website's card: one number, then the line behind
 * it (lib/payday-line). Faded from the last paycheck to today; from today,
 * flat but for the bills, each icon at the start of its drop, ending on
 * payday at the number. Below zero is striped red.
 */
function UntilPayday({ data }: { data: AccountData }) {
  const [w, setW] = useState(0)
  const f = freeUntilPayday(data)
  if (!f) return null
  const counted = new Set(data.plaidAccounts.filter(a => a.type === 'depository' && isCounted({ id: a.id, name: a.name, type: a.type, subtype: a.subtype, balanceUSD: 0 }, data.spendToggles ?? {})).map(a => a.plaid_account_id).filter(Boolean))
  const rows = data.transactions
    .filter(t => t.plaid_account_id && counted.has(t.plaid_account_id) && (t.transaction_type === 'expense' || t.transaction_type === 'income'))
    .map(t => ({ date: t.date, out: t.transaction_type === 'expense' ? spentUSD(t) : -toUSD(t.amount, t.currency), category: t.category }))
  const biggestPay = Math.max(0, ...rows.filter(r => r.out < 0).map(r => -r.out))
  const bills = f.bills.map(b => ({ iso: b.iso, usd: -b.amount, description: b.description, category: b.category ?? guessBillCategory(b.description) }))
  if (f.cardsOwed > 0) bills.unshift({ iso: isoDay(new Date()), usd: f.cardsOwed, description: 'Card balance', category: 'credit_card' })
  const line = paydayLine({ today: new Date(), cash: f.spending, paydayIso: f.payday.iso, bills, rows, payMin: biggestPay * 0.5 })
  const { span, today, past, dips, end } = line
  const short = end < 0
  const H = 130, TOP = 32
  const vals = [...past, end, ...line.bills.map(b => b.before)]
  const hi = Math.max(...vals), lo = Math.min(0, ...vals)
  const floor = short ? Math.min(lo, -(hi - lo) * 0.3) : lo
  const x = (d: number) => (d / Math.max(1, span)) * w
  const y = (v: number) => TOP + ((hi - v) / Math.max(1, hi - floor)) * (H - TOP)
  const pastPath = past.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  let fut = `M${x(today).toFixed(1)},${y(past[today]).toFixed(1)}`
  for (const b of line.bills) fut += ` L${x(b.day).toFixed(1)},${y(b.before).toFixed(1)} L${x(b.day).toFixed(1)},${y(b.before - b.usd).toFixed(1)}`
  fut += ` L${w},${y(end).toFixed(1)}`
  const zero = y(0)
  const marks: (typeof line.bills[number] & { more: number })[] = []
  for (const b of line.bills) {
    const near = marks.find(m => Math.abs(x(m.day) - x(b.day)) < 32)
    if (!near) marks.push({ ...b, more: 0 })
    else { near.more += 1; if (b.usd > near.usd) Object.assign(near, { day: b.day, usd: b.usd, before: b.before, category: b.category }) }
  }
  const cats = expenseCategories()
  const Pin = ({ left, top, category, more = 0, faded = false }: { left: number; top: number; category: string | null; more?: number; faded?: boolean }) => (
    <View style={{ position: 'absolute', left: left - 14, top: top - 32, width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface2, borderWidth: 2, borderColor: panel(), opacity: faded ? 0.8 : 1 }}>
      <CategoryGlyph cat={{ key: category ?? 'other', color: cats.find(c => c.key === category)?.color }} size={13} />
      {more > 0 && <View style={{ position: 'absolute', right: -8, top: -8, borderRadius: 7, paddingHorizontal: 4, backgroundColor: colors.ink }}><Text style={{ fontSize: 10, fontWeight: '800', color: panel() }}>+{more}</Text></View>}
    </View>
  )
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Until payday: ${signed(end)} ${short ? 'short' : 'yours'} until ${dayLabel(f.payday.iso)}. Open your budget`} onPress={() => { haptic.tick(); router.push('/money/budget') }}
      className="gap-2 rounded-3xl p-4 active:opacity-80" style={{ backgroundColor: panel() }}>
      <View className="flex-row items-center justify-between">
        <Text className="text-[12px] font-bold uppercase tracking-[1.5px] text-ink-3">Until payday</Text>
        <Text className="text-[13px] font-bold" style={{ color: colors.green }}>Money ›</Text>
      </View>
      <View className="flex-row items-baseline gap-2">
        <Text className={`font-mono text-[30px] ${short ? 'text-neg-ink' : 'text-ink'}`}>{signed(end)}</Text>
        <Text className="text-[13px] text-ink-3">{short ? 'short before payday' : 'yours until payday'}</Text>
      </View>
      <View style={{ height: H + 22, marginTop: 4 }} onLayout={e => setW(e.nativeEvent.layout.width - 14)}>
        {w > 0 && (
          <>
            <Svg width={w + 14} height={H} style={{ overflow: 'visible' }}>
              <Defs>
                <SvgGradient id="payfill" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={colors.teal} stopOpacity={0.22} /><Stop offset="1" stopColor={colors.teal} stopOpacity={0} /></SvgGradient>
                <Pattern id="payshort" width={7} height={7} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <Rect width={7} height={7} fill={colors.negBg} /><Line x1={0} y1={0} x2={0} y2={7} stroke={colors.neg} strokeWidth={2} opacity={0.45} />
                </Pattern>
              </Defs>
              <Path d={`${fut} L${w},${Math.min(zero, H)} L${x(today)},${Math.min(zero, H)} Z`} fill="url(#payfill)" />
              {short && <Rect x={0} y={zero} width={w} height={H - zero} fill="url(#payshort)" />}
              {short && <Line x1={0} x2={w} y1={zero} y2={zero} stroke={colors.neg} strokeWidth={1.5} />}
              <Path d={pastPath} fill="none" stroke={colors.teal} strokeOpacity={0.35} strokeWidth={2.5} strokeLinejoin="round" />
              <Path d={fut} fill="none" stroke={colors.teal} strokeWidth={2.5} strokeLinejoin="round" />
              <Line x1={x(today)} x2={x(today)} y1={y(past[today])} y2={H} stroke={colors.teal} strokeWidth={1.5} strokeDasharray="2 3" />
              <Circle cx={x(today)} cy={y(past[today])} r={6} fill={colors.tealDeep} stroke={panel()} strokeWidth={2.5} />
            </Svg>
            {dips.map(d => <Pin key={`d${d.day}`} left={x(d.day - 1)} top={y(past[d.day - 1])} category={d.category} faded />)}
            {marks.map(m => <Pin key={`b${m.day}`} left={x(m.day)} top={y(m.before)} category={m.category} more={m.more} />)}
            <View style={{ position: 'absolute', left: w - 12, top: y(end) - 12, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: short ? colors.neg : colors.green, borderWidth: 2, borderColor: panel() }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF' }}>$</Text>
            </View>
            <Text className="absolute bottom-0 left-0 text-[11px] font-bold text-ink-3">{dayLabel(line.startIso)}</Text>
            <Text className="absolute bottom-0 right-0 text-[11px] font-bold text-ink-3">Payday · {dayLabel(f.payday.iso)}</Text>
          </>
        )}
      </View>
      {f.bills.length > 0 && <Text className="text-[13px] text-ink-2">{money(f.billsBefore)} in {f.bills.length} {f.bills.length === 1 ? 'bill' : 'bills'} before payday</Text>}
    </Pressable>
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
    <Pressable accessibilityRole="button" accessibilityLabel={`This month: ${money(total)} spent of your ${money(budget)} day-to-day budget. ${pace}. Open your budget`} onPress={() => { haptic.tick(); router.push('/money/budget') }}
      className="gap-2 rounded-3xl p-4 active:opacity-80" style={{ backgroundColor: panel() }}>
      <View className="flex-row items-center justify-between">
        <Text className="text-[12px] font-bold uppercase tracking-[1.5px] text-ink-3">This month</Text>
        <Text className="text-[13px] font-bold" style={{ color: colors.green }}>Money ›</Text>
      </View>
      <View className="flex-row items-center gap-4">
        <View>
          <Text className={`font-mono text-[28px] ${left < 0 ? 'text-neg-ink' : 'text-ink'}`}>{money(total)}</Text>
          <Text className="text-[12px] text-ink-3">of {money(budget)}</Text>
        </View>
        <View className="flex-1" style={{ height: H }} onLayout={e => setW(e.nativeEvent.layout.width)}>
          {w > 0 && (
            <Svg width={w} height={H} style={{ overflow: 'visible' }}>
              <Line x1={0} y1={H} x2={w} y2={py(budget)} stroke={colors.border} strokeWidth={2} strokeDasharray="4 5" />
              {soFar.length > 0 && <Path d={path} fill="none" stroke={colors.teal} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />}
              {soFar.length > 0 && <Circle cx={px(soFar.length - 1)} cy={py(soFar[soFar.length - 1])} r={4} fill={colors.tealDeep} />}
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
