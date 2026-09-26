# Partner referral and outreach program

Status: proposed implementation handoff
Owner: founder
Prepared: 26 September 2026
Baseline inspected: latest GitHub `main` at `ef8c406`; the partner architecture
was compared with the current pricing, Stripe, Supabase, analytics, and admin code.

This plan describes a small founding-partner program for UntilFire. It joins
three pieces that must work as one system:

1. a useful, credible partner offer;
2. durable referral attribution and commission accounting; and
3. an internal outreach workflow that the founder and Codex can operate without
   putting private contacts or correspondence in this public repository.

This is a proposal, not authorization to publish the program, email anyone,
change pricing, pay commissions, or deploy. Claude should implement it only after
the founder approves the offer and the initial scope.

## Current implementation evidence

The current code already provides foundations this work should extend:

- `lib/pricing.ts` is the pricing source of truth: Pro is currently displayed as
  `$3/month` or `$30/year`, with a 90-day trial.
- `/pricing`, `/api/stripe/checkout`, `/api/stripe/webhook`,
  `/api/stripe/portal`, and `/api/stripe/sync-subscription` already exist.
- `subscriptions` mirrors Stripe entitlement state in Supabase.
- the Stripe webhook already emits server-confirmed checkout analytics.
- `/admin` is protected by `ADMIN_EMAILS`; every admin API route independently
  verifies the bearer token with `requireAdminUser`.
- admin email drafts show the existing service-role-only pattern for private
  operational data.
- PostHog funnel events and their privacy constraints are owned by
  `lib/analytics-events.ts` and `docs/analytics/EVENTS.md`.

Do not duplicate these systems. Keep price display in `lib/pricing.ts`, Stripe
as the source of collected payment truth, Supabase as the operational ledger,
and PostHog as aggregate behavior analytics.

## Product decision to approve before building

### Recommended founding-partner pilot

Invite no more than five partners initially. For each partner's first ten paid
referrals:

- pay 50% of eligible collected Pro revenue for the first 12 paid months;
- lower the default to 30% for later referrals, unless the founder approves a
  partner-specific extension;
- attribute a visitor for 60 days before account creation;
- preserve an authenticated user's partner attribution for 12 months before
  their first paid invoice, which covers the current 90-day free trial;
- hold earned commission for 30 days before it becomes payable;
- reverse commission when the corresponding payment is refunded, disputed, or
  otherwise not retained;
- calculate on collected subscription revenue excluding tax, refunds, credits,
  and Stripe fees only if the exact definition is written in the partner terms;
- require disclosure of the affiliate relationship; and
- provide no exclusivity and no guaranteed positive review.

The 50% pilot is intentionally bounded by partner count, the first ten paid
referrals, and one year of collected revenue. At today's display price, the
maximum first-year share is only `$18` for a monthly customer who pays for all
12 months, or `$15` for an annual customer. Commission alone will not motivate a
large publisher. Every offer should therefore include a low-effort content asset:
a custom city comparison, co-branded landing page, audience-specific scenario,
chart pack, or live calculator demonstration.

Before launch, the founder must approve:

- 50% pilot and 30% standard rates;
- whether Stripe fees are deducted from the commission base;
- whether coupons reduce the commission base;
- partner and customer eligibility;
- the exact 12-month clock;
- payout schedule and minimum;
- tax, disclosure, privacy, termination, and dispute language; and
- whether the 90-day Pro trial remains appropriate for referred users.

Do not promise earnings or lifetime commissions. Do not call a placement an
"independent review" if payment depends on publication without requiring clear
affiliate disclosure.

## Scope: internal-first MVP

The first version should support three to five invited partners without building
a marketplace or automated payment platform.

### Build now

1. Public partner overview and application.
2. Partner terms.
3. Durable referral link and authenticated attribution.
4. Stripe invoice-based commission ledger.
5. Admin Partner & Outreach workspace.
6. Manual approval and manual payout recording.
7. Aggregate analytics and exportable partner statements.
8. One reusable co-branded landing template.

