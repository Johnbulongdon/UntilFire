/**
 * One way to print money.
 *
 * There were 39 hand-rolled money formatters in this codebase before this
 * file, and they disagreed. CoastFireCalculator printed $1.50M and $50k;
 * ExpatFireCalculator printed $1.50M but had no thousands tier, so the number
 * below it rendered as $1,500,000; fire-number used Intl and always printed in
 * full; AnimatedHero printed the digits with no currency symbol at all. A
 * money product that shows a balance three different ways on three screens
 * reads as three different products.
 *
 * Most of them also hardcoded "$" while the app supports 34 currencies, so a
 * user in Lisbon saw their euros labelled as dollars.
 *
 * Two styles, and the choice is about the reader's job, not about space:
 *
 *   exact    $1,500,000   a figure someone will check, reconcile or type back
 *   compact  $1.5M        a figure someone will compare or scan
 *
 * Use `exact` for anything a person might act on, and `compact` in charts,
 * tiles and comparisons. When in doubt, exact: a rounded number that turns
 * out to matter is worse than a long one. Cents are a separate axis — pass
 * `decimals: 2` for anything reconciled against a statement.
 *
 * (There was briefly a third style, `whole`. It formatted identically to
 * `exact`, because `exact` already defaults to zero decimals. A variant that
 * does nothing teaches a distinction that is not real, so it is gone.)
 */

import { getCurrencySymbol, type SupportedCurrency } from "./currency";

export type MoneyStyle = "exact" | "compact";

export interface FormatMoneyOptions {
  currency?: SupportedCurrency | string;
  style?: MoneyStyle;
  /** Force a leading + on positives. Off by default — most figures are not deltas. */
  signed?: boolean;
  /** Decimal places. Defaults to 0; pass 2 for anything reconciled against a statement. */
  decimals?: number;
}

/**
 * Compact tiers deliberately keep one decimal below 10M and 10k. Rounding
 * harder is how an axis ends up printing "$2k" against both $1,650 and
 * $2,200 — two different ticks with the same label, which reads as a bug.
 */
function compact(abs: number): string {
  if (abs >= 1_000_000_000) return `${(abs / 1_000_000_000).toFixed(abs >= 10_000_000_000 ? 0 : 1)}B`;
  if (abs >= 1_000_000) return `${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 10_000) return `${Math.round(abs / 1000)}k`;
  if (abs >= 1_000) return `${(abs / 1000).toFixed(1)}k`;
  return String(Math.round(abs));
}

export function formatMoney(amount: number, options: FormatMoneyOptions = {}): string {
  const { currency = "USD", style = "exact", signed = false, decimals = 0 } = options;
  const symbol = getCurrencySymbol(currency);
  const safe = Number.isFinite(amount) ? amount : 0;
  const abs = Math.abs(safe);

  let digits: string;
  if (style === "compact") {
    digits = compact(abs);
  } else {
    digits = abs.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  // The sign goes outside the symbol — "-$40", never "$-40". A minus tucked
  // after the symbol reads as part of the number.
  const sign = safe < 0 ? "−" : signed && safe > 0 ? "+" : "";
  return `${sign}${symbol}${digits}`;
}

/** Years and months, for a figure that is a duration rather than an amount. */
export function formatDuration(years: number): string {
  if (!Number.isFinite(years) || years <= 0) return "now";
  if (years < 1) {
    const months = Math.max(1, Math.round(years * 12));
    return `${months} ${months === 1 ? "month" : "months"}`;
  }
  if (years < 2) {
    const months = Math.round((years - 1) * 12);
    return months ? `1 year ${months}m` : "1 year";
  }
  return `${years.toFixed(1)} years`;
}
