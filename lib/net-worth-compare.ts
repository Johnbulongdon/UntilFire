/**
 * How someone's net worth compares with US households of their age.
 *
 * Measured against a published standard, the way a strength app scores a
 * lift against bodyweight: it means something to the first visitor, with no
 * other users to compare with. The standard is the Federal Reserve's Survey
 * of Consumer Finances (lib/net-worth-benchmarks.ts, generated).
 *
 * US only for now: a US distribution says nothing true about someone whose
 * money is in another currency, so they get no net-worth comparison.
 */

export type AgeBand = 'all' | 'under_35' | '35_44' | '45_54' | '55_64' | '65_74' | '75_plus'

export interface NetWorthBenchmarks {
  /** Survey year; amounts are in that year's dollars. */
  year: number
  /** Cutpoints at 1% … 99% for each band. */
  bands: Record<AgeBand, number[]>
}

export interface NetWorthComparison {
  band: AgeBand
  /** "aged 30–34"-style wording for the band, or "of all ages". */
  bandLabel: string
  /** Share of households with less, rounded down to a whole percent, 0–99. */
  aheadOfPct: number
  /** Above the 99th percentile: say "more than 99%", not a number. */
  aboveTop: boolean
  /** Age was not given, so the comparison is with all households. */
  allAges: boolean
  surveyYear: number
}

const BAND_LABEL: Record<AgeBand, string> = {
  all: 'of all ages',
  under_35: 'under 35',
  '35_44': 'aged 35–44',
  '45_54': 'aged 45–54',
  '55_64': 'aged 55–64',
  '65_74': 'aged 65–74',
  '75_plus': 'aged 75 and over',
}

export function ageBand(age: number | null | undefined): AgeBand {
  if (age == null || !Number.isFinite(age)) return 'all'
  if (age < 35) return 'under_35'
  if (age < 45) return '35_44'
  if (age < 55) return '45_54'
  if (age < 65) return '55_64'
  if (age < 75) return '65_74'
  return '75_plus'
}

/**
 * Share of households, 0–100, with strictly less net worth than `value`,
 * interpolated between the 1% cutpoints. Ties count as not ahead, so a zero
 * net worth is never said to beat the many households also at zero.
 */
export function shareBelow(value: number, cutpoints: number[]): number {
  if (cutpoints.length !== 99) throw new Error('expected 99 cutpoints')
  // Index of the first cutpoint at or above the value.
  const i = cutpoints.findIndex((c) => c >= value)
  if (i === -1) return 100
  if (i === 0) return 0
  const lo = cutpoints[i - 1]
  const hi = cutpoints[i]
  const within = hi > lo ? (value - lo) / (hi - lo) : 0
  // cutpoints[k] is the (k + 1)th percentile.
  return i + within
}

export function compareNetWorth(
  input: { netWorthUsd: number; age: number | null | undefined; ageAssumed: boolean; currency: string },
  benchmarks: NetWorthBenchmarks,
): NetWorthComparison | null {
  if (input.currency !== 'USD') return null
  if (!Number.isFinite(input.netWorthUsd)) return null
  const allAges = input.ageAssumed || input.age == null
  const band = allAges ? 'all' : ageBand(input.age)
  const cutpoints = benchmarks.bands[band]
  if (!cutpoints || cutpoints.length !== 99) return null
  const share = shareBelow(input.netWorthUsd, cutpoints)
  return {
    band,
    bandLabel: BAND_LABEL[band],
    aheadOfPct: Math.min(99, Math.floor(share)),
    aboveTop: share >= 99 && input.netWorthUsd > cutpoints[98],
    allAges,
    surveyYear: benchmarks.year,
  }
}
