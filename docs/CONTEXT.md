# UntilFire — AI Context File
> Paste this file at the start of any AI conversation to get it fully up to speed.
Last updated: July 2026

---

## What is UntilFire?

UntilFire is a **personal FIRE adviser** — the app that answers the question most people don't know how to ask: *"Can I actually FIRE? Where do I stand right now? And what should I do about it?"*

In 60 seconds with no login, you find your freedom date. Then UntilFire turns the number into a guided plan: what matters, what to do next, and how much closer it can bring work optionality.

The market is split between tools that are too simple to trust (FIRECalc, cFIREsim) and tools that are too complex to give you clear next steps (ProjectionLab, Boldin). Both leave you alone after giving you a number or a model. UntilFire doesn't. It does it with you: tracks what's actually happening, shows which choices move the date, and gives you a plan to follow.

Free tier: freedom date + FIRE number, no login, full dashboard, 1 bank + 1 brokerage connection, with city/tax assumptions where useful as trust proof.
Pro ($4.99/mo, 3 months free): unlimited bank/brokerage connections and AI transaction categorization.

**Important nuance:** the "adviser" part of the positioning is aspirational for the deeper AI-driven guidance layer (Phase 5, "Monthly Moves Adviser") — that engine is not built yet, and is intentionally paused. Early AI-generated recommendations tested too generic to lead with; the plan is to build stronger deterministic infra (scenario modeling, real tracked data) first. What's live today that supports the "does it with you" story is the reveal-screen scenario simulator and Plaid-connected real transaction tracking — not a personalized AI adviser yet.

**Positioning guardrail:** City-specific cost of living and tax assumptions are useful credibility features, but they are not the core story. The core story is that UntilFire does it with you: it shows the path, next move, and progress toward work optionality. This is a design philosophy, not a gamification mechanic — no streaks, no daily-engagement loops, no lesson-plan language. The product's real cadence is monthly, not daily.

**One-line pitch:** Personal finance that sets you free — start with your freedom date, then follow a plan to bring it closer.

**Live at:** https://untilfire.com
**X/Twitter:** @GetUntilFire
**GitHub:** github.com/Johnbulongdon/UntilFire (private)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI | React 19, TypeScript |
| Auth + Database | Supabase |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| Payments | Stripe |
| Bank connection | Plaid |
| AI categorisation | Claude (`ANTHROPIC_API_KEY`, server-side route) |
| Email | Resend |
| Analytics | Vercel Analytics, PostHog |
| Hosting | Vercel |

---

## Repo Structure

```
/app
  page.tsx                   → SEO shell + renders HomeClient
  HomeClient.tsx              → the full no-login calculator wizard and all its screens
                                 (Goal → City → Income → Savings → Portfolio → Reveal), in one large file
  components/landing/         → LandingPage.tsx (v7 dark hero), GoalsScreen.tsx, CityScreen.tsx,
                                 WizardProgress.tsx, Nav.tsx
  components/Logo.tsx, GeoArbitrageGlobe.tsx
  dashboard/                  → page.tsx (shell) + tabs: TransactionsTab, ReportsTab, CategoriesTab,
                                 RecurringTab, LearningHubTab, ProfileTab, PlaidConnect, CsvImportModal,
                                 UpgradeModal, PurchaseImpactPanel, TourModal, FeedbackWidget
  api/                         → waitlist, stripe/*, plaid/*, categorise, classify-needs-wants, email/*,
                                 feedback, survey, og, user, portfolio
  login/, auth/callback/       → Supabase Google OAuth
  fire-type/                   → FIRE Type quiz + share flow
  pricing/, learn/, calculators/, fire-number/*, portfolio/, share/, transactions/, geo-arbitrage/
                                → public SEO / secondary pages

/components                    → older, still-used dashboard-support pieces: CalculatorForm.tsx,
                                 ProjectionChart.tsx, PlanList.tsx, ProgressCircle.tsx, NextActions.tsx,
                                 QuickAddButton.tsx, LogStashForm.tsx, EnhancedFIRECalculator.tsx

/lib
  fire-data.ts                → 263 cities, tax rates
  fire/                        → calcFIRE(), calcTakeHome() and related FIRE math
  journey.ts                   → calculator → dashboard prefill handoff (localStorage)
  analytics.ts, analytics-events.ts, analytics-server.ts → funnel event contract (see docs/analytics/EVENTS.md)
  positioning.ts                → single-source anchor headline/description/proof copy
  plaid.ts, stripe.ts, supabase.ts, supabase-admin.ts

/docs                          → YOU ARE HERE
```

---

## Current State (July 2026)

