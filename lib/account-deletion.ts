/**
 * What has to be undone before an account can be deleted, checked on the
 * server so the website and the iOS app enforce the same rule.
 *
 * - A Pro subscription that will renew. Deleting the account does not stop
 *   Stripe: it would keep charging a card for an account that no longer
 *   exists. One already set to end at the period's close is fine.
 * - A connected bank. The person disconnects each one themselves, so they see
 *   UntilFire's access to the bank end before the account goes.
 *
 * Pure apart from the two lookups passed in, so scripts/verify-account-deletion
 * can check every case without Supabase or Stripe.
 */

export interface DeletionBlockers {
  /** A Stripe subscription that will charge again. */
  subscription: boolean
  /** Names of banks still connected through Plaid. */
  banks: string[]
}

export interface SubscriptionRow {
  plan: string | null
  status: string | null
  stripe_subscription_id: string | null
}

export interface StripeSubscriptionState {
  status: string
  cancel_at_period_end: boolean
}

const RENEWING = new Set(["active", "trialing", "past_due", "unpaid", "incomplete"])

/**
 * Whether a subscription will bill again. The row in `subscriptions` says
 * "active" until the period ends even after someone cancels, so when Stripe
 * can be asked, its answer wins; when it can't, the row is trusted, which
 * errs toward blocking rather than toward an orphaned charge.
 */
export function willRenew(row: SubscriptionRow | null, live: StripeSubscriptionState | null): boolean {
  if (!row?.stripe_subscription_id) return false
  if (live) return RENEWING.has(live.status) && !live.cancel_at_period_end
  return row.plan === "pro" || RENEWING.has(row.status ?? "")
}

export function hasBlockers(b: DeletionBlockers): boolean {
  return b.subscription || b.banks.length > 0
}

/** One sentence for the person, naming every step still to do. */
export function blockerMessage(b: DeletionBlockers): string {
  const steps: string[] = []
  if (b.subscription) steps.push("cancel your Pro subscription")
  if (b.banks.length === 1) steps.push(`disconnect ${b.banks[0]}`)
  else if (b.banks.length > 1) steps.push(`disconnect your ${b.banks.length} connected banks`)
  if (steps.length === 0) return ""
  return `Before deleting your account, ${steps.join(" and ")}.`
}
