# Audit repairs and remaining product work

Baseline: latest pushed main `fd20022dff9710826ed18bf8c1bc337f6659e630`.
This branch prepares repairs for review. Publication to main is not authorized.

## Behavior repaired

- Stripe activation and checkout return read validated item billing periods.
  When items have different periods, the earliest renewal boundary is stored.
  Existing active/pro representation is preserved for trials. An inactive
  subscription cannot be reactivated through the checkout return. Subscription
  database failures are returned as errors; webhook failures can be retried.
- Rate-limit identity never comes from an unverified Authorization string.
  Anonymous calls use the proxy-supplied IP. Already authenticated routes use
  the verified user id after an IP prefilter. Rotated access tokens retain the
  account limit. These are per-instance guards, not a distributed budget or
  a substitute for verified hosting firewall configuration.
- AI handlers bound streamed body bytes, strings, batch sizes and output
  tokens, set a provider timeout, and reject invalid/incomplete provider output.
  Bulk review sends 50-item batches. Failure leaves the review unsaved; it
  does not quietly classify missing items as wants. Goal-estimate failures
  and missing provider configuration do not yield invented dollar amounts.
- Hidden age wheels cannot report a scroll position as a changed answer.
  Visibility initialization and accessible focus are preserved. Income tiles
  are examples rather than claims about a typical local salary.
- Baseline negative cash flow now draws from accessible funds. Previously that
  worked for scenarios only, allowing a baseline deficit to go unspent.

No database migration or new dependency is required. Existing Stripe, Supabase
and OpenRouter environment configuration is still required for live operations.

## Verification

`npm run test:audit-repairs` executes real handlers with in-memory service
doubles: trial activation, billing-period validation, repeated checkout,
failed activation/cancellation writes, canceled return-page sync, rotated
invented tokens, oversized streamed bodies, invalid schema and provider failure.
It makes no real service request and reads no credentials.

`test:plan-freedom-date` exercises the actual dashboard engine. New zero-growth
examples use simple independent arithmetic: $30k funding $12k/year, a $24k bridge
before income begins, a locked pension that cannot fund current spending, and
a two-year break combined with explicitly lower spending. Existing scenarios,
debt, account-access, city, pension-contribution and tax checks remain in place.
The tax-card wiring assertion now checks the JSX property instead of a fixed
120-character source window; its financial requirement is unchanged.

Passed: `npm run validate` (production build, TypeScript, lint and second
production build; 447 static pages), `test:audit-repairs`,
`test:plan-freedom-date`, `test:fire-projection`, `test:life-changes`,
`test:explore`, `test:next-move`, `test:income-default`, and
`test:savings-period-input`. Existing lint warnings remain. Mobile TypeScript
and lint of the changed mobile projection file pass. Zero-return fixtures
compare the web and mobile projection outputs, including the funding gaps.

Production-build HTTP checks returned 400 for invalid AI input, 413 for an
oversized streamed body, and 429 with Retry-After after rotating invented
Bearer values; empty fixtures did not call a provider. Browser checks at 390px
and 1280px show no horizontal overflow on the age step. Initial age, summary
and accessible value agree at 32; ArrowDown selects 33, back/re-entry preserves
33, Home/End reach 16/85, and two typed digits select 32. Keyboard focus has a
visible browser outline. The browser requests reduced motion. Income after
skipping location shows Example amount. Screenshots and full build logs are
local audit artifacts, not sensitive repository data.

Live-site capture timed out, so visible production/main drift was not verified.
Dark theme, physical touch and native-device rendering remain pending. There
is no theme control on signed-out onboarding; this pass did not add one merely
for QA. These limits keep the PR in draft rather than implying release readiness.

The local environment has no service credentials. Mocked route checks do not
establish real checkout, database permissions, email delivery or bank linking.

## Product work that remains separate

Main already implements `calcProjection`, `life-changes`, account access and
bridge checking, Compare, next-move selection, Today, and Until payday. Do not
replace these based on unchecked backlog items. Current scenarios use yearly
projection steps, including prorated partial-year breaks; they are not a
month-by-month cash-flow simulation. Pension contributions are not future
pension income. No future benefits, inheritance, taxes or relocation costs
should be guessed automatically.

Home should explain which real input changed the date, with a link to its
owner in Money or Plan. An input change, a model/assumption change and a saved
alternative must remain distinct. Any comparison needs compatible before/after
inputs, a stable model version and a clear reset when the baseline is stale.
Do not label a forecast difference as realized progress.

Preserve D-73's daily maintenance and D-89/D-90's next-move and payday behavior.
The new Home preview is a design review, not a production reskin. Use the
user's local Mint defaults for new design explorations, explicitly label
sample plans, and retain the existing plan until an alternative is applied.
Keep sensitive financial values out of analytics and URLs. Phone/desktop
preview review precedes production integration of a new layout.

Before release: verify test-mode checkout and webhook retries with real test
services; authenticated save/reload; mobile touch and native runtime; host-wide
abuse controls. Merge and deployment remain pending user authorization.
