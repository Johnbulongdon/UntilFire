# Changelog

All notable changes to UntilFire are documented here.

## [Unreleased] - 2026-09-18

### Added
- **Household (P1)** — invite one partner to share a household, from `Profile → Household`. They create their own account, keep their own login and their own numbers; joining adds a shared view on top rather than merging anything. Invite by email, one live invitation at a time (re-inviting supersedes rather than stacks, so a corrected address cannot leave an old link redeemable), 14-day expiry, and **Disconnect** — one symmetric action either person can take instantly without the other's approval, because at two members with symmetric visibility "I leave" and "I remove you" have the same outcome.
- Accepting requires the signed-in address to match the address the invitation was sent to, not just possession of the link. A forwarded link is not enough to obtain read access to someone's complete financial history; a mismatch names the expected address, since the usual cause is signing in with a different Google account.
- `/household/join` survives the signup round trip. Most invitees are signed out and many have no account, and `/login` takes no return path, so the token is stashed in `localStorage` and the dashboard hands it back once a session exists.
- Household invitation email (`CAMPAIGNS.HOUSEHOLD_INVITE`) — the only email that reaches someone who is not a user yet, so it carries no figures at all. A mistyped address reveals nothing beyond a first name and that they were invited.
- `npm run test:household-rls` — fails on any client-side read of a household-shared table that relies on RLS alone for scoping. Those reads silently start returning a partner's rows once the peer policies are active, with nothing in the diff to notice.

- **Household combined view (P3)** — a `Together` card on Home showing one freedom date for two people, with a You / Partner / Together breakdown. The date anchors on the younger partner's age and then reports both ages at that date, because a household reaches freedom together and the older partner arriving first isn't the question. Renders nothing without a household rather than showing an empty state.
- **Shared-account detection (P2)** — accounts both partners linked at the same institution with the same last four digits are proposed, never assumed: two different accounts can share those by coincidence, so a person confirms. Confirmed pairs count once in the household total; undecided pairs stay counted for both, with the card saying so, since overstating a household total beats silently halving it.
- **Household Pro (P4)** — one subscription covers both members, via a `SECURITY DEFINER` boolean rather than letting a partner read the owner's `subscriptions` row. They learn the household is Pro, not the amount, status, renewal date or Stripe IDs.

### Changed
- **FIRE profile moved from Profile to `Plan → Freedom Date`** as `Your assumptions` — age, retirement target city, lifestyle target and tax home. All four model something that hasn't happened yet, which is Plan by app-structure rule 2; they sat in account settings, and Plan and Expat FIRE had each grown an "Edit in Profile →" button to reach them. Both escape hatches are gone: the inputs now sit directly above the date they produce. The FIRE *type* stays in Profile, since a personality result is not a projection input.
- `test:profile-single-location` → `test:single-location`. It asserted the one canonical location input lives in ProfileTab; it now asserts the stronger invariant — exactly one such input across the whole dashboard, that it lives with the plan, that Profile holds no planning assumptions, and that no "Edit in Profile" escape hatch has reappeared.
- `net_worth_snapshots` on the dashboard's progress chart now filters `user_id` explicitly. It was the only client-side read scoped by RLS alone; under peer-read policies it would have interleaved both partners' histories and then truncated at `limit(120)` across them — a wrong line rather than an obviously merged one.

### Database
- `0016_household_accounts` applied — `households`, `household_members`, `household_invites`, `shared_account_links`, two `SECURITY DEFINER` helpers, and peer **read** access on nine financial tables. Writes stay owner-only everywhere: `goals`, `net_worth_snapshots` and `expected_payments` each had a single `FOR ALL` policy, which Postgres reuses as `WITH CHECK`, so each was split four ways to keep the peer clause on `SELECT` alone.
- A household holds exactly two people, enforced by `member_slot` + `UNIQUE (household_id, member_slot)` — a slot rather than a count trigger, because a unique index cannot be raced.
- `0035_household_revoke_anon` — Supabase grants EXECUTE on new `public` functions to `anon` individually, so `REVOKE ... FROM PUBLIC` in 0016 did not achieve what its comment claimed.

