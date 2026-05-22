# UntilFire 鈥?AI Context File
> Paste this file at the start of any AI conversation to get it fully up to speed.  
> Last updated: April 2026

---

## What is UntilFire?

UntilFire is a **personal FIRE adviser** — the app that answers the question most people don't know how to ask: *"Can I actually FIRE? Where do I stand right now? And what should I do about it?"*

In 60 seconds with no login, you find your freedom date. Then UntilFire turns the number into a guided plan: what matters, what to do next, and how much closer it can bring work optionality.

The market is split between tools that are too simple to trust (FIRECalc, cFIREsim) and tools that are too complex to give you clear next steps (ProjectionLab, Boldin). Both leave you alone after giving you a number or a model. UntilFire doesn't. It does it with you: tracks what's actually happening, shows which choices move the date, and gives you a plan to follow.

Free tier: freedom date + FIRE number, no login, with city/tax assumptions where useful.
Pro ($4.99/mo): your personal FIRE adviser — plan based on your actual spending, not generic tips.

**One-line pitch:** Personal finance that sets you free — start with your freedom date, then follow a plan to bring it closer.

**Live at:** https://untilfire.com  
**X/Twitter:** @GetUntilFire  
**GitHub:** github.com/Johnbulongdon/UntilFire (private)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Auth + Database | Supabase |
| Styling | Tailwind CSS v4 + shared white/green design tokens |
| Charts | Recharts |
| Email | Resend |
| Hosting | Vercel |
| Analytics | Vercel Analytics |

---

## Repo Structure

```
/app
  page.tsx              鈫?Main landing + calculator wizard (5 screens)
  layout.tsx            鈫?Root layout
  globals.css           鈫?Global styles
  dashboard/page.tsx    鈫?Logged-in dashboard (expense tracking)
  expenses/page.tsx     鈫?Expense log
  login/page.tsx        鈫?Auth page
  api/waitlist/route.ts 鈫?Waitlist email signup API
  auth/callback/page.tsx鈫?Supabase OAuth callback

/components
  CalculatorForm.tsx    鈫?(legacy, replaced by page.tsx wizard)
  ProjectionChart.tsx   鈫?Recharts projection chart
  LogStashForm.tsx      鈫?Expense logging form
  PlanList.tsx          鈫?FIRE plan list
  ProgressCircle.tsx    鈫?Progress ring component

/lib
  fire-data.ts          鈫?263 cities, tax rates, FIRE calc logic
  supabase.ts           鈫?Supabase client

/docs                   鈫?YOU ARE HERE
```

---

## Current State (March 2026)

### What's built and live
- **5-screen calculator wizard**: Hero 鈫?City 鈫?Income 鈫?Savings 鈫?FIRE Reveal
- **263 cities** worldwide with search-as-you-type dropdown
- **Custom city fallback**: users can enter monthly expenses manually if city not found
- **Tax calculation**: US federal brackets (2025), FICA, all 50 state rates, international flat rates
- **FIRE reveal**: cinematic slam animation, count-up, glow effect, delta cards
- **Dashboard**: expense tracking, projection chart (requires login)
- **Waitlist**: collecting emails for AI roadmap feature
- **SEO**: robots.ts, sitemap.ts configured

### What is NOT built yet
- AI roadmap feature (waitlisted, planned at $4.99/mo)
- Stripe / payment integration
- Mobile app (web only)
- Social sharing card (share my FIRE number)
- City-specific SEO landing pages
- Email onboarding sequence

---

## Key Files to Know

| File | Purpose |
|---|---|
| `app/page.tsx` | Entire landing page + calculator wizard. All 5 screens, all CSS, all logic in one file. |
| `lib/fire-data.ts` | CITIES array (263 entries), STATE_TAX object, `calcTakeHome()`, `calcFIRE()` functions |
| `app/dashboard/page.tsx` | Logged-in user dashboard with charts and expense tracking |
| `app/api/waitlist/route.ts` | POST endpoint for waitlist signups |

---

## Business Model

| Tier | Price | Access |
|---|---|---|
| Free | $0 | Full FIRE calculator, no login required 鈥?city, income, savings 鈫?FIRE number + retirement date |
| Pro | $4.99/mo | Personal FIRE adviser: plan, budget tracker, real-time FIRE date, personalised next steps |

---

## Key Product Decisions

- **No login wall** on the calculator 鈥?friction-free discovery is the growth strategy
- **Search-as-you-type** city search (not country 鈫?state 鈫?city cascade)
- **25脳 rule** with 7% real annual return assumption
- **Custom city fallback** 鈥?user enters monthly expenses in USD if their city isn't listed
- **Syne + DM Sans + DM Mono** font stack; dark theme (#08080e background, #f97316 orange accent, #22d3a5 teal)
- Wizard state lives in `app/page.tsx` only 鈥?not in URL params or global state

---

## Repo Workflow Rule

- **Canonical baseline:** latest pushed GitHub `origin/main`
- **Local unpushed changes:** preserve them, but do not treat them as baseline by default
- **Live Vercel:** verification target for UI work, not the primary implementation baseline unless explicitly requested
- **Deployment/build IDs:** treat identifiers such as `6Tb7dySgE` as deployment references unless confirmed to be git revisions

---

## Links to Other Docs

- [PRD.md](./PRD.md) 鈥?full product requirements
- [MARKET.md](./MARKET.md) 鈥?market research, TAM, competitor analysis
- [PERSONAS.md](./PERSONAS.md) 鈥?user and buyer personas
- [USER_JOURNEY.md](./USER_JOURNEY.md) 鈥?full user journey map
- [ROADMAP.md](./ROADMAP.md) 鈥?phased roadmap
- [DECISIONS.md](./DECISIONS.md) 鈥?architecture and product decision log
