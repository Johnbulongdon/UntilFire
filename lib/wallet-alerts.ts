/**
 * Google Pay payments read from Google Wallet's alerts on Android (8 Nov 2026,
 * D-142). Pure, shared by the phone (turning an alert into a payment, and
 * skipping one the bank already sent) and the bank sync (folding the Google
 * Pay copy into the bank's when it arrives), so both match the same way.
 */
import { merchantKey } from "./merchant-memory.ts";

/** The tag on a payment added from a Google Wallet alert; "sys:" tags are never shown as the person's own. */
export const GPAY_TAG = "sys:gpay";
/** How far apart the alert and the bank's copy may be dated (banks post a day or two later). */
export const MATCH_DAYS = 3;

export interface WalletPayment { amount: number; currency: string | null; merchant: string }

const SYMBOLS: [string, string][] = [["HK$", "HKD"], ["US$", "USD"], ["CA$", "CAD"], ["C$", "CAD"], ["A$", "AUD"], ["S$", "SGD"], ["$", "USD"], ["€", "EUR"], ["£", "GBP"], ["¥", "JPY"]];
const AMOUNT = /(HK\$|US\$|CA\$|C\$|A\$|S\$|\$|€|£|¥)\s?(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/;
// Alerts that hold an amount but are not a new payment by you.
const NOT_A_PAYMENT = /declin|refund|reversed|cancel|fail|didn.t go through|received|sent you|request/i;

/**
 * One Wallet alert as a payment, or null when it isn't one. US wording is
 * "Blue Bottle Coffee" over "$4.50 with Visa ••1234", or "$4.50 at Blue Bottle
 * Coffee" in one line. The currency is null when the alert only says "$" and
 * the caller should use the person's own.
 */
export function parseWalletAlert(title: string, text: string): WalletPayment | null {
  const all = `${title}\n${text}`;
  if (NOT_A_PAYMENT.test(all)) return null;
  const m = all.match(AMOUNT);
  if (!m) return null;
  const amount = Number(m[2].replace(/,/g, ""));
  if (!(amount > 0)) return null;
  const at = all.match(/\bat\s+(.+?)(?:\s+(?:with|using|on)\s+.*)?$/im);
  const merchant = (at ? at[1] : AMOUNT.test(title) ? "" : title).trim().replace(/[.!]+$/, "");
  if (!merchant) return null;
  const code = SYMBOLS.find(([s]) => s === m[1])?.[1] ?? null;
  return { amount, currency: m[1] === "$" ? null : code, merchant };
}

/** Same shop, by name: "STARBUCKS #1234 SEATTLE" and "Starbucks" match; "Shell" and "Shake Shack" don't. */
export function sameMerchant(a: string, b: string): boolean {
  const x = merchantKey(a), y = merchantKey(b);
  if (!x || !y) return false;
  if (x === y || x.startsWith(`${y} `) || y.startsWith(`${x} `)) return true;
  const first = (s: string) => s.split(" ")[0];
  return first(x).length >= 4 && first(x) === first(y);
}

const dayGap = (a: string, b: string) => Math.abs(Date.parse(`${a.slice(0, 10)}T00:00:00Z`) - Date.parse(`${b.slice(0, 10)}T00:00:00Z`)) / 86_400_000;

export interface MatchRow { id: string; date: string; amount: number; currency: string; description: string }

/** The row in `pool` that is the same payment as `row`: same amount and currency, close dates, same shop. */
export function findTwin<T extends MatchRow>(row: MatchRow, pool: T[], taken: Set<string> = new Set()): T | null {
  return pool.find((p) => !taken.has(p.id) && p.id !== row.id
    && p.currency === row.currency && Math.abs(p.amount - row.amount) < 0.005
    && dayGap(p.date, row.date) <= MATCH_DAYS && sameMerchant(p.description, row.description)) ?? null;
}

/**
 * Bank rows that arrived, matched to Google Pay rows already saved. Each
 * Google Pay row pairs with at most one bank row, so two coffees of the same
 * price both stay.
 */
export function pairWalletTwins<B extends MatchRow, G extends MatchRow>(bank: B[], gpay: G[]): { bank: B; gpay: G }[] {
  const taken = new Set<string>();
  const pairs: { bank: B; gpay: G }[] = [];
  for (const b of bank) {
    const g = findTwin(b, gpay, taken);
    if (g) { taken.add(g.id); pairs.push({ bank: b, gpay: g }); }
  }
  return pairs;
}