## [Unreleased] - 2026-09-12

### Added
- Per-month spending analysis on `Money → Insights` (`MonthInsight`) — pick any month with data, see its categories ranked by size, and switch individual categories off. The comparison baseline recomputes with the same exclusions applied to every other month, so excluding Travel drops both the headline and the median it is measured against rather than comparing a filtered month against an unfiltered one. Median rather than mean, since the outlier month is what the exclusions exist to see past. A conditional line translates the result into the FIRE target at 25× annual spending — phrased as "if every month looked like this one", because one month is not a rate.

## [Unreleased] - 2026-08-29

### Added
- "Your month" check-in card on Home (`DashTab`) — closes the monthly loop by combining last month's actual result (`consistencyMonths`, on-track or off-plan, savings vs. short) with this month's top recommendation (`topTasks[0]`) into one verdict, with a CTA that scrolls to the existing top-tasks card. Dismissible per calendar month (`uf_checkin_dismissed_YYYY-MM`), so it reappears as a fresh check-in each month rather than sitting as a permanent fixture.
- `funnel_next_move_opened` analytics event — fires when the check-in card's CTA is clicked, giving the top-tasks recommendations their first real click target (previously informational only).

## [Unreleased] - 2026-08-16

### Removed
- Monte Carlo "Confidence Check" page (`FIRE Calculator → Simulate`) — the success-probability copy overclaimed 10,000 simulations while the code ran 1,000, and "before your target age" was actually a flat 40-year horizon from today regardless of the user's real age. Removed rather than patched pending a redesign that ties it correctly into the plan's real freedom date. `MonteCarloCard`, `SimulationsTab`, and `lib/fire/monte-carlo.ts` deleted.

## [Unreleased] - 2026-07-10

### Added
- Transaction import now accepts Excel (.xlsx/.xls) files through the same column-mapping, duplicate-detection, and currency-inference pipeline as CSV
- Transaction import now accepts PDF bank/credit-card statements — transactions are reconstructed directly from the PDF's text layout (no columns to map) using `pdfjs-dist`, then fed through the same review/duplicate-detection flow as CSV/Excel. Card-payment lines (marked "CR") are excluded on import since they aren't purchases
- Each imported transaction now records which file it came from (`source_file`); the transactions list shows a small file-name badge on any row imported from CSV/Excel/PDF
- "Raw file sample" preview on the import map step now shows every parsed row in a scrollable panel with a sticky header, instead of hard-capping at 5 rows

### Fixed
- Excel imports with title/metadata rows before the real header (e.g. WeChat Pay Excel exports) now correctly detect the real header row instead of leaving all column-mapping dropdowns blank — ported the same header-row scan already used for CSV imports

## [Unreleased] - 2026-06-15

