# Changelog

All notable changes to UntilFire are documented here.

## [Unreleased] - 2026-09-24

### Documentation
- Aligned shared agent rules, Claude's entry point, and the legacy instruction
  bundle; separated main as a baseline from the PR publishing destination.
  Reconciled both vault branch snapshots into one maintained repo knowledge base,
  with source inventory, active/superseded decisions and privacy exclusions.
- Added the project-memory index, current requirements and feature map, and dated
  launch context. Agent startup now includes relevant decision history; meaningful
  changes update their rationale and contracts in the same PR. Older plans remain
  historical evidence rather than competing instructions.
- Reconciled design exceptions and current navigation, and corrected household,
  Monte Carlo, and Contributions roadmap status. Added focused financial and
  accessible UI verification requirements without changing application behavior.

### Added — backfill from 22–23 September commits
- Plan → Contributions: budget-normalised allocation tilt and drift bands
  (`96e9d63`, `7396244`), Plaid holdings import (`f931d88`), saved plans and
  visit-triggered monthly snapshots (`2bd2640`), priority ladder (`a0267b1`),
  account-derived inputs and saved ladder settings (`9eece6f`, `cd163db`), and
  emergency-fund account selection (`eb7e549`).
- Matching Home Next contribution card using the shared ladder derivation
  (`8775078`). Monthly/weekly/daily allocation output already exists; monthly
  contribution email remains a follow-up. The September 24 entries supersede
  the earlier amount/cadence model.
  See `docs/design/next-contribution.md`.

### Fixed — backfill
- Plaid sync applies classification rules to future imports without overwriting
  user-set tags, preventing untagged imports from understating measured needs
  (`8775078`). Holdings import handles cash and closed positions (`fbead99`,
  `9a1c76f`).

### Historical implementation reconciled from vault notes
- PWA and Android TWA foundations exist (`9fe27fc`, `dcc3395`, June 29);
  this does not establish store publication or current device QA.
- Portfolio performance comparison and scenario comparison were added
  (`8299a8a`, June 18; `2524c64`, June 19). Old missing-feature lists are historical.
- Email-capture instrumentation was added in `7d3c88c` (July 16); verify actual
  coverage instead of reusing the later vault note's missing-instrumentation claim.
- Projection assumptions were unified in `f79d688` (September 2); display pricing
  was centralised in `lib/pricing.ts` by `dbec537` (September 15). Older mixed
  returns and $4.99 notes are historical. Live behavior/billing was not rechecked.

### Verification boundary
- These feature entries describe repository implementation at `8775078`, not
  newly verified production behavior. Publication was reconciled with main
  `2af3cb8` on September 24, preserving its two newer Contributions commits.
  This documentation change does not alter runtime code or apply migrations;
  a main update can trigger the repository's existing automatic deployment.
- Reproduced existing guard failures on unchanged runtime/test files:
  `test:calm-startup` fails its single explicit-opener assertion because feedback
  also opens from a URL parameter; `test:cashflow-mobile-save` fails two CSS
  assertions while sticky positioning and bottom padding exist as inline styles.
  Follow up with behavior/browser verification before revising those guards;
  this pass does not establish that either flow is correct or remove tests.

### Added
- **Every line behind the contribution figure.** The Contributions page shows a day-by-day ledger under the amount: the opening balance and the accounts it comes from, each expected payment in and out on its date, the running balance, contribution day, and the low point the figure is taken from. A bare total nobody can trace is a total nobody should move money on.
- It says out loud what it leaves out. Income that was due and never marked received is listed as **not counted**, with the reason. Spending the budget knows about but the Expected list doesn't is compared, because anything missing from that list is missing from the forecast.
- When nothing is safe to contribute, the Home card now says so and shows the day the balance runs short, instead of hiding itself at the moment it has a warning to give.
- **Your month, in date order.** Money → Expected opens on a month view: every expected payment in and out on its day, repeats included (paid ones marked), then one **day-to-day spending** line for the budget spending that has no date, then In / Out / Left for the month. Step between months with ‹ ›. It is the dated half of the budget, and Plan → Contributions works from the same dates.

### Changed
- **What "safe to contribute" means.** It is now the lowest the balance falls between contribution day and the next one — not the balance on the day. A bill due the day after contributing used to be ignored, which is exactly the one that bounces if everything was just invested.
- Expected **income** now counts (payday is when there is money to contribute), and repeating payments are expanded across the cycle rather than counted once.
- **The contribution forecast allows for day-to-day spending.** The budget's monthly spending, less the repeating bills already on the Expected list, is spread evenly per day as labelled estimate lines between dated payments — each showing its days × rate, so every row still adds up. Without it the balance only fell on bill days and the safe figure overstated what was spare. Recorded as D-10.

