# UntilFire Codebase

UntilFire is a Next.js app for FIRE planning: a public calculator/wizard, SEO learning pages, and a logged-in dashboard for cashflow, assets, liabilities, and freedom-date planning.

Live site: [untilfire.com](https://untilfire.com)

## Knowledge base

Start with [project memory](docs/KNOWLEDGE.md), [current direction](docs/CONTEXT.md),
and [the decision log](docs/DECISIONS.md). This repo is the single maintained home
for public-safe project knowledge as well as code. Read why a choice was made
before changing it; update the relevant docs in the same PR.

The old Obsidian vault is retained as historical source material. Both branches
were reconciled in [the migration record](docs/history/vault-reconciliation.md);
normal work no longer requires a separate vault read or update.

## Tech stack

- Framework: Next.js 15 App Router
- Runtime/UI: React 19, TypeScript
- Styling: Tailwind CSS v4 plus app-specific global CSS
- Auth/database: Supabase Auth, Postgres, RLS
- Payments: Stripe
- Bank sync: Plaid
- Charts: Recharts
- Animation: GSAP
- AI integration: server-side categorisation route; inspect `app/api/categorise/route.ts` for the current provider
- Email: Resend; lifecycle sending lives in `app/api/email/` and `lib/email-send.ts`
- Analytics: Vercel Analytics and PostHog
- Hosting: Vercel

## Main app areas

- `app/` — Next.js App Router routes and route handlers
- `app/page.tsx` — public landing page and calculator wizard
- `app/dashboard/` — authenticated dashboard tabs and dashboard components
- `app/components/landing/` — landing-page UI components
- `app/fire-number/[city-slug]/` — city SEO landing pages
- `app/learn/` — public learning hub and article routes
- `app/calculators/` — standalone calculator hub
- `app/api/` — API routes for waitlist, Stripe, Plaid, feedback, AI categorisation (`/api/categorise`), and related server work
- `lib/` — shared FIRE logic, Supabase helpers, Plaid helpers, journey/localStorage helpers, and positioning constants
- `scripts/` — repo validation utilities

## Important files

- `lib/fire/index.ts` — FIRE engine surface and recommendations
- `lib/fire-data.ts` — city data and tax/FIRE helpers
- `lib/fire/strategies/traditional.ts` — core FIRE projection strategy
- `lib/supabase.ts` — Supabase client helpers and subscription gating
- `lib/journey.ts` — calculator prefill and localStorage helpers
- `lib/positioning.ts` — reusable anchor marketing copy constants
- `app/globals.css` — global design tokens and component classes
- `.env.example` — required environment variable names, without secrets

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Development server:

```text
http://localhost:3000
```

## Environment variables

Copy `.env.example` to `.env.local` and fill values locally or in Vercel.

Current variable names:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_PRO_PRICE_ID
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_POSTHOG_KEY
NEXT_PUBLIC_POSTHOG_HOST
ANTHROPIC_API_KEY
RESEND_API_KEY
FEEDBACK_TO_EMAIL
LOOPS_API_KEY
PLAID_CLIENT_ID
PLAID_SECRET
PLAID_ENV
```

Do not commit real secrets, tokens, passwords, API keys, webhook secrets, or connection strings.

## Scripts

```bash
npm run dev          # start Next.js dev server
npm run build        # production build
npm run start        # start production server after build
npm run lint         # eslint .
npm run typecheck    # next build + tsc --noEmit
npm run test:seo     # verify SEO config
npm run validate     # typecheck + lint + build
```

## Deployment

Pushing to `main` deploys through Vercel.

Before pushing code changes:

1. Fetch latest `origin/main`.
2. Confirm the working tree is clean except intended changes.
3. Follow `AGENTS.md` for relevant verification; docs-only changes need reference
   checks and `git diff --check`, while broad/risky code changes need `npm run validate`.
4. Update the relevant repo documents with the change. A main baseline does not
   authorize a main push, merge, or deployment; use the requested review workflow.

## Repo boundary

Keep code, setup, agent instructions, current design/feature contracts, roadmap,
changelog, and public-safe product direction and decision rationale here. Link
historical material instead of maintaining competing current summaries.

Keep credentials, raw personal feedback, respondent portfolios, private contact
lists and sensitive business data out of the public repo. The old vault has not
been deleted, merged, or configured as read-only by this documentation change.
