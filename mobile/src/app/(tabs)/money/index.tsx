import { router } from 'expo-router'
import { Pressable, View } from 'react-native'

import { BankBridge } from '@/components/BankBridge'
import { Button } from '@/components/Button'
import { Icon } from '@/components/Icon'
import { TransactionRow } from '@/components/TransactionRow'
import { haptic } from '@/lib/haptics'

import { LoadingState } from '@/components/LoadingState'

import { PrimaryButton } from '@/components/PrimaryButton'
import { Card, Label, Screen } from '@/components/Screen'
import { Text } from '@/components/Text'
import { money } from '@/lib/format'
import { categoryOf, monthSpend, thisMonth } from '@/lib/money-data'
import { reviewCounts } from '@/lib/review'
import { useAccount, type AccountData } from '@/state/account'
import { useAuth } from '@/state/auth'
import { freedomFor, usePlan } from '@/state/plan'
import { TAB_COLOR, tabInk } from '@/theme/colors'
import { splitBudget } from '@/lib/budget-split'

/**
 * Money's hub (V2): this month's spending as the headline, every Money page as
 * an icon tile, then the latest transactions. Replaces the stacked summary
 * cards after the October audit.
 */
export default function Money() {
  const { session } = useAuth()
  const { data, loading, refresh } = useAccount()

  if (!session) return <SignedOutMoney />

  return (
    <Screen tab="money" flat hideTitle title="Money" refreshing={loading && !!data} onRefresh={refresh}>
      {!data ? <LoadingState cards={3} /> : (
        <>
          <Headline data={data} />
          <Tiles />
          {data.plaidAccounts.length === 0 && <BankBridge />}
          <Latest data={data} />
        </>
      )}
    </Screen>
  )
}

