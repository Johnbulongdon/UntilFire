/**
 * The FIRE number: the invested amount that could pay for a year of spending,
 * every year, without paid work.
 *
 * Calculators disagree on this number mostly because each one quietly picks
 * different factors. This one names every factor, and each has a default
 * (the plain 25× rule) and a recommendation the reader can take or leave:
 *
 *   FIRE number = (spending − other income) ÷ (1 − tax on withdrawals) ÷ withdrawal rate
 *
 * Everything is in today's dollars. The withdrawal rate is the share taken in
 * the first year, then raised with prices, so the target is real, not nominal.
 * See docs/DECISIONS.md D-23.
 */

import { SP500_HISTORY } from './sp500-history.ts'

export const WITHDRAWAL_RATES = [3, 3.5, 4, 4.5, 5] as const
export const TAX_RATES = [0, 5, 10, 15, 20] as const

/** The rule everyone quotes: 4%, or 25× spending. */
export const DEFAULT_WITHDRAWAL_RATE = 4
/** Tax to assume on withdrawals when the reader doesn't know their account mix. */
export const RECOMMENDED_TAX_RATE = 10
/** Plan for money to last to this age; the withdrawal rate follows from it. */
export const PLAN_TO_AGE = 95

export interface FireNumberInputs {
  /** A year of spending in retirement, in today's dollars. */
  annualSpending: number
  /** Reliable income from the day work stops (pension, rent, part-time). */
  otherIncome?: number
  /** Effective tax on withdrawals, as a percentage. */
  taxRatePct?: number
  /** First-year withdrawal, as a percentage of the portfolio. */
  withdrawalRatePct?: number
}

export interface FireNumberResult {
  fireNumber: number
  /** The spending the portfolio pays for, after other income. */
  portfolioSpending: number
  /** What the portfolio withdraws in the first year, tax included. */
  firstYearWithdrawal: number
  /** How many years of spending the target holds (25 at 4%). */
  multiple: number
  /** The target from spending alone, before other income or tax. */
  fromSpending: number
  /** How much other income takes off the target. */
  otherIncomeReduction: number
  /** How much tax on withdrawals adds to the target. */
  taxAddition: number
}

const money = (n: number | undefined) => (Number.isFinite(n) ? Math.max(0, n as number) : 0)

export function fireNumber(inputs: FireNumberInputs): FireNumberResult {
  const spending = money(inputs.annualSpending)
  const income = Math.min(money(inputs.otherIncome), spending)
  const tax = Math.min(Math.max(inputs.taxRatePct ?? 0, 0), 60) / 100
  const rate = Math.max(inputs.withdrawalRatePct ?? DEFAULT_WITHDRAWAL_RATE, 0.5) / 100

  const portfolioSpending = spending - income
  const firstYearWithdrawal = portfolioSpending / (1 - tax)
  const total = firstYearWithdrawal / rate
  return {
    fireNumber: total,
    portfolioSpending,
    firstYearWithdrawal,
    multiple: 1 / rate,
    fromSpending: spending / rate,
    otherIncomeReduction: income / rate,
    taxAddition: total - portfolioSpending / rate,
  }
}

/**
 * The withdrawal rate to suggest for the age work stops. The 4% rule was
 * tested over 30 years (the Trinity Study); longer retirements need a lower
 * first-year rate to last. Without an age, the standard 4% stands.
 */
export function recommendedWithdrawalRate(stopAge: number | null): { rate: number; years: number | null; why: string } {
  if (stopAge === null || !Number.isFinite(stopAge)) {
    return { rate: 4, years: null, why: 'The standard rule, tested over 30-year retirements. Add the age you want to stop working for a rate that fits your timeline.' }
  }
  const years = Math.max(PLAN_TO_AGE - Math.floor(stopAge), 0)
  if (years <= 30) return { rate: 4, years, why: `About ${years} years of retirement, which is what the 4% rule was tested for.` }
  if (years <= 45) return { rate: 3.5, years, why: `About ${years} years of retirement, longer than the 30 the 4% rule was tested for, so a lower rate leaves room.` }
  return { rate: 3, years, why: `About ${years} years of retirement. Money that has to last that long needs a lower first-year rate.` }
}

