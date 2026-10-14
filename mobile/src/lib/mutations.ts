/**
 * The app's writes, each doing what the website does for the same action, so
 * a change made on the phone looks the same on untilfire.com. Row-level
 * security limits every write to the signed-in user's own rows.
 */
import { addRecurrence, isoDay, parseIsoDate, type LifeVersion } from '@/engine'
import { supabase } from '@/lib/supabase'
import type { Bill, MerchantRule } from '@/state/account'

export interface TransactionDraft {
  id?: string
  date: string
  amount: number
  currency: string
  description: string
  category: string
  sub_category: string | null
  notes: string
  /** What came back; never more than the amount. */
  refund_amount: number
  transaction_type: 'expense' | 'income'
  /** need or want for an expense, so a transaction you add yourself is already filed (D-73). */
  need?: 'need' | 'want' | null
  /** The tags already on an edited row, kept apart from need/want. */
  tags?: string[]
}

/** Add or edit a transaction, as TransactionsTab's save does (app/dashboard/TransactionsTab.tsx). */
export async function saveTransaction(userId: string, draft: TransactionDraft): Promise<string | null> {
  const payload = {
    user_id: userId,
    date: draft.date,
    amount: draft.amount,
    refund_amount: Math.min(Math.max(0, draft.refund_amount), draft.amount),
    notes: draft.notes.trim(),
    currency: draft.currency,
    description: draft.description.trim(),
    category: draft.category || (draft.transaction_type === 'income' ? 'other_income' : 'other'),
    sub_category: draft.sub_category || null,
    transaction_type: draft.transaction_type,
    tags: [...(draft.tags ?? []).filter(g => g !== 'need' && g !== 'want'), ...(draft.transaction_type === 'expense' && draft.need ? [draft.need] : [])],
  }
  const { error } = draft.id
    ? await supabase.from('expenses').update(payload).eq('id', draft.id)
    : await supabase.from('expenses').insert(payload)
  return error ? (draft.id ? 'Couldn\'t save your changes. Please try again.' : 'Couldn\'t add the transaction. Please try again.') : null
}

export async function deleteTransaction(id: string): Promise<string | null> {
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  return error ? 'Couldn\'t delete it. Please try again.' : null
}

/**
 * Tick off a bill, as ExpectedPaymentsTab does: a repeating bill moves its
 * due date to the next occurrence; a one-off is marked completed.
 */
export async function markBillPaid(bill: Bill): Promise<string | null> {
  if (bill.recurrence && bill.recurrence !== 'none') {
    const current = parseIsoDate(bill.due_date)
    const due_date = current ? isoDay(addRecurrence(current, bill.recurrence as Parameters<typeof addRecurrence>[1])) : bill.due_date
    const { error } = await supabase.from('expected_payments').update({ due_date, completed_at: null }).eq('id', bill.id)
    return error ? 'Couldn\'t update the bill. Please try again.' : null
  }
  const { error } = await supabase.from('expected_payments').update({ completed_at: new Date().toISOString() }).eq('id', bill.id)
  return error ? 'Couldn\'t update the bill. Please try again.' : null
}

/**
 * Set the monthly budget per category. Like the dashboard's save, read the row
 * first and change only the category amounts, so the FIRE profile and custom
 * categories stored beside them are left exactly as they were.
 */
export async function saveBudget(userId: string, budget: Record<string, number>): Promise<string | null> {
  const { data: row, error: readError } = await supabase.from('user_budget').select('expenses').eq('user_id', userId).maybeSingle()
  if (readError) return 'Couldn\'t save the budget. Please try again.'
  const expenses = { ...((row?.expenses as Record<string, unknown>) ?? {}), ...budget }
  const { error } = row
    ? await supabase.from('user_budget').update({ expenses, updated_at: new Date().toISOString() }).eq('user_id', userId)
    : await supabase.from('user_budget').insert({ user_id: userId, expenses })
  return error ? 'Couldn\'t save the budget. Please try again.' : null
}

