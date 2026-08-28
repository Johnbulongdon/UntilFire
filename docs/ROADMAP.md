# UntilFire — Product Roadmap
Last updated: August 2026

---

## Product Direction

**Positioning:** Personal finance that sets you free.

UntilFire starts with your freedom date, then walks with you toward it: what matters, what to do this month, and how each move brings work optionality closer. Free, no login.

**Core differentiator:** UntilFire does it with you. Most finance tools either hand you a number and leave you alone, or hand you a model you have to interpret yourself. UntilFire should be the path in between: a clear next move, tracked progress, and guidance that keeps working with you toward financial freedom. This is about continuity and clarity, not gamification — no streaks, no daily-engagement mechanics.

**North star:** Turn financial independence from an abstract calculator result into a clear, emotional, actionable path: *when can work become optional, what should I do next, and how will UntilFire help me keep moving?*

**Product principles:**
- Lead with the emotional outcome: freedom date, work optional, escape the grind.
- Make the main promise the guided path, not city-specific cost-of-living or tax math.
- Use city/tax assumptions as supporting trust proof only: “credible enough to believe,” not the headline differentiator.
- Keep the first value moment free, fast, and no-login.
- Show a specific plan, not generic FIRE advice.
- Make calculations feel trustworthy with transparent assumptions, privacy reassurance, and clear methodology.
- Treat the dashboard and Pro tier as continuity after the first aha moment, not a replacement for the free calculator.
- Do not hide the aha moment behind login, payment, or heavy setup.

## Active Revenue Goal — $3k MRR

UntilFire's active goal is to reach **$3k monthly recurring revenue**. Roadmap work should be prioritized by direct contribution to this goal.

**Revenue path:**
1. Get more new visitors to the no-login freedom-date result without friction.
2. Show enough trust, clarity, and monthly value that users understand why saving or upgrading is useful.
3. Convert activated users into Pro customers only after the free aha moment.
4. Retain paying users through a plan, progress tracking, and continuity.

**Priority order while pursuing $3k MRR:**
- Fix blockers in mobile and end-to-end no-login activation.
- Verify Stripe checkout, return, subscription sync, and billing portal before depending on paid conversion.
- Finalize free vs Pro packaging around "personal FIRE adviser" and the plan.
- Add post-result save/email/share loops that do not expose sensitive finances.
- Support founder-led beta and launch channels with freedom-led, work-optionality, and plan messaging.

---

## Phase 0 — Foundation ✅ Complete

*Goal: Working product live at untilfire.com*

- [x] Next.js 15 app deployed on Vercel
- [x] Supabase auth with Google OAuth
- [x] FIRE calculator foundation
- [x] Dashboard foundation
- [x] Projection chart with Recharts
- [x] Waitlist API (`/api/waitlist`)
- [x] SEO basics (`robots.ts`, `sitemap.ts`)
- [x] Domain: untilfire.com live

---

## Phase 1 — Calculator, Dashboard, and SEO Base ✅ Complete

*Goal: Give users a personalized FIRE answer and a dashboard that can continue the journey.*

### Calculator / Public Funnel

- [x] 5-screen landing calculator wizard
- [x] 263 cities worldwide with cost-of-living data
- [x] Search-as-you-type city dropdown
- [x] Custom city fallback with manual monthly expenses
- [x] US federal/state/FICA tax calculation
- [x] International effective tax assumptions
- [x] FIRE number reveal
- [x] Existing portfolio balance input
- [x] Wizard → dashboard prefill handoff
- [x] Public calculator hub at `/calculators`
- [x] SEO calculators: Coast FIRE, APY, compound interest, savings rate, 4% rule
- [x] First city SEO landing pages under `/fire-number/*`

### Dashboard

