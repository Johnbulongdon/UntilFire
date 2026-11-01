# UntilFire — Product Roadmap

## Current priorities

**Last updated:** 27 October 2026 (Asia/Shanghai). **Owner:** John.
**Goal:** A trustworthy financial-clarity experience people return to and will pay
for, working toward **$3k MRR**. Positioning: see [CONTEXT.md](CONTEXT.md).

This is the shared task queue for every agent (D-110). Now has **at most three**
priorities, not three tasks per agent. Queued items are remembered, not permission
to start unrelated work. Status here describes evidence, not live verification.

### Now — three active priorities, in order

| ID | Priority | Status / owner | Done when | Blocker / next action |
| --- | --- | --- | --- | --- |
| N1 | Roll out the approved positioning | In review; Claude — branch `claude/project-thread-yhurmt`, 29 October | Homepage, metadata, social preview and email footer match D-109; affected mobile/desktop layouts checked. Review video/teaser wording too. | Repo guidance merged in PR #316. Homepage and social image changed with Next Horizon (PR #323). Remaining old slogan in search/social titles and descriptions, structured data, web app manifest, email footer and demo video script replaced 29 October (John: "update slogan everywhere"). Google Play listing text lives outside the repo and still needs John to update it in Play Console. |
| N2 | Verify the complete first-use journey | In review; Codex — [PR #322](https://github.com/Johnbulongdon/UntilFire/pull/322), 27 October | Onboarding → useful first result → signup → bank connection → dashboard checked; numbers agree, saved state survives reload, next action is clear; failures recorded and critical ones resolved. | PR #319 is merged. Refund/account-save repair [PR #320](https://github.com/Johnbulongdon/UntilFire/pull/320) remains in review with its migration unapplied. Financial repairs [PR #321](https://github.com/Johnbulongdon/UntilFire/pull/321) merged as 5b5d3e3; GitHub reports successful website deployment and the live dashboard bundle contains the new bridge guard. The financial merge also published a successful phone preview update. Current subtask: align the welcome actions (X4), verified and in review in PR #322. Full live journey QA remains pending. Bank connection stays optional before first value. |
| N3 | Test with five target users | Planned; John recruits, agent supports | Five busy early-career target users observed; comprehension, useful moment, friction and expected reason to return recorded privately, with anonymized conclusions here. | Recruit while N1/N2 progress; do not expose users to known critical flow failures. Ask permission before any outreach. |

1 November: N2 subtask — Codex is implementing the approved Accounts & tools / focused Plan setup loop and member provider referrals in [PR #354](https://github.com/Johnbulongdon/UntilFire/pull/354). Current yellow/pastel style; actual invitation attribution selects reviewed member links. Creator-flow audit repairs: direct provider-link setup entry, preserved member invite code on creator upgrade and retryable creator lookup failures. Implementation in review; additive migration, programme review/activation, installed-device handoff acceptance and release remain pending. No fourth Now item.

29 October: John asked for all website interaction-audit fixes ("fix all"); handled as a reliability interrupt within N2 because a failed plan load could overwrite saved data. In review on branch `claude/project-thread-x6thrn`; audit in project files `untilfire/web-interaction-audit-2026-10-29/`. No fourth Now item is created.

29 October: John asked for the city pages to match Next Horizon (mock approved in thread, "go"). Handled within N1 on branch `claude/project-thread-yhurmt`: single city pages, the city share image (previously 404) and geo-arbitrage pages. Ranking and state share images had the same non-route file problem; fixed with the website audit (branch `claude/project-thread-jpmkcz`, PR #330).

31 October: John asked for all Transactions audit fixes ("fix all in suggested order"; audit in project files `untilfire/transactions-audit-2026-10-31/`). Financial correctness interrupt within N2; In review on branch `claude/project-thread-kdu44b`. Home, Budget and phone parity for D-130 is the follow-up.

31 October: John asked for a simpler bank-file import (D-127; mock approved, "build it"). Website only, In review on branch `claude/project-thread-arorlm`; outside Now/Next as a John-requested feature, no Now item displaced.

29 October: John asked for the 50/30/20 starting budget (D-106 follow-up; mock approved, "build"). Website only, In review on branch `claude/project-thread-v7mf9g`; outside Now/Next as a John-requested feature, no Now item displaced.

27 October: John authorized these reproduced persistence repairs within N2. They take precedence over N1 runtime copy until reviewed; N1 remains Ready and N3 remains Planned. No fourth Now item is created.

Reliability, financial correctness, security and billing blockers may interrupt
this order. Record the reason and which Now item is displaced; do not silently
create a fourth active priority. Existing authorized work is not canceled by this
queue: reconcile its scope and dependencies before starting overlapping changes.

30 October: John selected landing-page option 2 (centered hero and connected product example), with a dedicated wrapping directory-badge area. N1 design follow-up, Codex, [PR #331](https://github.com/Johnbulongdon/UntilFire/pull/331) on `codex/landing-connected-preview`; production build and local desktop/phone design QA passed (see design-qa.md). Review http://127.0.0.1:4203/ before merge. Preserve onboarding, metadata and directory links. Follow-up: remove the landing FAQ/article appendage and end with grouped calculator, city-guide, Learn/account and legal navigation as John requested. John subsequently approved the connected closing/footer and continuous review rail, requested removal of its visible controls/dots, and explicitly authorized build and merge. D-118 records scope; genuine review content is still pending and the public review list remains empty.

### Next — ordered follow-ups

| ID | Task | Start condition / done when |
| --- | --- | --- |
| X4 | Align the Android welcome-screen sign-in button | In review; Codex — [PR #322](https://github.com/Johnbulongdon/UntilFire/pull/322), explicitly authorized 27 October within N2. The welcome route requested the compact Button variant for I already have an account. Removed only that prop: both actions now stretch to the same width, use a 56-point face, 18-point radius and 17-point label, while secondary styling and navigation remain intact. Actual component output, phone types and changed-file lint passed. Review/merge and physical-device screenshot verification pending. |
| X1 | Fix the biggest repeated user obstacle | After N3 supplies evidence; prioritize observed friction, then verify the fix with affected users. |
| X2 | Check actual return behavior | Follow up about a week after each session and around payday; record whether users returned, what triggered it and why others did not. Payday is a hypothesis, not a new feature requirement. Use existing retention analytics where sufficient. |
| X3 | Verify paid conversion, then expand acquisition | Verify checkout, subscription activation and entitlement persistence before relying on paid conversion. Resolve critical billing failures immediately under N2; broad promotion waits for first-use reliability and evidence of repeat value. |

### Later — remembered, not active commitments

- **Conditional growth:** Product Hunt, Reddit/X, Show HN, partnerships and referral
  experiments. Existing evidence and plans remain below; recheck readiness before launch.
- **Product depth:** stronger deterministic next-move guidance, contribution email,
  scenarios and supported location research, only where user evidence warrants it.
- **Deferred expansion:** extra planning tools, extra onboarding questions, an AI
  advice layer and broad promotion. Revisit after the first-use/return tests.
- **Existing backlog:** the detailed phase sections below retain prior ideas,
  implementation notes and constraints. They are a reference, not another active
  queue; unchecked does not mean absent. Review current code before promoting an item.

### Updating this queue

- Before starting, fetch latest main, read Now/Next/Later, inspect open PRs, and
  identify the task ID, owner and scope. Record an in-progress PR link when available.
- Update status, blocker/next action and the date in the same PR as the work.
  Use Planned, Ready, In progress, Blocked, In review, or Completed; include evidence.
  A completed implementation with an unmerged PR stays In review.
- Promote from Next when a Now slot opens and the work is within John's authorized
  scope. Record priority changes and their reason; material direction changes go
  in [DECISIONS.md](DECISIONS.md). Never infer merge/deployment authority from the queue.
- Move completed items into the dated record below with a PR/evidence link and
  update [CHANGELOG.md](../CHANGELOG.md). Keep deferred/rejected items with a short
  reason. Nothing is silently deleted; retain detailed historical plans below.
- Keep respondent identities, finances, raw quotes and research notes private.
  The public repo stores only anonymized conclusions and task status.

### Completed / disposition record

- **1 November 2026 — Completed (pending merge):** buttons and popups style sync;
  old teal/slate popups, browser confirms, public calculator pages and share
  images moved to Next Horizon tokens. Findings and screenshots in project files
  `untilfire/style-sync-audit-2026-11-01/`.
- **27 October 2026 — Completed:** positioning decision and historical slogan
  recorded; [PR #316](https://github.com/Johnbulongdon/UntilFire/pull/316) merged
  as `2a83202`. Runtime copy rollout is N1, not complete.
- **27 October 2026 — Deferred:** broad promotion and new feature expansion until
  evidence from the existing first-use and return experience supports them.

---

## Detailed roadmap and historical planning

The sections below preserve previous plans and checkmarks. **Now / Next / Later
above owns current execution order**, including where an older heading says
“Current Focus” or “Next sprint.” Old metrics, launch dates and verification
claims need refreshing; none of them automatically overrides this queue.

## October 22, 2026 — City savings benchmark follow-up

- [ ] Add typical savings by city to the savings-pace experience once a reliable, comparable source is verified. Research coverage, median versus average, city versus metro boundaries, data year, household versus individual units, and before-tax versus take-home definitions. Label estimates and broader geographic fallbacks explicitly. A resident percentile requires a savings distribution; never infer it from an average or from unrelated income and spending datasets. Until suitable data is available, keep the user's own savings percentage and money left to spend; do not display invented local benchmarks. This is a research and implementation to-do, not approval to publish an unsupported comparison.

**October 20 money update:** safety cash counts toward freedom with separate cash returns (D-95). Spending accounts remain excluded.

**October 20 update:** Home arrangement editing is removed by user request (D-94); use the standard fixed layout.

**October 19 update:** tax estimators are paused by user request pending QA (D-93). Keep income entry in take-home terms; saved tax controls must not affect projections while unavailable.
Last aligned: 24 September 2026 against app `2af3cb8` (focused documentation pass).

This is planning context, not an exhaustive feature inventory or proof of live
correctness. Check code, tests, recent commits and `CHANGELOG.md` before treating
an unchecked item as absent. Existing production-verification checkmarks are
historical reports and were not revalidated in this documentation pass.

Current direction and its rationale live in [CONTEXT.md](CONTEXT.md) and
[DECISIONS.md](DECISIONS.md). The reconciled [launch context](planning/launch-context.md)
prioritises activation/retention before a conditional January 2027 relaunch.
Its historical evidence needs refreshing; code already contains email-capture
instrumentation, so do not infer missing instrumentation from an old audit.
Country SEO is a bounded experiment, not permission to add pages. Older launch
checklists below are historical planning context, not new approval to execute.

---

## Positioning rollout — October 27, 2026

Decision/history recording is complete (PR #316). Remaining runtime copy work is
tracked once as **N1** above; comprehension testing belongs to **N3**.

## Product Direction

**Positioning:** See beyond your balance. Open up your life.

See your whole financial picture, understand your choices, and build toward the life you want.

Founder-approved working copy, 27 October 2026 (D-109); comprehension is not yet validated.

UntilFire connects everyday financial clarity with the life a user wants. A freedom date makes the future tangible, with ongoing guidance: what matters, what to do this month, and how each move brings work optionality closer. Free, no login.

**Core differentiator:** UntilFire does it with you. Most finance tools either hand you a number and leave you alone, or hand you a model you have to interpret yourself. UntilFire should be the path in between: a clear next move, tracked progress, and guidance that keeps working with you toward financial freedom. Since D-73 (October 2026) that continuity is daily: a short Today list of one-tap items so people stay on top of their money without opening every page. Completed days are counted, never streaked.

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
  *2026-09-24 funnel review (counts kept out of this public repo):* most
  people who finish the calculator also reach its result; the losses are
  before starting and after the result. After the result, most of those who
  go on to sign in leave the Google-only sign-in page within seconds, which
  makes a non-Google option the first fix. Repeated short sessions from a
  few devices, most likely testing, inflate landing and mobile counts; open
  the site once per test browser with `?uf_internal=1` to flag them. Each result step is now
  measured (`funnel_reveal_step_viewed`), so drop-off inside the six result
  screens is visible from this date. Email-code sign-in is built and waits on
  Supabase SMTP and template setup before it is switched on (D-18).
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
- [x] Home / Money / Plan navigation, with Profile in the user menu; current destinations are documented in `docs/design/app-structure.md`
- [x] FIRE projection chart and target progress
- Removed 16 August 2026: Monte Carlo "Confidence Check"; no current simulation feature. Any return requires a separately scoped redesign (see `CHANGELOG.md`).
- [x] Cashflow transaction tracker
- [x] Custom categories and sub-categories using localStorage
- [x] Recurring planner with include/exclude toggles and detection from transaction history
- [x] Reports: income vs expenses, category breakdown, month-by-month table
- [x] Multi-currency dashboard display with fallback FX rates
- [x] Profile account settings and FIRE personality/type; planning assumptions (including target city) moved to Plan on 18 September

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
- [x] Daily automatic refresh of every connection (`/api/cron/plaid-sync`, 09:00 UTC), logged in `job_runs`; holdings requested only from connections with an investment account (D-16)
- [ ] Plaid webhooks (`SYNC_UPDATES_AVAILABLE`) if once a day proves too slow — see D-16
- [x] Plaid billing leaks closed: account deletion and disconnect remove the connection at Plaid before our row; Investments only where an investment account is picked (D-17)
- [ ] Revisit Pro price at 20–50 paying users or if Plaid costs pass ~40% of net Pro revenue (D-17)

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

- [ ] Product Hunt tagline: "See beyond your balance. Open up your life." (D-109; replaces the former slogan recorded in the decision log).
- [ ] Product Hunt short description: "See your whole financial picture, understand your choices, and build toward the life you want."
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
- Historical city-expansion proposal superseded by the bounded SEO experiment
  in [launch context](planning/launch-context.md); do not create more pages from this checkbox
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
- [ ] Evaluate match-once recurring tracking against current Cashflow → Upcoming
  (`ExpectedPaymentsTab.tsx`); the former standalone Recurring tab was folded in,
  so the old proposal is not an instruction to rebuild that tab
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
- [x] "This month: invest $300 more and your freedom date moves 4 months closer" style recommendations — shipped as the "Your month" check-in card on Home (`DashTab`), synthesizing `consistencyMonths` (last month's actual result) and `topTasks[0]` (this month's move) into one verdict; dismissible per calendar month via `uf_checkin_dismissed_YYYY-MM`
- [ ] Explain tradeoffs clearly: impact, difficulty, confidence, and why it matters — impact exists (`impactYears`); difficulty and confidence do not yet
- [ ] Keep recommendations grounded in user data and editable assumptions
- [x] Monthly Home check-in card and matching Next contribution card (see below)
- [ ] Monthly progress/contribution email — existing retention emails do not implement this loop

### Next contribution — implemented 22–24 September 2026

Implementation status below is grounded in commits `96e9d63` through `2af3cb8`;
it does not certify production deployment, migration state, or browser QA.
See `docs/design/next-contribution.md` for the model and caveats.

- [x] Plan → Contributions: budget-normalised allocation tilt, 5/25 drift bands
  and per-asset overrides; manual targets/holdings and Plaid holdings import
- [x] Saved allocation and ladder inputs, local/account reconciliation, and
  monthly snapshots on tab visits (not a cron; unvisited months have no snapshot)
- [x] Priority ladder, account-derived inputs, and explicit emergency-fund account
  selection; distinguish following an account from a manual override
- [x] Home Next contribution card shares the ladder derivation with Plan
- [x] Plaid sync applies need/want classification rules without overwriting user
  tags, keeping future imports in the measured-needs base
- [ ] Production verification of this Contributions flow and persistence
- [ ] Monthly contribution email
- [x] Separate "Money arrives" schedule and "Buy in" allocation frequency
- [x] Cash-based contribution amount with marked manual override; dated ledger,
  recurring income/bills and the cycle low point determine the safe amount
- [ ] Resolve named allocation/asset suggestions with legal input before shipping;
  do not treat executing user-chosen targets as approval for recommendations

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
- [x] `funnel_next_move_opened` — fires when the "Your month" check-in card's CTA is clicked, which scrolls to and opens the top-tasks card; the click target this event was blocked on
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

**4. Monthly check-in — new Home card, not a nav change — shipped 2026-08-29**

Compares the month's actuals (already tracked via Cashflow) against the
plan, using the rules engine's output — the "Your month" card on Home
(`DashTab`, above the freedom-date/best-move row). No nav change, per the IA
note below. Not yet done: a monthly email version (dashboard card alone
satisfies this item; email is separate, still unchecked under Core Adviser
Feature above) and the feedback widget in stage 2 below.

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

- [x] Household mode: partner invitation/disconnect, combined Home view,
  confirmed shared-account deduplication, and shared Pro entitlement (18 September;
  `b6a3cd0`, `c1ffdb6`). See changelog for boundaries and verification context.
- [ ] Advanced assumptions editor: returns, inflation, withdrawal rate, tax assumptions
- [ ] International expansion improvements for high-demand countries/cities
- [x] PWA manifest/service worker and Android TWA scaffold (`9fe27fc`, `dcc3395`)
- [ ] Verify install/device experience and store-publication status separately

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

29 October — N2 subtask: John approved the complete Next Horizon rebrand across public web, onboarding, app, native and admin. In review; Codex — [PR #323](https://github.com/Johnbulongdon/UntilFire/pull/323), branch `codex/next-horizon-rebrand`. Reviewed surfaces and automated checks pass; authenticated admin visual review and physical-phone/store-build verification remain the next release checks. Logo exports and current contract: `public/brand/`, `docs/design/design-system.md`. Typical city savings remains a research to-do. No production release claimed; native assets require a store build.

29 October N2 follow-up — Codex: lighter category palette B selected and implemented on the rebrand branch; mapping preserves legacy category hue families. Standalone high-resolution payday C remains a design review, pending John’s choice. No change to payday calculations or release status.

29 October N2 refinement — John approved payday C without a bottom slider. Codex implemented the real web and phone cards with above-chart details, per-bill selection and direct chart inspection. Shared same-day/empty/shortfall checks pass; browser/phone verification is in progress. No production or phone release authorized.

29 October N2 verification update — category B / payday C: web production build, types, changed-file lint, iOS/Android/web export and focused financial/presentation regressions passed. Real component desktop/390px, direct mouse drag, keyboard, shortfall and empty states checked with fictional data. Physical device touch QA remains pending; changes are local on the review branch, not released.

29 October N2 browser follow-up — Codex: interactive example plan, directional question transitions, selection/press/focus feedback, stable section transitions, Money loading placeholders and live savings feedback implemented locally. Exact decimal slider restoration fixed during QA. Landing/onboarding and Home/Money/Plan/Profile fit at 390px; no signed-in financial data changed. See docs/design/design-qa.md for evidence and limits. Native pace precision parity, physical-touch/Safari/screen-reader checks remain follow-ups. No release authorized.

29 October N2 browser verification completed — final production build and focused regressions passed; loaded landing/onboarding at 390px and 1280px, signed-in four main sections at 390px, input focus, exact decimal undo and Plan disclosure checked. Review evidence in docs/design/design-qa.md. Changes are local on the review branch and have not yet been committed/pushed to PR323. Safari, physical touch and screen-reader coverage remain pending.

### October 29 onboarding feedback follow-up
- Implemented locally: whole-number improvement control, today-dollar target, hidden Skip, corrected city selection/currency conversion, visible year grid and shorter reveal, sign-in recovery.
- Keep improvement in the journey until a definite removal decision.
- Before release: fresh Google sign-in on the canonical production origin and physical-device QA; existing local signed-in session was verified read-only.

### N2 — marked calendar follow-up, 29 October
Owner: Codex. Implemented locally under the existing rebrand review (PR #323), not yet pushed or released. Replace both browser calendar presentations with selected B. Calendar date/recurrence/selection/refund tests pass; desktop and narrow browser checks in progress. Native app calendar styling remains outside this browser-only change; financial engines are unchanged.

N2 release update — 29 October, Codex: John authorized website publication of PR #323 plus the accumulated approved refinements. Calendar repair removes bank-history markers and preserves scheduled occurrence dates, with regression coverage added to Financial consistency CI. Full release validation and production deployment verification in progress; no separate database migration or store submission.

30 October landing follow-up within N1: selected conversion options 1/2 implemented, option 3 rotating layout scaffold verified locally; actual approved testimonials and portraits pending. Normal/public landing hides an empty story list; explicit localhost-only preview uses labeled placeholders. Options 4/5 excluded. No publication authorized or performed.

Landing review-rail follow-up: approved compact mock implemented as continuous looping cards; local desktop, phone swipe, reduced motion and seam navigation verified on e2d1f36. Actual testimonial content remains pending; demo profiles are local-only and labeled. Marketing/promotion scope awaits clarification of the user's wording; no external outreach or posting performed.

30 October — N1 landing refinement, Codex, [PR #332](https://github.com/Johnbulongdon/UntilFire/pull/332), `codex/landing-polish`, In review: preserve opening copy; tighten phone hero; clarify slider interaction; show bank-connection plan comparison; improve small controls; quiet directory badges. Baseline f2da67c (merged PR #331). Build, changed-component lint, SEO/start-action checks and desktop/phone visual review passed; docs/design/landing-polish/verification.md records evidence. No production change yet.

30 October — N1, John approved the interactive city globe and requested merge and shipment with the landing refinements (PR #332). Codex implementing on codex/landing-polish from f2da67c; D-120 records the final scope. Validation and final release checks in progress.

30 October — N1 globe automatic rotation follow-up, Codex, codex/globe-auto-spin. Baseline origin/main 16d8904. Implementation and production-build verification in progress; no unrelated open PR overlap found.

31 October — N1 web style consistency, Codex, codex/web-style-consistency. Baseline latest pushed origin/main 4ec5eea. Remaining legacy public, portfolio/export, admin, budget/import and utility surfaces updated; validation and visual review in progress. No overlap with open product/security/native PRs; no merge or publication yet.

N1 web style follow-up: [draft PR #335](https://github.com/Johnbulongdon/UntilFire/pull/335), implementation bf27c01. Build/type/lint and focused guards passed; public browser screenshots verified. Awaiting signed-in visual review, then merge authorization.

31 October N1 PR #335: signed-in Home/Money/Plan/Profile light/dark and phone Home inspected; import/guided budget screens inspected without saving. Corrected Explore/referral dark pastel contrast and pill dialog buttons. Final build passed. Admin visual review blocked by access denial; no auth changes.

31 October N1 payday card polish, Codex, codex/payday-card-polish, baseline main 7b63c78. Actual component updated and Before/After fixture preview available at port 4208. Focused lint, payday and free-to-spend guards passed; final build/review in progress. No merge or deployment yet.

N1 payday polish is In review: [PR #336](https://github.com/Johnbulongdon/UntilFire/pull/336), implementation 4346376. Build/type/lint and chart/cash guards passed; browser before/after and edge-state checks recorded. Awaiting design review; not merged or deployed.

31 October N1/N2 payday refinement — Codex, PR #336: John approved the simplified ledger mock and authorized build/ship. D-124 supersedes the chart polish. Shared everyday-cost estimate, optional visit-only zero cushion, Home Today synchronization and matching phone card implemented. In review until checked and merged; deployment and phone channel promotion tracked separately.

31 October N1/N2 mobile pastel surfaces — Codex, codex/mobile-pastel-hubs, baseline origin/main 28817af. Money/Plan tiles, Profile wells and summary chips adopt approved lighter pastels; dark Plan icon/step contrast repaired. Type/lint/native exports and light/dark component checks pass. Physical-device and signed-in acceptance remain pending; no merge or release yet. See docs/design/mobile-pastels/README.md.

Mobile pastel surfaces in review: [PR #342](https://github.com/Johnbulongdon/UntilFire/pull/342), implementation 944c32d. Final mobile type/lint and Android/iOS/web exports passed. Light/dark actual-component previews recorded; installed-device acceptance and release pending. Author retains ownership.

31 October N1/N2 mobile welcome — Codex, codex/mobile-welcome-product-preview,
baseline origin/main cd78930. Original option 3 selected; implementation and local
verification in progress. Preserve auth/onboarding paths; A/B experiment deferred.
No merge, OTA promotion or store submission requested in this change.

Mobile welcome is in review: PR #340 (https://github.com/Johnbulongdon/UntilFire/pull/340), implementation 66c9e2a. Mobile type/lint and final Android/iOS/web exports passed; welcome actions verified in the rendered preview. Physical-device, light-theme and accessibility-device checks remain pending before phone release. No experiment or release published.

31 October release authorized by John: integrate original welcome #340 and published Android 0.2.1 runtime/configuration #326 through #342. Finish category badge, Plan chart and Today button refinements. Combined checks pass; merge and phone compatibility/promotion verification in progress. No SDK58 or account-safety migration included.

31 October N2 phone entry QOL — Codex, codex/mobile-entry-qol, baseline e00652c. John's first three QOL items implemented: dirty-entry navigation protection, Next/Done and Android keyboard avoidance, account-scoped Activity filter/position memory. Browser caught and resolved a hidden-list zero-offset overwrite; return/remount both retain 461px in the shared-hook fixture. Checks and PR review in progress; no merge/release requested yet. Details: docs/design/mobile-entry-qol/README.md.

Phone entry QOL in review: [PR #349](https://github.com/Johnbulongdon/UntilFire/pull/349), implementation 4a115e2, reconciled head 85d7063. Type/lint/regression and all-platform exports pass; final Android check after main reconciliation recorded in PR. Actual guard/keyboard flow and Activity 461px return/remount verified in local fixtures without customer writes. Physical keyboard/Back/gesture acceptance pending; no merge or phone publication.


1 November N2 connected account-action journey — In review; Codex, [draft PR #354](https://github.com/Johnbulongdon/UntilFire/pull/354): concept approved by John, interactive mock for review. Home keeps one next-move card opening a Plan task; Money owns Accounts & tools, comparison, disclosed referral examples and a return-to-plan setup loop. Current yellow/pastel style explicitly selected. Mock build and four packaging tests pass; desktop/320px/390px browser flows checked. Production integration, owned progress persistence, provider programme review and real inviter-link routing remain pending. See docs/design/accounts-tools-journey/README.md.
