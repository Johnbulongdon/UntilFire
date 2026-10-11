import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { deriveFirePersonality, quickFreedom } from '@/engine'

export type Goal = 'retire-early' | 'financial-freedom' | 'exploring'

/** What onboarding collects. Monthly amounts, in dollars. Kept on the device only. */
export interface Plan {
  goal?: Goal
  /** The city picked in onboarding, with its yearly living cost in USD. */
  city?: { name: string; col: number }
  monthlyIncome: number
  monthlySpending: number
  invested: number
  age?: number
}

const STORAGE_KEY = 'untilfire.plan.v1'

interface PlanContextValue {
  plan: Plan | null
  /** False until the saved plan has been read from storage. */
  ready: boolean
  draft: Partial<Plan>
  setDraft: (patch: Partial<Plan>) => void
  savePlan: (plan: Plan) => Promise<void>
  clearPlan: () => Promise<void>
}

const PlanContext = createContext<PlanContextValue | null>(null)

export function PlanProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<Plan | null>(null)
  const [ready, setReady] = useState(false)
  const [draft, setDraftState] = useState<Partial<Plan>>({})

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => { if (raw) setPlan(JSON.parse(raw) as Plan) })
      .catch(() => {})
      .finally(() => setReady(true))
  }, [])

  const setDraft = useCallback((patch: Partial<Plan>) => setDraftState(d => ({ ...d, ...patch })), [])

  const savePlan = useCallback(async (next: Plan) => {
    setPlan(next)
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {})
  }, [])

  const clearPlan = useCallback(async () => {
    setPlan(null)
    setDraftState({})
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {})
  }, [])

  const value = useMemo(() => ({ plan, ready, draft, setDraft, savePlan, clearPlan }), [plan, ready, draft, setDraft, savePlan, clearPlan])
  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>
}

export function usePlan() {
  const ctx = useContext(PlanContext)
  if (!ctx) throw new Error('usePlan must be used inside PlanProvider')
  return ctx
}

/** A complete plan from onboarding's answers so far. */
export function planFromDraft(draft: Partial<Plan>): Plan {
  return {
    goal: draft.goal,
    city: draft.city,
    monthlyIncome: draft.monthlyIncome ?? 0,
    monthlySpending: draft.monthlySpending ?? 0,
    invested: draft.invested ?? 0,
    age: draft.age,
  }
}

/** The freedom result for a plan, from the same maths as untilfire.com. */
export function freedomFor(plan: Plan) {
  const result = quickFreedom(plan)
  const ageAtFreedom = plan.age != null && result.years != null ? Math.floor(plan.age + result.years) : null
  return { ...result, ageAtFreedom }
}

/** The FIRE personality the website gives the same answers (lib/fire-personality.ts). */
export function personalityFor(plan: Plan) {
  const result = quickFreedom(plan)
  return deriveFirePersonality({
    mode: 'starter',
    goal: plan.goal,
    age: plan.age,
    monthlyIncome: plan.monthlyIncome,
    monthlyExpenses: plan.monthlySpending,
    monthlySavings: Math.max(0, plan.monthlyIncome - plan.monthlySpending),
    yearsToFire: result.years ?? 65,
    portfolio: plan.invested,
  })
}
