import Stripe from "stripe";

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

export const STRIPE_PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID ?? "";
export const STRIPE_PRO_ANNUAL_PRICE_ID = process.env.STRIPE_PRO_ANNUAL_PRICE_ID ?? "";

/**
 * Which Stripe price to charge. Annual falls back to monthly when the annual
 * price isn't configured, so a missing env var downgrades the plan rather than
 * sending someone to a checkout with no line item.
 */
export function priceIdFor(interval: "month" | "year"): string {
  if (interval === "year" && STRIPE_PRO_ANNUAL_PRICE_ID) return STRIPE_PRO_ANNUAL_PRICE_ID;
  return STRIPE_PRO_PRICE_ID;
}
