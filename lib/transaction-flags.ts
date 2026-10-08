/**
 * "Worth a look" on Transactions (D-31): rows that may be making the numbers
 * wrong, raised for the person to confirm rather than fixed silently.
 *
 *   card_payment — reads like paying a credit card bill, which is moving
 *                  money, not spending it (lib/spend-range looksLikeCardPayment).
 *   duplicate    — same merchant, amount and currency on the same day, or
 *                  within two days when the rows came from different
 *                  sources (a bank and a CSV overlapping). Buying the same
 *                  coffee two days running is not a duplicate.
 *   large        — far above what this merchant usually costs, or, for a
 *                  new merchant, among the person's largest expenses.
 *
 * A dismissal is stored on the row as an "ok:<kind>" tag, so the answer
 * travels with the transaction and nothing new is needed in the database.
 */
import { merchantKey } from "./merchant-memory.ts";
import { looksLikeCardPayment, median, netAmount, type RangeTx } from "./spend-range.ts";

/** "bill" — looks like a listed Upcoming bill not yet linked to it (lib/spend-forecast unlinkedBillPayments). */
export type FlagKind = "card_payment" | "duplicate" | "large" | "bill";
export type FlagTx = RangeTx & { id: string; tags?: string[] | null; source?: string | null };

export const FLAG_ORDER: FlagKind[] = ["bill", "card_payment", "duplicate", "large"];
export const okTag = (k: FlagKind) => `ok:${k}`;
export const isSystemTag = (tag: string) => tag.startsWith("ok:");
const LARGE_FLOOR_USD = 250;

const dayNumber = (date: string) => Math.floor(Date.parse(`${date.slice(0, 10)}T00:00:00Z`) / 86_400_000);

/**
 * Flags for the rows in view. `history` is everything the person has, which
 * gives each merchant its usual size. One flag per row, in FLAG_ORDER.
 */
export function findFlags(inView: FlagTx[], history: FlagTx[], toUSD: (amount: number, currency: string) => number): Map<string, FlagKind> {
  const out = new Map<string, FlagKind>();
  const ok = (t: FlagTx, k: FlagKind) => !!t.tags?.includes(okTag(k));
  const expenses = inView.filter((t) => t.transaction_type === "expense");

  for (const t of expenses) if (looksLikeCardPayment(t) && !ok(t, "card_payment")) out.set(t.id, "card_payment");

  // Duplicates: the later of a matching pair is the one flagged.
  const byKey = new Map<string, FlagTx[]>();
  for (const t of expenses) {
    const k = `${merchantKey(t.description ?? "")}|${t.amount}|${t.currency}`;
    byKey.set(k, [...(byKey.get(k) ?? []), t]);
  }
  for (const group of byKey.values()) {
    if (group.length < 2) continue;
    const sorted = [...group].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    for (let i = 1; i < sorted.length; i++) {
      const t = sorted[i];
      const prev = sorted[i - 1], gap = dayNumber(t.date) - dayNumber(prev.date);
      const twin = gap === 0 || (gap <= 2 && (t.source ?? "manual") !== (prev.source ?? "manual"));
      if (twin && !ok(t, "duplicate") && !out.has(t.id)) out.set(t.id, "duplicate");
    }
  }

  // Large: against this merchant's own history when it has one, else the person's top 5%.
  const usd = (t: FlagTx) => toUSD(netAmount(t), t.currency);
  const past = history.filter((t) => t.transaction_type === "expense");
  const byMerchant = new Map<string, number[]>();
  for (const t of past) {
    const k = merchantKey(t.description ?? "");
    byMerchant.set(k, [...(byMerchant.get(k) ?? []), usd(t)]);
  }
  const all = past.map(usd).sort((a, b) => a - b);
  const p95 = all.length >= 20 ? all[Math.floor(all.length * 0.95)] : Infinity;
  for (const t of expenses) {
    if (out.has(t.id) || ok(t, "large")) continue;
    const v = usd(t);
    if (v < LARGE_FLOOR_USD) continue;
    const seen = (byMerchant.get(merchantKey(t.description ?? "")) ?? []).filter((x) => x !== v);
    const big = seen.length >= 3 ? v >= 3 * median(seen) : v >= p95;
    if (big) out.set(t.id, "large");
  }
  return out;
}
