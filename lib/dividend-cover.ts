/**
 * How much of the monthly bills the person's dividends already pay: the small
 * Dividends tile on Home (dividend FIRE, 5 Nov 2026). Nothing to set up; it
 * reads the dividends the bank already labelled and the bills on Calendar.
 */
import { type Recurrence, recurrenceToMonthly } from "./recurring-detect.ts";

export type DividendTx = {
  date: string; // YYYY-MM-DD
  /** USD, after refunds. */
  usd: number;
  transaction_type?: string;
  category?: string;
  sub_category?: string | null;
  description?: string;
};

export type DividendCover = {
  /** Dividends a month, USD, averaged over the months the history covers. */
  monthly: number;
  /** Repeating bills a month, USD. */
  bills: number;
  /** Share of bills paid, 0–100+. */
  pct: number;
};

const DIVIDEND = /dividend/i;

/** A dividend payment: Plaid's INCOME_DIVIDENDS (sub-category "Dividends"), or an investment-income row that names one. */
export function isDividend(t: DividendTx): boolean {
  if (t.transaction_type !== "income") return false;
  if (DIVIDEND.test(t.sub_category ?? "")) return true;
  return t.category === "investment" && DIVIDEND.test(t.description ?? "");
}

const monthIndex = (iso: string) => Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7)) - 1;

/**
 * Dividends from the last 12 months, divided by the months of history (at
 * least 3, so one quarterly payout in a new account is not read as monthly),
 * against the monthly cost of repeating bills. Null when there is no dividend
 * or no repeating bill, so the tile stays hidden.
 */
export function dividendCover(
  txns: DividendTx[],
  bills: { usd: number; recurrence: Recurrence }[],
  today: string,
): DividendCover | null {
  const now = monthIndex(today);
  const recent = txns.filter((t) => now - monthIndex(t.date) < 12 && t.date <= today);
  const total = recent.filter(isDividend).reduce((s, t) => s + Math.max(0, t.usd), 0);
  if (total <= 0) return null;
  const billsMonthly = bills.reduce((s, b) => s + recurrenceToMonthly(Math.abs(b.usd), b.recurrence), 0);
  if (billsMonthly <= 0) return null;
  const earliest = recent.reduce((m, t) => Math.min(m, monthIndex(t.date)), now);
  const months = Math.min(12, Math.max(3, now - earliest + 1));
  const monthly = total / months;
  return { monthly, bills: billsMonthly, pct: (monthly / billsMonthly) * 100 };
}
