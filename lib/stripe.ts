import Stripe from "stripe";
import { STRIPE_PRICE_IDS } from "./pricing";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Missing STRIPE_SECRET_KEY env var");
  }
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-04-22.dahlia",
    });
  }
  return _stripe;
}

// Convenience alias used in route handlers
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as any)[prop];
  },
});

/**
 * Which Stripe price to charge: the IDs beside the display prices in
 * lib/pricing.ts, so what the page promises and what checkout bills cannot
 * drift apart. The STRIPE_PRO_PRICE_ID and STRIPE_PRO_ANNUAL_PRICE_ID
 * variables in Vercel are no longer read.
 */
export function priceIdFor(interval: "month" | "year"): string {
  return STRIPE_PRICE_IDS[interval];
}

/**
 * When the paid (or trial) period ends. Since API version 2025-03-31 Stripe
 * keeps it on each subscription item, not on the subscription, so reading
 * `sub.current_period_end` gave undefined and `new Date(NaN).toISOString()`
 * threw before the row was saved (D-99).
 */
export function periodEndIso(sub: Stripe.Subscription): string | null {
  const ends = sub.items?.data?.[0]?.current_period_end
    ?? (sub as unknown as { current_period_end?: number }).current_period_end;
  return typeof ends === "number" ? new Date(ends * 1000).toISOString() : null;
}
