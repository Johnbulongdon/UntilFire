// Server-side funnel capture. Used by the Stripe webhook so checkout success
// is recorded by the server of record (not the browser, which can be closed
// before the redirect lands).
//
// Uses the PostHog public capture endpoint over fetch to avoid pulling in the
// posthog-node package for a single event.

import {
  FunnelEvents,
  withVersion,
  type CheckoutSucceededServerProperties,
} from './analytics-events';

const DEFAULT_HOST = 'https://us.i.posthog.com';

function resolveCaptureUrl(): string | null {
  const host = (process.env.NEXT_PUBLIC_POSTHOG_HOST || DEFAULT_HOST).replace(
    /\/$/,
    '',
  );
  return host ? `${host}/capture/` : null;
}

async function captureServer(
  event: string,
  distinctId: string,
  properties: object,
): Promise<void> {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const url = resolveCaptureUrl();
  if (!apiKey || !url || !distinctId) return;

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        event,
        distinct_id: distinctId,
        properties,
        timestamp: new Date().toISOString(),
      }),
      // Webhooks are short-lived; don't let analytics block Stripe ack.
      keepalive: true,
    });
  } catch {
    // Never let analytics failures bubble into the webhook response.
  }
}

export async function trackCheckoutSucceededServer(input: {
  distinctId: string;
  plan: string;
  priceId?: string;
  stripeSessionId: string;
  mode: string;
}): Promise<void> {
  const props: CheckoutSucceededServerProperties = withVersion({
    plan: input.plan,
    price_id: input.priceId,
    stripe_session_id: input.stripeSessionId,
    mode: input.mode,
    source: 'stripe_webhook' as const,
  });
  await captureServer(FunnelEvents.CHECKOUT_SUCCEEDED, input.distinctId, props);
}
