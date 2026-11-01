import { paydayRemainder } from '@engine/payday-spending.ts'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Redirect, router } from 'expo-router'
import { useEffect, useState } from 'react'
import { Appearance, Pressable, View } from 'react-native'
import Svg, { Circle, Line, Path } from 'react-native-svg'

import { AccountSetupCard } from '@/components/AccountSetupCard'
import { UntilPaydayCard } from '@/components/UntilPaydayCard'
import { Button } from '@/components/Button'
import { FreedomLineChart } from '@/components/FreedomLineChart'
import { GuidedTour } from '@/components/GuidedTour'
import { useTourAnchor } from '@/components/tour-anchors'
import { HouseholdCard } from '@/components/HouseholdCard'
import { RecurringTeaser } from '@/components/RecurringCard'
import { SetupCard, useSetupOpen } from '@/components/SetupCard'
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
import { everydayByDay, freedomProgress, guessBillCategory, progressPercent, isCounted, isoDay, paydayLine, quickFreedom, type NextMove } from '@/engine'
import { usePlan } from '@/state/plan'
import { brand, colors } from '@/theme/colors'
import { splitBudget } from '@/lib/budget-split'
import { freeUntilPayday, unpaid, upcoming } from '@/lib/bills'
import { phoneNextMove, snoozedMoves, snoozeMove } from '@/lib/next-move'
import { spentUSD, toUSD } from '@/state/account'
import { expenseCategories } from '@/lib/custom-categories'
import { monthCount, quietDayToMark, safeToSpendToday, saveTodayProgress, todayItems } from '@/lib/today'

/**
 * Home (V2, after the October audit; D-89, D-108): Today first, then the
 * freedom date and its path, the one next move with Get set up docked under
 * it, then four round actions, Phantom-style. What's left this month gets a
 * pace line and the next big bill; safety lives in the top bar. On the other
 * tabs Today is pinned above the tab bar. Home interprets; it owns no inputs
 * (docs/design/app-structure.md).
 */