/** Progress toward the target, 0–100. */
export function fireProgress(saved: number, target: number): number {
  if (!(target > 0)) return saved > 0 ? 100 : 0
  return Math.min(Math.max(saved / target, 0), 1) * 100
}

/**
 * The growth a portfolio earns each year after inflation. It sets how fast
 * savings reach the FIRE number, so it moves the freedom date more than any
 * other assumption. Rather than asserting a number, every choice is a piece of
 * S&P 500 history (lib/sp500-history.ts) with how often every 30-year stretch
 * since 1928 did at least that well, so a reader can see why 5% is cautious
 * and 11% is optimistic, and pick how sure they want to be. D-24.
 */
export interface GrowthChoice {
  id: string
  label: string
  /** Why this stretch is worth considering. */
  why: string
  /** e.g. "1928–2025". */
  span: string
  /** After inflation: what the freedom date uses. */
  realPct: number
  /** Before inflation, as an account statement shows it. */
  nominalPct: number
  /** Inflation over the same years (the gap between the two). */
  inflationPct: number
  /** True where the before-inflation figure assumes the long-run inflation rather than measuring it. */
  nominalEstimated: boolean
  /** Share of 30-year stretches since 1928 that did at least this well. */
  beatShare: number
}

const H = SP500_HISTORY
const LONG_RUN_INFLATION = H.periods.find((p) => p.id === 'since1928')!.inflationPct
const withInflation = (realPct: number, inflationPct: number) =>
  Math.round(((1 + realPct / 100) * (1 + inflationPct / 100) - 1) * 1000) / 10

export const GROWTH_CHOICES: GrowthChoice[] = [
  ...H.periods.map((p) => ({
    id: p.id, label: p.label, why: p.why, span: `${p.from}–${p.to}`,
    realPct: p.realPct, nominalPct: p.nominalPct, inflationPct: p.inflationPct, nominalEstimated: false, beatShare: p.beatShare,
  })),
  {
    id: 'cautious', label: 'Cautious', why: 'A margin below the long-run average, for a plan that holds in an ordinary 30 years.',
    span: 'Our recommendation', realPct: H.cautious.realPct, nominalPct: withInflation(H.cautious.realPct, LONG_RUN_INFLATION),
    inflationPct: LONG_RUN_INFLATION, nominalEstimated: true, beatShare: H.cautious.beatShare,
  },
  {
    id: 'worst30', label: 'Worst 30 years on record', why: 'Fine on paper, but high inflation ate most of it.',
    span: `${H.worst.from}–${H.worst.to}`, realPct: H.worst.realPct, nominalPct: H.worst.nominalPct,
    inflationPct: H.worst.inflationPct, nominalEstimated: false, beatShare: H.worst.beatShare,
  },
]

/** Inflation to assume alongside a growth rate: the matching stretch's, else the long-run average. */
export function inflationFor(realPct: number): number {
  return GROWTH_CHOICES.find((c) => c.realPct === realPct)?.inflationPct ?? LONG_RUN_INFLATION
}

/** The S&P 500 since 1928 after inflation: the engine's REAL_RETURN, as a percentage. */
export const DEFAULT_RETURN_PCT = H.periods.find((p) => p.id === 'since1928')!.realPct
/** Cautious: history beat it in most 30-year stretches, not just the average one. */
export const RECOMMENDED_RETURN_PCT = H.cautious.realPct
export const SP500_THROUGH = H.through
export const SP500_WINDOWS = H.windows

const byId = (id: string) => GROWTH_CHOICES.find((c) => c.id === id)!
export const RETURN_RECOMMENDATION =
  `${RECOMMENDED_RETURN_PCT}%. The S&P 500 did at least this well in ${byId('cautious').beatShare}% of 30-year stretches since 1928; its full-history average, ${DEFAULT_RETURN_PCT}%, in only ${byId('since1928').beatShare}%. Recent decades were higher, but a plan should hold up if the next 30 years are ordinary.`
