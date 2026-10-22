/**
 * Why someone cancels Pro (D-99). One reason each, written in the user's own
 * words and specific to UntilFire, with no "Other": a catch-all becomes the
 * real cancel button and teaches nothing. `stripe` is the nearest of Stripe's
 * fixed feedback values, so the reason also shows in the Stripe dashboard.
 */
export const CANCEL_REASONS = [
  { key: "budget", label: "It doesn't fit my budget right now", stripe: "too_expensive" },
  { key: "break", label: "I'm taking a break", stripe: "unused" },
  { key: "free_enough", label: "The free plan is enough", stripe: "missing_features" },
  { key: "bank_sync", label: "My bank won't sync", stripe: "low_quality" },
  { key: "goal_reached", label: "I reached my goal", stripe: "other" },
] as const;

export type CancelReason = (typeof CANCEL_REASONS)[number]["key"];

export function isCancelReason(value: unknown): value is CancelReason {
  return CANCEL_REASONS.some((r) => r.key === value);
}