export default function Home() {
  const { plan } = useLivePlan()
  const result = useFreedom()
  const { session } = useAuth()
  const { data, loading, refresh } = useAccount()
  const [paydayAdjustment,setPaydayAdjustment]=useState<{window:string;everyday:number|null;cushion:number}|null>(null)
  const payday = data ? freeUntilPayday(data) : null
  const paydayWindow = session?.user.id+':'+payday?.payday.iso+':'+isoDay(new Date())
  const activeAdjustment=paydayAdjustment?.window===paydayWindow?paydayAdjustment:null
  const paydayRemaining=payday?paydayRemainder(payday.free,activeAdjustment?.everyday??payday.everyday?.amount??null,activeAdjustment?.cushion??0):null
  const setupOpen = useSetupOpen(data)
  if (!plan || !result) return <Redirect href="/onboarding" />

  return (
    <Screen tab="home" flat hideTitle title="Home" refreshing={loading && !!data} onRefresh={data ? refresh : undefined}>
      {data && session && <TodayCard data={data} userId={session.user.id} paydayDaily={payday ? paydayRemaining===null?null:Math.max(0,Math.floor(paydayRemaining/payday.days)):undefined} />}
      <Hero result={result} />
      <DateMoved result={result} />
      {data && <SavingsGap data={data} />}
      {data && setupOpen === false && <NextMoveCard data={data} />}
      {data && <SetupCard data={data} freedomYear={result.year ?? null} />}
      <Actions signedIn={!!session} />
      {data && (freeUntilPayday(data) ? <UntilPayday key={paydayWindow} data={data} onAdjustmentChange={a=>setPaydayAdjustment({window:paydayWindow,...a})} /> : <ThisMonth data={data} />)}
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
    <View {...useTourAnchor('hero')} style={{ borderRadius: 28, overflow: 'hidden', backgroundColor: brand.yellow }}>
      <View style={{ padding: 18, paddingBottom: 14 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Free in ${date}. Open your freedom date`} onPress={() => { haptic.tick(); router.push('/plan/freedom') }}>
          <Text style={{ color: '#5C5130' }} className="text-[12px] font-bold uppercase tracking-[2px]">Free in</Text>
          <Text style={{ color: '#151719' }} className="font-display text-[50px] font-bold leading-[56px] tracking-tight">{date}</Text>
          {!!sub && <Text style={{ color: '#5C5130' }} className="text-[15px]">{sub}</Text>}
        </Pressable>
        <HowFar result={result} />
        <View className="mt-4"><FreedomLineChart f={result} /></View>
      </View>
    </View>
  )
}

/**
 * How far you've come (goal gradient, lib/freedom-progress): the share of the
 * freedom number already there and the next quarter mark, close enough to chase.
 */
function HowFar({ result }: { result: Freedom }) {
  const p = freedomProgress(result.invested, result.target, result.series.map(s => ({ year: s.year, value: s.invested })))
  if (!p) return null
  const pct = progressPercent(p.share)
  const next = p.next ? `Next: ${Math.round(p.next.mark * 100)}%${p.next.year != null ? ` in ${p.next.year}` : `, ${money(p.next.toGo)} to go`}` : 'Your freedom number is there'
  return (
    <View className="mt-4" accessible accessibilityLabel={`${pct} of your freedom number. ${next}`}>
      <View className="flex-row items-baseline justify-between">
        <Text style={{ color: '#151719' }} className="font-mono text-[15px] font-bold">{pct} there</Text>
        <Text style={{ color: '#5C5130' }} className="text-[13px]">{next}</Text>
      </View>
      <View className="mt-2 h-2.5 overflow-hidden rounded-full" style={{ backgroundColor: '#D8C67B' }}>
        <View className="h-full rounded-full" style={{ width: `${Math.max(2, p.share * 100)}%`, backgroundColor: brand.deep }} />
        {[0.25, 0.5, 0.75].map(m => (
          <View key={m} className="absolute bottom-0 top-0 w-[2px]" style={{ left: `${m * 100}%`, backgroundColor: 'rgba(6,65,47,0.55)' }} />
        ))}
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
const panel = () => (Appearance.getColorScheme() === 'dark' ? '#213F35' : '#E3F7EF')

/**
 * Today on Home (D-108): what's left to answer, opening into the one-at-a-time
 * list, or the day's check when it's done. Safe to spend is a figure under it,
 * not a step to tick, and a day with nothing to answer counts once it's opened.
 */
function TodayCard({ data, userId, paydayDaily }: { data: AccountData; userId: string; paydayDaily?:number|null }) {
  const { refresh } = useAccount()
  const anchor = useTourAnchor('today')
  const progress = data.profile.today
  const { day, items } = todayItems(data, progress)
  const count = monthCount(progress.done)
  const safe = paydayDaily !== undefined ? paydayDaily : safeToSpendToday(data)
  const quiet = quietDayToMark(progress.done, items.length)
  useEffect(() => {
    if (!quiet) return
    saveTodayProgress(userId, { ...progress, done: [...progress.done, quiet] }).then(() => refresh()).catch(() => {})
    // Once per day to mark; progress is read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiet, userId])
  const left = items.length
  return (
    <View {...anchor} className="gap-3 rounded-3xl p-4" style={{ backgroundColor: panel() }}>
      <View className="flex-row items-baseline justify-between">
        <Text className="text-[18px] font-bold text-ink">Today</Text>
        <Text className="text-[13px] text-ink-2"><Text className="font-mono text-[13px] text-ink-2">{count.done}</Text> of <Text className="font-mono text-[13px] text-ink-2">{count.of}</Text> days</Text>
      </View>
      {left > 0 ? (
        <View className="flex-row items-center justify-between gap-3">
          <Text className="flex-1 text-[15px] leading-5 text-ink">
            {progress.done.includes(day) ? `${left} new since you finished` : `${left === 1 ? 'One thing to sort' : `${left} things to sort`}, about a minute`}
          </Text>
          <Button small label="Start" onPress={() => { haptic.press(); router.push('/today') }} />
        </View>
      ) : (
        <View className="flex-row items-center gap-2">
          <Icon name="checkmark.circle.fill" fallback="✓" size={22} color={colors.teal} />
          <Text className="text-[15px] font-bold" style={{ color: colors.tealDeep }}>Today&apos;s done</Text>
        </View>
      )}
      <Pressable accessibilityRole="button" accessibilityLabel={safe != null ? `Safe to spend today ${money(safe)}. Open your budget` : 'Set a budget to see what\'s safe to spend each day'}
        onPress={() => { haptic.tick(); router.push(safe != null ? '/money/budget' : '/budget-edit') }}
        className="flex-row items-center justify-between border-t pt-3 active:opacity-70" style={{ borderTopColor: colors.border }}>
        {safe != null
          ? <Text className="text-[15px] text-ink">Safe to spend today <Text className="font-mono text-[15px] font-semibold text-ink">{money(safe)}</Text></Text>
          : <Text className="text-[15px] text-ink-2">Set a budget to see what&apos;s safe to spend each day</Text>}
        <Text className="text-[16px] text-ink-3">›</Text>
      </Pressable>
    </View>
  )
}

const MOVE_ROUTE: Record<NextMove['tab'], '/money/budget' | '/plan/contributions' | '/plan/what-if'> = {
  cashflow: '/money/budget', contributions: '/plan/contributions', 'fire-calculator': '/plan/what-if',
}

/** The one next move (D-89), the website's rule: over budget, then no budget, then the contribution ladder. "Not now" puts it off a week. */
function NextMoveCard({ data }: { data: AccountData }) {
  const { plan: answers } = usePlan()
  const [snoozed, setSnoozed] = useState<Set<string> | null>(null)
  useEffect(() => { snoozedMoves().then(setSnoozed).catch(() => setSnoozed(new Set())) }, [])
  if (!snoozed) return null
  const move = phoneNextMove(data, snoozed, answers)
  if (!move) return <AccountSetupCard />
  const later = () => { haptic.tick(); snoozeMove(move.key).catch(() => {}); setSnoozed(new Set([...snoozed, move.key])) }
  const icon = MOVE_ICON[move.key === 'lease' ? 'lease' : move.tab]
  // The one card on Home that looks different (Von Restorff): a green frame and
  // an icon, where every other card is a plain soft panel.
  return (
    <View className="gap-3 rounded-3xl p-4" style={{ backgroundColor: colors.card, borderWidth: 2, borderColor: colors.green }}>
      <View className="flex-row items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-[13px]" style={{ backgroundColor: colors.green50 }}>
          <Icon name={icon.name} fallback={icon.fallback} size={24} color={colors.green} />
        </View>
        <Text className="flex-1 text-[12px] font-bold uppercase tracking-[1.5px]" style={{ color: colors.green }}>Your next move</Text>
        <Text className="text-[13px] font-bold" style={{ color: colors.green }}>{move.door === 'plan' ? 'Plan ›' : 'Money ›'}</Text>
      </View>
      <Text className="text-[18px] font-bold leading-6 text-ink">{move.title}</Text>
      {!!move.because && <Text className="text-[14px] leading-5 text-ink-2">{move.because}</Text>}
      {!!move.payoff && (
        <View className="self-start rounded-full px-2.5 py-1" style={{ backgroundColor: colors.tealSoft }}>
          <Text className="text-[12px] font-bold" style={{ color: colors.tealDeep }}>{move.payoff}</Text>
        </View>
      )}
      <View className="flex-row items-center gap-2">
        <Button small label={move.button} onPress={() => { haptic.press(); router.push(move.href ?? MOVE_ROUTE[move.tab]) }} />
        <Button small kind="quiet" label="Not now" onPress={later} />
      </View>
    </View>
  )
}

const MOVE_ICON: Record<NextMove['tab'] | 'lease', { name: 'chart.pie.fill' | 'chart.line.uptrend.xyaxis' | 'wand.and.stars' | 'house.fill'; fallback: string }> = {
  cashflow: { name: 'chart.pie.fill', fallback: '🥧' },
  contributions: { name: 'chart.line.uptrend.xyaxis', fallback: '📈' },
  'fire-calculator': { name: 'wand.and.stars', fallback: '✨' },
  lease: { name: 'house.fill', fallback: '🏠' },
}


/**
 * Until payday (D-90), the website's card: one number, then the line behind
 * it (lib/payday-line). Faded from the last paycheck to today; from today,
 * flat but for the bills, each icon at the start of its drop, ending on
 * payday at the number. Below zero is striped red.
 */
function UntilPayday({ data,onAdjustmentChange }: { data: AccountData;onAdjustmentChange:(a:{everyday:number|null;cushion:number})=>void }) {
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
  const cats = expenseCategories()
  const estimate = f.everyday
  return <UntilPaydayCard onAdjustmentChange={onAdjustmentChange} key={f.payday.iso+':'+isoDay(new Date())} everyday={estimate?.amount??null} estimateSource={estimate?.source} line={line} paydayIso={f.payday.iso} billCount={f.bills.length} billTotal={f.bills.reduce((s,b)=>s+Math.abs(b.amount),0)} icon={key=>cats.find(c=>c.key===key)?.emoji??'💳'} onOpen={()=>{haptic.tick();router.push('/money/budget')}} />
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
