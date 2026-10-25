import AsyncStorage from '@react-native-async-storage/async-storage'

import { isRent, ladderViewFromPlan, pickNextMove, type NextMove, type RungKind } from '@/engine'
import { EMPTY_PLAN, contributionFacts } from '@/lib/contribution-facts'
import { expenseCategories } from '@/lib/custom-categories'
import { money } from '@/lib/format'
import { splitBudget } from '@/lib/budget-split'
import type { AccountData } from '@/state/account'
import type { Plan, Worry } from '@/state/plan'

/** A next move on the phone: the shared one, plus why it was picked and, for a lease, where it opens. */
export type PhoneMove = NextMove & { because?: string; href?: { pathname: '/lease'; params: { bill: string } } }

/** The ladder steps each worry brings forward, in order. */
const WORRY_STEPS: Partial<Record<Worry, RungKind[]>> = {
  debt: ['high-interest-debt', 'low-interest-debt'],
  invest: ['tax-advantaged', 'taxable'],
}
const BECAUSE: Record<Exclude<Worry, 'none'>, string> = {
  payday: 'Because you said money runs out before payday.',
  debt: 'Because you said you want debt gone.',
  invest: "Because you said you're not sure where to invest.",
}

/**
 * Home's one next move, the website's rule (lib/next-move, D-89): a category
 * over budget, then no budget, then the contribution ladder's first step.
 * Over-budget is judged on the everyday part, never bill or yearly categories,
 * the same split as "left" (lib/budget-split). The phone has no what-if
 * fallback yet; with nothing to say, the card hides.
 *
 * Onboarding's answers shape it (D-104): the worry brings its ladder steps to
 * the front and says so, and a renter whose Rent bill has no lease date is
 * asked for it once the money moves are done.
 */
export function phoneNextMove(data: AccountData, snoozed: Set<string>, plan?: Pick<Plan, 'worry' | 'housing'> | null): PhoneMove | null {
  const split = splitBudget(data)
  const labels = new Map(expenseCategories().map(c => [c.key, c.label]))
  const categories = [...split.everydayBy.entries()]
    .filter(([k]) => !split.billKeys.has(k))
    .map(([key, v]) => ({ key, label: labels.get(key) ?? key, budget: v.budget, spent: v.spent }))
  const ladder = ladderViewFromPlan(data.contributionPlan ?? EMPTY_PLAN, contributionFacts(data))
  const worry = plan?.worry
  const front = (worry && WORRY_STEPS[worry]) ?? []
  const fills = ladder ? [...ladder.waterfall.fills].sort((a, b) => rank(front, a.kind) - rank(front, b.kind)) : null
  const move = pickNextMove({
    categories,
    hasBudget: split.everydayBudget + split.billsMonthly > 0,
    ladder: fills,
    fallback: null,
    fmt: n => money(n),
    snoozed: key => snoozed.has(key),
  })
  if (move && worry && worry !== 'none') {
    const fits = worry === 'payday' ? move.door === 'money' : front.some(k => move.key === `ladder:${k}`)
    if (fits) return { ...move, ...(move.key === 'budget' && worry === 'payday' ? { title: 'Make payday last: set a day-to-day budget' } : {}), because: BECAUSE[worry] }
  }
  if (move) return move
  const rent = plan?.housing === 'rent' ? data.bills.find(b => isRent(b) && !b.lease_ends_on) : undefined
  if (rent && !snoozed.has('lease')) {
    return {
      key: 'lease', door: 'money', tab: 'cashflow', button: 'Add lease date', payoff: null,
      title: 'Add your lease end date so we can remind you before the notice deadline',
      href: { pathname: '/lease', params: { bill: rent.id } },
    }
  }
  return null
}

const rank = (front: RungKind[], kind: RungKind) => { const i = front.indexOf(kind); return i < 0 ? front.length : i }

const SNOOZE_DAYS = 7
const KEY = 'next-move-snoozed'

/** Moves put off with "Not now", still within their week. */
export async function snoozedMoves(now = Date.now()): Promise<Set<string>> {
  try {
    const all = JSON.parse((await AsyncStorage.getItem(KEY)) ?? '{}') as Record<string, number>
    return new Set(Object.entries(all).filter(([, until]) => until > now).map(([k]) => k))
  } catch {
    return new Set()
  }
}

export async function snoozeMove(key: string, now = Date.now()) {
  try {
    const all = JSON.parse((await AsyncStorage.getItem(KEY)) ?? '{}') as Record<string, number>
    const kept = Object.fromEntries(Object.entries(all).filter(([, until]) => until > now))
    await AsyncStorage.setItem(KEY, JSON.stringify({ ...kept, [key]: now + SNOOZE_DAYS * 86_400_000 }))
  } catch { /* the move shows again, which is harmless */ }
}
