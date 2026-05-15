# UntilFire

**Know if you can FIRE and where you stand — in 60 seconds.**

Free, no login. Your personal FIRE adviser tells you exactly what to do each month to move your retirement date earlier.

Live at **untilfire.com**.

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 15 (App Router) |
| Auth + DB | Supabase (Google OAuth, Postgres) |
| Styling | Tailwind CSS v4 + inline styles (Manrope / Inter) |
| Charts | Recharts |
| Payments | Stripe |
| Email | Resend |
| Hosting | Vercel |
| Analytics | Vercel Analytics, PostHog, Google Analytics |

## Design system

White/green. Background `#F7F9FB`, primary green `#064E3B` / `#059669`, teal `#22d3a5`, accent orange `#f97316`, borders `#E2E8F0`. Fonts: Syne (headings), DM Sans (UI), DM Mono (numbers).

## Dashboard navigation

The `/dashboard` is a single-page app with a flat 7-item sidebar nav:

| Tab | Content |
|---|---|
| **Overview** | Net worth summary, FIRE projection chart, KPI cards |
| **Cashflow** | Budget settings + two-pane transaction tracker (sticky form + scrollable list) |
| **Assets** | Portfolio overview, 401(k) / Roth IRA / taxable brokerage inputs |
| **Liabilities** | Debt and mortgage inputs |
| **FIRE Calculator** | Menu hub → Goals (target retirement age) + Monte Carlo simulations |
| **Reports** | Period selector (3/6/12 months), income vs expenses chart, category breakdown, month-by-month table |
| **Learning Hub** | Calculators, SEO articles, and FIRE topics |

## Tiers

| Tier | Price | What you get |
|---|---|---|
| **Free** | $0 | Find out if FIRE is achievable for you — city, income, taxes. No login required. 263 cities worldwide. |
| **Pro** | $9/mo | Your personal FIRE adviser: tracks your progress, spots what's slowing you down, and tells you the one move to make each month. |

## Key features

- **60-second FIRE answer** — find out whether you can retire early, personalised to your city and income, before you create an account
- **263 cities worldwide** — real cost-of-living data; no national averages
- **City-level tax calculation** — US federal/state + FICA; international flat effective rates
- **Personal FIRE adviser** (Pro) — monthly action plan based on your actual spending, not generic tips
- **Multi-currency expense tracking** — transactions stored in any currency, auto-converted to USD using live rates
- **FIRE projection chart** — 401(k) / Roth / taxable growth over 50 years with FIRE target line
- **Monte Carlo simulation** — 10,000 scenarios showing your probability of reaching FIRE by your target age
- **Spending reports** — income vs expenses chart, category breakdown, month-by-month table (3/6/12m selector)
- **Recurring planner** — manual entry of recurring income/bills with include/exclude toggles; auto-detects repeating transactions
- **Wizard → dashboard handoff** — calculator prefill (income, city, age, spend) flows into dashboard on first login

## Competitive position

The market splits into three buckets — all with the same gap:

| Bucket | Who | Gap |
|---|---|---|
| **FIRE Calculators** | FIRECalc (free), cFIREsim (effectively abandoned) | Give you a success rate, then leave you alone. No personalisation. No next steps. |
| **FIRE Planners** | ProjectionLab ($109/yr), Boldin ($144/yr, built for 55+) | Powerful models that require 20+ min to set up and still don't tell you what to do. US-only. |
| **Budgeting Apps** | Monarch Money ($100–199/yr), YNAB ($109/yr) | Great for spending visibility; FIRE is an afterthought. No city-level COL. No retirement math. |

**The gap UntilFire fills:** Nobody answers *"Can I actually FIRE? Where am I right now? What should I do this month?"* — the question every early-career person on the FIRE path is actually asking. UntilFire is the entry point: first answer in 60 seconds, then an adviser that keeps score and gives clear, personalised direction. See `docs/MARKET.md` for full competitive analysis.

## Major routes

| Route | Description |
|---|---|
| `/` | Landing page + 5-screen FIRE calculator wizard |
| `/dashboard` | Logged-in dashboard |
| `/login` | Google OAuth sign-in |
| `/calculators` | Calculator hub (SEO landing page) |
| `/calculators/coast-fire` | Coast FIRE calculator |
| `/calculators/apy` | APY calculator |
| `/calculators/compound-interest` | Compound interest calculator |
| `/calculators/savings-rate` | Savings rate calculator |
| `/calculators/4-percent-rule` | FIRE number / 4% rule calculator |
| `/learn/articles` | SEO article grid (11 articles, structured body with h2/p nodes) |
| `/learn/[slug]` | Individual article page with OpenGraph metadata |
| `/learn/topics` | Topics index |
| `/auth/callback` | OAuth callback handler |
| `/api/waitlist` | Email capture endpoint |
| `/api/stripe/*` | Stripe checkout, portal, webhook |