- [x] Dashboard shell with sidebar navigation
- [x] Overview, Cashflow, Assets, Liabilities, FIRE Calculator, Reports, Learning Hub, Profile
- [x] FIRE projection chart and target progress
- [x] Monte Carlo simulation in dashboard
- [x] Cashflow transaction tracker
- [x] Custom categories and sub-categories using localStorage
- [x] Recurring planner with include/exclude toggles and detection from transaction history
- [x] Reports: income vs expenses, category breakdown, month-by-month table
- [x] Multi-currency dashboard display with fallback FX rates
- [x] Profile settings: name, city, default currency, delete account

### Content / SEO

- [x] Stage-based Learning Hub
- [x] Public stage pages under `/learn/stages/[stage]`
- [x] Article grid and individual article pages
- [x] Topics index
- [x] Internal links from landing/nav to calculators and learn pages

---

## Phase 2 — Built Recently, Needs Production Verification 🧪

*Goal: Do not rebuild what exists. Verify, harden, and decide whether each feature belongs in the Product Hunt path.*

### Monetisation / Pro

- [x] Stripe checkout route: `/api/stripe/checkout`
- [x] Stripe portal route: `/api/stripe/portal`
- [x] Stripe webhook route: `/api/stripe/webhook`
- [x] Stripe subscription sync route: `/api/stripe/sync-subscription`
- [x] Dashboard upgrade modal connected to checkout
- [x] Subscription table/schema present
- [x] Verify production Stripe env vars and webhook signing secret on Vercel
- [x] Test full checkout → dashboard return → subscription sync → portal flow
- [x] **Launch paywall decided:** Free tier gets 1 bank account + 1 brokerage account. Pro unlocks additional connections and AI categorisation. Upgrade prompts shown when limits are hit.

### Bank Connection / Plaid

- [x] Plaid server routes: create link token, exchange token, sync, disconnect, list items, accounts
- [x] Plaid dashboard UI in Cashflow/Profile
- [x] Free users limited to 1 bank; Pro users can connect more
- [x] Plaid account balances feed Assets/Liabilities/Overview calculations
- [x] Plaid transaction import feeds Cashflow
- [x] Verify production Plaid credentials and environment mode — **Plaid works 100%**
- [x] QA bank connection, sync, duplicate handling, disconnect, and account refresh
- [x] **Plaid is a Product Hunt launch feature** — bank connection is live and promoted in the dashboard

### AI Categorisation

- [x] Client now calls server route `/api/categorise`
- [x] Server route uses `ANTHROPIC_API_KEY` instead of exposing a client-side key
- [x] `.env.example` includes `ANTHROPIC_API_KEY`
- [x] `handleDescriptionBlur` re-enabled — fires on description blur for expense transactions ≥4 chars
- [x] **AI categorisation is a Pro feature** — gated behind subscription, not available on free tier
- [x] Verify production env var `ANTHROPIC_API_KEY` is set in Vercel
- [x] QA categorisation accuracy and fallback behavior
- [x] AI review modal with per-row overrides and "Approve all" — PR #52
- [x] Need/want rule per sub-category in Categories tab — PR #49
- [x] Mismatch detection when setting sub-category rules — PR #51

### Dashboard Polish

