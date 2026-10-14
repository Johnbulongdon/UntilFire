/**
 * The free month for finishing the FIRE type quiz (D-79): once per account,
 * and only for someone who has never had Pro or a trial, so it never
 * undercuts the card-backed trial.
 */
export const REWARD_DAYS = 30;

export interface RewardSub { status?: string | null; stripe_subscription_id?: string | null; apple_original_transaction_id?: string | null; source?: string | null }

export function rewardEligible(sub: RewardSub | null, rewardedAt: string | null): boolean {
  if (rewardedAt) return false;
  if (!sub) return true;
  return !sub.stripe_subscription_id && !sub.apple_original_transaction_id && sub.source !== "reward" && sub.status !== "active";
}
