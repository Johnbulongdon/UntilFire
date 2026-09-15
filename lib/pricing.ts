/**
 * What Pro costs — the single source of truth.
 *
 * Before this module the price was hand-typed in six files (the modal, the
 * pricing page and its JSON-LD, the landing page, Profile, the trial-reminder
 * email, and the analytics contract). Changing it meant finding all six and
 * hoping. A price that disagrees with itself across the product is a trust
 * problem and, in the reminder email, a promise about someone's card.
 *
 * No imports, so anything can read it — including lib/email-html.ts, which
 * stays otherwise dependency-free so the admin can render a preview client-side.
 *
 * The amounts here are display copy. The amount actually charged lives in
 * Stripe, keyed by STRIPE_PRO_PRICE_ID / STRIPE_PRO_ANNUAL_PRICE_ID. Changing
 * a number here without changing the Stripe price changes what you promise,
 * not what you bill — always move both.
 */

export const PRO_MONTHLY_USD = 3;
export const PRO_ANNUAL_USD = 30;

/** Stripe's trial_period_days, granted to first-time subscribers only. */
export const TRIAL_DAYS = 90;
export const TRIAL_LABEL = "3 months free";

export type BillingInterval = "month" | "year";

/** $30/yr is $2.50/mo. */
export const ANNUAL_PER_MONTH_USD = PRO_ANNUAL_USD / 12;

/** $36 of monthly vs $30 of annual — two months. */
export const ANNUAL_MONTHS_FREE = Math.round((PRO_MONTHLY_USD * 12 - PRO_ANNUAL_USD) / PRO_MONTHLY_USD);

export const ANNUAL_SAVING_PCT = Math.round((1 - PRO_ANNUAL_USD / (PRO_MONTHLY_USD * 12)) * 100);

/** "$3", "$2.50" — whole dollars stay whole, so $3/mo doesn't read as $3.00. */
export function formatPrice(usd: number): string {
  return Number.isInteger(usd) ? `$${usd}` : `$${usd.toFixed(2)}`;
}

export const PRO_MONTHLY_LABEL = formatPrice(PRO_MONTHLY_USD);
export const PRO_ANNUAL_LABEL = formatPrice(PRO_ANNUAL_USD);
export const ANNUAL_PER_MONTH_LABEL = formatPrice(ANNUAL_PER_MONTH_USD);