export interface BillDraft {
  id?: string
  description: string
  amount: number
  currency: string
  transaction_type: 'expense' | 'income'
  due_date: string
  recurrence: string
  category: string | null
}

/** Add or edit a bill or payday, as ExpectedPaymentsTab's form does. */
export async function saveBill(userId: string, draft: BillDraft): Promise<string | null> {
  const payload = {
    user_id: userId,
    description: draft.description.trim(),
    amount: draft.amount,
    currency: draft.currency,
    transaction_type: draft.transaction_type,
    due_date: draft.due_date,
    recurrence: draft.recurrence,
    // A repeating bill is never finished, so switching to repeat reopens it.
    ...(draft.recurrence !== 'none' ? { completed_at: null } : {}),
    category: draft.category || null,
  }
  const { error } = draft.id
    ? await supabase.from('expected_payments').update(payload).eq('id', draft.id)
    : await supabase.from('expected_payments').insert(payload)
  return error ? 'Couldn\'t save it. Please try again.' : null
}

export async function deleteBill(id: string): Promise<string | null> {
  const { error } = await supabase.from('expected_payments').delete().eq('id', id)
  return error ? 'Couldn\'t delete it. Please try again.' : null
}

/**
 * Change part of the FIRE profile (typed balances, debts, mortgages) the way
 * the dashboard's save does: read the row, change only the named fields inside
 * `_fire_profile`, keep everything else. `fire_assets` mirrors the 401(k), as
 * the dashboard keeps it for older readers, and a change to invested money
 * records a net worth snapshot, as the dashboard does.
 */
export async function saveFireProfile(userId: string, patch: Record<string, unknown>): Promise<string | null> {
  const { data: row, error: readError } = await supabase.from('user_budget').select('expenses').eq('user_id', userId).maybeSingle()
  if (readError) return 'Couldn\'t save. Please try again.'
  const expenses = (row?.expenses as Record<string, unknown>) ?? {}
  const before = (expenses._fire_profile as Record<string, unknown>) ?? {}
  const fp = { ...before, ...patch }
  const update: Record<string, unknown> = { expenses: { ...expenses, _fire_profile: fp }, updated_at: new Date().toISOString() }
  if ('k401' in patch) update.fire_assets = Number(patch.k401) || 0
  const { error } = row
    ? await supabase.from('user_budget').update(update).eq('user_id', userId)
    : await supabase.from('user_budget').insert({ user_id: userId, ...update })
  if (error) return 'Couldn\'t save. Please try again.'

  const invested = (f: Record<string, unknown>) => ['k401', 'rothIRA', 'taxable', 'cashSavings'].reduce((s, k) => s + (Number(f[k]) || 0), 0)
  if (invested(fp) !== invested(before)) {
    await supabase.from('net_worth_snapshots').insert({ user_id: userId, portfolio_value: invested(fp) })
  }
  return null
}

/** Set the monthly take-home everything reads (user_budget.income), as Income and Budget do. */
export async function saveIncome(userId: string, monthly: number): Promise<string | null> {
  const { data: row } = await supabase.from('user_budget').select('user_id').eq('user_id', userId).maybeSingle()
  const { error } = row
    ? await supabase.from('user_budget').update({ income: monthly, updated_at: new Date().toISOString() }).eq('user_id', userId)
    : await supabase.from('user_budget').insert({ user_id: userId, income: monthly })
  return error ? 'Couldn\'t save. Please try again.' : null
}

