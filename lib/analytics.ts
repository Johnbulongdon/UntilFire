// Client-side funnel instrumentation. Wraps posthog-js so call sites import
// typed helpers (e.g. trackCalculatorStepViewed) rather than reaching into
// posthog directly — this keeps event names and property contracts pinned to
// lib/analytics-events.ts.

'use client';

import posthog from 'posthog-js';
import {
  FunnelEvents,
  PRO_PLAN_ANALYTICS,
  CALCULATOR_STEP_INDEX,
  bucketUSD,
  bucketYears,
  withVersion,
  type CalculatorStepId,
  type CalculatorStepProperties,
  type CalculatorRevealedProperties,
  type SignupStartedProperties,
  type SignupCompletedProperties,
  type DashboardFirstViewProperties,
  type PaywallProperties,
  type CheckoutStartedProperties,
  type FireTypeStartedProperties,
  type FireTypeCompletedProperties,
  type FireTypeSharedProperties,
  type FireTypeCtaClickedProperties,
  type HysaEmptyStateCtaClickedProperties,
  type EmailCaptureSubmittedProperties,
  type NextMoveViewedProperties,
  type NextMoveOpenedProperties,
  type ScenarioTestedProperties,
  type ScenarioAcceptedProperties,
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

export function trackSignupCompleted(input: { isNewUser: boolean; authProvider: string }) {
  const props: SignupCompletedProperties = withVersion({
    is_new_user: input.isNewUser,
    auth_provider: input.authProvider,
  });
  // send_instantly: fires right before a hard navigation in the OAuth
  // callback; queued events would otherwise be dropped on page unload.
  capture(FunnelEvents.SIGNUP_COMPLETED, props, { sendInstantly: true });
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

export function trackPaywallViewed(input: { source: string; priceId?: string }) {
  const props: PaywallProperties = withVersion({
    plan: PRO_PLAN_ANALYTICS.plan,
    price_monthly: PRO_PLAN_ANALYTICS.priceMonthly,
    ...(input.priceId ? { price_id: input.priceId } : {}),
    source: input.source,
  });
  capture(FunnelEvents.PAYWALL_VIEWED, props);
}

export function trackCheckoutStarted(input: { source: string; priceId?: string }) {
  const props: CheckoutStartedProperties = withVersion({
    plan: PRO_PLAN_ANALYTICS.plan,
    price_monthly: PRO_PLAN_ANALYTICS.priceMonthly,
    ...(input.priceId ? { price_id: input.priceId } : {}),
    source: input.source,
  });
  capture(FunnelEvents.CHECKOUT_STARTED, props);
}

export function trackFireTypeStarted(input: { source?: string }) {
  const props: FireTypeStartedProperties = withVersion({
    ...(input.source ? { source: input.source } : {}),
  });
  capture(FunnelEvents.FIRE_TYPE_STARTED, props);
}

export function trackFireTypeCompleted(input: { fireTypeCode: string; source?: string }) {
  const props: FireTypeCompletedProperties = withVersion({
    fire_type_code: input.fireTypeCode,
    fire_type_axes: input.fireTypeCode,
    ...(input.source ? { source: input.source } : {}),
  });
  capture(FunnelEvents.FIRE_TYPE_COMPLETED, props);
}

export function trackFireTypeShared(input: { fireTypeCode: string; shareMethod: 'native' | 'clipboard' }) {
  const props: FireTypeSharedProperties = withVersion({
    fire_type_code: input.fireTypeCode,
    fire_type_axes: input.fireTypeCode,
    share_method: input.shareMethod,
  });
  capture(FunnelEvents.FIRE_TYPE_SHARED, props);
}

export function trackFireTypeCtaClicked(input: { fireTypeCode: string; source?: string }) {
  const props: FireTypeCtaClickedProperties = withVersion({
    fire_type_code: input.fireTypeCode,
    fire_type_axes: input.fireTypeCode,
    ...(input.source ? { source: input.source } : {}),
  });
  capture(FunnelEvents.FIRE_TYPE_CTA_CLICKED, props);
}

export function trackHysaEmptyStateCtaClicked(input: {
  cta: 'learn_more' | 'connect_account';
  destination: 'apy_calculator' | 'plaid_connect';
  placement?: 'assets_empty_state';
}) {
  const props: HysaEmptyStateCtaClickedProperties = withVersion({
    cta: input.cta,
    destination: input.destination,
    placement: input.placement ?? 'assets_empty_state',
  });
  capture(FunnelEvents.HYSA_EMPTY_STATE_CTA_CLICKED, props);
}

export function trackEmailCaptureSubmitted(input: { landingSource?: string }) {
  const props: EmailCaptureSubmittedProperties = withVersion({
    ...(input.landingSource ? { landing_source: input.landingSource } : {}),
  });
  capture(FunnelEvents.EMAIL_CAPTURE_SUBMITTED, props);
}

export function trackNextMoveViewed(input: { moveCount: number; topPriority: number }) {
  const props: NextMoveViewedProperties = withVersion({
    move_count: input.moveCount,
    top_priority: input.topPriority,
  });
  capture(FunnelEvents.NEXT_MOVE_VIEWED, props);
}

export function trackNextMoveOpened(input: { topPriority: number }) {
  const props: NextMoveOpenedProperties = withVersion({
    top_priority: input.topPriority,
  });
  capture(FunnelEvents.NEXT_MOVE_OPENED, props);
}

export function trackScenarioTested(input: { scenarioIndex: number; scenarioLabel: string; deltaYears: number }) {
  const props: ScenarioTestedProperties = withVersion({
    scenario_index: input.scenarioIndex,
    scenario_label: input.scenarioLabel,
    delta_years_rounded: Math.round(input.deltaYears * 10) / 10,
  });
  capture(FunnelEvents.SCENARIO_TESTED, props);
}

export function trackScenarioAccepted(input: { scenarioIndex: number; scenarioLabel: string; deltaYears: number }) {
  const props: ScenarioAcceptedProperties = withVersion({
    scenario_index: input.scenarioIndex,
    scenario_label: input.scenarioLabel,
    delta_years_rounded: Math.round(input.deltaYears * 10) / 10,
  });
  // send_instantly: onSave navigates to /login right after this fires;
  // queued events would otherwise be dropped on page unload, same reasoning
  // as trackSignupCompleted above.
  capture(FunnelEvents.SCENARIO_ACCEPTED, props, { sendInstantly: true });
}
