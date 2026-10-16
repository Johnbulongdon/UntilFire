import { router } from 'expo-router'
import { Button } from '@/components/Button'
import { useEffect, useMemo, useState } from 'react'
import { Pressable, View } from 'react-native'

import { BankBridge } from '@/components/BankBridge'
import { LoadingState } from '@/components/LoadingState'
import { DetailScreen } from '@/components/DetailScreen'
import { Card, Label } from '@/components/Screen'
import { Text } from '@/components/Text'
import { EmptyState } from '@/components/EmptyState'
import { DEFAULT_MORTGAGE_RATE_PCT, payoffYear } from '@/engine'
import { isMortgageAccount } from '@/lib/balances'
import { compactMoney, money } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { netWorthOf } from '@/lib/net-worth'
import { needOf, typicalBy } from '@/lib/money-data'
import { withdrawalsLeftLabel } from '@engine/savings-limits.ts'
import { useAccount, type AccountData } from '@/state/account'
import { useAuth } from '@/state/auth'

const KIND: Record<string, string> = { depository: 'Bank', investment: 'Investments', credit: 'Credit card', loan: 'Loan' }
// The website's emergency-fund rule: needs are these budgets; 1.5 months is the floor, 6 the target.
const NEED_KEYS = ['housing', 'food', 'transport', 'healthcare']
const FLOOR_MONTHS = 1.5
const TARGET_MONTHS = 6

/** Net Worth and Debts from the website on one page: totals, history, the split, editable balances and mortgages, accounts. */
export default function NetWorth() {
  const { data, loading, refresh } = useAccount()
  if (!data) return <DetailScreen back="Money" title="Net worth"><LoadingState /></DetailScreen>
  const nw = netWorthOf(data)
  const scale = Math.max(nw.assetTotal, nw.owedTotal, 1)

  return (
    <DetailScreen back="Money" title="Net worth" refreshing={loading} onRefresh={refresh}>
      <Card>
        <Label>What you own minus what you owe</Label>
        <Text className={`mt-1 font-mono text-[34px] ${nw.netWorth < 0 ? 'text-neg-ink' : 'text-ink'}`}>{money(nw.netWorth)}</Text>
        <View className="mt-4 gap-2">
          <Bar label="Own" value={nw.assetTotal} share={nw.assetTotal / scale} color="bg-green" />
          <Bar label="Owe" value={nw.owedTotal} share={nw.owedTotal / scale} color="bg-neg" />
        </View>
      </Card>

      <History data={data} />
      <EmergencyFund data={data} />

      <Card>
        <View className="flex-row justify-between">
          <Label>Assets</Label>
          <Button small kind="quiet" label="Edit balances" onPress={() => { haptic.tick(); router.push('/balances') }} />
        </View>
        {nw.assets.length === 0
          ? <EmptyState size={88} title="Nothing added yet" body="Add what you have in cash, savings and investments." />
          : nw.assets.map((a, i) => <Row key={a.label} label={a.label} value={compactMoney(a.value)} first={i === 0} />)}
      </Card>

      <Card>
        <View className="flex-row justify-between">
          <Label>Debts</Label>
          <Button small kind="quiet" label="Edit other debt" onPress={() => { haptic.tick(); router.push('/balances') }} />
        </View>
        {nw.owed.length === 0
          ? <Text className="mt-2 text-[14px] text-ink-2">No debts. </Text>
          : nw.owed.map((d, i) => <Row key={d.label} label={d.label} value={`−${compactMoney(d.value)}`} first={i === 0} negative />)}
      </Card>

      <Card>
        <View className="flex-row justify-between">
          <Label>Mortgages</Label>
          <Button small kind="quiet" label="+ Add" onPress={() => { haptic.tick(); router.push('/mortgage') }} />
        </View>
        {data.typed.mortgages.length === 0 ? (
          <Text className="mt-2 text-[14px] text-ink-2">None added.</Text>
        ) : data.typed.mortgages.map((m, i) => {
          const year = payoffYear(m.balance, m.monthly, m.ratePct ?? DEFAULT_MORTGAGE_RATE_PCT)
          return (
            <Pressable accessibilityRole="button" key={m.id} onPress={() => { haptic.tick(); router.push({ pathname: '/mortgage', params: { id: m.id } }) }}
              className={`flex-row items-center justify-between py-2.5 ${i > 0 ? 'border-t border-border' : ''}`}>
              <View>
                <Text className="text-[15px] font-semibold text-ink">{m.name}</Text>
                <Text className="text-[12px] text-ink-3">{money(m.monthly)}/mo{year ? ` · paid off ${year}` : ''}</Text>
              </View>
              <Text className="font-mono text-[15px] text-neg-ink">−{compactMoney(m.balance)}</Text>
            </Pressable>
          )
        })}
        {data.plaidAccounts.some(isMortgageAccount) && (
          <Text className="mt-2 text-[12px] text-ink-3">A connected mortgage is counted instead of these.</Text>
        )}
      </Card>

      <Accounts data={data} />
    </DetailScreen>
  )
}

