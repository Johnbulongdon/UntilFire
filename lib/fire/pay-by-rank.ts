// "Suggest by rank" (D-82): take-home in a city someone plans to move to and
// work in, at the same income rank they hold where they live now.
//
// The Census bands are household income, so a band is never used as a salary.
// Only the ratio between the two cities at the person's rank is used:
// gross there = gross here × (city B at rank ÷ city A at rank), then each
// side's own tax turns gross into take-home. It is a labelled starting point
// the person overwrites, never a figure the plan assumes on its own.

import { CITY_INCOME_BANDS, INCOME_BAND_PERCENTILES, INCOME_TOP_CODE } from '../city-income-bands';
import { calcTakeHome } from './tax';

/** The lowest rank whose ratio between cities says something about pay. */
const MIN_RATIO_RANK = 40;

/** Percentile and income at each band Census measured, with p0 at $0; top-coded bands left out. */
function points(bands: readonly number[]): [number, number][] {
  const out: [number, number][] = [[0, 0]];
  bands.forEach((v, i) => { if (v < INCOME_TOP_CODE) out.push([INCOME_BAND_PERCENTILES[i], v]); });
  return out;
}

/** Where an income sits in a city, capped at the highest band Census measured. */
function rankOf(income: number, bands: readonly number[]): number {
  const pts = points(bands);
  for (let i = 1; i < pts.length; i++) {
    const [p0, v0] = pts[i - 1];
    const [p1, v1] = pts[i];
    if (income <= v1) return p0 + ((income - v0) / (v1 - v0)) * (p1 - p0);
  }
  return pts[pts.length - 1][0];
}

/** Income at a rank, or null above the highest measured band. */
function incomeAt(rank: number, bands: readonly number[]): number | null {
  const pts = points(bands);
  for (let i = 1; i < pts.length; i++) {
    const [p0, v0] = pts[i - 1];
    const [p1, v1] = pts[i];
    if (rank <= p1) return v0 + ((rank - p0) / (p1 - p0)) * (v1 - v0);
  }
  return null;
}

/** Gross annual pay that leaves this take-home in a jurisdiction (tax rises with pay, so halving converges). */
function grossFor(takeHomeAnnual: number, state: string): number {
  let lo = takeHomeAnnual;
  let hi = takeHomeAnnual * 3 + 10_000;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (calcTakeHome(mid, state).takeHome < takeHomeAnnual) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

export type PayByRank = {
  /** Suggested take-home a month in the new city, to the nearest $10. */
  takeHomeMonthly: number;
  /** Their rank where they live now, as a whole percentile. */
  percentile: number;
  /** Gross pay there ÷ gross pay here. */
  ratio: number;
  /** True when their rank is above what Census measured in either city, so a lower rank's ratio was used. */
  aboveMeasured: boolean;
};

/**
 * The suggestion, or null when either city has no Census bands (outside the
 * US, or not in the list) or there is no take-home to rank.
 */
export function suggestPayByRank({ takeHomeMonthly, fromKey, toKey, fromState, toState }: {
  takeHomeMonthly: number; fromKey: string; toKey: string; fromState: string; toState: string;
}): PayByRank | null {
  const from = CITY_INCOME_BANDS[fromKey];
  const to = CITY_INCOME_BANDS[toKey];
  if (!from || !to || !(takeHomeMonthly > 0)) return null;

  const gross = grossFor(takeHomeMonthly * 12, fromState);
  const rank = rankOf(gross, from);
  // Use their rank where both cities were measured; above that, the highest
  // rank both were measured at. Never a top-coded $250,000. Below the 40th the
  // bands are mostly households with no earner (retirees, students), so the
  // bottom fifth of Manhattan reads lower than Austin's and would suggest a
  // pay cut for moving to New York; ranks under 40 use the 40th's ratio.
  const shared = Math.min(points(from).at(-1)![0], points(to).at(-1)![0]);
  const at = Math.min(Math.max(rank, MIN_RATIO_RANK), shared);
  const here = incomeAt(at, from);
  const there = incomeAt(at, to);
  if (!here || !there) return null;

  const ratio = there / here;
  const takeHome = calcTakeHome(gross * ratio, toState).takeHome / 12;
  return {
    takeHomeMonthly: Math.round(takeHome / 10) * 10,
    percentile: Math.round(rank),
    ratio,
    aboveMeasured: rank > shared,
  };
}