## Environment variables

Copy `.env.example` to `.env.local` for local dev.

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_PRO_PRICE_ID=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
```

## Dev

```bash
npm install
npm run dev          # localhost:3000
npm run build        # production build
npm run typecheck    # next build && tsc --noEmit
npm run lint         # eslint .
```

## Key files

| File | Purpose |
|---|---|
| `app/page.tsx` | Landing + full calculator wizard |
| `app/dashboard/page.tsx` | Dashboard shell, sidebar nav, tab routing, FIRE goals form |
| `app/dashboard/TransactionsTab.tsx` | Cashflow two-pane layout with AI categorisation |
| `app/dashboard/CategoriesTab.tsx` | Monthly spend by category, expandable rows, project breakdown |
| `app/dashboard/RecurringTab.tsx` | Recurring planner — manual entry + auto-detection |
| `app/dashboard/ReportsTab.tsx` | Monthly reports — chart, category breakdown, summary table |
| `lib/supabase.ts` | Supabase client singleton |
| `lib/journey.ts` | `CalculatorPrefill` type + localStorage read/write helpers |
| `lib/fire-data.ts` | 263 cities, tax logic, `calcFIRE()` |
| `lib/fire/index.ts` | Monte Carlo simulation + FIRE engine |
| `app/globals.css` | Global design tokens |

## Supabase tables

- `user_budget` — income, expense categories, FIRE profile per user
- `expenses` — individual transactions (with AI categorisation, multi-currency)
- `waitlist` — pre-signup email captures
- `subscriptions` — Stripe subscription status per user

## Deployment

Push to `main` triggers a Vercel deploy. No manual steps required.

## Recent Updates

| PR | Date | Description |
|---|---|---|
| — | May 2026 | Profile tab: edit display name, city (263-city search), default currency; delete account with email confirmation; `profiles.default_currency` column added to Supabase |
| — | May 2026 | Pre-login wizard rebuilt: removed Goals step, added Portfolio Balance step (feeds startingBalance into calcFIRE), moved age to portfolio step, updated dashboard prefill to seed cashSavings, updated CTA copy |
| — | May 2026 | Overview redesigned: split hero card (white left / dark green right), 3 mini-stat boxes (Years Remaining, Progress, Status), stacked FIRE projection bar chart (5Y/15Y/All), "This Month" KPI cards from cashflow with CTA when empty |
| — | May 2026 | SEO foundation pass: restored `/calculators` hub, added crawlable landing-page links to calculators/learn, expanded sitemap coverage, and turned `/learn/topics` into a real topic index |
| — | May 2026 | Local/dev reliability pass: added `.env.example`, made public pages build without Supabase env vars, and aligned validation scripts with the current Next.js build flow |
| — | May 2026 | Reports tab: income vs expenses chart, category breakdown, month-by-month table (3/6/12m selector) |
| — | May 2026 | Recurring tab redesigned: manual entry planner with include/exclude toggles + auto-detection |
| — | May 2026 | FIRE Calculator converted to hub-and-spoke (menu → Goals / Simulation); Monte Carlo moved off Overview |
| — | May 2026 | Wizard → dashboard prefill handoff fixed: `monthlyIncome`, `currentAge`, `cityName` now flow correctly |
| — | May 2026 | Learning Hub articles page populated with 11 SEO articles; structured `BodyNode` body type |
| #27 | May 2026 | Custom expense categories + sub-categories (localStorage); removed "Work expense" checkbox |
| #26 | May 2026 | Fixed crash on Cashflow tab (missing `existingTags` prop in mobile drawer); fixed FX fallback overwrite |
| #25 | May 2026 | Project/Event tag input in QuickAdd form — groups transactions across time periods |
| #24 | May 2026 | `FALLBACK_RATES` constant seeds FX rates so conversion never silently breaks on API failure |
| #23 | May 2026 | Multi-currency conversion in dashboard actuals KPIs and transaction day-net headers |
| #22 | May 2026 | Cashflow sub-tabs (Cashflow / Categories / Recurring / Budgets); new CategoriesTab analytics |
| #21 | May 2026 | Two-pane cashflow layout; flat 7-item sidebar; Learning Hub tab |

---

## Current State

**What works end-to-end:**
- `/dashboard` — full FIRE dashboard, login-gated, redirects to `/login` if no session
- **Overview tab** — greeting + split hero card (FIRE year, Years Remaining, Progress, Status / FIRE Target, Investable Assets, progress bar) + This Month KPI cards (Income, Expenses, Net Surplus, Savings Rate from cashflow transactions; CTA to Cashflow when no data logged) + stacked Path to FIRE bar chart (Contributions vs Market Growth, 5Y/15Y/All toggle)
- **Cashflow tab → Cashflow sub-tab** — two-pane QuickAdd + transaction list; AI categorisation; multi-currency; Project/Event tags; custom categories/sub-categories; edit/delete with undo toast
- **Cashflow tab → Categories sub-tab** — monthly spend by category (expandable, sub-cat breakdown, project breakdown); by-project/event section
- **Cashflow tab → Recurring sub-tab** — manual entry planner (income/expense) with frequency, include/exclude toggles, subscription detection; auto-detects repeating items from history
- **Cashflow tab → Budgets sub-tab** — budget bars (budget vs actual per category)
- **Assets/Liabilities/FIRE Calculator tabs** — input forms + projection chart + Monte Carlo simulation
- **FIRE Calculator** — hub menu → Goals sub-tab (retirement target) + Simulation sub-tab (Monte Carlo); back navigation
- **Reports tab** — period selector (3/6/12m), KPI cards, income vs expenses bar chart, category breakdown, month-by-month table
- **Calculators hub** — `/calculators` lists all SEO calculators and links users into the main FIRE wizard
- **Multi-currency** — transactions stored in any currency; auto-converted to USD using live Frankfurter API rates; fallback hardcoded rates if API fails
- **Custom categories** — stored in `localStorage` key `uf_custom_cats`; custom sub-categories in `uf_custom_subcats`; both are device-local only
- **Learning Hub articles** — 11 SEO articles at `/learn/articles`; individual article pages at `/learn/[slug]`
- **Learning Hub topics** — topic index at `/learn/topics` clusters FIRE concepts and links related articles/calculators
- **SEO internal linking** — landing/nav now expose crawlable links to `/calculators` and `/learn`

**Placeholder / incomplete:**
- **Stripe / Pro tier** — schema exists (`subscriptions` table, `isPro()` helper in `lib/supabase.ts`) but no paywall enforced in UI; Stripe webhook route exists at `app/api/stripe/webhook/route.ts`

**Known technical debt:**
- AI categorisation in `TransactionsTab.tsx` calls Anthropic API client-side with a hardcoded API key placeholder — no key is set in env, so it silently falls back to `"other"` for all descriptions
- Custom categories are device-local (localStorage), not synced across devices via Supabase
- `is_work_related` field: checkbox removed from form but field still written as `false` on every save; old transactions with `true` show a "work" pill in the list

---

## Pending Work

Priority order based on `docs/ROADMAP.md` Phase 2 goals:

**High priority (Phase 2 distribution):**
- [ ] Share my FIRE number — native share card + clipboard copy (social growth driver)
- [ ] Add existing savings input to landing calculator (current portfolio balance)
- [ ] Stripe $9/mo Pro tier — checkout flow, paywall on AI features, Stripe webhook already scaffolded
- [ ] Email onboarding sequence (Resend: Day 1 / Day 3 / Day 7)
- [ ] Reddit launch (r/financialindependence weekly promo thread — see `docs/LAUNCH_POSTS.md`)

**Product improvements:**
- [ ] Mobile UX audit — Cashflow QuickAdd form is hidden on mobile behind bottom drawer; verify UX
- [ ] Migrate custom categories to Supabase for cross-device sync
- [ ] Fix AI categorisation — wire `ANTHROPIC_API_KEY` env var or move to a server route
- [ ] Fix inconsistent "Budget tab" label in empty states (should be "Cashflow")
- [ ] Add error toasts for failed Supabase saves/deletes (currently silent)
- [ ] Persist active tab in URL query param (`?tab=reports`) so bookmarks work

**SEO / growth:**
- [ ] First 5 city landing pages (`/fire-number/austin-tx`, `/fire-number/london`, etc.)
- [ ] Product Hunt launch

---

## Making UI changes safely

1. Run `npm run dev` locally and verify the change in the browser before pushing.
2. Check that `npm run build` passes (TypeScript compilation must succeed).
3. The design baseline is the white/green system — background `#F7F9FB`, green `#059669`, teal `#20D4BF`. Do not introduce dark/orange theming in new code.
4. Push directly to `main` after local verification when the change is approved to ship.
