** UntilFire
The personal finance app built for FIRE.
See your FIRE number, your timeline, and the money moves that get you there faster.
Free, no login.

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

**Logged-in dashboard**

- **Acceleration card** — always-visible highest-impact move ranked by years saved
- **FIRE projection chart** — stacked contributions vs. market growth over 50 years
- **Monte Carlo simulation** — probability of reaching FIRE given market volatility
- **Multi-currency expense tracking** — transactions in any currency, normalized to USD
- **Recurring planner** — automatic detection + manual entry of recurring bills
- **Spending reports** — income vs. expenses chart, category breakdown, 3/6/12m selector
- **Investment simulations** — DCA with 3-scenario overlay, age-based glide path

**Growth / SEO**

- 5 city landing pages (`/fire-number/austin-tx`, `/fire-number/london`, `/fire-number/singapore`, `/fire-number/shanghai`, `/fire-number/dubai`)
- Public Learning Hub with 4 guided stages and 11 SEO articles
- FIRE Type personality quiz at `/fire-type`
- 6 standalone calculators at `/calculators`

## Latest updates

- Hardened `/api/waitlist` with email normalization, format validation, duplicate-safe success handling, and basic burst protection
- Removed stale `/debug` crawler blocking and cleaned the Plaid connection panel so its status/error UI uses stable plain-text copy
- Upgraded the Next.js baseline and dependency overrides so the repo validates cleanly on the latest `main` checkout with `npm run validate`

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
| Payments | Stripe |
| Email | Resend |
| Hosting | Vercel |
| Analytics | Vercel Analytics, PostHog, Google Analytics |

**Design system:** White/green. Background `#F7F9FB`, primary green `#064E3B` / `#059669`, teal `#22d3a5`, accent orange `#f97316`. Fonts: Manrope (headings), Inter (UI).

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
| `/dashboard` | Logged-in Freedom Acceleration Engine dashboard |
| `/login` | Google OAuth sign-in |
| `/calculators` | Calculator hub |
| `/learn` | Stage-based public Learning Hub |
| `/learn/stages/[stage]` | Public FIRE learning paths |
| `/learn/[slug]` | Individual SEO articles |
| `/fire-type` | FIRE personality quiz |
| `/auth/callback` | OAuth callback |
| `/api/waitlist` | Email capture |
| `/api/stripe/*` | Checkout, portal, webhook |

---

## Key files

| File | Purpose |
|---|---|
| `app/page.tsx` | Landing + full calculator wizard + interactive reveal |
| `app/components/landing/HeroScreen.tsx` | Hero copy and stats strip |
| `app/dashboard/page.tsx` | Dashboard shell, all tabs, acceleration card |
| `app/dashboard/TransactionsTab.tsx` | Cashflow two-pane with AI categorisation |
| `lib/fire/index.ts` | FIRE engine surface, `recommendActionsForReveal` |
| `lib/fire-data.ts` | 263 cities, tax logic, `calcFIRE()` |
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
| **Pro** | $9/mo | Full dashboard: acceleration card, expense tracking, Monte Carlo, monthly action plans |

---

## Supabase tables

- `user_budget` — income, expense categories, FIRE profile per user
- `expenses` — individual transactions (multi-currency, AI-categorised)
- `waitlist` — pre-signup email captures
- `subscriptions` — Stripe subscription status

---

## Deployment

Push to `main` triggers a Vercel deploy automatically.

---

## Recent Updates

