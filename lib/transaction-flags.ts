/**
 * "Worth a look" on Transactions (D-31): rows that may be making the numbers
 * wrong, raised for the person to confirm rather than fixed silently.
 *
 *   card_payment — reads like paying a credit card bill, which is moving
 *                  money, not spending it (lib/spend-range looksLikeCardPayment).
 *   duplicate    — same merchant, amount and currency on the same day, or
 *                  within two days when the rows came from different
 *                  sources (a bank and a CSV overlapping). Buying the same
 *                  coffee two days running is not a duplicate. A row
 *                  typed in by hand matches the bank's copy on amount
 *                  alone, within three days. A card line for an Alipay or
 *                  WeChat Pay purchase ("Alp Meituan  $3.47") matches the
 *                  wallet's own row ("美团  ¥22.90") across currencies.
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
export const isSystemTag = (tag: string) => tag.startsWith("ok:") || tag.startsWith("sys:");
const LARGE_FLOOR_USD = 250;

const dayNumber = (date: string) => Math.floor(Date.parse(`${date.slice(0, 10)}T00:00:00Z`) / 86_400_000);

// A card statement line for something paid through Alipay or WeChat Pay:
// "Alp Meituan", "ALP*Walmart", "Alipay Amap Taxi", "Weixin Panduo Platform".
const WALLET_CHARGE = /^\s*(alp\b|alp\*|alipay|weixin|wechat|wxpay|tenpay)/i;
export const isWalletCharge = (description: string) => WALLET_CHARGE.test(description);

type TwinTx = { date: string; amount: number; currency: string; description?: string | null };

/**
 * The card's copy of a wallet purchase (Oct 2026). A card statement shows
 * "Alp Meituan −$3.47" and the Alipay export shows "美团 −¥22.90" for the
 * same meal: other currency, other name. They match within two days when the
 * card line's printed foreign amount ("CNY 22.90") is the same, or, with none
 * printed, when the converted amounts are within `tolerance` (card rates and
 * fees). Returns a closeness score (lower is closer), or null when not a pair.
 */
export function walletTwinScore(card: TwinTx, other: TwinTx, toUSD: (amount: number, currency: string) => number, tolerance = 0.05): number | null {
  if (card.currency === other.currency) return null;
  if (!isWalletCharge(card.description ?? "") || isWalletCharge(other.description ?? "")) return null;
  const days = Math.abs(dayNumber(card.date) - dayNumber(other.date));
  if (!(days <= 2)) return null;
  const printed = (card.description ?? "").match(/\b([A-Z]{3})\s?([\d,]+\.\d{2})\b/);
  if (printed && printed[1] === other.currency) {
    return Math.abs(parseFloat(printed[2].replace(/,/g, "")) - other.amount) <= 0.02 ? days * 0.01 : null;
  }
  const a = toUSD(card.amount, card.currency), b = toUSD(other.amount, other.currency);
  const gap = Math.abs(a - b), size = Math.max(a, b);
  if (!(gap <= Math.max(tolerance * size, 0.02))) return null;
  return gap / Math.max(size, 0.01) + days * 0.01;
}

/**
 * Card copies of wallet purchases: card row id → the wallet row it copies.
 * `cards` are the rows that may be copies; `all` the rows they may copy.
 * Closest pairs first; each row pairs once.
 *
 * The card's own rate is learned from the rows (Oct 2026): John's card
 * charged 6.6 yuan a dollar while the market feed said about 7.1, so a 5%
 * band around the feed missed two thirds of the copies. Candidates are found
 * with a wide band, the usual rate between each pair of currencies is their
 * median, and a pair counts when it sits within 3% of that rate.
 */
export function walletTwins<T extends TwinTx & { id: string }>(cards: T[], all: T[], toUSD: (amount: number, currency: string) => number): Map<string, T> {
  const wide: { card: T; other: T; score: number }[] = [];
  for (const card of cards) {
    if (!isWalletCharge(card.description ?? "")) continue;
    for (const other of all) {
      const score = walletTwinScore(card, other, toUSD, 0.2);
      if (score !== null) wide.push({ card, other, score });
    }
  }
  const printed = (c: T) => /\b[A-Z]{3}\s?[\d,]+\.\d{2}\b/.test(c.description ?? "");
  const key = (c: T, o: T) => `${c.currency}>${o.currency}`;
  const ratios = new Map<string, number[]>();
  for (const { card, other } of wide) {
    if (printed(card) || !(card.amount >= 1)) continue; // cents rounding skews tiny ones
    ratios.set(key(card, other), [...(ratios.get(key(card, other)) ?? []), other.amount / card.amount]);
  }
  const rate = new Map([...ratios].filter(([, r]) => r.length >= 5).map(([k, r]) => [k, median(r)]));
  const pairs: { card: T; other: T; score: number }[] = [];
  for (const p of wide) {
    const r = rate.get(key(p.card, p.other));
    if (printed(p.card) || r === undefined) {
      const score = walletTwinScore(p.card, p.other, toUSD);
      if (score !== null) pairs.push({ ...p, score });
      continue;
    }
    const expected = p.card.amount * r, gap = Math.abs(p.other.amount - expected);
    // A card amount is rounded to the cent, which moves tiny ones by more than 3%.
    if (gap > Math.max(0.03 * expected, 0.006 * r)) continue;
    pairs.push({ ...p, score: gap / Math.max(expected, 0.01) + Math.abs(dayNumber(p.card.date) - dayNumber(p.other.date)) * 0.01 });
  }
  const out = new Map<string, T>(), used = new Set<string>();
  for (const { card, other } of pairs.sort((a, b) => a.score - b.score)) {
    if (used.has(card.id) || used.has(other.id)) continue;
    used.add(card.id); used.add(other.id);
    out.set(card.id, other);
  }
  return out;
}

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

  // Typed in by hand, then the bank sends its own copy (Oct 2026): the names
  // rarely match ("Coffee" vs "STARBUCKS #1234"), so the same amount within
  // three days is enough. The hand-typed row is the one flagged, so confirming
  // keeps the bank's record. Each bank row matches one typed row at most.
  const fromBank = (t: FlagTx) => t.source === "plaid";
  const typed = (t: FlagTx) => (t.source ?? "manual") === "manual";
  const claimed = new Set<string>();
  for (const t of expenses) {
    if (!typed(t) || out.has(t.id) || ok(t, "duplicate")) continue;
    const twin = expenses.find((b) => fromBank(b) && !claimed.has(b.id) && b.currency === t.currency
      && Math.abs(b.amount - t.amount) < 0.005 && Math.abs(dayNumber(b.date) - dayNumber(t.date)) <= 3);
    if (twin) { claimed.add(twin.id); out.set(t.id, "duplicate"); }
  }

  // Wallet purchases on a card statement: the card row is flagged, so
  // confirming keeps the wallet's row, which has the time, the shop's own
  // name and the amount actually paid.
  for (const id of walletTwins(expenses.filter((t) => !out.has(t.id) && !ok(t, "duplicate")), expenses, toUSD).keys()) out.set(id, "duplicate");

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
