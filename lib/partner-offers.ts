/**
 * Partner offers' rules, in one place: savings, bank and brokerage accounts
 * UntilFire lists after someone has their result. Offers are picked for fit,
 * never for what they pay, and every link says who earns from it.
 *
 * No imports, so the tests, the API routes and the pages read the same rules.
 */

export const OFFER_KINDS = ["savings", "bank", "brokerage"] as const;
export type OfferKind = (typeof OFFER_KINDS)[number];

export const OFFER_KIND_LABEL: Record<OfferKind, string> = {
  savings: "High-yield savings",
  bank: "Bank",
  brokerage: "Brokerage",
};

export type PartnerOffer = {
  slug: string;
  kind: OfferKind;
  name: string;
  blurb: string;
  rateBps: number | null;
  bonusText: string | null;
  bonusEndsOn: string | null;
};

export const isOfferKind = (v: unknown): v is OfferKind =>
  typeof v === "string" && (OFFER_KINDS as readonly string[]).includes(v);

export function normaliseSlug(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const slug = raw.trim().toLowerCase();
  return /^[a-z0-9][a-z0-9-]{1,40}$/.test(slug) ? slug : null;
}

/** "example.com", from "https://www.Example.com/" or "Example.com". */
export function normaliseDomain(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const d = raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d) ? d : null;
}

/**
 * A link may go live only if it is https and its host is the offer's domain
 * or a subdomain of it. This is what stops a pasted short link or a look-alike
 * site from ever being shown to a user.
 */
export function linkMatchesDomain(rawUrl: unknown, domain: string): boolean {
  if (typeof rawUrl !== "string") return false;
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password) return false;
  const host = url.hostname.toLowerCase();
  return host === domain || host.endsWith(`.${domain}`);
}

/** The bonus line, or null once its end date has passed (inclusive, UTC). */
export function activeBonus(o: Pick<PartnerOffer, "bonusText" | "bonusEndsOn">, now = new Date()): string | null {
  if (!o.bonusText) return null;
  if (!o.bonusEndsOn) return o.bonusText;
  const today = now.toISOString().slice(0, 10);
  return o.bonusEndsOn >= today ? o.bonusText : null;
}

/** 420 → "4.20% APY". */
export const rateLabel = (bps: number | null) => (bps == null ? null : `${(bps / 100).toFixed(2)}% APY`);

/** What a year at this rate earns on a balance, in whole dollars. */
export const yearlyInterest = (balance: number, bps: number | null) =>
  bps == null || !(balance > 0) ? 0 : Math.round((balance * bps) / 10000);

/**
 * The disclosure shown under every link (FTC endorsement guides): plain,
 * next to the button, naming who earns. `referrer` is the creator's first
 * name when their link is the one in use.
 */
export function disclosure(referrer: string | null): string {
  return referrer
    ? `${referrer}, who invited you to UntilFire, earns a reward if you open this account. It costs you nothing.`
    : "UntilFire earns a reward if you open this account. It costs you nothing.";
}

/** Live offers for the page, grouped in OFFER_KINDS order. */
export function groupOffers<T extends { kind: OfferKind }>(offers: T[]): { kind: OfferKind; offers: T[] }[] {
  return OFFER_KINDS.map((kind) => ({ kind, offers: offers.filter((o) => o.kind === kind) })).filter(
    (g) => g.offers.length > 0,
  );
}
