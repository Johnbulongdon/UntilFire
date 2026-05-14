export const CALCULATOR_PREFILL_KEY = 'uf_calc_prefill'

export type CalculatorPrefill = {
  monthlyIncome?: number
  monthlySavings?: number
  monthlySpendEstimate?: number
  annualCost?: number
  cityName?: string
  stateKey?: string
  fireGoal?: string
  fireTarget?: number
  retireYear?: number
  generatedAt?: string
  income?: number
  currentAge?: number
}

function readPrefill(): CalculatorPrefill | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(CALCULATOR_PREFILL_KEY)
    if (!raw) return null
    return JSON.parse(raw) as CalculatorPrefill
  } catch {
    return null
  }
}

export function peekCalculatorPrefill() {
  return readPrefill()
}

export function consumeCalculatorPrefill() {
  const prefill = readPrefill()
  if (!prefill || typeof window === 'undefined') return prefill

  try {
    window.localStorage.removeItem(CALCULATOR_PREFILL_KEY)
  } catch {}

  return prefill
}

export function saveCalculatorPrefill(prefill: CalculatorPrefill) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(CALCULATOR_PREFILL_KEY, JSON.stringify(prefill))
  } catch {}
}