| PR | Date | Description |
|---|---|---|
| #21 | May 2026 | Two-pane cashflow layout; flat 7-item sidebar; Learning Hub tab |
| #22 | May 2026 | Cashflow sub-tabs (Cashflow / Categories / Recurring / Budgets); new CategoriesTab analytics |
| #23 | May 2026 | Multi-currency conversion in dashboard actuals KPIs and transaction day-net headers |
| #24 | May 2026 | `FALLBACK_RATES` constant seeds FX rates so conversion never silently breaks on API failure |
| #25 | May 2026 | Project/Event tag input in QuickAdd form — groups transactions across time periods |
| #26 | May 2026 | Fixed crash on Cashflow tab (missing `existingTags` prop in mobile drawer); fixed FX fallback overwrite |
| #27 | May 2026 | Custom expense categories + sub-categories (localStorage); removed "Work expense" checkbox |
| #28 | May 2026 | Currency step in calculator wizard — CurrencyScreen with flag icons, per-currency confetti, FX conversion throughout |
| #29 | May 2026 | Restore Design E reveal screen; replace line chart with stacked bar chart (`GrowthBarChart`) showing contributions vs. market returns |
| #30 | May 2026 | Cashflow UX: TransactionList bounded to `calc(100vh - 48px)` matching QuickAddForm height; QuickAddForm category icons now show emoji instead of 2-letter codes |
| #31 | May 2026 | Hero copy refresh ("The personal finance app built for FIRE"); Fraunces font import added; wizard CTAs standardised to "Continue →"; empty-state text fixed for mobile; dead "See a sample" CTA removed |

---

## Current State

**What works end-to-end:**
- `/dashboard` — full FIRE dashboard, login-gated, redirects to `/login` if no session
- **Calculator wizard** — 6-step flow (city → currency → income → savings → portfolio → reveal); multi-currency with FX conversion; Design E reveal with GSAP animations and stacked bar growth chart
- **Cashflow tab → Cashflow sub-tab** — two-pane QuickAdd + transaction list; AI categorisation; multi-currency; Project/Event tags; custom categories/sub-categories; edit/delete with undo toast
- **Cashflow tab → Categories sub-tab** — monthly spend by category (expandable, sub-cat breakdown, project breakdown)
- **Cashflow tab → Budgets sub-tab** — budget bars (budget vs actual per category)
- **Assets/Liabilities/FIRE Calculator tabs** — input forms + projection chart + Monte Carlo simulation
- **Multi-currency** — transactions stored in any currency; auto-converted to USD using live Frankfurter API; fallback hardcoded rates if API fails
- **Custom categories** — stored in `localStorage` (`uf_custom_cats`, `uf_custom_subcats`); device-local only

**Placeholder / incomplete:**
- **Cashflow → Recurring sub-tab** — "coming soon" placeholder, no logic
- **Reports tab** — "coming soon" placeholder, no logic
- **Stripe / Pro tier** — schema exists but no paywall enforced in UI; webhook route at `app/api/stripe/webhook/route.ts`

**Known technical debt:**
- AI categorisation calls Anthropic API client-side with no key set — silently falls back to `"other"` for all descriptions
- Custom categories are device-local (localStorage), not synced via Supabase
- `is_work_related` field: checkbox removed from form but still written as `false` on every save; old transactions with `true` show a stale "work" pill
- `RetirementTargetCard` uses hardcoded 25× FIRE multiplier — could diverge from `calcFIRE()` if withdrawal rate changes

---

## Pending Work

**High priority:**
- [ ] Stripe $9/mo Pro tier — checkout flow, paywall on AI features
- [ ] Email onboarding sequence (Resend: Day 1 / Day 3 / Day 7)
- [ ] Recurring transactions — auto-detect and display repeating expenses
- [ ] Reports tab — monthly summaries, spending trends
- [ ] Fix AI categorisation — wire `ANTHROPIC_API_KEY` env var or move to a server route
- [ ] Migrate custom categories to Supabase for cross-device sync
- [ ] Zero-savings warning in calculator wizard

**Product improvements:**
- [ ] Mobile UX audit — Cashflow QuickAdd form is hidden behind bottom drawer on mobile
- [ ] Button hover/active states — CTA buttons have no visual feedback on hover (inline styles block pseudo-classes)
- [ ] `RetirementTargetCard` — replace hardcoded 25× with shared constant from `calcFIRE`
