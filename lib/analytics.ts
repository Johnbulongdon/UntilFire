// Client-side funnel instrumentation. Wraps posthog-js so call sites import
// typed helpers (e.g. trackCalculatorStepViewed) rather than reaching into
// posthog directly — this keeps event names and property contracts pinned to
// lib/analytics-events.ts.

'use client';

import posthog from 'posthog-js';
import {
  FunnelEvents,
  CALCULATOR_STEP_INDEX,
  bucketUSD,
  bucketYears,
  withVersion,
  type CalculatorStepId,
  type CalculatorStepProperties,
  type CalculatorRevealedProperties,
  type SignupStartedProperties,
  type DashboardFirstViewProperties,
  type PaywallProperties,
  type CheckoutStartedProperties,
} from './analytics-events';

function isClient(): boolean {
  return typeof window !== 'undefined';
}

function capture(
  event: string,
  properties: object,
  options?: { sendInstantly?: boolean },
) {
  if (!isClient()) return;
  try {
    posthog.capture(
      event,
      properties as Record<string, unknown>,
      options?.sendInstantly ? { send_instantly: true } : undefined,
    );
  } catch {
    // Analytics must never break product code paths.
  }
}

export function identifyUser(userId: string) {
  if (!isClient() || !userId) return;
  try {
    posthog.identify(userId);
  } catch {}
}

export function resetUser() {
  if (!isClient()) return;
  try {
    posthog.reset();
  } catch {}
}

export function trackLandingViewed(landingSource?: string) {
  capture(
    FunnelEvents.LANDING_VIEWED,
    withVersion(landingSource ? { landing_source: landingSource } : {}),
  );
}

export function trackCalculatorStepViewed(
  stepId: CalculatorStepId,
  landingSource?: string,
) {
  const props: CalculatorStepProperties = withVersion({
    step_id: stepId,
    step_index: CALCULATOR_STEP_INDEX[stepId],
    ...(landingSource ? { landing_source: landingSource } : {}),
  });
  capture(FunnelEvents.CALCULATOR_STEP_VIEWED, props);
}

export function trackCalculatorRevealed(input: {
  stateKey: string;
  isCustomCity: boolean;
  fireTarget: number;
  yearsToFire: number;
  landingSource?: string;
}) {
  const props: CalculatorRevealedProperties = withVersion({
    state_key: input.stateKey,
    is_custom_city: input.isCustomCity,
    fire_target_bucket: bucketUSD(input.fireTarget),
    years_to_fire_bucket: bucketYears(input.yearsToFire),
    ...(input.landingSource ? { landing_source: input.landingSource } : {}),
  });
  capture(FunnelEvents.CALCULATOR_REVEALED, props);
}

export function trackSignupStarted(input: {
  fromCalculator: boolean;
  stateKey?: string;
  landingSource?: string;
}) {
  const props: SignupStartedProperties = withVersion({
    from_calculator: input.fromCalculator,
    ...(input.stateKey ? { state_key: input.stateKey } : {}),
    ...(input.landingSource ? { landing_source: input.landingSource } : {}),
  });
  capture(FunnelEvents.SIGNUP_STARTED, props);
}

export function trackSignupCompleted() {
  // send_instantly: this fires right before a hard navigation in the OAuth
  // callback path; queued events would otherwise be dropped when the page
  // unloads.
  capture(FunnelEvents.SIGNUP_COMPLETED, withVersion({}), { sendInstantly: true });
}

export function trackDashboardFirstView(input: {
  hadCalculatorPrefill: boolean;
  viaUpgrade: boolean;
  scenarioId?: string;
}) {
  const props: DashboardFirstViewProperties = withVersion({
    had_calculator_prefill: input.hadCalculatorPrefill,
    via_upgrade: input.viaUpgrade,
    ...(input.scenarioId ? { scenario_id: input.scenarioId } : {}),
  });
  capture(FunnelEvents.DASHBOARD_FIRST_VIEW, props);
}

export function trackPaywallViewed(surface: string) {
  const props: PaywallProperties = withVersion({ surface });
  capture(FunnelEvents.PAYWALL_VIEWED, props);
}

export function trackCheckoutStarted(surface: string) {
  const props: CheckoutStartedProperties = withVersion({ surface });
  capture(FunnelEvents.CHECKOUT_STARTED, props);
}