### Defer until the pilot proves demand

- self-serve partner onboarding;
- automated payouts or Stripe Connect;
- tax form collection;
- multi-user partner organizations beyond one owner;
- automatic mass outreach;
- public partner directory;
- multi-level or sub-affiliate commissions;
- coupon-only attribution;
- cross-device anonymous attribution;
- editable commission contracts after a referral has converted; and
- a full partner asset library or message generator.

## Pages and routes

### Public pages

#### `/partners`

Purpose: explain who the program is for and invite a small number of appropriate
partners.

Content:

- UntilFire's audience and product value;
- example collaboration formats;
- plain-language pilot economics marked as subject to acceptance;
- disclosure and honest-review expectations;
- application form; and
- link to partner terms and privacy policy.

Application fields should be minimal: name, email, organization/channel,
website or primary social URL, audience description, intended promotion method,
and optional note. Do not collect bank, tax, government ID, or payout details.

#### `/partners/terms`

Purpose: stable, versioned public terms covering eligibility, attribution,
commission basis, timing, refunds, prohibited promotion, disclosures,
termination, privacy, and changes. The founder should obtain appropriate legal
and tax review before accepting partners or paying commissions.

Store the accepted terms version and timestamp on the partner record. Never
silently apply new economics to previously earned commission.

#### `/partners/[slug]`

Purpose: optional co-branded landing template for approved partners. It should
reuse the standard calculator and Mint design system, show the partner name only
with permission, and contain no private audience or financial data.

Reserve `dashboard` and `terms` so they cannot be used as partner slugs.

### Referral route

#### `/p/[code]`

Implement as a route handler, not a visible page. Validate the active code,
record an aggregate-safe visit, set a secure first-party `uf_partner` cookie,
append approved UTM values, and redirect to the partner's configured landing
path or `/`.

Cookie defaults:

- `HttpOnly`;
- `Secure` in production;
- `SameSite=Lax`;
- path `/`;
- 60-day maximum age; and
- code or opaque referral token only, never contact data.

Invalid, expired, or paused codes should redirect safely without setting
attribution. Avoid open redirects by allowing only repository-owned relative
landing paths.

### Partner dashboard: phase two

Do not block the pilot on a self-serve dashboard. Send an admin-generated summary
to early partners after the founder approves each report. When repeated requests
justify it, add:

- `/partners/dashboard` — visits, attributed signups, paid referrals, pending
  commission and paid commission;
- `/partners/dashboard/links` — referral links and approved landing pages;
- `/partners/dashboard/referrals` — anonymized status rows with no email, name,
  city, account balances, spending, income, or other financial data;
- `/partners/dashboard/payouts` — statements and payment status; and
- `/partners/dashboard/assets` — approved logos, screenshots, copy and required
  disclosure text.

Use the existing Supabase account for authentication plus a `partner_members`
mapping. Do not use user-editable `user_metadata` for access control.

### Admin workspace

Add a `Partners` tab to the existing `/admin` page rather than creating a second
admin shell. Preserve the `ADMIN_EMAILS` and `requireAdminUser` security boundary.

The tab needs four views:

1. **Pipeline** — prospect, fit, stage, last contact, next action and owner.
2. **Partner detail** — terms, rate, links, landing page, attributed funnel,
   notes and status controls.
3. **Commissions** — invoice-level pending, payable, reversed and paid rows.
4. **Payouts** — draft statement, founder approval, paid date and external
   reference.

Initial outreach stages:

`idea` → `researched` → `approved_to_contact` → `contacted` → `replied` →
`negotiating` → `active`, with `declined` and `paused` terminal side paths.

Admin actions that change economics, approve a payout, or mark a payout paid
must write an audit event with the admin user id and timestamp.

## Supabase data model

Create a forward-only migration with the Supabase CLI after refreshing current
documentation and checking for relevant breaking changes. All tables in an
exposed schema must have RLS enabled. Operational tables should grant no client
access and be reached through authenticated server routes with the service role.

### `partners`