/** Save the account's own categories (user_budget.expenses._custom_cats), as useCustomCategories does. */
export async function saveCustomCategories(userId: string, cats: { key: string; label: string; code: string; color: string; emoji?: string }[]): Promise<string | null> {
  const { data: row, error: readError } = await supabase.from('user_budget').select('expenses').eq('user_id', userId).maybeSingle()
  if (readError) return 'Couldn\'t save. Please try again.'
  const expenses = { ...((row?.expenses as Record<string, unknown>) ?? {}), _custom_cats: cats }
  const { error } = row
    ? await supabase.from('user_budget').update({ expenses, updated_at: new Date().toISOString() }).eq('user_id', userId)
    : await supabase.from('user_budget').insert({ user_id: userId, expenses })
  return error ? 'Couldn\'t save. Please try again.' : null
}

/**
 * Save the contribution plan (profiles.contribution_plan), as the website's
 * saveCloudPlan does, stamped so the newer copy wins between devices.
 */
export async function saveContributionPlan(userId: string, plan: import('@/engine').StoredPlan): Promise<string | null> {
  const { error } = await supabase.from('profiles').update({ contribution_plan: { ...plan, updatedAt: Date.now() } }).eq('user_id', userId)
  return error ? 'Couldn\'t save the plan. Please try again.' : null
}

export interface GoalDraft { id?: string; name: string; emoji: string; target_amount: number; current_saved: number; target_date: string | null }

/** Add or edit a goal (the goals table the website's Goals page reads). */
export async function saveGoal(userId: string, draft: GoalDraft, sortOrder: number): Promise<string | null> {
  const payload = { user_id: userId, name: draft.name.trim(), emoji: draft.emoji, target_amount: draft.target_amount, current_saved: draft.current_saved, target_date: draft.target_date }
  const { error } = draft.id
    ? await supabase.from('goals').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', draft.id)
    : await supabase.from('goals').insert({ ...payload, sort_order: sortOrder })
  return error ? 'Couldn\'t save the goal. Please try again.' : null
}

export async function deleteGoal(id: string): Promise<string | null> {
  const { error } = await supabase.from('goals').delete().eq('id', id)
  return error ? 'Couldn\'t delete it. Please try again.' : null
}

/** Set the age the plan uses (user_budget.fire_age), as the website's profile does. */
export async function saveAge(userId: string, age: number): Promise<string | null> {
  const { error } = await supabase.from('user_budget').update({ fire_age: Math.round(age), updated_at: new Date().toISOString() }).eq('user_id', userId)
  return error ? 'Couldn\'t save your age. Please try again.' : null
}

/** Your name, saved where the website keeps it: the profile and the sign-in record. */
export async function saveDisplayName(userId: string, name: string): Promise<string | null> {
  const [a, b] = await Promise.all([
    supabase.auth.updateUser({ data: { full_name: name.trim() } }),
    supabase.from('profiles').upsert({ user_id: userId, display_name: name.trim(), updated_at: new Date().toISOString() }, { onConflict: 'user_id' }),
  ])
  return a.error || b.error ? 'Couldn\'t save your name. Please try again.' : null
}

