import AsyncStorage from '@react-native-async-storage/async-storage'
import NetInfo from '@react-native-community/netinfo'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { setCustomCategories } from '@/lib/custom-categories'
import { loadRates, setDisplayCurrency } from '@/lib/display-currency'
import { addMonths, type CategoryDef, CITIES, FALLBACK_RATES, fetchAllPages, isoDay, loadMortgages, monthOf, netAmount, type Mortgage, type MortgageTerms, type PlanSettings, REAL_RETURN, type StoredPlan, type LifeVersion, normaliseLayout, type DashboardLayout } from '@/engine'
import { effectiveBalances, effectiveDebts, type PlaidAccount } from '@/lib/balances'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/state/auth'
import { listenForPurchases } from '@/lib/apple-iap'
import { usePlan } from '@/state/plan'
import { scheduleBillReminders } from '@/lib/bill-reminders'
import { cancelTodayReminders, scheduleTodayReminders } from '@/lib/today-reminder'
import { seedFromOnboarding } from '@/lib/mutations'

const SITE = 'https://www.untilfire.com'
/** Months of transactions the app reads: this one and twelve before it, for ranges up to a year and "usual". */
const HISTORY_MONTHS = 12

export interface Transaction {
  id: string
  date: string // YYYY-MM-DD
  amount: number
  refund_amount: number | null
  currency: string
  description: string
  category: string
  sub_category: string | null
  transaction_type: 'expense' | 'income' | 'transfer'
  notes: string | null
  tags: string[]
  source?: string | null
}

/** What the signed-in account holds, read the same way app/dashboard/page.tsx reads it. */
export interface Bill {
  id: string
  description: string
  amount: number
  currency: string
  transaction_type: 'expense' | 'income'
  due_date: string
  recurrence: string
  category: string | null
  sub_category: string | null
}

export interface Goal {
  id: string
  name: string
  emoji: string | null
  target_amount: number
  current_saved: number
  target_date: string | null
}

export interface TodayProgress { done: string[]; acks: string[] }

export interface AccountData {
  /** Pro, on this account or through the household (lib/supabase isPro). */
  pro: boolean
  /** Monthly take-home from the website's budget. */
  income: number
  /** Monthly budget per expense category, in USD. */
  budget: Record<string, number>
  age: number | null
  transactions: Transaction[]
  plaidAccounts: PlaidAccount[]
  /** Bills and paydays still to come (Calendar on the website). */
  bills: Bill[]
  goals: Goal[]
  /** What was typed in on the website (or here); connected accounts override these in `balances`. */
  typed: { k401: number; rothIRA: number; taxable: number; cashSavings: number; totalDebt: number; mortgages: Mortgage[] }
  /** Plan settings (salary, pension, employer money, goal) and where the person lives, from the FIRE profile. */
  profile: {
    plan: PlanSettings
    cityName: string
    taxKey: string
    /** The website's planning assumptions, from the FIRE profile. */
    growthRate: number
    withdrawalRate: number
    retirementCityName: string
    retirementCityCol: number
    lifestyleMultiplier: number
    taxEnabled: boolean
    retirementTaxRate: number
    rothPct: number
    mortgageMonthly: number
    mortgageTerms: MortgageTerms
    comparisons: LifeVersion[]
    contributionDone: { iso: string; amount: number } | null
    /** The Today list (D-73): days finished and items answered, shared with the website. */
    today: TodayProgress
  }
  /** From profiles: what to call you and which currency to show money in. */
  displayName: string
  homeLayout: DashboardLayout
  currency: string
  /** The contribution plan (profiles.contribution_plan), or null when none is saved. */
  contributionPlan: StoredPlan | null
  /** The account's own categories, from the website. */
  customCategories: CategoryDef[]
  /** Invested money over time, oldest first (net_worth_snapshots). */
  snapshots: { value: number; at: string }[]
  balances: { k401: number; rothIRA: number; taxable: number; cashSavings: number }
  debts: { otherDebt: number; mortgage: number; cards: number }
}