### Fixed
- **Repeating payments drifted through the calendar.** Marking one paid added a fixed 30 days and wrote the date back through UTC, so in UTC+8 a bill due on the 28th rolled to the 27th, and a bill due on the 1st walked to the 31st, then the 30th. Months are now calendar months in local time, using the same helper the forecast uses.
- The Budget tab's "committed this month" had been counting bills up to 70 days out since the previous release, when the query behind it was widened for the contribution window. It counts this month's bills again.

### Added — guards
- `npm run test:cashflow-forecast` — runs in UTC+8 and UTC−7, since the date bugs it guards against only exist away from Greenwich.

## [Unreleased] - 2026-09-23

### Added
- **Next contribution.** A tab under Plan that works out where this period's money should go, and a Home card that says it without being gone looking for. The order is a published convention — emergency floor, employer match, expensive debt, emergency target, tax-advantaged, cheap-debt overpayment, then invest the rest — and every rung can be moved or switched off. The allocation maths is ported from the spreadsheet it replaces, guarded against the sheet's own figures.
- **Two cadences, not one.** *Money arrives* is payday; *Buy in* is how often it is then invested. Paid monthly while dollar-cost-averaging weekly is ordinary, and it is why cash sits in the brokerage between the two. The page carries a countdown to the next contribution date.
- **The contribution amount follows real cash.** Cash in accounts that are not your emergency fund, less anything due before the next contribution date. The subtraction is shown rather than just its answer, because with no bills recorded nothing is subtracted and the figure reads high — which is the direction that tells someone to invest their rent. A hand-set amount is still available and is marked as one.
- **The emergency fund reads the right accounts.** Savings and money market only; a current account is this month's spending and brokerage cash is waiting to be invested. Which accounts count is yours to choose, and the field says where its number came from.
- Monthly expenses follow the last complete month, the average, or a figure you set. Everything on the page saves as you type, to `profiles.contribution_plan`.

### Fixed
- **Plaid's sync now applies your need/want rules.** It wrote `tags: []` on every import and a rule was only ever applied at the moment it was set, so a rule made in March stopped applying in April. Everything counting needs — the emergency fund target, the ladder's monthly expenses — read low as a result. The sync never overwrites a tag you set yourself.

### Added — guards
- `npm run test:contribution-plan`, `test:contribution-waterfall`, `test:contribution-ladder`, `test:contribution-schedule`, `test:emergency-fund-accounts`, `test:classification-rules`.

## [Unreleased] - 2026-09-20

### Added
- **Transactions can carry a time of day, and never have to.** Plaid supplies one for the institutions that send it, a statement import recovers the one already sitting in its date column, and the add/edit form has an optional **Time** field next to the date. The time shows in the transaction list when there is one and nothing at all when there isn't — a blank stays blank rather than becoming midnight.
- Stored as an instant, not a wall clock, so "14:30" typed in Hong Kong still reads 14:30 there and shifts correctly for a household partner elsewhere. `date` remains the field everything groups and totals by; where the two disagree at a day boundary, the date wins.
- `npm run test:transaction-time` — covers the ways a time goes wrong quietly: Plaid's 00:00 placeholder must not become a confident midnight, `authorized_datetime` must win over `datetime`, a time buried in an ISO or WeChat date cell must be recovered, and a round trip through the form must come back unchanged.

## [Unreleased] - 2026-09-19

### Added
- **Home is arrangeable.** An **Edit** button turns Home's cards into draggable tiles: drag by the grip to reorder, press × to remove one, press the width control to make it narrow or wide, and put anything you removed back from the tray underneath. Saved per user in `profiles.dashboard_layout`. Defaults are exactly the current layout, so nothing changes until you change it.
- Dragging is pointer-based rather than HTML5 drag-and-drop, which never fires on touch. Reordering still happens through CSS `order`, so a card's contents never move in the DOM mid-drag. Card content is inert while editing, so a drag can't also press something inside a card.
- `npm run test:dashboard-layout` — covers the layout merge, which fails silently in every direction: a card added later must appear for someone who customised before it existed, an id since removed must drop, a corrupt value must fall back rather than empty the page, and a required card must stay visible however it was stored.

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
