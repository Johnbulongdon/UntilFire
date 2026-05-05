# UntilFire Funnel Events — v1 Contract

This is the canonical contract for the v1 conversion funnel. Every event
listed here has a single emit site in code; if you add a new emit site,
update this doc in the same change.

The contract is also encoded in `lib/analytics-events.ts`. That file is the
runtime source of truth — the constants there are imported by every emit
site, so a typo in code is a TypeScript error rather than a silently renamed
event in PostHog. **This doc and that file must stay in sync.**

## Funnel order

```
funnel_landing_viewed
  → funnel_calculator_step_viewed (step_id=goals)
  → funnel_calculator_step_viewed (step_id=city)
  → funnel_calculator_step_viewed (step_id=income)
  → funnel_calculator_step_viewed (step_id=savings)
  → funnel_calculator_revealed
  → funnel_signup_started
  → funnel_signup_completed
  → funnel_dashboard_first_view
  → funnel_paywall_viewed          (helper exposed; emit site lands with paywall UI)
  → funnel_checkout_started        (helper exposed; emit site lands with paywall UI)
  → funnel_checkout_succeeded      (server, Stripe webhook)
```

## PII rules

- No emails, names, raw addresses, or precise dollar amounts in property
  payloads.
- FIRE target and years-to-FIRE are bucketed (`bucketUSD` / `bucketYears` in
  `lib/analytics-events.ts`).
- `scenario_id` is only attached after auth (dashboard first view onward).
- Pre-auth events ride PostHog's anonymous `distinct_id`. After signup we
  call `posthog.identify(userId)` so the anonymous funnel stitches to the
  authenticated person.
- `funnel_event_version` is attached to every event so we can evolve the
  contract without breaking historical queries.

## Events

### `funnel_landing_viewed`

- **Where**: `app/page.tsx`, `Home` screen effect when `screen === 'hero'`.
- **Properties**: none beyond defaults (`funnel_event_version`).

### `funnel_calculator_step_viewed`

- **Where**: `app/page.tsx`, `Home` screen effect when the wizard transitions
  to one of the four steps.
- **Properties**:
  - `step_id` — `goals` | `city` | `income` | `savings`.
  - `step_index` — `1..4`. Mirrors `step_id` for funnel ordering in PostHog.
  - `fire_goal` — optional. The selected FIRE goal once it's been picked
    (e.g. `early`, `coast`, `gen`, `nomad`).

### `funnel_calculator_revealed`

- **Where**: `app/page.tsx`, `RevealScreen` effect, fired exactly once per
  mount when the reveal animation fully settles (`revealed === true`).
- **Properties**:
  - `state_key` — tax jurisdiction key (e.g. `CA`, `TX`, `custom`).
  - `is_custom_city` — boolean. `true` for custom monthly-expense entries.
  - `fire_target_bucket` — `lt_250k` | `250k_500k` | `500k_1m` | `1m_2m`
    | `2m_5m` | `gte_5m`.
  - `years_to_fire_bucket` — `lt_5` | `5_10` | `10_20` | `20_30` | `gte_30`.
  - `fire_goal` — optional, same domain as above.

### `funnel_signup_started`

- **Where**: `app/login/page.tsx`, click handler on the Google sign-in
  button.
- **Properties**:
  - `from_calculator` — boolean. `true` when a calculator prefill is present
    (i.e. the user came from the reveal CTA).
  - `state_key` — optional. Mirrors the prefill's tax jurisdiction.

### `funnel_signup_completed`

- **Where**: fired in two places, both as the same event with the same
  identify call so dedup at the user level is straightforward:
  - `app/login/page.tsx` Supabase `SIGNED_IN` listener.
  - `app/auth/callback/page.tsx` after `exchangeCodeForSession` resolves.
- **Properties**: none beyond defaults.
- **Side effect**: `posthog.identify(userId)` runs alongside the event.

### `funnel_dashboard_first_view`

- **Where**: `app/dashboard/page.tsx`, the session-load `useEffect` after
  `loadDefaultScenario` resolves. Fires once per dashboard mount.
- **Properties**:
  - `had_calculator_prefill` — boolean.
  - `via_upgrade` — boolean. `true` when the URL carries `?upgraded=true`
    (i.e. landing from a Stripe checkout success redirect).
  - `scenario_id` — UUID of the user's default scenario.

### `funnel_paywall_viewed`

- **Status**: helper exposed (`trackPaywallViewed(surface)`), no emit site
  yet. The paywall UI lands in a separate issue; that change is required to
  call this helper.
- **Properties**:
  - `surface` — short label for where the paywall rendered (e.g.
    `dashboard_upgrade_card`).

### `funnel_checkout_started`

- **Status**: helper exposed (`trackCheckoutStarted(surface)`), no emit site
  yet. Wire this to whatever button POSTs to `/api/stripe/checkout`.
- **Properties**:
  - `surface` — short label for the click origin.

### `funnel_checkout_succeeded`

- **Where**: **server** — `app/api/stripe/webhook/route.ts`, on the
  `checkout.session.completed` event after the subscriptions row upsert
  succeeds. Sent via `lib/analytics-server.ts` over the PostHog public
  capture endpoint (`${NEXT_PUBLIC_POSTHOG_HOST}/capture/`).
- **`distinct_id`**: Supabase `user_id` from the checkout session metadata
  (`metadata.supabase_user_id`). This stitches into the same person as the
  client identify call.
- **Properties**:
  - `plan` — `pro`.
  - `price_id` — Stripe price id from the subscription (optional if Stripe
    omits it).
  - `stripe_session_id` — the Stripe Checkout Session id.
  - `mode` — `subscription`.
  - `source` — `stripe_webhook`.

The server is the source of truth for checkout success. We deliberately do
not fire a client-side echo on `/dashboard?upgraded=true`; the dashboard
first-view event with `via_upgrade=true` is enough to spot-check the
client-side experience without double-counting conversions.

## Adding a new event

1. Add the event name to `FunnelEvents` in `lib/analytics-events.ts`.
2. Add a property interface and helper in `lib/analytics.ts` (or
   `lib/analytics-server.ts` for server-only events).
3. Call the helper from exactly one site.
4. Document the event in this file.

## Verification

- The smoke window for this issue is the first 24 hours after deploy.
  Acceptance is non-zero counts for the public-calculator events
  (`funnel_landing_viewed`, `funnel_calculator_step_viewed`,
  `funnel_calculator_revealed`).
- The PostHog project for verification is the one configured by
  `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST` (see Vercel env).
