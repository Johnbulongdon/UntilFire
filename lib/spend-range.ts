/**
 * Spending over a chosen time range, and what "usual" means for it.
 *
 * Transactions used to be read one month at a time. The page now looks at
 * any range (a month, a quarter, a year) in the same view, so the rules for
 * "how much did I spend" and "how much do I usually spend" live here, as pure
 * functions, rather than in the chart components.
 *
 * Usual is the median of the person's last six complete months, measured up to
 * the same day of the month. Median, not mean, for the same reason as
 * Insights (MonthInsight): the one expensive month is exactly what it should
 * see past. Fewer than three past months gives no usual at all, because a
 * comparison against one or two months says more about those months than
 * about the person.
 */

export type RangeTx = {
  date: string; // YYYY-MM-DD
  amount: number;
  refund_amount?: number | null;
  currency: string;
  transaction_type: "expense" | "income" | "transfer";
  category: string;
  description: string;
};

export const MIN_USUAL_MONTHS = 3;

/** What an expense cost after refunds; never negative. */
export const netAmount = (t: Pick<RangeTx, "amount" | "refund_amount">) =>
  Math.max(0, t.amount - (t.refund_amount || 0));

export function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// ── Months and ranges ──────────────────────────────────────────────────────

export const monthOf = (date: string) => date.slice(0, 7);
export const daysInMonth = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m, 0).getDate();
};
export function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** A count of whole months (1, 3, 6, 12 or a custom span), or January to date. */
export type RangePreset = number | "ytd";
export type DateRange = { start: string; end: string; months: string[] }; // inclusive dates

/** A range of whole months ending with `endMonth`; "ytd" runs January to `endMonth`. */
export function rangeFor(preset: RangePreset, endMonth: string): DateRange {
  const count = preset === "ytd" ? Number(endMonth.slice(5, 7)) : preset;
  const months = Array.from({ length: count }, (_, i) => addMonths(endMonth, i - count + 1));
  return { start: `${months[0]}-01`, end: `${endMonth}-${String(daysInMonth(endMonth)).padStart(2, "0")}`, months };
}

/** The arrows move a range by its own length, so a year steps a year. */
export const stepRange = (preset: RangePreset, endMonth: string, dir: -1 | 1) =>
  addMonths(endMonth, dir * (preset === "ytd" ? 12 : preset));

/** Bar size that reads well for the range: days for a month, weeks for a quarter, months beyond. */
export function bucketFor(months: number): "day" | "week" | "month" {
  return months <= 1 ? "day" : months <= 3 ? "week" : "month";
}

// ── Usual ──────────────────────────────────────────────────────────────────

/**
 * Median spend of past complete months, counting only days 1..`day` of each
 * (capped at that month's length). `day` of 31 compares whole months.
 * Months with no spending at all are skipped: no data is not a $0 month.
 * Returns null below MIN_USUAL_MONTHS. Six months back, the same window as
 * the forecast's everyday rate (spend-forecast USUAL_LOOKBACK), so the chart
 * has one meaning of "a typical month".
 */
export function usualToDay(
  spend: { date: string; usd: number }[],
  currentMonth: string,
  day: number,
  lookback = 6,
): { value: number; months: number } | null {
  const first = addMonths(currentMonth, -lookback);
  const byMonth = new Map<string, number>();
  for (const s of spend) {
    const m = monthOf(s.date);
    if (m >= currentMonth || m < first) continue;
    if (Number(s.date.slice(8, 10)) > Math.min(day, daysInMonth(m))) continue;
    byMonth.set(m, (byMonth.get(m) ?? 0) + s.usd);
  }
  // A month counts if anything was spent in it at all, not just before `day`.
  const active = new Set(spend.map((s) => monthOf(s.date)).filter((m) => m < currentMonth && m >= first));
  const totals = [...active].map((m) => byMonth.get(m) ?? 0);
  if (totals.length < MIN_USUAL_MONTHS) return null;
  return { value: median(totals), months: totals.length };
}

/**
 * Usual for a whole range: the usual complete month for each month in it,
 * except the current one, which is compared only up to today. With
 * `wholeMonths` the current month is compared whole too: for a category that
 * is mostly one bill (rent), "by today" depends on which day it was paid, and
 * rent paid on the 11th made a usual of $0 on the 8th (D-49).
 */
export function usualForRange(
  spend: { date: string; usd: number }[],
  range: DateRange,
  today: string,
  wholeMonths = false,
): number | null {
  const thisMonth = monthOf(today);
  const full = usualToDay(spend, thisMonth, 31);
  if (!full) return null;
  let total = 0;
  for (const m of range.months) {
    if (m > thisMonth) continue;
    if (m === thisMonth && !wholeMonths) {
      const partial = usualToDay(spend, thisMonth, Number(today.slice(8, 10)));
      total += partial?.value ?? 0;
    } else total += full.value;
  }
  return total;
}

// ── Card payments ──────────────────────────────────────────────────────────

/**
 * Paying a credit card bill is moving money, not spending it: the purchases
 * on the card are the spending. Linked banks already drop these at import
 * (Plaid's LOAN_PAYMENTS), but CSV and statement imports cannot, so an
 * expense whose description reads like a card payment is flagged for the
 * person to confirm. Flag only; nothing is excluded silently.
 */
const CARD_PAYMENT = [
  /\bautopay\b/i,
  /\b(credit )?card (bill )?pa?yme?n?t\b/i,
  /\bpayment,? thank you\b/i,
  /\bcrd(t)? pmt\b/i,
  /\bepay(ment)?\b/i,
  /\b(amex|chase card|citi card|discover|capital one|bilt|apple card|barclaycard)\b.*\bpay(ment)?\b/i,
  /信用卡还款|还信用卡/,
];

export function looksLikeCardPayment(t: Pick<RangeTx, "description" | "transaction_type">): boolean {
  return t.transaction_type === "expense" && CARD_PAYMENT.some((re) => re.test(t.description ?? ""));
}
