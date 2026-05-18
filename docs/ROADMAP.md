# UntilFire — Product Roadmap
Last updated: May 2026

---

## Product Direction

**Positioning:** Find your freedom date.

UntilFire shows when work can become optional — your FIRE number, your timeline, and the monthly moves that can bring freedom closer. Free, no login.

**North star:** Turn financial independence from an abstract calculator result into a clear, emotional, actionable path: *when can work become optional, and what can I do this month to bring that date closer?*

**Product principles:**
- Lead with the emotional outcome: freedom date, work optional, escape the grind.
- Keep the first value moment free, fast, and no-login.
- Show specific monthly moves, not generic FIRE advice.
- Make calculations feel trustworthy with transparent assumptions, privacy reassurance, and clear methodology.
- Treat the dashboard and Pro tier as continuity after the first aha moment, not a replacement for the free calculator.

---

## Phase 0 — Foundation ✅ (Complete)

*Goal: Working product live at untilfire.com*

- [x] Next.js 15 app deployed on Vercel
- [x] Supabase auth (Google OAuth)
- [x] Basic FIRE calculator
- [x] Dashboard with expense tracking
- [x] Projection chart (Recharts)
- [x] Waitlist API (`/api/waitlist`)
- [x] SEO basics (robots.ts, sitemap.ts)
- [x] Domain: untilfire.com live

---

## Phase 1 — Calculator & Dashboard Base ✅ (Complete)

*Goal: Give users a personalized FIRE answer and a dashboard that can continue the journey*

- [x] 5-screen wizard flow
- [x] 263 cities worldwide with real cost-of-living data
- [x] Search-as-you-type city dropdown
- [x] Custom city fallback with manual monthly expenses
- [x] US federal/state/FICA tax calculation
- [x] International effective tax assumptions
- [x] FIRE number reveal
- [x] Delta cards showing how small changes affect the timeline
- [x] Existing portfolio balance input
- [x] Wizard → dashboard prefill handoff
- [x] Dashboard with Overview, Cashflow, Assets, Liabilities, FIRE Calculator, Reports, and Learning Hub
- [x] Monte Carlo simulation in dashboard
- [x] Multi-currency dashboard display
- [x] Stage-based Learning Hub and SEO calculator hub
- [x] First city SEO landing pages under `/fire-number/*`

---

## Phase 2 — Product Hunt Readiness 🔥 (Current Focus)

*Goal: Make the public product strong enough for impatient launch traffic to understand, try, trust, and share.*

*Launch readiness target: before Product Hunt run*

### Must Fix Before Launch

- [ ] **Fix main CTA path:** clicking the primary homepage CTA must immediately open or scroll to the first calculator step. No dead-feeling click, hidden flow, or repeated CTA.
- [ ] **Align homepage copy with new positioning:** hero should use “Find your freedom date” / “work can become optional” / “monthly moves that bring freedom closer.”
- [ ] **Rename primary CTA:** prefer “Find my freedom date” over “Calculate my FIRE number” for broader emotional pull.
- [ ] **Make first calculator step obvious:** show a clear “Step 1” prompt, input, progress, and continue button above the fold after CTA click.
- [ ] **Show the differentiator visually:** above the fold or on the result screen, show example monthly moves like “Invest +$300/mo → freedom 1.8 years sooner.”
- [ ] **Add trust line near hero/result:** privacy + transparent assumptions + city/tax methodology, e.g. “Private by default. No account required. Built with city-level cost and tax assumptions.”
- [ ] **Mobile QA:** complete full no-login calculator flow on mobile viewport and fix any layout/CTA issues.
- [ ] **End-to-end no-login QA:** homepage → calculator → result → adjust inputs → share/save path must work without account creation.

### Product Hunt Launch Assets

- [ ] Product Hunt tagline: “Find your freedom date in 60 seconds.”
- [ ] Product Hunt short description: “UntilFire shows when work can become optional — your FIRE number, timeline, and the monthly moves that can bring freedom closer. Free, no login.”
- [ ] Maker first comment: personal story + why FIRE tools need to show what to do next, not just a number.
- [ ] 20–40 second demo GIF/video: enter inputs → get freedom date → see monthly moves.
- [ ] 3–5 screenshots: hero, calculator step, result, monthly moves, dashboard continuity.
- [ ] Simple FAQ answers: calculation assumptions, privacy, who it is for, why it is free.