function Headline({ data }: { data: AccountData }) {
  const { total, categories } = monthSpend(data.transactions, thisMonth())
  // The one "left": everyday budget less everyday spending, bills set aside (lib/budget-split).
  const { everydayBudget: budget, left } = splitBudget(data)
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Spent ${money(total)} this month. Open transactions`} onPress={() => { haptic.tick(); router.push('/money/transactions') }}>
      <Text className="text-[12px] font-bold uppercase tracking-[2px] text-ink-3">Spent this month</Text>
      <Text style={{ color: tabInk('money') }} className="font-display text-[52px] font-bold leading-[58px] tracking-tight">{money(total)}</Text>
      {budget > 0 && <Text className="text-[15px] text-ink-2">{left >= 0 ? `${money(left)} left of ${money(budget)}` : `${money(-left)} over ${money(budget)}`}</Text>}
      {/* Where it went, so the headline isn't a bare total; the rest is in Budget. */}
      {categories.length > 0 && (
        <Pressable accessibilityRole="button" accessibilityLabel="Spending by category" hitSlop={4} onPress={() => { haptic.tick(); router.push('/money/budget') }} className="mt-1 active:opacity-70">
          <Text className="text-[14px] text-ink-2">
            {categories.slice(0, 3).map((c, i) => (
              <Text key={c.key} className="text-[14px] text-ink-2">{i > 0 ? ' · ' : ''}{categoryOf(c.key).label} <Text className="font-mono text-[14px] text-ink">{money(c.usd)}</Text></Text>
            ))}
            <Text className="text-[14px] text-ink-3">  ›</Text>
          </Text>
        </Pressable>
      )}
    </Pressable>
  )
}

type SymbolName = Parameters<typeof Icon>[0]['name']
const TILES: { label: string; icon: SymbolName; fallback: string; to: string }[] = [
  // Review took Add's place (Oct 2026): Home and Activity both add, and Review left Home's actions.
  { label: 'Review', icon: 'checklist', fallback: '✓', to: '/review' },
  { label: 'Activity', icon: 'list.bullet', fallback: '≡', to: '/money/transactions' },
  { label: 'Budget', icon: 'chart.pie.fill', fallback: '◔', to: '/money/budget' },
  { label: 'Calendar', icon: 'calendar', fallback: '▦', to: '/money/calendar' },
  { label: 'Net worth', icon: 'building.columns.fill', fallback: '▥', to: '/money/net-worth' },
  { label: 'Income', icon: 'arrow.down.circle.fill', fallback: '↓', to: '/money/income' },
  { label: 'Insights', icon: 'lightbulb.fill', fallback: '!', to: '/money/insights' },
]

/** Every Money page as a chunky icon tile, four to a row. */
function Tiles() {
  const { data } = useAccount()
  const toReview = data ? reviewCounts(data.transactions).need : 0
  return (
    <View className="flex-row flex-wrap" style={{ rowGap: 18 }}>
      {TILES.map(t => (
        <Pressable key={t.label} accessibilityRole="button" accessibilityLabel={t.label} onPress={() => { haptic.press(); router.push(t.to as never) }} style={{ width: '25%', alignItems: 'center', gap: 6 }}>
          {({ pressed }) => (
            <>
              <View style={{ width: 62, height: 62, borderRadius: 20, backgroundColor: TAB_COLOR.money, alignItems: 'center', justifyContent: 'center',
                borderBottomWidth: pressed ? 0 : 4, borderBottomColor: 'rgba(0,0,0,0.28)', marginTop: pressed ? 4 : 0 }}>
                <Icon name={t.icon} fallback={t.fallback} size={26} color="#FFFFFF" />
                {t.to === '/review' && toReview > 0 && (
                  <View accessibilityLabel={`${toReview} to review`} style={{ position: 'absolute', top: -6, right: -6, minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: TAB_COLOR.money }} className="font-mono text-[12px] font-bold">{toReview > 99 ? '99+' : toReview}</Text>
                  </View>
                )}
              </View>
              <Text className="text-[13px] font-bold text-ink">{t.label}</Text>
            </>
          )}
        </Pressable>
      ))}
    </View>
  )
}

/** The five most recent transactions, then the way to all of them. */
function Latest({ data }: { data: AccountData }) {
  const rows = data.transactions.slice(0, 5)
  if (!rows.length) return null
  return (
    <View>
      <Text className="mb-1 text-[12px] font-bold uppercase tracking-[2px] text-ink-3">Latest</Text>
      {rows.map((t, i) => <TransactionRow key={t.id} t={t} first={i === 0} />)}
      <View className="mt-3"><Button kind="quiet" small style={{ alignSelf: 'center' }} label="See all" onPress={() => router.push('/money/transactions')} /></View>
    </View>
  )
}

/** Before sign-in: the onboarding numbers, and the way in. */
function SignedOutMoney() {
  const { plan } = usePlan()
  if (!plan) return null
  const now = freedomFor(plan)
  const leaner = freedomFor({ ...plan, monthlySpending: Math.max(0, plan.monthlySpending - 100) })
  const monthsSooner = now.years != null && leaner.years != null ? Math.round((now.years - leaner.years) * 12) : null
  const saving = plan.monthlyIncome - plan.monthlySpending

  return (
    <Screen tab="money" title="Money" subtitle="What you have and manage">
      <Card>
        <Label>Each month</Label>
        <View className="mt-3 gap-2.5">
          <Row label="Take-home pay" value={money(plan.monthlyIncome)} />
          <Row label="Spending" value={money(plan.monthlySpending)} />
          <View className="h-px bg-border" />
          <Row label="Left to save" value={money(saving)} negative={saving < 0} />
        </View>
      </Card>
      {monthsSooner != null && monthsSooner > 0 && (
        <Card soft>
          <Text className="text-[15px] leading-6 text-ink">
            Every <Text className="font-mono text-[15px]">$100</Text> a month you don't spend brings your freedom date about{' '}
            <Text className="font-bold text-teal-deep">{monthsSooner} {monthsSooner === 1 ? 'month' : 'months'} closer</Text>.
          </Text>
        </Card>
      )}
      <Card>
        <Text className="font-display text-[22px] font-bold text-ink">See your real spending</Text>
        <Text className="mt-1 text-[14px] leading-5 text-ink-2">
          Sign in with your UntilFire account to bring in your transactions, budget and net worth from untilfire.com.
        </Text>
        <View className="mt-4"><PrimaryButton label="Sign in" onPress={() => router.push('/sign-in')} /></View>
      </Card>
    </Screen>
  )
}

function Row({ label, value, negative }: { label: string; value: string; negative?: boolean }) {
  return (
    <View className="flex-row justify-between">
      <Text className="text-[16px] text-ink">{label}</Text>
      <Text className={`font-mono text-[16px] ${negative ? 'text-neg-ink' : 'text-ink'}`}>{value}</Text>
    </View>
  )
}
