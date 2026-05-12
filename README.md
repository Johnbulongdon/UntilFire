# UntilFire

UntilFire is a Next.js FIRE planning app with a public calculator, a logged-in dashboard, a calculator library, and a small learning hub.

## Stack

- Next.js 15 App Router
- React 19
- Supabase auth + data
- Tailwind CSS v4 foundations plus route-level inline styling
- Recharts for projections
- Vercel for deployment

## Routes

- `/` - landing page and main FIRE calculator
- `/dashboard` - logged-in planning dashboard
- `/learn` - public learning hub
- `/calculators/*` - standalone calculator pages
- `/login` - Google OAuth entry

## Scripts

```bash
npm run dev
npm run typecheck
npm run lint
npm run build
npm run validate
```

## Environment

Required public Supabase variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Additional server-side integrations may also require:

- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_PRO_PRICE_ID`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST`

## Analytics

The v1 conversion funnel is instrumented through PostHog. The canonical
event contract lives in [`docs/analytics/EVENTS.md`](docs/analytics/EVENTS.md);
the runtime source of truth is `lib/analytics-events.ts`. Update both
together when changing the funnel.

## Product State

### Past State

- UntilFire started as a FIRE calculator with supporting documentation and calculator routes.
- The dashboard was added as the logged-in planning workspace for income, expenses, assets, liabilities, projections, and scenario tracking.
- Some dashboard source text was later found to contain mojibake/corrupted emoji strings such as `棣冩崁`, which rendered visibly in the UI.

### Current State

- The app is a Next.js FIRE planning product with a public calculator, logged-in dashboard, calculator library, learning hub, Supabase integration, and PostHog funnel tracking.
- The dashboard uses real emoji/icon labels in source where icons are intended, and the known corrupted dashboard mojibake markers have been removed.
- The canonical implementation baseline is the latest pushed GitHub `origin/main`.

### Future State

- Keep the dashboard as the operating center for a user's FIRE plan: budget targets, actual spending, assets, liabilities, projections, and next actions.
- Add stronger regression coverage for text encoding/UI copy so corrupted characters cannot quietly return.
- Continue improving activation: calculator handoff, first saved plan, first logged expense, and clear next best actions.

## Workflow

- The default implementation baseline is the latest pushed GitHub `origin/main`.
- Local unpushed edits are not baseline unless explicitly requested.
- For UI work, verify against the latest pushed GitHub/Vercel state before pushing.
- Pushing `main` triggers production deployment on Vercel.
