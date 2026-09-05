// Pure FIRE engine types. No React, Supabase, or fetch dependencies — keep it
// that way so this module can be exercised from server routes, scripts, and
// future native clients.

export type LocaleKind = 'us' | 'intl' | 'unknown';

/**
 * A tax jurisdiction the engine knows how to reason about. v1 carries a single
 * `jurisdiction` string keyed into the city/tax dataset, but the discriminant
 * lets us add richer locales (e.g. {kind:'us', state, county}) without
 * reshaping the seam.
 */
export interface Locale {
  kind: LocaleKind;
  jurisdiction: string;
}

export interface TaxBreakdown {
  fedTax: number;
  fica: number;
  stateTax: number;
  takeHome: number;
  /** Effective tax rate as a percentage (e.g. 27.5). */
  effectiveRate: number;
  jurisdictionLabel: string;
  /** True for US locales — preserved so the legacy reveal copy keeps working. */
  isUSCity: boolean;
  /**
   * True when we cannot credibly compute take-home (e.g. user-typed city with
   * no known jurisdiction). Callers must surface this rather than silently
   * showing a fabricated number.
   */
  unknownJurisdiction: boolean;
}

export interface FireInputs {
  monthlySavings: number;
  annualExpenses: number;
  currentAge?: number;
  startingBalance?: number;
  /** Real annual return assumption. Defaults to 0.07. */
  expectedRealReturn?: number;
  /** Safe withdrawal rate. Defaults to 0.04 (25× target). */
  withdrawalRate?: number;
  /** Cap on the projection to keep the loop bounded. Defaults to 65. */
  maxYears?: number;
}

export interface FireOutput {
  fireTarget: number;
  /** Null when the target is not reached within the projection horizon. */
  years: number | null;
  retireYear: number | null;
  /** Age at FIRE — only set when the caller supplied currentAge. */
  age?: number;
}

/**
 * A FIRE strategy turns a candidate's inputs into a target and a years-to-FIRE
 * projection. v1 ships the traditional 25× / 4% strategy. Lean/Fat/Coast/Barista
 * strategies plug into the same shape via the registry without route churn.
 */
export interface FireStrategy {
  id: string;
  label: string;
  description: string;
  compute(inputs: FireInputs): FireOutput;
}