/** Invested money over time, from the snapshots the website and app record on each change. */
function History({ data }: { data: AccountData }) {
  const points = data.snapshots
  if (points.length < 2) return null
  const values = points.map(p => p.value)
  const min = Math.min(...values), max = Math.max(...values)
  const span = Math.max(max - min, 1)
  const change = values[values.length - 1] - values[0]
  const since = new Date(points[0].at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  return (
    <Card>
      <Label>Invested over time</Label>
      <Text className="mt-1 text-[14px] text-ink-2">
        <Text className={`font-mono text-[14px] ${change >= 0 ? 'text-teal-deep' : 'text-neg-ink'}`}>{change >= 0 ? '+' : '−'}{compactMoney(Math.abs(change))}</Text> since {since}
      </Text>
      <View className="mt-3 h-24 flex-row items-end" style={{ gap: 2 }}>
        {points.map((p, i) => (
          <View key={i} className="flex-1 rounded-t bg-teal" style={{ height: `${8 + ((p.value - min) / span) * 92}%`, opacity: 0.35 + 0.65 * (i / (points.length - 1)) }} />
        ))}
      </View>
    </Card>
  )
}

/** Months of essentials your cash covers, against the website's floor and target. */
function EmergencyFund({ data }: { data: AccountData }) {
  const needsBudget = NEED_KEYS.reduce((s, k) => s + (data.budget[k] ?? 0), 0)
  // Without need budgets, your actual needs in a typical month (your need/want answers) before a 60% guess.
  const spentNeeds = useMemo(() => typicalBy(data.transactions, needOf).get('need') ?? 0, [data.transactions])
  const needs = needsBudget > 0 ? needsBudget : spentNeeds > 0 ? spentNeeds : Object.values(data.budget).reduce((s, v) => s + v, 0) * 0.6
  const basis = needsBudget > 0 ? 'your need budgets' : spentNeeds > 0 ? 'what your needs usually cost' : 'your budget'
  if (!(needs > 0)) return null
  const months = data.balances.cashSavings / needs
  const state = months <= 0 ? 'Missing' : months < FLOOR_MONTHS ? 'Fragile' : months < TARGET_MONTHS ? 'Building' : 'Healthy'
  const tone = state === 'Healthy' ? 'text-pos-ink' : state === 'Building' ? 'text-warn' : 'text-neg-ink'
  return (
    <Card>
      <View className="flex-row justify-between">
        <Label>Emergency fund</Label>
        <Text className={`text-[13px] font-bold ${tone}`}>{state}</Text>
      </View>
      <Text className="mt-1 font-mono text-[24px] text-ink">{months.toFixed(1)} months</Text>
      <Text className="text-[13px] text-ink-3">of essentials ({money(needs)}/mo) covered by cash and savings</Text>
      <View className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
        <View className={`h-full rounded-full ${state === 'Healthy' ? 'bg-green' : state === 'Building' ? 'bg-warn' : 'bg-neg'}`} style={{ width: `${Math.min(1, months / TARGET_MONTHS) * 100}%` }} />
      </View>
      <Text className="mt-1.5 text-[12px] text-ink-3">
        Target <Text className="font-mono text-[12px] text-ink-3">{money(needs * TARGET_MONTHS)}</Text>, {TARGET_MONTHS} months of needs from {basis}. Below {FLOOR_MONTHS} months is fragile. Wants aren't counted: they'd stop if income did.
      </Text>
    </Card>
  )
}

interface Holding { account_id: string; security_id: string; quantity: number; institution_value: number | null }

/** Connected accounts, and the holdings inside investment accounts (fetched when opened). */
function Accounts({ data }: { data: AccountData }) {
  const { session } = useAuth()
  const [holdings, setHoldings] = useState<{ list: Holding[]; names: Record<string, { name: string | null; ticker_symbol: string | null }> } | null>(null)
  const hasInvestments = data.plaidAccounts.some(a => a.type === 'investment')

  useEffect(() => {
    if (!session || !hasInvestments) return
    fetch('https://www.untilfire.com/api/plaid/holdings', { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d) setHoldings({ list: d.holdings ?? [], names: d.securities ?? {} }) })
      .catch(() => {})
  }, [session, hasInvestments])

  if (data.plaidAccounts.length === 0) {
    return (
      <Card soft>
        <Label>Connected accounts</Label>
        <Text className="mt-2 text-[14px] leading-5 text-ink-2">
          No banks connected; the totals above come from the balances you typed.
        </Text>
        <View className="mt-3"><BankBridge /></View>
      </Card>
    )
  }
  return (
    <Card>
      <Label>Connected accounts</Label>
      {data.plaidAccounts.map((a, i) => {
        const inside = (holdings?.list ?? []).filter(h => h.account_id === a.plaid_account_id)
        return (
          <View key={a.id} className={`py-2.5 ${i > 0 ? 'border-t border-border' : ''}`}>
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text numberOfLines={1} className="text-[15px] font-semibold text-ink">{a.name}{a.mask ? ` ••${a.mask}` : ''}</Text>
                <Text className="text-[12px] text-ink-3">{isMortgageAccount(a) ? 'Mortgage' : KIND[a.type] ?? a.type}</Text>
                {a.withdrawal_limit != null && (
                  <Text className={`text-[12px] ${(a.withdrawals?.length ?? 0) > a.withdrawal_limit ? 'font-semibold text-neg-ink' : 'text-ink-2'}`}>
                    {withdrawalsLeftLabel(a.withdrawal_limit, a.withdrawals?.length ?? 0)}
                  </Text>
                )}
              </View>
              <Text className={`font-mono text-[15px] ${a.type === 'credit' || a.type === 'loan' ? 'text-neg-ink' : 'text-ink'}`}>{money(a.balance_current ?? 0)}</Text>
            </View>
            {(a.withdrawals ?? []).map((w, j) => (
              <View key={`w${j}`} className="mt-1 flex-row justify-between pl-3">
                <Text numberOfLines={1} className="flex-1 pr-3 text-[13px] text-ink-2">{w.date.slice(5).replace('-', '/')} · {w.description ?? 'Transfer'}{w.pending ? ' · pending' : ''}</Text>
                <Text className="font-mono text-[13px] text-ink-2">{money(w.amount)}</Text>
              </View>
            ))}
            {inside.slice(0, 6).map(h => (
              <View key={h.security_id} className="mt-1 flex-row justify-between pl-3">
                <Text numberOfLines={1} className="flex-1 pr-3 text-[13px] text-ink-2">{holdings?.names[h.security_id]?.ticker_symbol ?? holdings?.names[h.security_id]?.name ?? 'Holding'}</Text>
                <Text className="font-mono text-[13px] text-ink-2">{compactMoney(h.institution_value ?? 0)}</Text>
              </View>
            ))}
          </View>
        )
      })}
      <View className="mt-3"><BankBridge another compact /></View>
    </Card>
  )
}

function Bar({ label, value, share, color }: { label: string; value: number; share: number; color: string }) {
  return (
    <View className="flex-row items-center gap-3">
      <Text className="w-9 text-[13px] text-ink-3">{label}</Text>
      <View className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
        <View className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(1, share)) * 100}%` }} />
      </View>
      <Text className="w-16 text-right font-mono text-[13px] text-ink">{compactMoney(value)}</Text>
    </View>
  )
}

function Row({ label, value, first, negative }: { label: string; value: string; first?: boolean; negative?: boolean }) {
  return (
    <View className={`flex-row justify-between py-2.5 ${first ? 'mt-1' : 'border-t border-border'}`}>
      <Text className="text-[15px] text-ink-2">{label}</Text>
      <Text className={`font-mono text-[15px] ${negative ? 'text-neg-ink' : 'text-ink'}`}>{value}</Text>
    </View>
  )
}
