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

/**
 * Five-year age groups (D-21). Single years would be finer, but the survey
 * has only 40–90 households at each age, too few for a stable distribution.
 */
export type AgeBand =
  | 'all' | '18_24' | '25_29' | '30_34' | '35_39' | '40_44' | '45_49'
  | '50_54' | '55_59' | '60_64' | '65_69' | '70_74' | '75_plus'

export interface NetWorthBenchmarks {
  /** Survey year; amounts are in that year's dollars. */
  year: number
  /** Cutpoints at 1% … 99% for each band. */
  bands: Record<AgeBand, number[]>
  /** Survey households behind each band (rows ÷ 5 implicates). */
  households?: Partial<Record<AgeBand, number>>
  /** The Fed's published ten-year medians beside ours from the same rows. */
  fedCheck?: Record<string, { ours: number; published: number }>
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
  /** Month the survey's dollars were brought forward to ("August 2026"), or null if not adjusted. */
  adjustedThrough: string | null
}

/**
 * Prices since the survey year (lib/net-worth-inflation.ts, generated from
 * the BLS consumer price index). Today's net worth is brought back to survey
 * dollars before it is placed, so both sides are in the same money (D-07).
 */
export interface InflationAdjustment {
  /** CPI-U for `through` divided by the survey year's annual average. */
  factor: number
  /** Latest month of the index used, e.g. "August 2026". */
  through: string
}

const BAND_LABEL: Record<AgeBand, string> = {
  all: 'of all ages',
  '18_24': 'aged 18–24',
  '25_29': 'aged 25–29',
  '30_34': 'aged 30–34',
  '35_39': 'aged 35–39',
  '40_44': 'aged 40–44',
  '45_49': 'aged 45–49',
  '50_54': 'aged 50–54',
  '55_59': 'aged 55–59',
  '60_64': 'aged 60–64',
  '65_69': 'aged 65–69',
  '70_74': 'aged 70–74',
  '75_plus': 'aged 75 and over',
}

export function ageBand(age: number | null | undefined): AgeBand {
  if (age == null || !Number.isFinite(age)) return 'all'
  if (age < 25) return '18_24'
  if (age < 30) return '25_29'
  if (age < 35) return '30_34'
  if (age < 40) return '35_39'
  if (age < 45) return '40_44'
  if (age < 50) return '45_49'
  if (age < 55) return '50_54'
  if (age < 60) return '55_59'
  if (age < 65) return '60_64'
  if (age < 70) return '65_69'
  if (age < 75) return '70_74'
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
  inflation: InflationAdjustment | null = null,
): NetWorthComparison | null {
  if (input.currency !== 'USD') return null
  if (!Number.isFinite(input.netWorthUsd)) return null
  const allAges = input.ageAssumed || input.age == null
  const band = allAges ? 'all' : ageBand(input.age)
  const cutpoints = benchmarks.bands[band]
  if (!cutpoints || cutpoints.length !== 99) return null
  const valid = inflation != null && Number.isFinite(inflation.factor) && inflation.factor > 0
  const inSurveyDollars = valid ? input.netWorthUsd / inflation.factor : input.netWorthUsd
  const share = shareBelow(inSurveyDollars, cutpoints)
  return {
    band,
    bandLabel: BAND_LABEL[band],
    aheadOfPct: Math.min(99, Math.floor(share)),
    aboveTop: share >= 99 && inSurveyDollars > cutpoints[98],
    allAges,
    surveyYear: benchmarks.year,
    adjustedThrough: valid ? inflation.through : null,
  }
}

/** Age bands in table order, youngest first, for the by-age table. */
export const AGE_BANDS: Exclude<AgeBand, 'all'>[] = [
  '18_24', '25_29', '30_34', '35_39', '40_44', '45_49',
  '50_54', '55_59', '60_64', '65_69', '70_74', '75_plus',
]

/** Short age wording for a table row: "25–29", "75+". */
export const AGE_BAND_SHORT: Record<AgeBand, string> = {
  all: 'All ages',
  '18_24': '18–24',
  '25_29': '25–29',
  '30_34': '30–34',
  '35_39': '35–39',
  '40_44': '40–44',
  '45_49': '45–49',
  '50_54': '50–54',
  '55_59': '55–59',
  '60_64': '60–64',
  '65_69': '65–69',
  '70_74': '70–74',
  '75_plus': '75+',
}

/**
 * The net worth at a percentile of a band, in today's dollars: the survey's
 * cutpoint brought forward with the same factor the comparison divides by.
 * `pct` is 1–99; 50 is the median.
 */
export function percentileToday(
  benchmarks: NetWorthBenchmarks,
  band: AgeBand,
  pct: number,
  inflation: InflationAdjustment | null = null,
): number | null {
  const cutpoints = benchmarks.bands[band]
  if (!cutpoints || cutpoints.length !== 99) return null
  if (!Number.isInteger(pct) || pct < 1 || pct > 99) return null
  const valid = inflation != null && Number.isFinite(inflation.factor) && inflation.factor > 0
  return cutpoints[pct - 1] * (valid ? inflation.factor : 1)
}
