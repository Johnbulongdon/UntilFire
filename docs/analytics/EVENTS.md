# UntilFire Funnel Events - v1 Contract

This is the canonical contract for the v1 conversion funnel. Every event
listed here has a single emit site in code; if you add a new emit site,
update this doc in the same change.

The contract is also encoded in `lib/analytics-events.ts`. That file is the
runtime source of truth - the constants there are imported by every emit
site, so a typo in code is a TypeScript error rather than a silently renamed
event in PostHog. **This doc and that file must stay in sync.**

## Funnel order

```
funnel_landing_viewed
  → [primary] funnel_calculator_step_viewed (step_id=goal)
           → funnel_calculator_step_viewed (step_id=city)
           → funnel_calculator_step_viewed (step_id=income)
           → funnel_calculator_step_viewed (step_id=savings)
           → funnel_calculator_step_viewed (step_id=portfolio)
           → funnel_calculator_revealed
           → funnel_signup_started
           → funnel_signup_completed
           → funnel_dashboard_first_view
           → funnel_paywall_viewed     (dashboard upgrade modal opens)
           → funnel_checkout_started   (Stripe checkout URL returned)
           → funnel_checkout_succeeded (server, Stripe webhook)

  → [reveal, no-signup branch] funnel_email_capture_submitted (waitlist email form on the reveal screen)

  → [quiz branch] funnel_fire_type_started  (on first answer)
               → funnel_fire_type_completed (on result mount)
               → funnel_fire_type_shared    (optional, on share action)
               → funnel_fire_type_cta_clicked → rejoins primary funnel

  → [dashboard experiment] funnel_hysa_empty_state_cta_clicked (cta=learn_more|connect_account)
```

`step_id=currency` is a tombstone: an earlier flow had a standalone currency-selection
step between city and income. It was folded into the income step (`IncomeScreen`'s
inline currency picker) and is no longer part of the live wizard, but the value is kept
in `CalculatorStepId` / `CALCULATOR_STEP_INDEX` so historical PostHog data stays valid.
Do not wire a new screen to `step_id=currency`.

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
- Revenue funnel events include plan and current monthly price, but never raw
  payment details.
- `landing_source` is a coarse route/source label such as `learn-hub`,
  `calculator-savings-rate`, or `fire-number-austin-tx`. It is used for
  acquisition attribution, not personal identification.

## Events

### `funnel_landing_viewed`

- **Where**: `app/page.tsx`, `Home` screen effect when `screen === 'hero'`.
- **Properties**:
  - `landing_source` - optional route/source label when the visitor arrived
    from an internal content page or acquisition landing page.

### `funnel_calculator_step_viewed`

- **Where**: `app/HomeClient.tsx`, `HomeClient` screen effect when the wizard
  transitions to one of the five live steps (`goal`, `city`, `income`,
  `savings`, `portfolio`).
- **Properties**:
  - `step_id` - `goal` | `city` | `income` | `savings` | `portfolio` (`currency`
    is a tombstoned value from a retired step; see the funnel order note above).
  - `step_index` - mirrors `step_id` for funnel ordering in PostHog. Not a dense
    `1..5` range - `goal` was added after the others were indexed and kept its
    own value (`0`) so historical data for `city`/`income`/`savings`/`portfolio`
    stays comparable across the change.
  - `landing_source` - optional route/source label.

### `funnel_calculator_revealed`

- **Where**: `app/page.tsx`, `RevealScreen` effect, fired exactly once per
  mount when the reveal animation fully settles (`revealed === true`).
- **Properties**:
  - `state_key` - tax jurisdiction key (e.g. `CA`, `TX`, `custom`).
  - `is_custom_city` - boolean. `true` for custom monthly-expense entries.
  - `fire_target_bucket` - `lt_250k` | `250k_500k` | `500k_1m` | `1m_2m`
    | `2m_5m` | `gte_5m`.
  - `years_to_fire_bucket` - `lt_5` | `5_10` | `10_20` | `20_30` | `gte_30`.
  - `landing_source` - optional route/source label.

### `funnel_signup_started`

- **Where**: `app/login/page.tsx`, click handler on the Google sign-in
  button.
