# Changelog

All notable changes to UntilFire are documented here.

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
