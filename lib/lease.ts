/**
 * A lease on the Rent bill (founder, Oct 17 2026). One rule for the phone
 * and the website: only something tagged Housing › Rent offers a lease, the
 * notice deadline is the end date less the notice period, and Today asks
 * "Stay or move?" 30 days before that deadline, again a week before if the
 * answer was "not sure". The expected rise feeds what-ifs only; the headline
 * freedom date stays on real spending and catches up after renewal.
 */

export const DEFAULT_NOTICE_DAYS = 60;
/** Today first asks this many days before the notice deadline. */
export const FIRST_ASK_DAYS = 30;
/** And once more this close to it, when the answer was "not sure". */
export const LAST_ASK_DAYS = 7;

export type LeaseDecision = "renew" | "move" | "unsure";

export type Lease = {
  ends_on: string; // YYYY-MM-DD, last day of the lease
  notice_days?: number | null;
  rise_pct?: number | null;
  decision?: LeaseDecision | null;
};

/** Housing › Rent: the only tag that offers a lease. Mortgage never does. */
export const isRent = (x: { category?: string | null; sub_category?: string | null }): boolean =>
  x.category === "housing" && x.sub_category === "Rent";

/** The old combined tag, asked about once so it can become Rent or Mortgage. */
export const isRentOrMortgage = (x: { category?: string | null; sub_category?: string | null }): boolean =>
  x.category === "housing" && x.sub_category === "Rent/Mortgage";

const DAY = 86_400_000;
const utc = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** The last day to tell the landlord, YYYY-MM-DD. */
export const noticeDeadline = (lease: Lease): string =>
  iso(utc(lease.ends_on) - (lease.notice_days ?? DEFAULT_NOTICE_DAYS) * DAY);

/** Whole days from `today` to `date`; negative once it has passed. */
export const daysUntil = (date: string, today: string): number => Math.round((utc(date) - utc(today)) / DAY);

/**
 * Whether Today should ask "Stay or move?" on `today`. Once inside 30 days of
 * the deadline until it is answered; an "unsure" is asked again in the last
 * week. Nothing after the deadline: by then the decision has been made for them.
 */
export function leaseAsk(lease: Lease, today: string): "first" | "last" | null {
  const left = daysUntil(noticeDeadline(lease), today);
  if (left < 0 || left > FIRST_ASK_DAYS) return null;
  if (!lease.decision) return left <= LAST_ASK_DAYS ? "last" : "first";
  if (lease.decision === "unsure" && left <= LAST_ASK_DAYS) return "last";
  return null;
}

/** Rent after renewal at the expected rise, rounded to the dollar; the same rent when the rise isn't known. */
export const rentAfterRenewal = (rent: number, risePct?: number | null): number =>
  Math.round(rent * (1 + (risePct ?? 0) / 100));

/** How far along the lease is today, 0 to 1, for the timeline, given a 12-month lease when the start isn't known. */
export function leaseProgress(lease: Lease, today: string, months = 12): number {
  const end = utc(lease.ends_on);
  const start = Date.UTC(+lease.ends_on.slice(0, 4), +lease.ends_on.slice(5, 7) - 1 - months, +lease.ends_on.slice(8, 10));
  return Math.min(1, Math.max(0, (utc(today) - start) / (end - start)));
}