- `id uuid primary key`
- `slug text unique not null`
- `name text not null`
- `website_url text`
- `status text` — applicant, invited, active, paused, declined
- `commission_rate_bps integer`
- `founding_rate_bps integer`
- `founding_referral_limit integer`
- `commission_months integer`
- `pre_signup_window_days integer`
- `pre_payment_window_days integer`
- `hold_days integer`
- `default_landing_path text`
- `terms_version text`
- `terms_accepted_at timestamptz`
- `created_at`, `updated_at`

Snapshot economics onto each attribution or commission. Changing a partner's
future rate must not rewrite already earned amounts.

### `partner_members`

- `partner_id uuid references partners`
- `user_id uuid references auth.users`
- `role text` — owner or viewer
- unique `(partner_id, user_id)`

RLS may allow a member to read only their partner's safe dashboard data. It must
not allow access to prospects, outreach, internal notes, referred user details,
Stripe identifiers, or admin audit data.

### `partner_referral_codes`

- `id uuid primary key`
- `partner_id uuid references partners`
- `code text unique not null`
- `landing_path text`
- `campaign text`
- `status text` — active, paused, retired
- `created_at`, `expires_at`

Codes are public identifiers, not secrets.

### `partner_applications`

- fields submitted by `/partners`;
- status and reviewed timestamp;
- source and consent/terms acknowledgement; and
- service-role-only access.

Application contact information is private operational data. Do not copy it into
repository documents or PostHog.

### `partner_attributions`

- `id uuid primary key`
- `partner_id uuid references partners`
- `referral_code_id uuid references partner_referral_codes`
- `user_id uuid unique references auth.users`
- `first_seen_at`, `claimed_at`
- `payment_eligibility_expires_at`
- rate and duration snapshots;
- source/campaign/landing path; and
- optional admin override reason and timestamp.

The MVP uses first eligible partner attribution at account claim and then locks
it. An admin may correct a demonstrable error, but the old and new values must be
audited. Existing users who click a referral link do not become newly referred.
Partners cannot refer themselves or another member of their partner account.

### `partner_commissions`

- `id uuid primary key`
- `partner_id`, `attribution_id`, `user_id`
- `stripe_invoice_id text unique not null`
- `stripe_subscription_id text`
- `currency text`
- gross collected, excluded amount, eligible amount, rate basis points, and
  commission amount stored as integer minor currency units;
- `status` — pending, payable, approved, paid, reversed;
- `earned_at`, `payable_at`, `paid_at`; and
- reversal amount and reason.

Use integer cents, never floating-point currency. Store the calculation inputs so
every amount can be reproduced later.

### `partner_payouts` and `partner_payout_items`

`partner_payouts` records one approved statement and its manual payment status.
`partner_payout_items` joins eligible commission rows to that payout. Once paid,
the statement is immutable; corrections use a later adjustment, not edits to the
past.

Do not store bank account or tax identification data in the public schema. Use a
qualified payout provider later if the pilot requires it.

### `partner_outreach`

Private service-role-only CRM fields:

- prospect/partner reference;
- public source URL and why the audience fits;
- contact name, role and contact channel;
- stage;
- last contact and next action timestamps;
- owner;
- internal notes; and
- current draft subject/body or a reference to an admin draft row.

Keep email bodies and replies private. Never copy them into Git, PostHog, public
logs or user-visible partner pages.

### `partner_admin_events`

Append-only audit rows for application decisions, term acceptance, rate changes,
attribution overrides, commission adjustments, payout approval and payout
completion.

## Attribution and billing flow

```text
partner link
  → GET /p/[code]
  → validate code and set 60-day first-party cookie
  → redirect to owned landing page
  → visitor calculates freely
  → user signs in
  → POST /api/partners/claim reads cookie and authenticated user
  → immutable partner_attribution is created
  → checkout includes attribution id in Stripe metadata
  → 90-day trial may begin (no commission yet)
  → Stripe invoice.paid confirms collected money
  → idempotent commission row created as pending
  → hold period ends
  → admin approves payout statement
  → founder pays outside the app and records the reference
```

