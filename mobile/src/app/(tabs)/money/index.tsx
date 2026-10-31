import { router } from 'expo-router'
import { Pressable, View } from 'react-native'

import { BankBridge } from '@/components/BankBridge'
import { Button } from '@/components/Button'
import { FeatureTile, MONEY_FEATURES } from '@/components/FeatureTile'
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
import { tabInk } from '@/theme/colors'
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
      {budget > 0 && <Text className="text-[15px] text-ink-2">{left >= 0 ? `${money(left)} left of ${money(budget)} everyday` : `${money(-left)} over ${money(budget)} everyday`}</Text>}
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

/** Money's destinations retain their routes and review count. */
function Tiles() {
  const { data } = useAccount()
  const toReview = data ? reviewCounts(data.transactions).need : 0
  return <View className="flex-row flex-wrap" style={{ rowGap: 18 }}>
    {MONEY_FEATURES.map(t => <FeatureTile key={t.to} feature={t} compact count={t.to === '/review' ? toReview : 0}
      onPress={() => { haptic.press(); router.push(t.to as never) }} />)}
  </View>
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
            Every <Text className="font-mono text-[15px]">$100</Text> a month you don&apos;t spend brings your freedom date about{' '}
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
