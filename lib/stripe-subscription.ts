/** Current Stripe versions put billing periods on items, not subscriptions. */
export function stripeSubscriptionState(sub: {
  status: string;
  items: { data: { current_period_end: number }[] };
}) {
  const ends = sub.items.data.map(item => item.current_period_end);
  if (!ends.length || ends.some(end => !Number.isSafeInteger(end) || end <= 0 || end > 8_640_000_000_000)) {
    throw new Error("Subscription has no valid billing period");
  }
  // UntilFire sells one item. If an account has multiple items, use the first
  // renewal boundary rather than accidentally extending access to the last one.
  const current_period_end = new Date(Math.min(...ends) * 1000).toISOString();
  const active = sub.status === "active" || sub.status === "trialing";
  // Existing clients use active/pro for both paid access and an active trial.
  return { status: active ? "active" : sub.status, plan: active ? "pro" : "free", current_period_end };
}