### Added
- CSV import modal: full column-mapping UI with a step machine (upload → map → review → importing → done), batch insert in chunks of 50
- CSV import: duplicate detection review step — matches on date + amount only (category excluded because manual and imported entries use different category names)
- AI transaction categorisation route now calls the Anthropic API server-side; no API key is exposed to the client
- Dark mode persistence across page loads (PR #54)
- Achievement milestones rendered as teal pin bubbles directly on the projection chart (standalone achievement card removed)
- FIRE Type result page: full redesign with Trading Card layout and dark page background
- FIRE Type avatars: 16 custom illustrated characters per FIRE type, extended to full-body compositions with bold flat art style
- FIRE Type light-reveal animation with trading card effect
- FIRE Type share card: clean white Poster design, fully flat (no drop shadows)
- Animated logo reveal assets and FIRE number landing pop/glow effect (PR #56)
- Expense categories expanded with Utilities (phone, internet, household bills) and additional sub-categories covering common budgeting patterns
- Emoji palette for category customisation expanded from ~30 to ~90 options
- Demo video v26: render script for 43-second UntilFire motion-graphics video

### Changed
- CSV import duplicate matching updated to drop the category field from the match key, fixing false negatives between manually entered and auto-imported transactions
- FIRE Type share card content simplified and avatar crop tightened for cleaner framing
- Wordmark: orange removed from "Fire" text on the FIRE Type page to fix branding inconsistency

## [Unreleased] - 2026-05-26

### Changed
- Dashboard emergency-fund logic now excludes brokerage cash reserved for investing from the emergency-fund "Current Savings" figure, while still counting that money in total cash/assets.
- Google login now resolves the production OAuth callback through `lib/site.ts`, keeps localhost callbacks local in dev, and manually follows the returned OAuth URL so the app stays explicit about the real UntilFire destination.
- `AUTH_SETUP.md` now documents that the Supabase **Site URL** should be the canonical UntilFire domain so Google shows the UntilFire URL instead of the raw `*.supabase.co` project URL on the consent screen.

### Verification
- `npm run build` passed after the dashboard emergency-fund update and Google-login callback cleanup.

## [Unreleased] - 2026-05-02

### Changed
- `supabase-setup.sql` rewritten to match the live app: drops the legacy `user_plans` schema and now creates `user_budget`, `expenses`, `subscriptions`, and `waitlist` with RLS policies + `updated_at` triggers. Idempotent — safe to re-run.
- `AUTH_SETUP.md` rewritten against the live architecture: documents Google OAuth via `/login` → `/auth/callback`, removes the stale `middleware.ts` references, and lists the env vars and fresh-setup steps that map to the rewritten SQL.

### Verification
- `npm run typecheck` passes against the rewritten docs/SQL changes (no TS files were modified).
- SQL parses to four tables (`user_budget`, `expenses`, `subscriptions`, `waitlist`), ten RLS policies, and three `updated_at` triggers — matches every `.from(...)` call in the active routes (`app/dashboard/page.tsx`, `app/dashboard/TransactionsTab.tsx`, `app/api/stripe/**`, `app/api/waitlist/route.ts`, `lib/supabase.ts getSubscription`).
- `middleware.ts` confirmed absent from the repo; route protection on `/dashboard` is the existing client-side session redirect, consistent with `docs/DECISIONS.md` (2026-03 Supabase + RLS decision).

### Known follow-ups
- Components in `/components` (`CalculatorForm`, `PlanList`, `LogStashForm`, `QuickAddButton`, `ProjectionChart`) are orphaned — they reference the dropped `user_plans` / `stash_history` tables but are not imported by any active route. Candidate for deletion in a follow-up cleanup task.
- `docs/CONTEXT.md` still lists `app/expenses/page.tsx` (does not exist; the live route is `app/transactions/page.tsx` redirecting into `/dashboard?tab=expenses`) and the orphaned components — flagged for the same cleanup pass.

## [0.2.0.0] - 2026-04-26

### Added
- Monte Carlo FIRE probability card: 1,000 simulations per render, σ=12% annual return volatility, 9-bucket histogram (0–5 yr through 40+), p10/p50/p90 percentile pills, interactive +$0–$5k/mo what-if slider
- `lib/monte-carlo.ts` — Box-Muller simulation engine, fully typed, tree-shakeable
- Full light mode across dashboard and Transactions tab — white card surfaces, `#f9f9fb` page background, `#1a1a2e` text, teal/orange accent palette preserved

### Changed
- Dashboard background migrated from dark (`#08080e`) to light (`#f9f9fb`) across all CSS variables and inline styles
- MonteCarloCard inserted between hero KPIs and projection charts in the Overview tab
- TransactionsTab: corrected button text colour (dark text on teal), category select colour, income/expense amount colour, month-nav arrow colours, tooltip background

## [0.1.0.0] - 2026-04-25

### Added
- Calculator → dashboard handoff via `uf_calc_prefill` localStorage
- Dashboard restructure: 3-tab layout (Overview | Calculator Hub | Budget & Transactions)
- Financial calculators hub: Coast FIRE, Savings Rate, APY, Compound Interest, 4% Rule
- FIRE Score as hero with full-width progress bar and year countdown
- City-discovery OG share card with dynamic image generation
- Transactions merged inline as dashboard tab
- SEO: OG image, JSON-LD, canonical URLs, sitemap, robots.txt
- Supabase + Google OAuth auth flow
- Stripe integration with Pro paywall (later opened to all users)
