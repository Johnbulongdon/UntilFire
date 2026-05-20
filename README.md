# UntilFire Codebase

UntilFire is a Next.js app for FIRE planning: a public calculator/wizard, SEO learning pages, and a logged-in dashboard for cashflow, assets, liabilities, and freedom-date planning.

Live site: [untilfire.com](https://untilfire.com)

## Knowledge base

This repository is intended to stay code-focused.

Product strategy, roadmap, user research, decision logs, launch notes, and long-form agent context live in the Obsidian vault instead:

- Vault repo: [Johnbulongdon/obsidian-vault](https://github.com/Johnbulongdon/obsidian-vault)
- UntilFire knowledge base: [obsidian-vault/UntilFire](https://github.com/Johnbulongdon/obsidian-vault/tree/main/UntilFire)
- Start here: [UntilFire Knowledge Base.md](https://github.com/Johnbulongdon/obsidian-vault/blob/main/UntilFire/UntilFire%20Knowledge%20Base.md)
- Agent operating trail: [Operating Log.md](https://github.com/Johnbulongdon/obsidian-vault/blob/main/UntilFire/Agent%20Context/Operating%20Log.md)

For AI agents: before changing product direction, UX IA, copy strategy, roadmap, or documentation, read the Obsidian knowledge base first. Use this repo for source code, tests, config, and minimal setup instructions.

## Tech stack

- Framework: Next.js 15 App Router
- Runtime/UI: React 19, TypeScript
- Styling: Tailwind CSS v4 plus app-specific global CSS
- Auth/database: Supabase Auth, Postgres, RLS
- Payments: Stripe
- Bank sync: Plaid
- Charts: Recharts
- Animation: GSAP
- AI integration: Anthropic SDK
- Email/marketing: Loops/Resend integration points
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
- `app/api/` — API routes for waitlist, Stripe, Plaid, feedback, and related server work
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
3. Run the relevant validation command, usually `npm run lint` for docs/light code and `npm run validate` for broader changes.
4. Keep product decisions and long-form context in the Obsidian vault, not in this README.

## Repo boundary

Keep in this repo:

- Source code
- Tests and validation scripts
- Package/config files
- Minimal setup and deployment instructions
- Minimal agent rules needed before touching code

Keep in Obsidian:

- Product strategy and positioning
- Roadmaps and sprint plans
- Personas and user journey notes
- Market research and launch/content calendars
- Decision logs and audit notes
- Agent operating context that is not required for code execution
