import AsyncStorage from '@react-native-async-storage/async-storage'

import { ladderViewFromPlan, pickNextMove, type NextMove } from '@/engine'
import { EMPTY_PLAN, contributionFacts } from '@/lib/contribution-facts'
import { expenseCategories } from '@/lib/custom-categories'
import { money } from '@/lib/format'
import { splitBudget } from '@/lib/budget-split'
import type { AccountData } from '@/state/account'

/**
 * Home's one next move, the website's rule (lib/next-move, D-89): a category
 * over budget, then no budget, then the contribution ladder's first step.
 * Over-budget is judged on the everyday part, never bill or yearly categories,
 * the same split as "left" (lib/budget-split). The phone has no what-if
 * fallback yet; with nothing to say, the card hides.
 */
export function phoneNextMove(data: AccountData, snoozed: Set<string>): NextMove | null {
  const split = splitBudget(data)
  const labels = new Map(expenseCategories().map(c => [c.key, c.label]))
  const categories = [...split.everydayBy.entries()]
    .filter(([k]) => !split.billKeys.has(k))
    .map(([key, v]) => ({ key, label: labels.get(key) ?? key, budget: v.budget, spent: v.spent }))
  const ladder = ladderViewFromPlan(data.contributionPlan ?? EMPTY_PLAN, contributionFacts(data))
  return pickNextMove({
    categories,
    hasBudget: split.everydayBudget + split.billsMonthly > 0,
    ladder: ladder ? ladder.waterfall.fills : null,
    fallback: null,
    fmt: n => money(n),
    snoozed: key => snoozed.has(key),
  })
}

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
