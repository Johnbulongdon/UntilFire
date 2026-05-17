# UntilFire — Freedom Acceleration Engine

> **"Guessing is expensive."**

UntilFire is not a budgeting app. It is a **Freedom Acceleration Engine** — a tool that makes the financial cost of every decision visible, quantified, and personal.

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