/** The currency money is shown in (profiles.default_currency), as the website's Profile sets it. */
export async function saveCurrency(userId: string, currency: string): Promise<string | null> {
  const { error } = await supabase.from('profiles').upsert({ user_id: userId, default_currency: currency, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  return error ? 'Couldn\'t save the currency. Please try again.' : null
}

/**
 * A new account starts from the onboarding answers, as the website does with
 * its calculator prefill: take-home as income, spending as the budget's
 * "other", invested money as cash savings, age and city. Only fills what is
 * empty, so it never overwrites an account that already has numbers.
 */
export async function seedFromOnboarding(userId: string, plan: { monthlyIncome: number; monthlySpending: number; invested: number; age?: number; city?: { name: string }; currency?: string }): Promise<boolean> {
  const { data: row } = await supabase.from('user_budget').select('income, expenses, fire_age').eq('user_id', userId).maybeSingle()
  if (row && Number(row.income) > 0) return false
  const expenses = (row?.expenses as Record<string, unknown>) ?? {}
  const hasBudget = Object.entries(expenses).some(([k, v]) => !k.startsWith('_') && typeof v === 'number' && v > 0)
  const fp = (expenses._fire_profile as Record<string, unknown>) ?? {}
  const next = {
    income: plan.monthlyIncome,
    expenses: {
      ...expenses,
      ...(hasBudget ? {} : { other: plan.monthlySpending }),
      _fire_profile: { ...fp, cashSavings: Number(fp.cashSavings) || plan.invested, ...(plan.city && !fp.cityName ? { cityName: plan.city.name } : {}) },
    },
    ...(plan.age ? { fire_age: plan.age } : {}),
    updated_at: new Date().toISOString(),
  }
  const { error } = row
    ? await supabase.from('user_budget').update(next).eq('user_id', userId)
    : await supabase.from('user_budget').insert({ user_id: userId, ...next })
  // The currency onboarding was answered in becomes the account's.
  if (!error && plan.currency && plan.currency !== 'USD') await saveCurrency(userId, plan.currency)
  return !error
}

/** Compare's saved versions (_fire_profile.comparisons), the last six, as the website keeps them. */
export async function saveComparisons(userId: string, list: LifeVersion[]): Promise<string | null> {
  return saveFireProfile(userId, { comparisons: list.slice(-6) })
}

/**
 * Answer a "Worth a look" flag, as TransactionsTab's resolveFlag does: a card
 * payment becomes a transfer; any other "no" is remembered on the row as an
 * ok:<kind> tag so it isn't asked again. A confirmed duplicate is deleted.
 */
export async function resolveFlag(tx: { id: string; tags: string[] }, kind: string, confirmed: boolean): Promise<string | null> {
  if (confirmed && kind === 'duplicate') return deleteTransaction(tx.id)
  const patch = confirmed && kind === 'card_payment'
    ? { transaction_type: 'transfer' }
    : { tags: [...tx.tags.filter(g => g !== `ok:${kind}`), `ok:${kind}`] }
  const { error } = await supabase.from('expenses').update(patch).eq('id', tx.id)
  return error ? 'Couldn\'t save that. Please try again.' : null
}

/** Save "always file this merchant like this", keeping the person's other rules. */
export async function saveMerchantRule(userId: string, rules: Record<string, MerchantRule>, key: string, rule: MerchantRule): Promise<string | null> {
  return saveFireProfile(userId, { merchantRules: { ...rules, [key]: rule } })
}

/** A move between your own accounts, as the website files one: no longer spending, so out of budgets and Review. */
export async function markTransfer(id: string): Promise<string | null> {
  const { error } = await supabase.from('expenses').update({ transaction_type: 'transfer', category: 'transfer', sub_category: null }).eq('id', id)
  return error ? 'Couldn\'t save that. Please try again.' : null
}

/** Put several transactions in one category at once (sub-category cleared, as a new category has its own). */
export async function setCategoryFor(ids: string[], category: string): Promise<string | null> {
  for (let i = 0; i < ids.length; i += 200) {
    const { error } = await supabase.from('expenses').update({ category, sub_category: null }).in('id', ids.slice(i, i + 200))
    if (error) return 'Couldn\'t change them all. Please try again.'
  }
  return null
}

/** Save which Home cards show and in what order (profiles.dashboard_layout), shared with the website's Home. */
export async function saveHomeLayout(userId: string, layout: unknown): Promise<string | null> {
  const { error } = await supabase.from('profiles').update({ dashboard_layout: layout }).eq('user_id', userId)
  return error ? 'Couldn\'t save. Please try again.' : null
}

/** File reviewed transactions: category, sub-category and the need/want tag, as the website's review does. */
export async function fileTransactions(rows: { id: string; category: string; sub_category: string | null; tags: string[] }[]): Promise<string | null> {
  for (const r of rows) {
    const { error } = await supabase.from('expenses').update({ category: r.category, sub_category: r.sub_category, tags: r.tags }).eq('id', r.id)
    if (error) return 'Couldn\'t save them all. Please try again.'
  }
  return null
}
