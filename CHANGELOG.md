# Changelog

All notable changes to UntilFire are documented here.

## [Unreleased] - 2026-09-24

### Documentation
- Recorded the concurrent-agent handoff SOP: flexible task scope, isolated workspaces,
  explicit ready PRs, Claude-owned sequential integration, combined verification,
  and deployment confirmation. This establishes an active-session routine, not a
  background automation or blanket merge authorization.
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
  *Followed up the same day: both flows were checked in a browser and both
  guards revised. See "Guards triaged" below.*

### Added
- **Every line behind the contribution figure.** The Contributions page shows a day-by-day ledger under the amount: the opening balance and the accounts it comes from, each expected payment in and out on its date, the running balance, contribution day, and the low point the figure is taken from. A bare total nobody can trace is a total nobody should move money on.
- It says out loud what it leaves out. Income that was due and never marked received is listed as **not counted**, with the reason. Spending the budget knows about but the Expected list doesn't is compared, because anything missing from that list is missing from the forecast.
- When nothing is safe to contribute, the Home card now says so and shows the day the balance runs short, instead of hiding itself at the moment it has a warning to give.
- **Out-of-date balances are shown, not hidden.** The contribution ledger lists every account whose balance is more than three days old, grouped by the day it was last refreshed — including accounts at zero, since a zero from four months ago may not be zero now — and says to sync in Money → Net Worth. The emergency-fund field says "as of" when its balance is old. Accounts only refresh when their connection is synced by hand, which is easy to forget for months.
- Foreign-currency accounts show their own balance beside the dollar figure, on the ledger and in the account picker.
- **Your month, in date order.** Money → Expected opens on a month view: every expected payment in and out on its day, repeats included (paid ones marked), then one **day-to-day spending** line for the budget spending that has no date, then In / Out / Left for the month. Step between months with ‹ ›. It is the dated half of the budget, and Plan → Contributions works from the same dates.

### Changed
- **What "safe to contribute" means.** It is now the lowest the balance falls between contribution day and the next one — not the balance on the day. A bill due the day after contributing used to be ignored, which is exactly the one that bounces if everything was just invested.
- Expected **income** now counts (payday is when there is money to contribute), and repeating payments are expanded across the cycle rather than counted once.
- **The contribution forecast allows for day-to-day spending.** The budget's monthly spending, less the repeating bills already on the Expected list, is spread evenly per day as labelled estimate lines between dated payments — each showing its days × rate, so every row still adds up. Without it the balance only fell on bill days and the safe figure overstated what was spare. Recorded as D-10.
- **Day-to-day spending now comes from last month's needs, not the whole budget.** The per-day figure in the contribution forecast and the "Day-to-day needs" line in the Expected month view are last complete month's need-tagged spending over that month's days, less any need already on the Expected list. A need is matched by name, by the category of a repeating bill, or by an amount within 5% of one, which catches rent paid as transfers to a person. Wants and untagged spending such as last month's trip are left out and reported beside the figure, with a prompt to tag anything that is really a need. The ledger explains the month, the total, each counted category and each exclusion with its reason. With no tagged needs, the budget-based figure is still used. Both pages now work from the same unpaid Expected rows, so the committed-payments query no longer stops 70 days out; an annual bill paid last month is excluded on both. Recorded as D-11.
- **See what the day-to-day estimate is made of, and leave a one-off out.** The per-day figure in the contribution ledger opens a breakdown: on hover with a mouse, on tap or click, or with Enter. It lists each category of last month's needs with its amount and share, what is already a dated bill, and what isn't counted. Each category has a **Leave out** tick, which asks **just this month** or **always**. "Just this month" lapses by itself once the next month's spending becomes the basis; "always" lasts until the category is ticked back in. Contributions, Home and the Expected month view all use the same choice. On phones the breakdown opens as a sheet from the bottom. Recorded as D-14.
- **The homepage links to the FIRE Type quiz again.** "Take the FIRE Type quiz" sits beside "Find my freedom date" in the hero, as a secondary link. It stacks under the start button on phones. The link was lost in the May landing redesign. The quiz stays out of onboarding until its result feeds the product (D-13).
- **Choose your emergency-fund accounts in Money → Net Worth.** Every cash account on the Connected Bank Accounts card has an **Emergency fund** tick, with a summary line underneath showing the fund's total and which accounts it comes from. Contributions, Home and the Emergency Fund card all follow that one choice. Contributions says where its figure comes from and links to Net Worth instead of keeping its own picker. The tiles also show a foreign-currency account's own balance and the date of any balance more than three days old. *Behaviour change:* unticking every account now means none of them is the emergency fund. Before, an empty choice fell back to savings accounts, which re-ticked them the moment the last box was cleared. Stale IDs from a relinked bank still fall back to savings. Recorded as D-12.

