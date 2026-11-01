# Accounts & tools — implementation contract

**Status:** implementation in review in [PR #354](https://github.com/Johnbulongdon/UntilFire/pull/354), 1 November 2026. No production migration, live programme activation, merge or phone promotion performed. Baseline: latest pushed main 3759091 (including PR #357 transaction fixes). The approved prototype remains under mock/ as design history.

## Placement and behaviour

- Money → Accounts & tools replaces the visible Offers label and preserves tab=offers links. Investing and savings/banking filters, country selection, details and up-to-two-account comparison use only live curated provider metadata. Empty/error states never invent sample offers.
- Plan → Contributions links to the focused Account setup step (tab=account-setup; phone /plan/account-setup). Existing accounts bypass referrals. An outbound click starts a setup task; it does not confirm an account opened. The user confirms opened and setup complete separately. Existing/new origin survives completion. No balances, financial assumptions or transfers change.
- Home can resume a user-started task when no higher-priority next move is present. It has no independent money input.
- Profile → Give a month and Money → Accounts & tools lead to My referral links. Both friend and creator partners can submit their own provider links. One UntilFire invite code continues to own attribution; this does not enrol a member in paid creator terms or change commissions/free-month rules.

## Referral routing and review

The signed-in account's immutable referral_attributions row selects the inviter. A later cookie, supplied partner ID or URL cannot replace it. The web list awaits the existing invite claim first; temporary claim failures preserve its cookie for retry.

For each provider, use the active inviter's approved link only while that provider is live, member links are enabled and the URL still matches its HTTPS provider domain. Otherwise use UntilFire's stored link. Database failures return a retryable error rather than silently selecting another beneficiary. The page identifies the selected link with UntilFire referral link or the submitted public name's referral link; it makes no payout, bonus or exclusive-reward promise. Founder-only bonus copy is omitted on member links.

Members can submit only registry providers, using a public first name and direct HTTPS referral URL. Every edit resets approval and increments a version. Admin review requires actual server admin authorization and the version reviewed; stale approvals conflict. Hiding a provider, disabling its programme, pausing the inviter or revoking/editing a link invalidates pending outbound tickets. Members can remove their own links.

POST /api/offers/open verifies authentication and the displayed selection key, then creates an opaque ten-minute ticket. /go consumes it once, revalidates current provider/partner/link status, records only offer and partner IDs, then redirects. It never takes a destination URL from the request or forwards an auth token. Bare legacy /go links continue to use UntilFire's link. Expired or changed tickets return to Accounts & tools rather than switching recipient.

Dynamic account nicknames, inviter labels, own links and member review details are masked in session recordings on web and phone, following D-103. No referral URL or financial amount is sent to a new analytics event.

## Programme activation and limits

No Robinhood, IBKR or other provider is seeded or enabled by this change. Admin must confirm the programme permits this placement, review current provider terms/disclosure requirements under D-03/D-81, add real approved metadata/domain/UntilFire link, and explicitly enable member submissions. A neutral label is not a compliance determination. No arbitrary shorteners or user-created providers. Rates/eligibility are provider supplied, not personalized recommendations.

Native uses the same saved account attribution. This release does not add deferred Play-install attribution: someone who joins on the web through an invite retains it when signing into the phone; an uncaptured mobile install is not retroactively attributed. Setup completion is self-reported, not verified by the broker.

## Rollout order

1. Review and apply the additive migration below to the intended database before releasing either caller. It changes no existing financial/referral rows.
2. Deploy the website/API and verify authenticated list, own-link submission, admin approval, inviter selection and account isolation in a non-production acceptance environment.
3. Verify installed-device browser handoff/return, then use the normal phone preview/production workflow (D-102). No dependencies, mobile scripts or native configuration change.
4. Activate individual programmes only after their review. Until then the library can be empty and member submissions remain disabled by default.

Rollback: revert the callers; leave additive tables and submitted data intact. Disable programmes or hide offers immediately if necessary. Do not drop user submissions as routine rollback.

## Verification

- node scripts/verify-provider-links.mjs executes real API handlers with an isolated in-memory Supabase adapter: invitation selection, wrong-user/invalid-auth attempts, stale approval/version conflicts, revoked/expired/replayed tickets, failure preservation and setup transitions. This adapter is not a live PostgREST acceptance test.
- Existing partner-offer, referral and Journeys guards remain required. Web/mobile typecheck, ESLint, production build and Android/iOS/web exports are checked separately.
- Local PostgreSQL/PGlite checks executed the full migration against baseline offer/referral tables and tested anon/authenticated denial, service-role access, default-disabled programmes, unique ownership, stale version updates and one-use ticket deletion. Existing installed tools were used; no new dependency was added. Queued PGlite operations do not prove independent-session concurrency.
- Browser component QA uses the actual web components and handlers with synthetic accounts/providers; no customer money or real provider application is touched. Auth and transport fixtures stay ignored under .audit-financial/. Record final visual/build results in implementation-qa.md.

## Migration

```sql
-- Curated member links; no providers seeded or made live.
BEGIN;
ALTER TABLE public.partner_offers ADD COLUMN IF NOT EXISTS member_links_enabled boolean NOT NULL DEFAULT false;
CREATE TABLE public.partner_referral_links (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 partner_id uuid NOT NULL REFERENCES public.referral_partners(id) ON DELETE CASCADE,
 offer_id uuid NOT NULL REFERENCES public.partner_offers(id) ON DELETE CASCADE,
 url text NOT NULL CHECK (length(url) BETWEEN 8 AND 2048),
 display_name text NOT NULL CHECK (length(display_name) BETWEEN 1 AND 40),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
 version integer NOT NULL DEFAULT 1 CHECK (version > 0),
 review_note text CHECK (length(review_note) <= 240),
 reviewed_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (partner_id, offer_id)
);
CREATE TABLE public.partner_offer_intents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 offer_id uuid NOT NULL REFERENCES public.partner_offers(id) ON DELETE CASCADE,
 link_id uuid REFERENCES public.partner_referral_links(id) ON DELETE CASCADE,
 partner_id uuid REFERENCES public.referral_partners(id) ON DELETE CASCADE,
 selection_key text NOT NULL,
 expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes')
);
CREATE INDEX partner_offer_intents_expiry_idx ON public.partner_offer_intents(expires_at);
CREATE TABLE public.account_setup_journeys (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 goal text NOT NULL CHECK (goal IN ('invest','save')),
 account_label text NOT NULL DEFAULT '' CHECK (length(account_label) <= 80),
 origin text CHECK (origin IN ('existing','new')),
 stage text NOT NULL DEFAULT 'choose' CHECK (stage IN ('choose','applying','opened','selected','done')),
 version integer NOT NULL DEFAULT 1 CHECK (version > 0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (user_id, goal)
);
ALTER TABLE public.partner_referral_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_offer_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_setup_journeys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.partner_referral_links, public.partner_offer_intents, public.account_setup_journeys FROM anon, authenticated;
GRANT ALL ON public.partner_referral_links, public.partner_offer_intents, public.account_setup_journeys TO service_role;
COMMIT;
```

## Approved mock history

### Original mock record

**Historical status:** review-only mock before implementation was authorized. The contract above owns current behaviour.
**Baseline:** started from GitHub main af157f1; reconciled latest main 3d97d33 before publication. Kept separate from bank-health PR #352.
**Style:** John explicitly selected the current app's yellow and pastel style over the older local Mint default. Use Inter, supplied logo assets, black pill actions and Next Horizon colours.

## Open locally

The running review is http://127.0.0.1:4214/#tools . Phone-size view: http://127.0.0.1:4214/?phone=1#tools .
The mock lives in this repo under mock/. Run its dev script from that folder if restarting it is needed. No production route, financial data, referral link, native configuration or root dependency changes.

## The journey

Home's **Your next move** remains one actionable card, not a new reminders page. It opens a task within Plan. Money owns the permanent **Accounts & tools** destination.

1. Home card → Plan task: choose an existing account or explore accounts.
2. Accounts & tools → Investing/Savings filters → optional comparison of two providers.
3. Provider details → nearby reward disclosure → provider handoff.
4. Return → opened / still applying / use an existing account.
5. Contribution setup → explicitly user-reported setup completion → Home updates its next step.

The handoff screen is labelled as a mock simulation, not an app page. It never opens a referral URL. Official provider-information links can open their public documentation. Preview controls sit outside the app.

Existing-account users bypass referrals and do not have to connect a bank. A savings provider cannot silently become the destination of an investing step: its explicit goal action opens a savings task first. Not now hides the Home card while leaving Plan reachable. A changed task clears that visit's dismissal.

## What is illustrative

All financial values, account status, dates and people are examples. State is memory-only and resets on refresh. Clicking a provider never marks an account opened. User-reported setup never changes balances or claims that money was transferred/invested.

Fidelity/Interactive Brokers/Robinhood are examples, not approved live offers, endorsements or a suitability assessment. No referral bonus, rate, fee or eligibility promise is invented. Savings-provider examples still need terms research. IBKR uses a neutral globe icon, not a fabricated brand logo.

The outside preview control shows an illustrative inviter link for IBKR; other examples fall back to UntilFire. This is not the production attribution resolver and does not assert provider-program approval.

## Production integration to follow visual review

- Extend existing Money → Offers (D-81); preserve existing offers deep links. Approved live data must come from the existing curated registry, not this hard-coded example list.
- Home retains the existing next-move priorities. Account setup is a relevant substep for the user's active plan; it must not outrank urgent cash/budget/debt issues or become an unsolicited broker advert.
- Keep setup progress owner-scoped on the server so it survives reload, sign-in and phone/web changes. Reuse Plan → Contributions and existing account/manual-activity tools for ongoing financial tracking.
- Resolve each provider's approved inviter link from existing attribution (D-27), otherwise the approved UntilFire link. Check allowed domains, geographic eligibility, terms approval and expiry. Never accept a beneficiary from an untrusted URL or copy auth credentials into a provider link.
- Keep click, self-reported opening, verified account connection and observed contribution separate. Existing outbound clicks do not prove conversion.
- A returning browser/app can offer the persisted step but cannot infer an account was opened from a tab switch. Do not nag on every foreground event.
- The existing legal/program-review question in D-03/D-81 remains before any brokerage referral offer is enabled. This mock adds no programme permissions or live payout claims.
- Preserve the bank-health feature, financial calculations, refund protections, contribution allocation and existing paid/free entitlements.

## Evidence

See mock/design-qa.md. Vite build and the template's four hosting-packaging tests pass. Browser checks covered both branches, comparison, keyboard filters, unsupported-location state, referral-credit/fallback examples, Not now and manual-account setup. Local screenshots stay outside Git in .audit-financial/accounts-tools-journey/.

Provider feature descriptions checked against official pages on 1 November 2026:
- Fidelity: https://www.fidelity.com/investing/brokerage-account
- IBKR: https://www.interactivebrokers.com/en/whyib/overview.php
- Robinhood: https://robinhood.com/us/en/support/articles/investments-you-can-make-on-robinhood/

These sources establish broad product descriptions, not approval of commercial referral placement.

## Referral-copy refinement — 1 November

John selected neutral attribution for the review mock: UntilFire referral link, or the inviter’s named referral link. No paid-link claim, payout certainty or unique-user-reward claim is made. Provider terms and any applicable live disclosure remain a production review requirement under D-81; the mock label is not a compliance determination.

### Creator-flow audit repairs — 1 November 2026

Creator dashboard now opens Money → Accounts & tools → My referral links directly. Existing members retain their current invitation code when joining the creator programme, preserving already-shared invitations and the partner ID used by approved provider links. New creators without an existing invite still choose a code. Creator account and statistics read failures return a retryable error; the UI never treats a failed lookup as not joined. No migration or commission change is needed for these repairs.

### Navigation correction — D-131

Supersedes earlier placement of own-link management inside Money. Creator programme now owns `/invite/provider-links` (phone `/creator`); ordinary members keep a Profile sharing shortcut. Existing `/dashboard?tab=offers&view=links` and phone `/provider-links` addresses forward to that editor.

Account browsing in Money never writes setup progress. Only the explicit Plan picker calls `onStarted` after a valid handoff ticket is reserved. Plan keeps the picker mounted within Account setup, preserving country, selected provider and comparisons while moving between picker, existing-account editor and setup progress. Creator editing never enters Plan. Back labels use actual parent destinations.

### Provider eligibility clarification — 1 November 2026

John clarified that provider legitimacy, not a connected-account requirement, is the eligibility rule. Members choose only admin-curated, live programmes with member submissions enabled. No member can create a provider or override its approved domain/status. The API, admin approval and outbound resolver all enforce the provider domain; web/phone show the expected domain and reject a mismatched URL before submitting. New/edited links still require review. A matching domain does not independently prove that a referral code is valid or belongs to the submitter; approval is retained. Wise, IBKR and Capital One are examples, not activated listings or hard-coded exceptions.
