# UntilFire — The personal finance app built for FIRE.

See your FIRE number, your timeline, and the money moves that get you there faster. Free, no login.

Live at **[untilfire.com](https://untilfire.com)**.

---

## Why UntilFire exists

Most finance apps track what already happened. They show you where your money went. They leave you alone.

UntilFire focuses on what you should do next — and shows you the exact cost, in years of freedom, of each decision you make or avoid.

- Save an extra $500/month? **That's 2.1 years sooner.**
- Take a 10% pay cut? **That's 3.4 years later.**
- Cut one recurring subscription? **That's 8 months back.**

Every input has a visible, quantified consequence. That's the Decision Impact Engine.

---

## The core product promise

UntilFire helps you understand how every financial decision accelerates or delays your path to financial independence — and shows you what to do next.

Users feel **clarity**, **momentum**, and **strategic control** over their future. Not guilt or shame.

---

## Decision Impact Engine

Unlike calculators that return a single number and walk away, UntilFire shows the _delta_: how many years sooner (or later) you reach FIRE based on each choice. The reveal screen includes an interactive decision grid — drag sliders to see how cutting dining or investing more moves your retirement date in real time.

The "Your Highest-Impact Move" card in the dashboard shows the top acceleration opportunity from your live numbers, ranked by years saved: save more, cut expenses, or grow income — whichever moves your date the most.

---

## Current features

**Free — no login required**

- **City-adjusted FIRE number** — cost-of-living normalization across 263 cities worldwide
- **Tax-accurate projection** — US federal/state/FICA + international effective rates; after-tax take-home as the savings basis
- **Interactive decision grid** — adjust dining-cut % and extra savings with sliders; FIRE date impact updates live
- **Quantified recommendations** — "Raise your savings rate from 12% to 20% → 2.3 years sooner" instead of generic advice
- **Wizard → dashboard handoff** — calculator prefill flows into dashboard on first login

**Logged-in dashboard (Pro)**

- **Overview tab** — FIRE target year, years remaining, progress bar, this-month KPIs (income/expenses/net/savings rate), Path to FIRE stacked bar chart with 5Y/15Y/All selector
- **Monte Carlo simulation** — 1,000-run probability of reaching FIRE given market volatility
- **FIRE projection chart** — stacked contributions vs. market growth
- **Multi-currency expense tracking** — transactions in any currency, auto-converted to USD via live Frankfurter API
- **Plaid bank sync** — connect checking, savings, and investment accounts; auto-imports transactions and holdings
- **Recurring planner** — automatic detection of recurring patterns from transaction history + manual entry with due date tracking
- **Spending reports** — income vs. expenses chart, category breakdown, month-by-month table, 3/6/12m period selector
- **Custom categories** — add your own expense categories with emoji and color; synced across devices via Supabase
- **Investment simulations** — DCA with 3-scenario overlay, age-based glide path

**Growth / SEO**

- City-specific landing pages (`/fire-number/[city-slug]`)
- Public Learning Hub with guided stages and SEO articles (`/learn`)
- FIRE Type personality quiz at `/fire-type`
- 6 standalone calculators at `/calculators`

---

## Long-term vision

UntilFire becomes the operating system for your financial independence journey: a live, personalized map where every decision has a visible price tag in years of freedom.

Roadmap:
- AI-guided monthly action plans based on actual spending
- Plaid-connected real-time delta tracking
- Milestone notifications when you hit an acceleration target
- Income acceleration pathways tailored to your FIRE type

---

## Tech stack

| Layer | Tech |
|---|---|
| Framework | Next.js 15 (App Router) |
| Auth + DB | Supabase (Google OAuth, Postgres, RLS) |
| Styling | Tailwind CSS v4 + inline styles |
| Charts | Recharts |
| Animations | GSAP |
| Payments | Stripe |
| Bank Sync | Plaid |
| AI | Anthropic SDK (Claude) |
| Email | Loops.so |
| Hosting | Vercel |
| Analytics | Vercel Analytics, PostHog |

**Design system:** White/green. Background `#F7F9FB`, primary green `#064E3B` / `#059669`, teal `#22d3a5`, accent orange `#f97316`. Fonts: Manrope (headings), Inter (UI), Fraunces italic (hero accent).

---

## How it compares

| Bucket | Who | Gap |
|---|---|---|
| **FIRE Calculators** | FIRECalc, cFIREsim | Give you a success rate, then leave you alone |
| **FIRE Planners** | ProjectionLab, Boldin | Powerful but 20+ min setup; no guidance on what to do |
| **Budgeting Apps** | Monarch, YNAB | Great visibility; FIRE is an afterthought |
| **UntilFire** | — | 60-second answer + decision impact + what to do next |

---

## Major routes

| Route | Description |
|---|---|
| `/` | Landing page + 5-screen FIRE calculator wizard |
| `/fire-number/[city-slug]` | City-specific SEO landing pages |
| `/fire-calculator` | Standalone FIRE calculator |
| `/dashboard` | Logged-in Freedom Acceleration Engine dashboard |
| `/login` | Google OAuth sign-in |
| `/pricing` | Pricing page |
| `/calculators` | Calculator hub (APY, 4% rule, Coast FIRE, compound interest, savings rate) |
| `/learn` | Stage-based public Learning Hub |
| `/learn/stages/[stage]` | Guided FIRE learning paths |
| `/learn/articles` | All SEO articles index |
| `/learn/topics` | Learning topics hub |
| `/learn/[slug]` | Individual SEO articles |
| `/fire-type` | FIRE personality quiz |
| `/auth/callback` | OAuth callback |
| `/api/waitlist` | Email capture |
| `/api/stripe/*` | Checkout, portal, webhook |
| `/api/plaid/*` | Bank sync (create-link-token, exchange-token, accounts, holdings, sync, disconnect) |

---

## Key files

| File | Purpose |
|---|---|
| `app/page.tsx` | Landing + full calculator wizard + interactive reveal |
| `app/components/landing/HeroScreen.tsx` | Hero copy, stats strip, and CTA |
| `lib/positioning.ts` | Anchor marketing copy constants (`UNTILFIRE_ANCHOR_HEADLINE` etc.) used by HeroScreen |
| `app/dashboard/page.tsx` | Dashboard shell, all tabs, acceleration card |
| `app/dashboard/TransactionsTab.tsx` | Cashflow two-pane with custom categories and multi-currency |
| `app/dashboard/ReportsTab.tsx` | Monthly spending reports — income vs expenses, category breakdown, 3/6/12m |
| `app/dashboard/RecurringTab.tsx` | Recurring expense detection and manual recurring items |
| `lib/fire/index.ts` | FIRE engine surface, `recommendActionsForReveal` |
| `lib/fire-data.ts` | 263 cities, tax logic |
| `lib/fire/strategies/traditional.ts` | Core `calcFIRE()` — FIRE projection engine |
| `lib/supabase.ts` | Supabase client, `isPro()` |
| `lib/journey.ts` | `CalculatorPrefill` type + localStorage helpers |
| `app/globals.css` | Global design tokens and component classes |

---

## Environment variables

Copy `.env.example` to `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_PRO_PRICE_ID=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
ANTHROPIC_API_KEY=
RESEND_API_KEY=
FEEDBACK_TO_EMAIL=
LOOPS_API_KEY=
PLAID_CLIENT_ID=
PLAID_SECRET=
PLAID_ENV=sandbox
```

## Dev

```bash
npm install
npm run dev          # localhost:3000
npm run build        # production build
npm run typecheck    # tsc --noEmit
npm run lint         # eslint .
```

---

## Tiers

| Tier | Price | What you get |
|---|---|---|
| **Free** | $0 | 60-second FIRE answer, interactive decision impact grid, city/tax-adjusted — no login |
| **Pro** | $4.99/mo | Unlimited connected bank accounts via Plaid (free tier: 1 account); auto-categorisation coming soon |

---

## Supabase tables

- `user_budget` — income, expense category budgets, FIRE profile, and custom categories (JSONB `expenses` column)
- `expenses` — individual transactions (amount, currency, category, sub_category, tags, date, description, source)
- `profiles` — user preferences (default currency, preferred currencies, FIRE age)
- `subscriptions` — Stripe subscription status (plan, stripe_customer_id, current_period_end)
- `plaid_items` — connected bank items (plaid_item_id, institution, access token reference)
- `waitlist` — pre-signup email captures

---

## Deployment

Push to `main` triggers a Vercel deploy automatically.

---

## Recent Updates

| PR | Date | Description |
|---|---|---|
| #21 | May 2026 | Two-pane cashflow layout; flat 7-item sidebar; Learning Hub tab |
| #22 | May 2026 | Cashflow sub-tabs (Cashflow / Categories / Recurring / Budgets); CategoriesTab analytics |
| #23 | May 2026 | Multi-currency conversion in dashboard actuals KPIs and transaction day-net headers |
| #24 | May 2026 | `FALLBACK_RATES` seeds FX rates so conversion never silently breaks on API failure |
| #25 | May 2026 | Project/Event tag input in QuickAdd form — groups transactions across time periods |
| #26 | May 2026 | Fixed crash on Cashflow tab (missing `existingTags` prop in mobile drawer); FX fallback fix |
| #27 | May 2026 | Custom expense categories + sub-categories (localStorage); removed "Work expense" checkbox |
| #28 | May 2026 | README: add Recent Updates, Current State, Pending Work sections |
| #29 | May 2026 | Custom categories in CategoriesTab; build fix for duplicate `customCats` declaration |
| #30 | May 2026 | Remove duplicate `customCats` declaration causing Vercel build failure |
| #31 | May 2026 | Overview tab redesign — greeting bar, hero card, this-month KPIs, Path to FIRE stacked bar chart |
| #32 | May 2026 | Overview tab refinement — split hero card, transaction-backed KPIs, quick action cards |
| #33 | May 2026 | Fix Overview KPI queries — replace `LIKE` date filter with proper `gte`/`lt` range comparison |
| #34 | May 2026 | Rebuild pre-login wizard — remove Goals step, add Portfolio Balance step; `startingBalance` wired into `calcFIRE()` |
| #35 | May 2026 | Fix orphaned `fireGoal` references causing production crash on landing page |
| #36–40 | May 2026 | Mobile nav simplification; Plaid/Assets integration; hero copy + `lib/positioning.ts` constants; SEO canonicalization; mobile dashboard UX fixes |
| #41 | May 2026 | Cashflow UX fixes; emoji icons in QuickAdd; empty-state copy; Fraunces font; AI cat paused; custom cat Supabase sync; `is_work_related` removed from save path; `RetirementTargetCard` uses stored withdrawal rate |

---

## Current State

**What works end-to-end:**
- `/dashboard` — full FIRE dashboard, login-gated, redirects to `/login` if no session
- **Calculator wizard** — 6-step flow (city → currency → income → savings → portfolio → reveal); multi-currency with FX conversion; GSAP animations; stacked bar growth chart
- **Overview tab** — split hero card (FIRE target year, progress, status); this-month KPIs from live transactions; Path to FIRE stacked bar chart; Monte Carlo simulation
- **Cashflow tab → Cashflow sub-tab** — two-pane QuickAdd + transaction list; multi-currency; Project/Event tags; custom categories/sub-categories (Supabase-synced); edit/delete with undo toast
- **Cashflow tab → Categories sub-tab** — monthly spend by category (expandable, sub-cat breakdown, project breakdown); delete custom categories
- **Cashflow tab → Recurring sub-tab** — auto-detection of recurring patterns from transaction history; manual recurring items; due date tracking; frequency inference (weekly, bi-weekly, monthly, quarterly, annual)
- **Cashflow tab → Budgets sub-tab** — budget bars (budget vs actual per category)
- **Reports tab** — monthly income vs expenses bar chart; category spending breakdown; month-by-month table; 3/6/12m period selector
- **Assets tab** — investment holdings (401k, Roth, taxable, cash); Plaid-connected accounts with balances
- **Liabilities tab** — personal debt and mortgage tracking
- **FIRE Calculator tab** — FIRE projection, confidence simulation (Monte Carlo), investment simulator with DCA
- **Multi-currency** — live Frankfurter API rates; `FALLBACK_RATES` applied immediately on mount so conversion is never silent-broken
- **Plaid bank sync** — connect accounts via Plaid Link; auto-import transactions; investment holdings; free tier limited to 1 account
- **Stripe Pro tier** — checkout flow live; paywall enforced via `UpgradeModal` at feature limits; `isPro()` gating via `subscriptions` table

**Known issues:**
- **AI categorisation paused** — the description-blur auto-categorise call is disabled to prevent overwriting the user's manual selection. Needs a server-side route with `ANTHROPIC_API_KEY` before re-enabling.
- **Stale "work" pill** — old transactions with `is_work_related: true` still display a "work" badge (field removed from new saves; no backfill migration run)

---

## Pending Work

**High priority:**
- [ ] Fix AI categorisation — move to a `/api/categorise` server route with `ANTHROPIC_API_KEY`, then re-enable
- [ ] Email onboarding sequence (Loops.so: Day 1 / Day 3 / Day 7)
- [ ] Zero-savings warning in calculator wizard — user can currently advance with $0 savings and see a misleading FIRE date

**Product improvements:**
- [ ] Mobile UX audit — Cashflow QuickAdd is behind a bottom drawer on mobile; behaviour and discoverability need review
- [ ] Button hover/active states — several CTAs use inline styles that block CSS pseudo-classes, leaving no visual hover feedback