### Fixed
- **Connected balances were added up as if every currency were dollars.** HK$20,000 counted as $20,000 in net worth, cash, the emergency fund, the contribution forecast and the freedom-date projection. Balances are now converted to dollars once, where accounts are loaded, so every total uses one currency. A currency with no exchange rate is shown but left out of totals rather than counted at face value — the shared conversion helper returns an unknown currency unchanged, which would have counted one won as one dollar.
- **Net Worth's emergency fund now follows the accounts chosen in Plan → Contributions.** It counted savings accounts only, so ticking a checking account there changed one page and not the other. *Behaviour change:* someone with only checking accounts connected who has not chosen any now sees an emergency fund of $0 on Net Worth, where it previously fell back to the cash figure typed into their profile — the same rule Contributions already used.
- **Repeating payments drifted through the calendar.** Marking one paid added a fixed 30 days and wrote the date back through UTC, so in UTC+8 a bill due on the 28th rolled to the 27th, and a bill due on the 1st walked to the 31st, then the 30th. Months are now calendar months in local time, using the same helper the forecast uses.
- The Budget tab's "committed this month" had been counting bills up to 70 days out since the previous release, when the query behind it was widened for the contribution window. It counts this month's bills again.
- **Chinese merchant names never matched anything.** Matching kept only a–z letters, so 中国移动 reduced to nothing. It matched no bill, and a Chinese-named bill already on the Expected list was suggested again as a new recurring payment. Matching is now Unicode-aware: two-character names count in scripts written without spaces, and accents no longer block a match (Café Nero = CAFE NERO).
- "Hide $0" on the Connected Bank Accounts card hid accounts whose currency has no exchange rate, because they convert to $0, and with them the warning that they aren't counted. It now goes by the bank's own balance.
- The Connected Bank Accounts card's heading, total, account masks and controls used fixed colours. They were nearly invisible in dark mode, and the grey masks were below 3:1 in light. They now use the theme's ink tokens.
- **Custom categories never reached your account, and a deleted one came back.** The shared category hook built its save to `user_budget` but never executed it: a Supabase query only sends when awaited or `.then()`'d. Adding or deleting a category changed only the one device, and the refetch whenever the tab regained focus restored whatever the account still held, so a deleted category reappeared. The save now runs, and nothing is written until the account's copy has been read once, so a stale cache on one device cannot overwrite a newer list saved from another. Checked in a browser against a stubbed account: delete-then-refocus stays deleted, a stale cache with a slow server writes nothing early, and a new user's first category is saved. Broken since `f39a66f` (July 22).
- **Recent months were missing from every history-based figure once an account passed 1,000 transactions.** The database returns at most 1,000 rows per request. The dashboard read 36 months of history oldest-first in one request, so an account past that size stopped months short of today. Last month's needs came up empty, so the day-to-day estimate fell back to the budget, several times the real figure. The emergency-fund needs and the history averages were missing their most recent months too. Transactions, Reports, Categories, recurring-payment suggestions, CSV duplicate checks and the rule tagging after a bank sync had the same cap, losing their oldest rows instead. Every read of the expenses table now pages through all of it. Checked end to end: with more than 1,000 stubbed transactions the dashboard reads two pages and the estimate uses August's needs, where the old code read one page and never saw August.
- **Undoing a transaction you had just added didn't delete it.** The row left the list, but the delete was never sent, so the transaction was back after the next reload. It is now sent. If it fails, the row returns to the list with a "Couldn't undo — the transaction is still saved" message rather than silently disagreeing with the database. Checked in a browser: the DELETE is sent and the row stays gone after a reload, and a rejected delete restores the row and shows the message. On the old code no DELETE was sent.
- **The currency chosen in the calculator was never saved to a new account.** On a first dashboard visit it was applied on screen, but the profile save was written as `void supabase…upsert(…)`, and `void` does not send a query. The choice was lost on any other device or after clearing storage. It is now sent, and a failure is logged. Checked on the real dashboard against a stubbed account: the profile upsert now carries the chosen currency, where the old code sent nothing.
- The currency picker on the calculator's income step had no accessible name: its "Currency:" text was not a label, so a screen reader announced an unnamed combo box. It is now a real label.
- **The Emergency Fund card was unreadable in dark mode.** Its headline was dark text on a dark card, its two panels were pale boxes, and its labels, figures, status badges, HYSA note and progress bar used fixed light-theme colours. It now uses theme tokens, and each state's faint tint is mixed from them. Every text in the card measures at least 4.6:1 in light and 6.9:1 in dark, in all four states at 390 and 1280 px. The progress bar, which Home's emergency-fund card also uses, fills with the status ink shades (at least 4.2:1 against its track; amber was under 3:1 before). "Rebuilding" is now neutral rather than sky blue, matching its state pill, since the design system has no blue. The state still shows in words and icons, not only in colour.