- **Properties**:
  - `from_calculator` - boolean. `true` when a calculator prefill is present
    (i.e. the user came from the reveal CTA).
  - `state_key` - optional. Mirrors the prefill's tax jurisdiction.
  - `landing_source` - optional route/source label carried from the page
    that introduced the visitor to the calculator.

### `funnel_signup_completed`

- **Where**: `app/auth/callback/page.tsx`, fired after Supabase finishes the
  OAuth callback and a session is available.
- **Properties**: none beyond defaults.
- **Side effect**: `posthog.identify(userId)` runs alongside the event.

### `funnel_dashboard_first_view`

- **Where**: `app/dashboard/page.tsx`, inside the `user_budget` query callback
  after profile data loads (`setProfileLoading(false)`). Fires once per dashboard mount.
- **Properties**:
  - `had_calculator_prefill` - boolean.
  - `via_upgrade` - boolean. `true` when the URL carries `?upgraded=true`
    (i.e. landing from a Stripe checkout success redirect).
  - `scenario_id` - UUID of the user's default scenario.

### `funnel_paywall_viewed`

- **Where**: `app/dashboard/UpgradeModal.tsx`, fired when the modal opens.
- **Properties**:
  - `plan` - `pro`.
  - `price_monthly` - `4.99`.
  - `price_id` - optional Stripe price id when available.
  - `source` - short label for where the paywall rendered (e.g. `profile`,
    `plaid_limit`, `dashboard_upgrade_modal`).

### `funnel_checkout_started`

- **Where**: `app/dashboard/UpgradeModal.tsx`, after `POST /api/stripe/checkout`
  returns a Stripe Checkout URL and before browser redirect.
- **Properties**:
  - `plan` - `pro`.
  - `price_monthly` - `4.99`.
  - `price_id` - Stripe price id returned by `/api/stripe/checkout`.
  - `source` - short label for the click origin (e.g. `profile`,
    `plaid_limit`, `dashboard_upgrade_modal`).

### `funnel_checkout_succeeded`

- **Where**: **server** - `app/api/stripe/webhook/route.ts`, on the
  `checkout.session.completed` event after the subscriptions row upsert
  succeeds. Sent via `lib/analytics-server.ts` over the PostHog public
  capture endpoint (`${NEXT_PUBLIC_POSTHOG_HOST}/capture/`).
- **`distinct_id`**: Supabase `user_id` from the checkout session metadata
  (`metadata.supabase_user_id`). This stitches into the same person as the
  client identify call.
- **Properties**:
  - `plan` - `pro`.
  - `price_monthly` - `4.99`.
  - `price_id` - Stripe price id from the subscription (optional if Stripe
    omits it).
  - `stripe_session_id` - the Stripe Checkout Session id.
  - `mode` - `subscription`.
  - `source` - `stripe_webhook`.

The server is the source of truth for checkout success. We deliberately do
not fire a client-side echo on `/dashboard?upgraded=true`; the dashboard
first-view event with `via_upgrade=true` is enough to spot-check the
client-side experience without double-counting conversions.

### `funnel_fire_type_started`

- **Where**: `app/fire-type/page.tsx`, fired on the user's first quiz answer (confirms real engagement, not just page load).
- **Properties**:
  - `source` — optional. Acquisition source (e.g. `homepage-secondary`).

### `funnel_fire_type_completed`

- **Where**: `app/fire-type/page.tsx`, `useEffect` on `stage === 'result'` mount.
- **Properties**:
  - `fire_type_code` — the 4-letter result code (e.g. `PSGB`). Not PII — it is a preference category, not a financial number.
  - `fire_type_axes` — same 4-letter axis code, kept explicit for downstream querying.
  - `source` — optional.

### `funnel_fire_type_shared`

- **Where**: `app/fire-type/page.tsx`, share button handler after successful share or clipboard copy.
- **Properties**:
  - `fire_type_code` — 4-letter result code.
  - `fire_type_axes` — same 4-letter axis code.
  - `share_method` — `native` | `clipboard`.

### `funnel_fire_type_cta_clicked`

- **Where**: `app/fire-type/page.tsx`, onClick on the "Calculate my actual FIRE number" CTA link.
- **Properties**:
  - `fire_type_code` — 4-letter result code.
  - `fire_type_axes` — same 4-letter axis code.
  - `source` — optional.

### `funnel_email_capture_submitted`

