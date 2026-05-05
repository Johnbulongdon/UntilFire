// Funnel event contract — single source of truth.
//
// See docs/analytics/EVENTS.md for the human-readable spec. Any new event or
// property must be added here first; instrumentation imports from this module
// so a typo in a call site is a TypeScript error rather than a silently
// renamed event in PostHog.

export const FUNNEL_EVENT_VERSION = 1;

export const FunnelEvents = {
  LANDING_VIEWED: 'funnel_landing_viewed',
  CALCULATOR_STEP_VIEWED: 'funnel_calculator_step_viewed',
  CALCULATOR_REVEALED: 'funnel_calculator_revealed',
  SIGNUP_STARTED: 'funnel_signup_started',
  SIGNUP_COMPLETED: 'funnel_signup_completed',
  DASHBOARD_FIRST_VIEW: 'funnel_dashboard_first_view',
  PAYWALL_VIEWED: 'funnel_paywall_viewed',
  CHECKOUT_STARTED: 'funnel_checkout_started',
  CHECKOUT_SUCCEEDED: 'funnel_checkout_succeeded',
} as const;

export type FunnelEventName =
  (typeof FunnelEvents)[keyof typeof FunnelEvents];

export type CalculatorStepId = 'goals' | 'city' | 'income' | 'savings';

export const CALCULATOR_STEP_INDEX: Record<CalculatorStepId, number> = {
  goals: 1,
  city: 2,
  income: 3,
  savings: 4,
};

// Coarse buckets keep individual users from being re-identified by their
// exact FIRE number / timeline. The contract is "bucket, never raw amount".
export function bucketUSD(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return 'unknown';
  if (amount < 250_000) return 'lt_250k';
  if (amount < 500_000) return '250k_500k';
  if (amount < 1_000_000) return '500k_1m';
  if (amount < 2_000_000) return '1m_2m';
  if (amount < 5_000_000) return '2m_5m';
  return 'gte_5m';
}

export function bucketYears(years: number): string {
  if (!Number.isFinite(years) || years < 0) return 'unknown';
  if (years < 5) return 'lt_5';
  if (years < 10) return '5_10';
  if (years < 20) return '10_20';
  if (years < 30) return '20_30';
  return 'gte_30';
}

export interface BaseFunnelProperties {
  funnel_event_version: number;
}

export interface CalculatorStepProperties extends BaseFunnelProperties {
  step_id: CalculatorStepId;
  step_index: number;
  fire_goal?: string;
}

export interface CalculatorRevealedProperties extends BaseFunnelProperties {
  state_key: string;
  is_custom_city: boolean;
  fire_target_bucket: string;
  years_to_fire_bucket: string;
  fire_goal?: string;
}

export interface SignupStartedProperties extends BaseFunnelProperties {
  from_calculator: boolean;
  state_key?: string;
}

export interface DashboardFirstViewProperties extends BaseFunnelProperties {
  had_calculator_prefill: boolean;
  via_upgrade: boolean;
  scenario_id?: string;
}

export interface PaywallProperties extends BaseFunnelProperties {
  surface: string;
}

export interface CheckoutStartedProperties extends BaseFunnelProperties {
  surface: string;
}

export interface CheckoutSucceededServerProperties extends BaseFunnelProperties {
  plan: string;
  price_id?: string;
  stripe_session_id: string;
  mode: string;
  source: 'stripe_webhook';
}

export function withVersion<P extends Record<string, unknown>>(
  props: P,
): P & BaseFunnelProperties {
  return { ...props, funnel_event_version: FUNNEL_EVENT_VERSION };
}