### Added — guards
- `npm run test:account-currency` — conversion, the refusal to count an unconvertible balance, and how old a balance is.
- `npm run test:cashflow-forecast` — runs in UTC+8 and UTC−7, since the date bugs it guards against only exist away from Greenwich.
- Extended `test:cashflow-forecast` (needs-based estimate, multi-script name matching), `test:contribution-ladder` (estimate source and fallback), `test:contribution-plan` (saving the account choice from Net Worth) and `test:emergency-fund-accounts` (an empty choice means none).
- Replaced forecast and ladder fixtures copied from a real account's balances and budget with generic figures.
- `npm run test:expense-reads-paged` tests the paging helper (several pages, an exact multiple of the page size, a failed page failing the whole read) and scans `app/` and `lib/` for any read of `expenses` that neither pages nor bounds itself. On the code before this fix it flags all ten such reads.
- `npm run test:supabase-writes-execute` scans `app/` and `lib/` with the TypeScript AST for Supabase writes that are built but never sent: a bare or `void` statement whose chain reaches `.from(`/`.rpc(` and a write, and whose outermost call is not `.then`/`.catch`/`.finally`. It self-tests on sample code first, so it cannot pass by finding nothing. On the code before these fixes it flags all three writes that shipped this way.

### Guards triaged
Twelve `test:*` scripts failed on an untouched main. Each was traced with `git log -S` to the commit where its code diverged, and its behaviour was checked in a browser:
- **Stale — code moved, behaviour intact:** `seo`, `income-default`, `savings-period-input` and `fire-type-cta` read `app/page.tsx`, but the flow moved to `app/HomeClient.tsx` in `15d5a49`. `cashflow-mobile-save`: the styles went inline in `60dcf09`. `categories-management`: persistence moved into `useCustomCategories` in `f39a66f`. `manual-category-icons`: the summary's category list moved to the parent in `1fcc2ad`. `reveal-save-plan-cta`: the sandbox lacked the analytics call added in `eb53299`.
- **Stale — deliberate product change:** `calm-startup` (the `?feedback=` link from the monthly email, `6a76189`, is still user-initiated). `city-page-seo` (titles lead with the number, `9908ea5`). `achieved-fire-reveal` (the reveal was rebuilt as `RevealFlow`, `ea47d24`). `currency-selection` (the currency cards were removed as dead in `7d3c88c`). `savings-period-input` (savings capped at income, whole-unit steps, `b2344b8`).
- Each revised guard asserts the current behaviour, not new source text. Where a guard could be weakened, a negative control showed it still fails on the regression it exists for.
- **Real regressions found and fixed:** custom categories never syncing (above), the unlabelled currency select (above), and `categories-management` now also fails if the sync is left unexecuted.
- `test:seo`'s FIRE Type check had been passing against `HeroScreen.tsx`, which has not been rendered since the landing redesign (`274a215`), and the redesign had dropped the link. The guard now reads the hero that renders, and it passes because the link was restored (D-13).

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