- [x] Dark mode persists across page loads — theme script in `<head>`, `useLayoutEffect` for toggle sync (PR #54)
- [x] Achievement milestones blended into the progress chart as teal pin bubbles
- [x] Achievement card removed — milestones live only on the chart

### FIRE Type

- [x] Trading card redesign: full-body illustrated avatar per FIRE type
- [x] Custom avatar system with 16 meme-archetype characters per type
- [x] White poster share card replacing the dark trading card
- [x] Share card drop shadow removed — flat poster design

### Distribution Experiments

- [x] FIRE Type quiz page at `/fire-type`
- [x] FIRE Type scoring and result storage in localStorage
- [x] FIRE Type native share / clipboard share
- [x] Fire Type analytics events
- [x] Public share page at `/share`
- [x] Dynamic OG image route for share cards
- [x] Decide whether FIRE Type is a primary Product Hunt asset or secondary acquisition experiment
- [x] Update share copy from "retire by" language to "freedom date / work optional" language

---

## Phase 3 — Product Hunt Readiness 🔥 Current Focus

*Goal: Make the public product strong enough for impatient launch traffic to understand, try, trust, and share.*

### Must Fix Before Launch

- [x] **Fix main CTA path:** clicking the primary homepage CTA must immediately open or scroll to the first calculator step. No dead-feeling click, hidden flow, or repeated CTA.
- [x] **Align live homepage copy:** hero should use freedom-led positioning / "work can become optional" / "plan that brings freedom closer."
- [x] **Rename primary CTA:** prefer "Find my freedom date" over "Calculate my FIRE number."
- [x] **Make first calculator step obvious:** show a clear "Step 1" prompt, input, progress, and continue button above the fold after CTA click.
- [x] **Show the differentiator visually:** above the fold or on the result screen, show example plan impact like "Invest +$300/mo → freedom 1.8 years sooner."
- [x] **Add trust line near hero/result:** privacy + transparent assumptions. City/tax methodology can appear as proof, but must not become the main promise.
- [x] **Update retirement-heavy copy:** replace "retire by" where it weakens the broader freedom/work-optional positioning.
- [x] **Mobile QA:** complete full no-login calculator flow on mobile viewport — no issues found.
- [x] **End-to-end no-login QA:** homepage → calculator → result → adjust inputs → share/save path confirmed working.

### Product Hunt Launch Assets

- [ ] Product Hunt tagline: "Personal finance that sets you free."
- [ ] Product Hunt short description: "UntilFire starts with your freedom date, then gives you a plan to bring work optionality closer. Free, no login."
- [ ] Maker first comment: personal story + why FIRE tools need to guide the path, not just hand over a number — good tools do not only show the answer, they help you get there.
- [ ] 20–40 second demo GIF/video: enter inputs → get freedom date → see plan.
- [ ] 3–5 screenshots: hero, calculator step, result, monthly move/plan, dashboard continuity. Avoid making city/tax comparison the hero screenshot.
- [ ] Simple FAQ answers: calculation assumptions, privacy, who it is for, why it is free.

### Shareability & Conversion

- [x] Result page should produce a shareable insight without exposing sensitive finances — "Freedom Year" share card (PR #48).
- [x] Refine `/share` and OG cards around freedom date or city insight, not raw net worth — Freedom Year card is default (PR #48).
- [x] Add "save my result" email capture after the reveal, not before the aha moment — plan email via Resend (PR #48).
- [x] Keep login secondary until after the user has seen value — login page shows personalized freedom year (PR #48).
- [x] Track funnel analytics: hero CTA click, calculator start, each step completion, result reveal, share/save/login clicks — PostHog events fixed (PR #47).
- [x] Animated logo reveal with FIRE number pop/glow on landing page — PR #56

### Acceptance Criteria for Launch Readiness

- [x] A new visitor can understand the product in 5 seconds.
- [x] A new visitor can start the calculator in 1 click.
- [x] A new visitor can reach a useful result in about 60 seconds.
- [x] The result explains the FIRE number, timeline, and a concrete plan.
- [x] The page answers "can I trust this?" before users ask.
- [x] The launch page has no obvious broken CTA, console error, or mobile layout blocker — confirmed via mobile QA.

---

## Phase 4 — Post-Launch Growth & Early Revenue 📈

*Goal: Convert launch attention into repeat usage, email leads, and first paying customers.*

### Email

- [x] Welcome email via Resend — founder voice, 3 direct points (bank history, forever free, long journey), CTA to dashboard
- [x] Day-7 retention email via Resend — genuine founder check-in, feedback ask, X/LinkedIn social links
- [x] Vercel cron (`0 10 * * *`) triggers retention send via `/api/email/retention`
- [x] Idempotency via `profiles.welcome_email_sent_at` / `day7_email_sent_at` columns
- [x] Preview route `/api/email/preview?type=welcome|retention&secret=CRON_SECRET`

### SEO

- [x] Homepage title keyword-first: "FIRE Calculator — Find Your Freedom Date in 60 Seconds | UntilFire"
- [x] `WebSite` + `SearchAction` schema in root layout (sitelinks searchbox eligibility)
- [x] `CollectionPage` + `BreadcrumbList` JSON-LD on `/learn`, `/learn/articles`, `/learn/stages/[stage]`
- [x] Sitemap, robots.txt, canonical tags, OG/Twitter fully covered across all public pages

### Growth

- [ ] Product Hunt launch and follow-up engagement
- [ ] Reddit launch post in relevant promo/community threads
- [ ] Hacker News Show HN post
- [ ] X launch thread from @GetUntilFire
- [ ] City SEO expansion from first pages to 50+ pages, framed as local trust and acquisition rather than core product positioning
- [ ] FIRE topic pages linked from calculator/result flows
- [ ] Lightweight founder-led content cadence around freedom date, work optionality, and the plan

### Product

- [ ] Improve "adjust inputs" flow from result screen
- [x] Scenario simulator on reveal screen: save more, earn more, reduce expenses, change city — presented as “moves that bring freedom closer,” not raw calculators
- [x] Transaction import: CSV, Excel (.xlsx/.xls), and PDF bank/credit-card statements, with column mapping (CSV/Excel), duplicate detection (date + amount), a review step, and per-row source-file tracking shown in the transactions list — CsvImportModal.tsx
- [ ] Better result explanation for beginners: FIRE number, withdrawal rate, assumptions, timeline
- [ ] Email result summary with top plan step
- [ ] Dashboard handoff that preserves calculator result and next action
- [ ] Sync custom categories/sub-categories to Supabase so they work across devices
- [ ] Persist active dashboard tab in URL query param, e.g. `?tab=reports`
- [ ] Add a way to remove custom categories once created
- [ ] Show a live projected freedom date in the top bar so it's always visible, not just on the Overview chart
- [ ] Rework recurring expenses (Cashflow → Recurring, `RecurringTab.tsx`): let users manually enter a recurring expense, match it once to a real transaction, and have future matching transactions auto-classified against it — current tab only does manual entries + automatic frequency detection, not match-once-then-auto-track
- [x] Redesign budget creation flow — replaced the one-click "Predict budget from history" bulk overwrite with a guided per-category modal (`BudgetSetupModal.tsx`) showing a historical reference next to each input

### Monetisation

- [ ] Finalize free vs Pro packaging
- [ ] Enforce Pro unlocks only after free value is delivered
- [ ] Email onboarding sequence: result saved, top move, dashboard reminder, Pro upgrade
- [ ] Pricing page copy aligned with "plan adviser," not generic dashboard access

### Demo Video

- [x] CanvasKit offscreen renderer for 43s motion-graphics demo video (`scripts/demo-video/render.mjs`)
- [x] 120 BPM beat-synced animations: compound chart, bank logo marquee, notification swipe leaks scene, end card
- [x] Bloom-cut transitions between scenes
- [x] v26: chart colors tuned for white bg, bars flush on axis, recovered counter beats with music

---

## Phase 5 — Monthly Moves Adviser 📅

*Goal: Make UntilFire useful every month, not just once.*

**Sequencing note (2026-07-16):** intentionally not urgent right now. Early AI-generated recommendations read as generic — the fix is stronger, transparent infra (real scenario modeling grounded in the user's actual data) before layering AI on top, not AI stepping in to cover for weak infra. Revisit once the deterministic guidance surface (scenario simulator, real tracked data) is solid.

**Update (2026-08-28):** the deterministic guidance surface is further along than this note implied. `DashTab`'s `topTasks` (`app/dashboard/page.tsx`) is already a rules-based recommendation engine — nine conditional rules, each carrying an impact (`impactYears`) and a priority score, sorted `priority` then `impactYears`, top 3 shown. The emergency-fund-first rule ("if safety net is below the floor, recommend safety first, ranked above growth moves") already exists and already outranks everything else. `RevealFlow`'s step-7 scenario picker is a working test-a-scenario UI. This phase is a lot more "extend what's there" than "build from zero" — see the Learning Loop section below for the concrete plan and what's shipped so far.

### Core Adviser Feature

- [x] Rules-based next-move ranking grounded in the user's actual data (`topTasks`, `DashTab`) — impact × priority, not impact alone yet (confidence/ease weighting still open, see Learning Loop below)
- [x] Emergency-fund-first safety rule, ranked above growth moves (`emergencyFundPlan.priorityMode`)
- [x] Working scenario-test UI with real recomputed numbers (`RevealFlow` step 7, `HomeClient.tsx`'s `scenarios`)
- [ ] "This month: invest $300 more and your freedom date moves 4 months closer" style recommendations — the pieces above produce this shape already; not yet surfaced as a monthly-cadence card
- [ ] Explain tradeoffs clearly: impact, difficulty, confidence, and why it matters — impact exists (`impactYears`); difficulty and confidence do not yet
- [ ] Keep recommendations grounded in user data and editable assumptions
- [ ] Monthly progress email or dashboard card

### Supporting Features

- [ ] Spending reports connected to freedom-date impact
- [ ] Recurring income/bill insights connected to the plan
- [ ] Coast FIRE and Barista FIRE scenario modelling
- [ ] Better projection confidence and scenario comparison
- [ ] Optional bank/Plaid deepening only if it improves the plan, not as a budgeting-app detour

### Learning Loop — Observe → understand → recommend → test → follow up → improve

Added 2026-08-28. The product should not just learn about the user; it should
help the user learn what actually changes their future. Sequenced by
dependency, not by calendar — each stage needs the one before it shipped and
producing real data before it's worth building.

**1. Behavioral event tracking — foundation, first slice shipped**

Extends the existing funnel contract (`lib/analytics-events.ts` /
`docs/analytics/EVENTS.md`) rather than a second system. North-star metric:
**reveal → user tests or accepts one next move** — that's whether UntilFire
creates action, not just curiosity.

- [x] `funnel_next_move_viewed` — Home shows a real recommendation
- [x] `funnel_scenario_tested` — a scenario is picked in the reveal
- [x] `funnel_scenario_accepted` — "Start my path" clicked, which scenario was live
- [ ] `funnel_next_move_opened` — needs the task rows in `DashTab` to become a real click target first; they're informational today
- [ ] `funnel_numbers_updated` — needs a decision on which edit surfaces count (Assets/Liabilities forms? Budget modal? both?) before wiring
- [ ] `funnel_action_completed` — needs a definition of "action" (mark a recommended task done doesn't have UI yet; connecting a bank account already does and could be the first instance)
- [ ] 7-day / 30-day return — **do not build a bespoke event for this.** PostHog computes retention natively from the identified pageviews/events already being sent; this needs correct use of PostHog's Retention insight, not new instrumentation. Revisit only if a dashboard card or lifecycle email needs a server-computed trigger, which is a different, larger feature (same shape as the existing Day-7 email cron).

**2. Lightweight feedback on recommendations — not started**

New small component next to the next-move card ("Does this feel realistic?"
/ 3 buttons / one event), separate from `FeedbackWidget.tsx` (that one is a
user-initiated free-text bug/feature form — different use case). Ships once
`funnel_next_move_viewed` has been live long enough to know the card is
actually being seen.

**3. Rules engine — extend `topTasks`, don't rebuild it**

- [x] Impact ranking (`impactYears`)
- [x] Safety-first override (emergency fund priority)
- [ ] Confidence weighting (manual-entry numbers vs. Plaid-verified)
- [ ] Ease/effort score per move type
- [ ] Sort by impact × confidence × ease instead of impact × priority alone
- [ ] "Maybe, show another" branch — swap in the next-ranked task instead of repeating the same one

**4. Monthly check-in — new Home card, not a nav change**

See the IA note below first. Compares the month's actuals (already tracked
via Cashflow) against the plan, using the rules engine's output. This is the
piece that makes the loop monthly instead of one-time.

**IA note — flagged, not resolved:** an earlier version of this loop proposed
`Home / Plan / Money / Tools / Check-in` as the nav. That conflicts with
`docs/design/app-structure.md` (confirmed 2026-08-26): `Home / Money / Plan /
Profile`, with an explicit rule that a nav group duplicating existing content
("Learn is not a top-level group... spends a nav slot on something nobody
opens the app to do") doesn't get its own slot. The same reasoning applies to
"Tools" — Scenarios and Expat FIRE already live in Plan. Recommendation:
keep the current nav; "Tools" needs no new group, and "Check-in" is a Home
card (Home's job is exactly this — "interprets the other two, read-only"),
not a fifth top-level destination.

---

## Phase 6 — Scale & Depth 📅

*Goal: Become the default entry point for people who want work to become optional.*

### Product Depth

- [ ] Partner/spouse mode for two-income households
- [ ] Advanced assumptions editor: returns, inflation, withdrawal rate, tax assumptions
- [ ] International expansion improvements for high-demand countries/cities
- [ ] PWA installable mobile experience

### Growth & Platform

- [ ] Referral loop: share a freedom-date insight, not private financial details
- [ ] Partnerships with FIRE creators/newsletters/podcasts
- [ ] Embeddable FIRE/freedom-date calculator for partner sites
- [ ] Public methodology page for SEO and trust

---

## Priority Decisions

John has chosen the next product direction:

1. **Launch path:** Do private/friends beta and soft public launch on Reddit/X before Product Hunt.
2. **Readiness gate:** Use beta/soft-launch quotas before PH: roughly 50 real visitors, 20 completed freedom-date results, 5 feedback replies, and zero critical flow issues. Stronger gate: 100 visitors, 50 completed results, and 10 people willing to support/comment.
3. **Core aha:** Lead with “freedom date + guided plan.” The result should not stop at a number/date; UntilFire should feel like it is doing the journey with the user.
4. **Plaid:** ✅ Confirmed launch feature — Plaid works 100% and is promoted in the dashboard for Product Hunt.
5. **FIRE Type:** Keep quiz as a secondary social/share loop, not the main launch promise.
6. **Monetisation:** ✅ Stripe verified. Free tier: 1 bank + 1 brokerage. Pro unlocks additional connections and AI categorisation. Soft-hide aggressive upgrade prompts until plan adviser is stronger.
7. **Next sprint:** Product Hunt Funnel Sprint — keep copy centered on “UntilFire does it with you,” show the plan/monthly move clearly, keep city/tax as trust proof, QA mobile/no-login flow, update share copy, and prepare launch assets.

---

## Metrics Targets

| Metric | Product Hunt Readiness | 90 Days After Launch | Scale Target |
|---|---|---|---|
| Homepage → calculator start | 35%+ | 40%+ | 45%+ |
| Calculator completion rate | 45%+ | 55%+ | 60%+ |
| Result → save/share/login action | 10%+ | 18%+ | 25%+ |
| Monthly active users | — | 1,000 | 10,000 |
| Registered users | — | 300 | 4,000 |
| Paid subscribers | — | 50 | 800 |
| MRR | — | $450 | $7,200 |

---

## What We're Deliberately NOT Building Yet

- Investment account aggregation as a Product Hunt launch dependency — too much trust/regulatory complexity before PMF
- Tax-loss harvesting advice — requires regulated advice boundaries
- Advisor marketplace — distracts from direct-to-consumer clarity
- Native mobile app — web-first until the funnel and retention are proven
- Heavy budgeting-app parity — UntilFire should show how money choices affect freedom and what to do next, not become another generic budgeting tool
- Login-first onboarding — conflicts with the free/no-login first value promise
