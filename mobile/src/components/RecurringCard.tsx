import { router } from 'expo-router'
import { useMemo } from 'react'
import { Pressable, View } from 'react-native'

import { Card, Label } from '@/components/Screen'
import { Text } from '@/components/Text'
import { detectRecurring, FALLBACK_RATES, recurrenceToMonthly, sameMerchant, toMonthly, type Recurrence } from '@/engine'
import { money } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { defaultNeed } from '@/lib/review'
import { toUSD, type AccountData } from '@/state/account'
import { project, type Freedom } from '@/state/freedom'

interface Item { name: string; monthly: number; bill: boolean; essential: boolean; sooner: number | null }

// Rent, family and care costs read as essential even when filed as "Other" (Oct 2026: "without your rent" felt hurtful).
const ESSENTIAL_NAME = /\b(rent|mortgage|landlord|child ?care|daycare|nursery|school|tuition|insurance|medical|pharmacy|electric|water|utilit)/i

/** A need: tagged so, a need category, or an essential-sounding name. Needs never get a "sooner" number. */
function isEssential(name: string, category: string | null, tags: string[] = []): boolean {
  if (tags.includes('need')) return true
  if (tags.includes('want')) return false
  return (!!category && defaultNeed(category) === 'need') || ESSENTIAL_NAME.test(name)
}

/**
 * What repeats every month: bills set up in Calendar plus repeating payments
 * found in transactions. Optional ones carry how much sooner the freedom date
 * comes without them (the full engine, spending lowered by that amount);
 * essentials (housing, food, care, anything tagged Need) never do.
 */
export function useRecurring(data: AccountData, freedom: Freedom | null): Item[] {
  return useMemo(() => {
    const list: Omit<Item, 'sooner'>[] = data.bills
      .filter(b => b.transaction_type === 'expense' && b.recurrence !== 'none')
      .map(b => ({ name: b.description, monthly: recurrenceToMonthly(Math.abs(toUSD(b.amount, b.currency)), b.recurrence as Recurrence), bill: true, essential: isEssential(b.description, b.category) }))
    const raw = data.transactions.filter(t => t.transaction_type === 'expense')
      .map(t => ({ id: t.id, date: t.date, amount: t.amount, currency: t.currency, description: t.description, category: t.category, transaction_type: 'expense' as const }))
    for (const d of detectRecurring(raw, FALLBACK_RATES).expenses) {
      if (d.frequency === 'irregular' || list.some(i => sameMerchant(i.name, d.description))) continue
      const tags = data.transactions.find(t => t.transaction_type === 'expense' && sameMerchant(t.description, d.description))?.tags
      list.push({ name: d.description, monthly: toMonthly(Math.abs(d.avgAmountUSD), d.frequency), bill: false, essential: isEssential(d.description, d.category, tags) })
    }
    const base = freedom?.inputs && freedom.years != null && freedom.years > 0 ? freedom.years : null
    return list.filter(i => i.monthly > 0).sort((a, b) => b.monthly - a.monthly).slice(0, 8).map(i => {
      if (i.essential || base == null || !freedom?.inputs) return { ...i, sooner: null }
      const without = project({ ...freedom.inputs, monthlyExpenses: Math.max(0, freedom.inputs.monthlyExpenses - i.monthly) }, data.age)
      return { ...i, sooner: without.years != null ? Math.max(0, (base - without.years) * 12) : null }
    })
  }, [data, freedom])
}

export function RecurringCard({ data, freedom }: { data: AccountData; freedom: Freedom | null }) {
  const items = useRecurring(data, freedom)
  if (items.length === 0) return null
  const total = items.reduce((s, i) => s + i.monthly, 0)
  return (
    <Card>
      <Label>Recurring</Label>
      <Text className="mt-1 text-[14px] leading-5 text-ink-2">
        These repeat to <Text className="font-mono text-[14px] text-ink">{money(total)}</Text> a month. Optional ones show how much sooner work becomes optional without them.
      </Text>
      <View className="mt-3 border-t border-border pt-2">
        {items.map(i => (
          <Pressable key={i.name} accessibilityRole="button" accessibilityLabel={`${i.name}, ${money(i.monthly)} a month${i.essential ? ', essential' : i.sooner != null ? `, ${soonerLabel(i.sooner)}` : ''}`}
            onPress={() => { haptic.tick(); router.push('/money/calendar') }} className="flex-row items-center py-2 active:opacity-70">
            <View className="flex-1 pr-3">
              <Text numberOfLines={1} className="text-[15px] text-ink">{i.name}</Text>
              <Text className="text-[12px] text-ink-3">{i.bill ? 'In your bills' : 'Found in your spending'}</Text>
            </View>
            <View className="items-end">
              <Text className="font-mono text-[14px] text-ink">{money(i.monthly)}/mo</Text>
              {i.essential ? <Text className="text-[12px] text-ink-3">Essential</Text>
                : i.sooner != null && <Text className="text-[12px] text-teal-deep">{soonerLabel(i.sooner)}</Text>}
            </View>
          </Pressable>
        ))}
      </View>
    </Card>
  )
}

export function soonerLabel(months: number): string {
  if (months < 0.5) return 'a few days sooner'
  const m = Math.round(months)
  return m < 24 ? `free ${m} ${m === 1 ? 'month' : 'months'} sooner` : `free ${(months / 12).toFixed(1)} years sooner`
}

/** Home's one line from the card above: the optional repeating payment worth the most time, when it's at least a month. Never an essential. */
export function RecurringTeaser({ data, freedom }: { data: AccountData; freedom: Freedom | null }) {
  const top = useRecurring(data, freedom).filter(i => (i.sooner ?? 0) >= 1).sort((a, b) => b.sooner! - a.sooner!)[0]
  if (!top) return null
  return (
    <Pressable accessibilityRole="button" onPress={() => { haptic.tick(); router.push('/money/insights') }} className="active:opacity-70">
      <Card>
        <Text className="text-[15px] leading-5 text-ink">
          {top.name} (<Text className="font-mono text-[15px]">{money(top.monthly)}/mo</Text>) is optional. Without it, you'd be <Text className="font-bold text-teal-deep">{soonerLabel(top.sooner!)}</Text>.
        </Text>
        <Text className="mt-1 text-[13px] text-ink-3">See everything that repeats ›</Text>
      </Card>
    </Pressable>
  )
}