interface AccountContextValue {
  data: AccountData | null
  loading: boolean
  error: string | null
  /** No connection right now: what shows is the copy saved on this phone. */
  offline: boolean
  /** When the numbers on screen were last loaded from the account. */
  savedAt: string | null
  refresh: () => Promise<void>
}

/**
 * The saved copy of the account on this phone. Bump the version whenever
 * AccountData gains a field, so a copy saved by an older build is ignored
 * instead of rendering with that field missing.
 */
const CACHE_VERSION = 3
const cacheKey = (userId: string) => `account-cache:v${CACHE_VERSION}:${userId}`

const AccountContext = createContext<AccountContextValue | null>(null)

/** A transaction's amount in USD, using the website's fallback rates. */
export function toUSD(amount: number, currency: string): number {
  if (!currency || currency === 'USD') return amount
  const rate = FALLBACK_RATES[currency]
  return rate ? amount / rate : amount
}

/** What an expense cost after refunds, in USD. */
export const spentUSD = (t: Transaction) => toUSD(netAmount(t), t.currency)

export function AccountProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const { plan, draft } = usePlan()
  const [data, setData] = useState<AccountData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const shown = useRef(false)

  const refreshRef = useRef<(() => Promise<void>) | null>(null)
  // Track the connection, and reload when it comes back.
  useEffect(() => NetInfo.addEventListener(state => {
    const off = state.isConnected === false
    setOffline(prev => { if (prev && !off) refreshRef.current?.(); return off })
  }), [])

  const refresh = useCallback(async () => {
    if (!session) { setData(null); shown.current = false; setSavedAt(null); setDisplayCurrency('USD'); cancelTodayReminders().catch(() => {}); return }
    setLoading(true); setError(null)
    const userId = session.user.id

    // Open instantly on the last numbers this phone saw, then load fresh ones.
    if (!shown.current) {
      const cached = await AsyncStorage.getItem(cacheKey(userId)).then(r => (r ? JSON.parse(r) as { savedAt: string; data: AccountData } : null)).catch(() => null)
      if (cached?.data && !shown.current) {
        setCustomCategories(cached.data.customCategories ?? [])
        setDisplayCurrency(cached.data.currency ?? 'USD')
        // Belt and braces: fill anything an older copy lacks.
        const d = { ...cached.data, homeLayout: normaliseLayout(cached.data.homeLayout) }
        d.profile = { ...d.profile, comparisons: d.profile?.comparisons ?? [] }
        setData(d); setSavedAt(cached.savedAt); shown.current = true
      }
    }
    try {
    const today = isoDay(new Date())
    const since = `${addMonths(monthOf(today), -HISTORY_MONTHS)}-01`

    const [budgetRes, txRes, plaid, billsRes, goalsRes, snapRes, profileRes, pro] = await Promise.all([
      supabase.from('user_budget').select('income, expenses, fire_age, fire_assets').eq('user_id', userId).maybeSingle(),
      fetchAllPages<Transaction>((from, to) => supabase.from('expenses')
        .select('id, date, amount, refund_amount, currency, description, category, sub_category, transaction_type, notes, tags, source')
        .eq('user_id', userId)
        .gte('date', since)
        .order('date', { ascending: false })
        .order('id')
        .range(from, to)),
      // Balances come through the website's API, as they do on the dashboard.
      fetch(`${SITE}/api/plaid/accounts`, { headers: { Authorization: `Bearer ${session.access_token}` } })
        .then(r => (r.ok ? r.json() : null))
        .then(d => (Array.isArray(d?.accounts) ? (d.accounts as PlaidAccount[]) : []))
        .catch(() => [] as PlaidAccount[]),
      supabase.from('expected_payments')
        .select('id, description, amount, currency, transaction_type, due_date, recurrence, category, sub_category')
        .eq('user_id', userId)
        .is('completed_at', null),
      supabase.from('goals')
        .select('id, name, emoji, target_amount, current_saved, target_date')
        .eq('user_id', userId)
        .order('sort_order'),
      supabase.from('net_worth_snapshots')
        .select('portfolio_value, captured_at')
        .eq('user_id', userId)
        .order('captured_at', { ascending: true })
        .limit(120),
      supabase.from('profiles').select('contribution_plan, display_name, default_currency, dashboard_layout').eq('user_id', userId).maybeSingle(),
      // Pro as the website decides it: an active Pro subscription, or a household that has one.
      (async () => {
        const { data: sub } = await supabase.from('subscriptions').select('status, plan').eq('user_id', userId).maybeSingle()
        if (sub?.status === 'active' && sub?.plan === 'pro') return true
        const { data } = await supabase.rpc('household_has_pro')
        return data === true
      })().catch(() => false),
    ])
    // Money shows in the account's currency, at today's rate when it can be fetched.
    const currency = (profileRes.data?.default_currency as string | null) || 'USD'
    setDisplayCurrency(currency, currency === 'USD' ? undefined : (await loadRates()) ?? undefined)

    // A brand-new account starts from the onboarding answers, then reloads once.
    if (!budgetRes.error && !(Number(budgetRes.data?.income) > 0) && plan && plan.monthlyIncome > 0) {
      if (await seedFromOnboarding(userId, plan)) { setLoading(false); return refresh() }
    }

    if (budgetRes.error || txRes.error) throw new Error(budgetRes.error?.message ?? txRes.error?.message)

    const raw = (budgetRes.data?.expenses ?? {}) as Record<string, unknown>
    const fp = (raw._fire_profile ?? {}) as Record<string, any>
    const budget: Record<string, number> = {}
    for (const [key, value] of Object.entries(raw)) {
      if (!key.startsWith('_') && typeof value === 'number') budget[key] = value
    }
    const customCategories = (Array.isArray(raw._custom_cats) ? raw._custom_cats : [])
      .filter((c: any) => c && typeof c.key === 'string')
      .map((c: any) => ({ key: c.key, label: c.label ?? c.key, code: c.code ?? 'CU', color: c.color ?? '#8a7c68', emoji: c.emoji ?? '🏷️' })) as CategoryDef[]
    setCustomCategories(customCategories)
    const mortgages = loadMortgages(fp)
    const mortgageBalance = mortgages.reduce((s, m) => s + m.balance, 0)

    const next: AccountData = {
      pro,
      income: Number(budgetRes.data?.income ?? 0),
      budget,
      age: budgetRes.data?.fire_age ?? null,
      transactions: (txRes.data ?? []).map(t => ({
        ...t,
        amount: Number(t.amount),
        refund_amount: t.refund_amount == null ? null : Number(t.refund_amount),
        currency: t.currency ?? 'USD',
        transaction_type: t.transaction_type ?? 'expense',
        tags: t.tags ?? [],
      })),
      plaidAccounts: plaid,
      bills: ((billsRes.data ?? []) as Bill[]).map(b => ({ ...b, amount: Number(b.amount), currency: b.currency ?? 'USD' })),
      goals: ((goalsRes.data ?? []) as Goal[]).map(g => ({ ...g, target_amount: Number(g.target_amount), current_saved: Number(g.current_saved) })),
      typed: {
        k401: fp.k401 || Number(budgetRes.data?.fire_assets ?? 0),
        rothIRA: fp.rothIRA || 0,
        taxable: fp.taxable || 0,
        cashSavings: fp.cashSavings || 0,
        totalDebt: fp.totalDebt || 0,
        mortgages,
      },
      profile: {
        plan: (fp.plan && typeof fp.plan === 'object' ? fp.plan : {}) as PlanSettings,
        cityName: String(fp.cityName ?? ''),
        taxKey: CITIES.find(c => c.name === fp.cityName)?.state ?? '',
        // 0.07 was the typed default every profile saved before growth could be chosen (D-24): it means "never chosen".
        growthRate: fp.growthRate && fp.growthRate !== 0.07 ? Number(fp.growthRate) : REAL_RETURN,
        withdrawalRate: Number(fp.withdrawalRate) || 0.04,
        retirementCityName: String(fp.retirementCityName ?? ''),
        retirementCityCol: Number(fp.retirementCityCol) || 0,
        lifestyleMultiplier: Number(fp.lifestyleMultiplier) || 1,
        taxEnabled: !!fp.taxEnabled,
        retirementTaxRate: fp.retirementTaxRate ?? 0.15,
        rothPct: Number(fp.rothPct) || 0,
        mortgageMonthly: Number(fp.mortgageMonthly) || 0,
        mortgageTerms: fp.mortgageTerms && typeof fp.mortgageTerms === 'object' ? fp.mortgageTerms : {},
        // Compare's saved versions, shared with the website (D-69).
        // This cycle's contribution, once marked as made (shared with the website).
        contributionDone: fp.contributionDone && typeof fp.contributionDone.iso === 'string' ? { iso: fp.contributionDone.iso as string, amount: Number(fp.contributionDone.amount) || 0 } : null,
        today: {
          done: Array.isArray(fp.today?.done) ? fp.today.done.filter((d: unknown) => typeof d === 'string') : [],
          acks: Array.isArray(fp.today?.acks) ? fp.today.acks.filter((d: unknown) => typeof d === 'string') : [],
        },
        comparisons: Array.isArray(fp.comparisons) ? fp.comparisons.filter((c: LifeVersion) => c && typeof c.id === 'string' && Array.isArray(c.changes)) : [],
      },
      customCategories,
      displayName: (profileRes.data?.display_name as string | null) ?? '',
      // Which Home cards show, in what order: the website's layout (lib/dashboard-layout).
      homeLayout: normaliseLayout(profileRes.data?.dashboard_layout),
      currency,
      contributionPlan: Array.isArray((profileRes.data?.contribution_plan as StoredPlan | null)?.targets) ? (profileRes.data!.contribution_plan as StoredPlan) : null,
      snapshots: (snapRes.data ?? []).map(r => ({ value: Number(r.portfolio_value), at: r.captured_at as string })),
      balances: effectiveBalances({
        k401: fp.k401 || Number(budgetRes.data?.fire_assets ?? 0),
        rothIRA: fp.rothIRA || 0,
        taxable: fp.taxable || 0,
        cashSavings: fp.cashSavings || 0,
        plaidAccounts: plaid,
      }),
      debts: effectiveDebts({ totalDebt: fp.totalDebt || 0, mortgageBalance, plaidAccounts: plaid }),
    }
    const stamp = new Date().toISOString()
    setData(next); setSavedAt(stamp); shown.current = true
    // Bill and payday reminders follow the latest bills (when turned on in Profile).
    scheduleBillReminders(next.bills).catch(() => {})
    // The 9pm Today reminder skips days already finished (D-73).
    scheduleTodayReminders(next.profile.today.done).catch(() => {})
    AsyncStorage.setItem(cacheKey(userId), JSON.stringify({ savedAt: stamp, data: next })).catch(() => {})
    } catch {
      setError(shown.current
        ? "Couldn't reach your account. These are the numbers saved on this phone."
        : "Couldn't load your account. Check your connection, then pull down to try again.")
    }
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  refreshRef.current = refresh
  useEffect(() => { refresh() }, [refresh])
  // Signed out, amounts show in the currency picked in onboarding.
  // Apple purchases that land outside the Pro screen still switch Pro on (launch audit, Oct 2026).
  useEffect(() => (session ? listenForPurchases(session.access_token, () => { refresh() }) : undefined), [session?.access_token]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!session) setDisplayCurrency(draft.currency ?? plan?.currency ?? 'USD') }, [session, plan?.currency, draft.currency])

  const value = useMemo(() => ({ data, loading, error, offline, savedAt, refresh }), [data, loading, error, offline, savedAt, refresh])
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

export function useAccount() {
  const ctx = useContext(AccountContext)
  if (!ctx) throw new Error('useAccount must be used inside AccountProvider')
  return ctx
}