- **Where**: `app/HomeClient.tsx`, `RevealScreen`'s `handleEmailCapture`, after
  the `/api/waitlist` POST resolves without throwing.
- **Why**: the reveal screen offers a no-account "or get it by email" form
  alongside the `/login` signup CTA. That path previously had no funnel event,
  so reveal → convert looked worse than it was - some of the drop-off measured
  by `funnel_signup_started` was really converting through this untracked
  path. This event closes that gap.
- **Properties**:
  - `landing_source` - optional route/source label.

### `funnel_hysa_empty_state_cta_clicked`

- **Where**: `app/dashboard/PlaidConnect.tsx`, only in the Assets empty state card when no bank is connected yet.
- **Properties**:
  - `cta` — `learn_more` | `connect_account`.
  - `destination` — `apy_calculator` | `plaid_connect`.
  - `placement` — `assets_empty_state`.

## Engagement loop (post-auth)

These extend the same contract past `funnel_dashboard_first_view` into what
happens on repeat visits. Added 2026-08-28 as the first step of the
Observe → understand → recommend → test → follow up → improve loop in
`docs/ROADMAP.md` Phase 5. The single most important number this section
exists to answer: **reveal → user tests or accepts one next move** — that's
`funnel_calculator_revealed` (existing) through `funnel_scenario_tested` /
`funnel_scenario_accepted` (below), stitched together once
`posthog.identify(userId)` runs at signup. It's the difference between
UntilFire creating action versus just curiosity.

### `funnel_next_move_viewed`

- **Where**: `app/dashboard/page.tsx`, `DashTab`, effect keyed on `topTasks`.
  Fires once per session, the first time Home actually has a real
  recommendation to show (`topTasks.length > 0`) — guarded by a
  `sessionStorage` flag (`uf_nmv`), same pattern as
  `funnel_dashboard_first_view`'s `uf_dv` flag.
- **Properties**:
  - `move_count` — how many ranked tasks are showing (max 3; see `topTasks`
    in `DashTab`).
  - `top_priority` — the top task's priority score. Only the emergency-fund
    rules set this above 0 (100 = below the floor, 70 = rebuilding toward
    target), so `top_priority > 0` means the safety-first rule is the one
    that fired, without sending the task's label text — those strings
    interpolate a dollar amount (e.g. "Rebuild your emergency fund by about
    $1,200"), which the PII rule below forbids.
### `funnel_next_move_opened`

- **Where**: `app/dashboard/page.tsx`, `DashTab`. Fires when the "Your month"
  check-in card's CTA is clicked, which scrolls to and opens the "Best way
  to move your date" (`topTasks`) card — the first real click target on a
  task row, closing the gap noted above.
- **Properties**:
  - `top_priority` — same meaning as `funnel_next_move_viewed`'s
    `top_priority`: identifies whether the safety-first rule is the move
    being opened, without sending the task's label text.
- **Not fired on dismiss**: clicking "Not now" on the check-in card hides it
  for the month without counting as opening the move — only the CTA counts.

### `funnel_scenario_tested`

- **Where**: `app/components/RevealFlow.tsx`, step 7's scenario picker,
  `onClick` on each scenario row.
- **Properties**:
  - `scenario_index` — position in the fixed 5-item list (`HomeClient.tsx`'s
    `scenarios` array: keep current plan, save $500 more, invest a 5% raise,
    sabbatical, markets return 2% less).
  - `scenario_label` — the scenario's label. Safe to send raw: the label set
    is fixed and generic, none of the five interpolate a user-specific
    number.
  - `delta_years_rounded` — years sooner/later than the current plan,
    rounded to one decimal. Deliberately **not** run through `bucketYears`:
    that bucketing exists to stop an absolute years-to-FIRE figure
    identifying someone, and a relative delta between two hypotheticals
    (typically under ±3 years) isn't that.

### `funnel_scenario_accepted`

- **Where**: `app/HomeClient.tsx`, `onSave` — fired when "Start my path" is
  clicked in the reveal's save step, right before `saveCalculatorPrefill`
  and the redirect to `/login`.
- **Properties**: same shape as `funnel_scenario_tested` — whichever
  scenario was selected when the user chose to move forward, not
  necessarily the one they last tapped.
- **Note**: uses `send_instantly` — `onSave` navigates immediately after,
  same reasoning as `trackSignupCompleted`.

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