### Shareability & Conversion

- [ ] Result page should produce a shareable insight without exposing sensitive finances.
- [ ] Add copy/share card focused on the freedom date or city insight, not raw net worth.
- [ ] Add “save my result” email capture after the reveal, not before the aha moment.
- [ ] Keep login secondary until after the user has seen value.
- [ ] Track funnel analytics: hero CTA click, calculator start, each step completion, result reveal, share/save/login clicks.

### Acceptance Criteria for Launch Readiness

- [ ] A new visitor can understand the product in 5 seconds.
- [ ] A new visitor can start the calculator in 1 click.
- [ ] A new visitor can reach a useful result in about 60 seconds.
- [ ] The result explains the FIRE number, timeline, and at least one concrete monthly move.
- [ ] The page answers “can I trust this?” before users ask.
- [ ] The launch page has no obvious broken CTA, console error, or mobile layout blocker.

---

## Phase 3 — Distribution & Early Revenue 📈 (After Product Hunt)

*Goal: Convert launch attention into repeat usage, email leads, and first paying customers.*

### Growth

- [ ] Product Hunt launch and follow-up engagement
- [ ] Reddit launch post in relevant weekly promo/community threads
- [ ] Hacker News Show HN post
- [ ] X launch thread from @GetUntilFire
- [ ] City SEO expansion from first pages to 50+ pages
- [ ] FIRE topic pages linked from calculator/result flows
- [ ] Lightweight founder-led content cadence around freedom date, work optionality, and monthly moves

### Product

- [ ] Improve “adjust inputs” flow from result screen
- [ ] Scenario simulator on reveal screen: save more, earn more, reduce expenses, change city
- [ ] Better result explanation for beginners: FIRE number, withdrawal rate, assumptions, timeline
- [ ] Email result summary with top monthly move
- [ ] Dashboard handoff that preserves calculator result and next action

### Monetisation

- [ ] Stripe integration for $9/mo Pro tier
- [ ] Pro value proposition: personal FIRE adviser that tracks progress and gives the one move to make each month
- [ ] Paywall only after free value is delivered
- [ ] Email onboarding sequence: result saved, top move, dashboard reminder, Pro upgrade

---

## Phase 4 — Monthly Moves Adviser 📅 (Q3 2026)

*Goal: Make UntilFire useful every month, not just once.*

### Core Adviser Feature

- [ ] Personalized monthly FIRE action plan based on actual spending, income, city, savings rate, and timeline
- [ ] “This month: invest $300 more and your freedom date moves 4 months closer” style recommendations
- [ ] Explain tradeoffs clearly: impact, difficulty, confidence, and why it matters
- [ ] Keep recommendations grounded in user data and editable assumptions
- [ ] Monthly progress email or dashboard card

### Supporting Features

- [ ] AI expense categorisation with server-side secrets only
- [ ] Recurring income/bill insights
- [ ] Spending reports connected to freedom-date impact
- [ ] Coast FIRE and Barista FIRE scenario modelling
- [ ] Optional bank connection only after trust and retention are proven

---

## Phase 5 — Scale & Depth 📅 (Q4 2026–Q1 2027)

*Goal: Become the default entry point for people who want work to become optional.*

### Product Depth

- [ ] Partner/spouse mode for two-income households
- [ ] Advanced assumptions editor: returns, inflation, withdrawal rate, tax assumptions
- [ ] International expansion improvements for high-demand countries/cities
- [ ] Better projection confidence and scenario comparison
- [ ] PWA installable mobile experience

### Growth & Platform

- [ ] Referral loop: share a freedom-date insight, not private financial details
- [ ] Partnerships with FIRE creators/newsletters/podcasts
- [ ] Embeddable FIRE/freedom-date calculator for partner sites
- [ ] Public methodology page for SEO and trust

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

- Investment account aggregation as a launch dependency — too much trust/regulatory complexity before PMF
- Tax-loss harvesting advice — requires regulated advice boundaries
- Advisor marketplace — distracts from direct-to-consumer clarity
- Native mobile app — web-first until the funnel and retention are proven
- Heavy budgeting-app parity — UntilFire should show how money choices affect freedom, not become another generic budgeting tool
- Login-first onboarding — conflicts with the free/no-login first value promise