Commission must be based on `invoice.paid` or the current Stripe equivalent that
proves money was collected. `checkout.session.completed` is insufficient because
the current checkout can begin a 90-day trial with no payment.

Handle monthly and annual prices, promotion codes, tax, partial refunds,
chargebacks, failed payments, subscription changes, cancellation, reactivation
and duplicate webhook delivery. Use Stripe invoice ids as idempotency keys.

Add relevant partner and attribution ids to Checkout and Subscription metadata,
but always re-validate against Supabase during webhook processing. Metadata is a
join aid, not the commission ledger.

## Server routes

### Public/authenticated

- `POST /api/partners/apply` — validate and store an application; rate limit it.
- `POST /api/partners/claim` — authenticated, reads the first-party cookie and
  creates one eligible attribution.
- `GET /p/[code]` — validates referral code, records safe visit analytics, sets
  cookie and redirects.
- phase two: `GET /api/partners/dashboard` — partner-member-only aggregate data.

### Admin

- `GET/POST /api/admin/partners`
- `GET/PATCH /api/admin/partners/[id]`
- `GET/POST/PATCH /api/admin/partners/outreach`
- `GET /api/admin/partners/[id]/performance`
- `GET/PATCH /api/admin/partner-commissions`
- `POST /api/admin/partner-payouts`
- `POST /api/admin/partner-payouts/[id]/approve`
- `POST /api/admin/partner-payouts/[id]/mark-paid`
- `GET /api/admin/partner-payouts/[id]/statement`

Every admin route must call `requireAdminUser`. Mutating endpoints need strict
body validation, safe state transitions and an audit write in the same logical
operation. If cross-table atomicity is required, use a narrowly scoped database
function in a non-exposed schema, revoke default public execute, and check the
authenticated admin inside the server route before invocation.

## Analytics contract

Add typed events to `lib/analytics-events.ts`, their emitters, and
`docs/analytics/EVENTS.md` in the same PR.

Suggested events:

- `partner_referral_landed`
- `partner_application_submitted`
- `partner_attribution_claimed`
- `partner_payment_attributed` (server only)

Safe properties include partner slug, referral campaign, landing route, price id,
billing interval and coarse funnel state. Do not send contact names, emails,
message bodies, exact user financial values, exact FIRE targets, Stripe customer
ids, invoice ids or payout details to PostHog.

Partner reporting should distinguish:

- referral visits;
- calculator starts;
- calculator reveals;
- attributed registrations;
- activated users, using the existing product activation definition;
- checkout starts;
- first paid invoices;
- retained paid subscriptions;
- collected eligible revenue;
- pending, payable and paid commission; and
- refunds/reversals.

Do not call clicks or signups customers. Do not calculate lifetime value until
enough paid cohorts have matured.

## Codex outreach operating process

Codex can support the pipeline, but sending outreach is representational
communication and remains a founder-authorized action.

### Codex may do without send approval

- research publicly available partner candidates;
- record public source URLs and safe fit summaries in the private admin CRM;
- remove weak, inactive or competing candidates;
- prepare a tailored offer and draft;
- generate partner-specific charts, calculator scenarios and landing-page copy;
- check public contact routes;
- prepare an approved batch for founder review;
- summarize aggregate results; and
- draft follow-ups based on responses the founder supplies or authorizes Codex
  to read.

### Codex must obtain action-time authorization before

- sending each outreach batch;
- submitting a partnership or guest form;
- replying to a partner;
- accepting negotiated terms;
- publishing a co-branded page;
- changing a commission rate; or
- approving or recording a payout as paid.

### Daily operating loop

1. Find no more than five new candidates.
2. Score audience fit, activity, likely reach, contactability and content angle.
3. Draft only the top two or three.
4. Founder reviews the concrete destination, subject, body and offer.
5. After approval, send and record the external message id or evidence.
6. Follow up once after seven days if there is no response; then pause.
7. For replies, prepare the next response and surface any requested economics or
   obligations before the founder accepts them.
