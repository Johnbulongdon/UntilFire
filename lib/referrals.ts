/**
 * The creator referral program's rules, in one place (D-27).
 *
 * A creator shares untilfire.com/r/<code>. Someone who signs up within the
 * cookie window is attributed to them for good. The creator then earns 30%
 * of every payment that person makes in their first 12 months of paying,
 * counted only when Stripe collects money (a free trial earns nothing) and
 * reversed if the payment is refunded or disputed. Earnings wait 30 days
 * before they can be paid, and payouts go out by hand, monthly, by PayPal or
 * Wise, once at least $20 is payable.
 *
 * No imports, so the tests, the API routes and the pages all read the same
 * numbers.
 */

export const REFERRAL_RATE = 0.3;
export const REFERRAL_RATE_BPS = 3000;
export const REFERRAL_RATE_LABEL = "30%";
export const REFERRAL_MONTHS = 12;
/** Days a refund or chargeback can still reverse an earning before it is payable. */
export const REFERRAL_HOLD_DAYS = 30;
export const REFERRAL_MIN_PAYOUT_CENTS = 2000;
/** How long a click is remembered before sign-up. */
export const REFERRAL_COOKIE_DAYS = 60;
export const REFERRAL_COOKIE = "uf_ref";
/** An account older than this at its first dashboard visit was not referred by a new click. */
export const REFERRAL_CLAIM_MAX_ACCOUNT_AGE_DAYS = 7;
export const REFERRAL_TERMS_VERSION = "2026-09-27";

/**
 * Two steps up from the base 30% (D-27): 40% once a creator has brought 10
 * paying customers, and 10% for as long as a customer keeps paying after
 * their first year. At $9 a month the business still keeps $3.34 a month at
 * 40%, and $6.04 at 10%.
 */
export const REFERRAL_TIER_RATE_BPS = 4000;
export const REFERRAL_TIER_RATE_LABEL = "40%";
export const REFERRAL_TIER_CUSTOMERS = 10;
export const REFERRAL_TAIL_RATE_BPS = 1000;
export const REFERRAL_TAIL_RATE_LABEL = "10%";

/**
 * "Give a month, get a month" (D-27): the credit a user earns when a friend
 * they invited first pays. One month of the monthly plan, $9, whichever plan
 * the user is on. Kept here, not imported from pricing, so this module stays
 * import-free; test:referrals checks the two agree.
 */
export const FRIEND_CREDIT_CENTS = 900;

/** A friend link's code: "f-" and eight letters or digits, readable aloud. */
export function friendCode(random: () => number = Math.random): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  for (;;) {
    let out = "f-";
    for (let i = 0; i < 8; i++) out += alphabet[Math.floor(random() * alphabet.length)];
    // Rarely, eight random letters spell "staff"; that code would be refused.
    if (normaliseCode(out)) return out;
  }
}

export type PayoutMethod = "paypal" | "wise";
export type CommissionStatus = "pending" | "payable" | "paid" | "reversed";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Words a creator code can't be, so /r/<code> never looks like ours. */
const RESERVED = new Set(["admin", "api", "untilfire", "support", "help", "pricing", "dashboard", "login", "invite", "terms", "team", "official"]);

/**
 * Anywhere in a code, not just the whole of it: "untilfire-official" or
 * "support-team" would read as us. "removed-" is the prefix a removed
 * creator's code is renamed to.
 */
const LOOKS_OFFICIAL = /until-?fire|official|support|staff|admin|^removed-/;

/** Lowercase letters, digits and single hyphens, 3–24 characters. */
export function normaliseCode(raw: string): string | null {
  const code = raw.trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){2,23}$/.test(code)) return null;
  if (RESERVED.has(code) || LOOKS_OFFICIAL.test(code)) return null;
  return code;
}

/**
 * The creator's share of what was collected, rounded down to the cent so it
 * never pays out more than was earned. The rate is in basis points (3000 =
 * 30%), snapshotted when the customer signed up.
 */
export function commissionCents(collectedCents: number, rateBps: number = REFERRAL_RATE_BPS): number {
  if (!Number.isFinite(collectedCents) || collectedCents <= 0) return 0;
  return Math.floor((collectedCents * rateBps) / 10_000);
}

/**
 * Whether a payment falls inside the earning window: the 12 months that
 * start with the customer's first paid invoice. With no earlier payment, this
 * one starts the window.
 */
export function withinEarningWindow(firstPaidAt: Date | null, paidAt: Date): boolean {
  if (!firstPaidAt) return true;
  const end = new Date(firstPaidAt);
  end.setUTCMonth(end.getUTCMonth() + REFERRAL_MONTHS);
  return paidAt.getTime() < end.getTime();
}

export function payableAt(earnedAt: Date): Date {
  return new Date(earnedAt.getTime() + REFERRAL_HOLD_DAYS * DAY_MS);
}

/** Stored rows are pending, paid or reversed; "payable" is pending past its hold. */
export function commissionStatus(row: { status: string; payable_at: string }, now: Date = new Date()): CommissionStatus {
  if (row.status === "paid" || row.status === "reversed") return row.status;
  return new Date(row.payable_at).getTime() <= now.getTime() ? "payable" : "pending";
}

export function accountYoungEnoughToClaim(createdAt: string, now: Date = new Date()): boolean {
  return now.getTime() - new Date(createdAt).getTime() <= REFERRAL_CLAIM_MAX_ACCOUNT_AGE_DAYS * DAY_MS;
}

export interface CommissionRow {
  referred_user_id: string;
  commission_cents: number;
  status: string;
  payable_at: string;
}

/**
 * The rate for one payment. Inside the customer's first 12 months of paying:
 * the base rate snapshotted at sign-up, or 40% from the creator's 10th paying
 * customer on (counting the one paying now). After those 12 months: 10%, for
 * as long as the customer pays.
 */
export function rateForPayment(opts: { baseRateBps: number; inFirstYear: boolean; payingCustomers: number }): number {
  if (!opts.inFirstYear) return REFERRAL_TAIL_RATE_BPS;
  return opts.payingCustomers >= REFERRAL_TIER_CUSTOMERS
    ? Math.max(opts.baseRateBps, REFERRAL_TIER_RATE_BPS)
    : opts.baseRateBps;
}

/**
 * Whether a creator can be paid now: $20 ready, or any amount at all for
 * their first payout, so the first real money arrives as soon as it clears.
 */
export function readyToPay(payableCents: number, hasBeenPaidBefore: boolean): boolean {
  return payableCents > 0 && (payableCents >= REFERRAL_MIN_PAYOUT_CENTS || !hasBeenPaidBefore);
}

/** The numbers a creator's dashboard and the admin view both show. */
export function summarise(rows: CommissionRow[], now: Date = new Date()) {
  const totals = { pending: 0, payable: 0, paid: 0, reversed: 0 };
  const paying = new Set<string>();
  for (const row of rows) {
    const status = commissionStatus(row, now);
    totals[status] += row.commission_cents;
    if (status !== "reversed") paying.add(row.referred_user_id);
  }
  return {
    ...totals,
    earned: totals.pending + totals.payable + totals.paid,
    payingCustomers: paying.size,
    readyToPay: readyToPay(totals.payable, totals.paid > 0),
  };
}

/** "$23.70", and "$20" rather than "$20.00" for whole dollars. */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2).replace(/\.00$/, "")}`;
}
