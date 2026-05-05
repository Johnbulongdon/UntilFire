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

## Workflow

- The default implementation baseline is the latest pushed GitHub `origin/main`.
- Local unpushed edits are not baseline unless explicitly requested.
- For UI work, verify against the latest pushed GitHub/Vercel state before pushing.
- Pushing `main` triggers production deployment on Vercel.
