# UntilFire

Personal FIRE calculator and financial independence tracker. Free calculator (no login), paid AI adviser tier.

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

## Key features

- **Multi-currency expense tracking** — transactions stored in any currency, auto-converted to USD for summaries using live rates from frankfurter.app
- **AI categorisation** — description → Claude API → category + tags, shown as a suggestion pill
- **Two-pane cashflow UI** — sticky QuickAdd form on the right, scrollable transaction list on the left; click any row to edit inline
- **FIRE projection** — chart of 401(k) / Roth / taxable growth over 50 years with FIRE target line
- **Monte Carlo simulation** — 1,000-run probability distribution of retirement outcomes (FIRE Calculator tab)
- **Budget comparison bars** — actual spend vs budget per category
- **Recurring planner** — manual entry of recurring income/expenses with include/exclude toggles; auto-detects repeating transactions from history
- **Reports tab** — income vs expenses bar chart (Recharts), per-category breakdown, month-by-month summary table; 3/6/12-month period selector
- **Wizard → dashboard handoff** — calculator prefill (income, city, age, spend estimate) flows into dashboard on first login via `localStorage` key `uf_calc_prefill`

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
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
```

## Dev

```bash
npm install
npm run dev          # localhost:3000
npm run build        # production build
npm run typecheck    # tsc --noEmit
npm run lint         # next lint
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

The `claude/setup-gstack-locally-E87N1` branch is the active development branch.

## Recent Updates

| PR | Date | Description |
|---|---|---|
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
- **Cashflow tab → Cashflow sub-tab** — two-pane QuickAdd + transaction list; AI categorisation; multi-currency; Project/Event tags; custom categories/sub-categories; edit/delete with undo toast
- **Cashflow tab → Categories sub-tab** — monthly spend by category (expandable, sub-cat breakdown, project breakdown); by-project/event section
- **Cashflow tab → Recurring sub-tab** — manual entry planner (income/expense) with frequency, include/exclude toggles, subscription detection; auto-detects repeating items from history
- **Cashflow tab → Budgets sub-tab** — budget bars (budget vs actual per category)
- **Assets/Liabilities/FIRE Calculator tabs** — input forms + projection chart + Monte Carlo simulation
- **FIRE Calculator** — hub menu → Goals sub-tab (retirement target) + Simulation sub-tab (Monte Carlo); back navigation
- **Reports tab** — period selector (3/6/12m), KPI cards, income vs expenses bar chart, category breakdown, month-by-month table
- **Multi-currency** — transactions stored in any currency; auto-converted to USD using live Frankfurter API rates; fallback hardcoded rates if API fails
- **Custom categories** — stored in `localStorage` key `uf_custom_cats`; custom sub-categories in `uf_custom_subcats`; both are device-local only
- **Learning Hub articles** — 11 SEO articles at `/learn/articles`; individual article pages at `/learn/[slug]`

**Placeholder / incomplete:**
- **Stripe / Pro tier** — schema exists (`subscriptions` table, `isPro()` helper in `lib/supabase.ts`) but no paywall enforced in UI; Stripe webhook route exists at `app/api/stripe/webhook/route.ts`
- **Learning Hub topics** — static links, no content yet at `/learn/topics`

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
4. Push to the feature branch, not directly to `main`.