### What's built and live
- **6-screen calculator wizard**, no login: Goal (multi-select) → City → Income → Savings → Portfolio → FIRE Reveal
- **263 cities** worldwide with search-as-you-type dropdown, custom-city fallback
- **Tax calculation**: US federal/FICA/state, international effective-rate assumptions
- **Scenario simulator** on the reveal screen (adjust savings/income/city/return assumption)
- **Full dashboard**: Overview, Cashflow, Assets, Liabilities, FIRE Calculator, Reports, Learning Hub, Profile
- **Stripe billing**: checkout, portal, webhook, subscription sync — verified in production
- **Plaid bank connections**: free tier 1 bank + 1 brokerage, Pro unlimited; feeds Assets/Liabilities/Cashflow
- **Transaction import**: manual entry, Plaid sync, and CSV/Excel/PDF statement upload with column mapping,
  duplicate detection, and per-row source-file tracking
- **AI transaction categorisation** (Pro feature, Claude-based, server-side)
- **FIRE Type quiz** (`/fire-type`) — shareable archetype result, secondary acquisition loop, not the main promise
- **Email**: welcome + day-7 retention via Resend
- **SEO**: city landing pages (`/fire-number/*`), Learning Hub, standalone calculators, sitemap/robots/OG
- **Funnel analytics**: PostHog events end to end, `funnel_landing_viewed` through `funnel_checkout_succeeded`,
  plus an email-capture event for the no-account "save by email" path on the reveal screen

### What is NOT built yet
- **Monthly Moves Adviser** (Phase 5) — the personalized "invest $X more → date moves Y sooner" AI
  recommendation engine. Intentionally paused: infra first, AI layer later.
- Partner/spouse mode, advanced assumptions editor, PWA/installable mobile (Phase 6)
- Product Hunt launch itself (assets are in progress; launch hasn't happened yet)
- Native mobile app (deliberately not building — web-first)

---

## Key Files to Know

| File | Purpose |
|---|---|
| `app/page.tsx` / `app/HomeClient.tsx` | Landing page + full calculator wizard state, screens, and styling |
| `app/components/landing/LandingPage.tsx` | The v7 dark marketing hero shown before the wizard starts |
| `lib/fire-data.ts`, `lib/fire/` | City data, tax assumptions, `calcFIRE()` / `calcTakeHome()` |
| `lib/journey.ts` | `CalculatorPrefill` — carries calculator results into the dashboard after signup |
| `lib/analytics-events.ts`, `lib/analytics.ts`, `docs/analytics/EVENTS.md` | Funnel event contract — canonical source of truth |
| `app/dashboard/page.tsx` | Logged-in dashboard shell and tab routing |
| `app/dashboard/UpgradeModal.tsx`, `app/pricing/page.tsx` | Pro upgrade surfaces |
| `app/dashboard/CsvImportModal.tsx` | CSV/Excel/PDF transaction import |
| `app/api/waitlist/route.ts` | No-account "save my plan by email" endpoint |

---

## Business Model

| Tier | Price | Access |
|---|---|---|
| Free | $0 | Full calculator (no login), full dashboard, 1 bank + 1 brokerage via Plaid, manual/CSV/Excel/PDF import |
| Pro | $4.99/mo (3 months free trial) | Unlimited bank/brokerage connections, AI transaction categorisation |

---

## Key Product Decisions

- **No login wall** on the calculator — friction-free discovery is the growth strategy
- **Search-as-you-type** city search (not country → state → city cascade)
- **25× rule**; reveal screen defaults to a 10% nominal annual return, with an optional toggle to a
  more conservative 7% "real" (inflation-adjusted) assumption
- **Custom city fallback** — user enters monthly expenses in USD if their city isn't listed
- Dark theme (`#08080e` background, `#f97316` orange accent, `#22d3a5` teal accent)
- "Guided path, not just a number" is a design philosophy, not a gamification mechanic — avoid
  analogies (e.g. Duolingo) that imply streaks or daily-engagement loops; the product's real cadence
  is monthly

---

## Repo Workflow Rule

- **Canonical baseline:** latest pushed GitHub `origin/main`
- **Local unpushed changes:** preserve them, but do not treat them as baseline by default
- **Live Vercel:** verification target for UI work, not the primary implementation baseline unless explicitly requested
- **Deployment/build IDs:** treat identifiers such as `6Tb7dySgE` as deployment references unless confirmed to be git revisions

---

## Links to Other Docs

- [PRD.md](./PRD.md) — full product requirements
- [MARKET.md](./MARKET.md) — market research, TAM, competitor analysis
- [PERSONAS.md](./PERSONAS.md) — user and buyer personas
- [USER_JOURNEY.md](./USER_JOURNEY.md) — full user journey map
- [ROADMAP.md](./ROADMAP.md) — phased roadmap, source of truth for built vs. planned
- [DECISIONS.md](./DECISIONS.md) — architecture and product decision log
- [analytics/EVENTS.md](./analytics/EVENTS.md) — funnel event contract

Broader strategy/positioning context (market gap, messaging guardrails, positioning decisions) lives in
the Obsidian vault under `UntilFire/Strategy/Product Positioning.md`, not duplicated here.