8. Attribute results to visits, activated users and paid invoices, not vanity
   impressions.

No automated cold-email sequence, scraped bulk list, purchased list, hidden
affiliate relationship or guaranteed positive review belongs in this program.

## Recommended implementation sequence for Claude

### PR 1 — attribution foundation

- migration for partners, referral codes, attributions and audit events;
- `/p/[code]` cookie/redirect route;
- authenticated claim endpoint;
- pass partner attribution through sign-in and checkout;
- analytics event contract;
- security and attribution tests.

This PR should not create commissions or expose a public application yet. Seed
one disabled test partner and verify the entire anonymous-to-authenticated handoff.

### PR 2 — commission ledger

- commission, payout and payout-item tables;
- invoice-paid commission creation;
- refund/dispute reversal handling;
- idempotency and integer-currency calculations;
- admin read-only commission table; and
- Stripe CLI or test-mode verification for monthly, annual, trial and refund
  cases.

### PR 3 — admin outreach and operations

- `Partners` tab in `/admin`;
- application, partner, pipeline, commission and payout views;
- safe mutation APIs and audit trail;
- draft statement export; and
- manual `mark paid` flow.

### PR 4 — public pilot

- `/partners` and `/partners/terms`;
- application endpoint with abuse controls;
- co-branded landing template;
- privacy/terms links;
- responsive, keyboard and overflow verification; and
- founder review of all public economics and claims.

### Later PR — partner dashboard

Build only after partners repeatedly need self-service reporting. Keep it
aggregate and anonymized.

## Acceptance checks

### Attribution

- valid code sets attribution and redirects only to an owned path;
- invalid, expired and paused codes do not attribute;
- attribution survives OAuth/email sign-in and the 90-day trial;
- first eligible referral locks; later clicks do not overwrite it;
- existing users and partner members cannot create new self-attribution;
- clearing cookies prevents anonymous recovery, documented as an MVP limit; and
- no contact or financial data appears in the URL or cookie.

### Billing and commissions

- checkout completion during a free trial creates no commission;
- first collected monthly and annual invoices create exactly one commission;
- duplicate webhooks remain idempotent;
- refunds and disputes reverse the correct amount;
- coupons, tax, fees and partial payments follow the approved written formula;
- commission stops after the snapshotted duration;
- rate changes do not rewrite prior earnings; and
- a paid statement cannot be mutated.

### Security and privacy

- all new exposed-schema tables have RLS;
- partner members see only their partner's anonymized aggregates;
- admin operational tables have no client policies;
- service-role keys remain server-only;
- `user_metadata` is never an authorization source;
- admin routes reject non-allowlisted authenticated users;
- no user email or financial values enter PostHog; and
- no payout credentials or tax ids are stored in the public schema.

### Experience

- public pages follow the current design system;
- long partner names and URLs do not overflow at 320, 390, 768 and 1440px;
- application errors explain recovery and never discard entered text;
- referral redirects remain fast and do not delay the calculator;
- partner claims and disclosures are readable on mobile; and
- the full route works in production-like Stripe and Supabase test environments.

## Launch gate and learning plan

Before inviting the first partner:

- confirm current production pricing and trial behavior;
- confirm Stripe webhook health and invoice-paid coverage;
- obtain approval for the terms and commission formula;
- prepare one co-branded example and one monthly statement example;
- test a complete referral through payment in Stripe test mode; and
- define the founder's manual payout method without storing sensitive details in
  the app.

Run the pilot until there are at least three active partners or ten attributed
paid customers, then review:

- activation rate by partner;
- paid conversion after the trial;
- refunds and early cancellation;
- direct Plaid and adviser cost by referred paid user;
- collected revenue minus commission and direct service cost;
- partner workload and content quality; and
- whether any partner generated enough qualified demand to justify a dashboard
  or automated payout provider.

The next rate should be based on retained contribution margin, not clicks,
impressions or unqualified registrations.

