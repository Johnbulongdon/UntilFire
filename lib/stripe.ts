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
