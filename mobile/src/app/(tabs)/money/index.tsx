import { router } from 'expo-router'
import { View } from 'react-native'

import { LoadingState } from '@/components/LoadingState'

import { AddButton } from '@/components/AddButton'
import { BudgetPace } from '@/components/BudgetPace'
import { HubCard, MoreList } from '@/components/HubCard'
import { PrimaryButton } from '@/components/PrimaryButton'
import { Card, Label, Screen } from '@/components/Screen'
import { Text } from '@/components/Text'
import { upcoming } from '@/lib/bills'
import { money } from '@/lib/format'
import { categoryOf, dayLabel, monthIncome, monthSpend, thisMonth } from '@/lib/money-data'
import { netWorthOf } from '@/lib/net-worth'
import { useAccount, type AccountData } from '@/state/account'
import { useAuth } from '@/state/auth'
import { freedomFor, usePlan } from '@/state/plan'
import { colors } from '@/theme/colors'

/** Money's hub: one card per page, each showing its number (navigation study, "Hubs, not sub-tabs"). */
export default function Money() {
  const { session } = useAuth()
  const { data, loading, refresh } = useAccount()

  if (!session) return <SignedOutMoney />

  return (
    <View className="flex-1">
    <Screen title="Money" subtitle="What you have and manage" refreshing={loading && !!data} onRefresh={refresh}>
      {!data ? (
        <LoadingState cards={4} />
      ) : (
        <>
          <ThisMonth data={data} />
          <BudgetSummary data={data} />
          <BillsSummary data={data} />
          <NetWorthSummary data={data} />
          <MoreList rows={[
            { label: 'Income', note: 'Salary to take-home, pension, employer money', onPress: () => router.push('/money/income') },
            { label: 'Insights', note: 'This month explained, and in and out over time', onPress: () => router.push('/money/insights') },
            { label: 'Categories', note: 'Spending by category, and your own categories', onPress: () => router.push('/money/categories') },
          ]} />
        </>
      )}
    </Screen>
    {data ? <AddButton /> : null}
    </View>
  )
}

/** The website's MonthCard, opening Transactions. */
function ThisMonth({ data }: { data: AccountData }) {
  const month = thisMonth()
  const { total, categories } = monthSpend(data.transactions, month)
  const top = categories.slice(0, 3)
  const rest = categories.slice(3).reduce((s, c) => s + c.usd, 0)
  const shown = [
    ...top.map(c => ({ key: c.key, label: categoryOf(c.key).label, color: categoryOf(c.key).color, usd: c.usd })),
    ...(rest > 0 ? [{ key: '_rest', label: 'Other', color: colors.ink3, usd: rest }] : []),
  ]
  const scale = Math.max(total, 1)
  const income = monthIncome(data.transactions, month)
  const count = data.transactions.filter(t => t.date.startsWith(month)).length

  return (
    <HubCard label="This month" onPress={() => router.push('/money/transactions')}>
      <View className="mt-1 flex-row flex-wrap items-baseline gap-2">
        <Text className="font-mono text-[28px] text-ink">{money(total)}</Text>
        <Text className="text-[13px] text-ink-3">spent{income > 0 ? ` · ${money(income)} in` : ''}</Text>
      </View>
      <View className="mt-3 h-2 flex-row overflow-hidden rounded bg-surface-2" style={{ gap: 2 }}>
        {shown.map(c => <View key={c.key} style={{ width: `${(c.usd / scale) * 100}%`, backgroundColor: c.color }} />)}
      </View>
      <View className="mt-2.5 flex-row flex-wrap gap-x-3 gap-y-1">
        {shown.map(c => (
          <View key={c.key} className="flex-row items-center gap-1.5">
            <View className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
            <Text className="text-[13px] text-ink-2">{c.label}</Text>
          </View>
        ))}
      </View>
      <Text className="mt-3 text-[13px] font-bold text-pos-ink">{count} {count === 1 ? 'transaction' : 'transactions'} →</Text>
    </HubCard>
  )
}

function BudgetSummary({ data }: { data: AccountData }) {
  const budget = Object.values(data.budget).reduce((s, v) => s + v, 0)
  const { total } = monthSpend(data.transactions, thisMonth())
  return (
    <HubCard label="Budget" onPress={() => router.push('/money/budget')}>
      {budget > 0 ? (
        <View className="mt-1"><BudgetPace spent={total} budget={budget} /></View>
      ) : (
        <Text className="mt-1 text-[14px] text-ink-2">No budget set yet.</Text>
      )}
    </HubCard>
  )
}

function BillsSummary({ data }: { data: AccountData }) {
  const next = upcoming(data.bills, 30).filter(e => e.type === 'expense').slice(0, 3)
  return (
    <HubCard label="Calendar" onPress={() => router.push('/money/calendar')}>
      {next.length === 0 ? (
        <Text className="mt-1 text-[14px] text-ink-2">Nothing due in the next 30 days.</Text>
      ) : next.map((e, i) => (
        <View key={`${e.iso}-${e.description}-${i}`} className={`flex-row justify-between py-2 ${i > 0 ? 'border-t border-border' : ''}`}>
          <Text numberOfLines={1} className="flex-1 pr-3 text-[15px] text-ink">{e.description}</Text>
          <Text className="text-[13px] text-ink-3">{dayLabel(e.iso)}  </Text>
          <Text className={`font-mono text-[15px] ${e.overdue ? 'text-neg-ink' : 'text-ink'}`}>{money(Math.abs(e.amount))}</Text>
        </View>
      ))}
    </HubCard>
  )
}

function NetWorthSummary({ data }: { data: AccountData }) {
  const nw = netWorthOf(data)
  return (
    <HubCard label="Net worth" onPress={() => router.push('/money/net-worth')}>
      <Text className={`mt-1 font-mono text-[28px] ${nw.netWorth < 0 ? 'text-neg-ink' : 'text-ink'}`}>{money(nw.netWorth)}</Text>
      <Text className="text-[13px] text-ink-3">
        {money(nw.assetTotal)} owned · {money(nw.owedTotal)} owed
      </Text>
    </HubCard>
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
    <Screen title="Money" subtitle="What you have and manage">
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
