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

White/green. Background `#F7F9FB`, primary green `#064E3B` / `#059669`, teal `#20D4BF`, borders `#E2E8F0`. Fonts: Manrope (UI), Inter (data/numbers).

## Major routes

| Route | Description |
|---|---|
| `/` | Landing page + 5-screen FIRE calculator wizard |
| `/dashboard` | Logged-in dashboard — FIRE tracking, budget, transactions |
| `/login` | Google OAuth sign-in |
| `/calculators` | Calculator hub (SEO landing page) |
| `/calculators/coast-fire` | Coast FIRE calculator |
| `/calculators/apy` | APY calculator |
| `/calculators/compound-interest` | Compound interest calculator |
| `/calculators/savings-rate` | Savings rate calculator |
| `/calculators/4-percent-rule` | FIRE number / 4% rule calculator |
| `/share` | Social share page for calculator results |
| `/auth/callback` | OAuth callback handler |
| `/api/waitlist` | Email capture endpoint (Supabase `waitlist` table) |
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
| `app/dashboard/page.tsx` | Main dashboard (income, expenses, FIRE projection) |
| `app/dashboard/TransactionsTab.tsx` | Transaction log with AI categorisation |
| `lib/supabase.ts` | Supabase client singleton |
| `lib/fire-data.ts` | 263 cities, tax logic, `calcFIRE()` |
| `lib/monte-carlo.ts` | Monte Carlo retirement simulation |
| `lib/auth-context.tsx` | Auth context provider |
| `app/globals.css` | Global design tokens |

## Supabase tables

- `user_budget` — income, expense categories, FIRE profile per user
- `expenses` — individual transactions (with AI categorisation)
- `waitlist` — pre-signup email captures
- `subscriptions` — Stripe subscription status per user

## Deployment

Push to `main` triggers a Vercel deploy. No manual steps required.

The `claude/setup-gstack-locally-E87N1` branch is the active development branch.

## Making UI changes safely

1. Run `npm run dev` locally and verify the change in the browser before pushing.
2. Check that `npm run build` passes — Vercel will run this on deploy.
3. The design baseline is the white/green system defined in `app/globals.css`. Do not introduce dark/orange theming in new code.
4. Push to the feature branch, not directly to `main`.
