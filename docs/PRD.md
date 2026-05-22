# UntilFire — Product Requirements Document (PRD)
Last updated: May 2026

---

## Problem Statement

Most people have no idea when they can retire or what "financial independence" actually means for them personally. The tools that exist are either:
- Too complex (ProjectionLab, Boldin) — overwhelming for beginners
- Too simple and generic (online calculators) — use national averages, ignore taxes, ignore real cost of living
- Too expensive ($99–$144/yr) — creating friction before users see any value

**The core insight**: people do not need another calculator that leaves them alone with a number. They need a clear path: what their freedom date is, what to do next, and how each monthly move brings work optionality closer. City and tax assumptions make the answer more credible, but the core product promise is guidance.

---

## Product Vision

> "The fastest way to find your freedom date and get a plan that helps you bring it closer."

UntilFire is the **guided entry point** to FIRE planning: simple enough that someone can get their number in 60 seconds, credible enough that they trust it, and useful enough that they know what to do next. City-level cost and tax assumptions support trust, but the product should be remembered as the adviser that does the journey with you.

---

## Target User

See [PERSONAS.md](./PERSONAS.md) for full profiles. In brief:

- **Primary**: 25–38 year old knowledge workers (tech, finance, healthcare) who earn $70k–$200k, have heard of FIRE, and want to know if it's achievable for them
- **Secondary**: Users who have tried calculators or spreadsheets and still do not know what to do next
- **Tertiary**: International users and digital nomads who benefit from city/cost/tax assumptions as trust and localisation features

---

## Core Features (Current — v1)

### 1. FIRE Calculator Wizard
**5-screen flow: Hero → City → Income → Savings → Reveal**

#### Screen 0: Hero / Landing
- Headline direction: freedom date + guided path, e.g. "Find your freedom date — then bring it closer"
- Single CTA: "Find my freedom date"
- Social proof: user count, market stats
- No login required, no email required

#### Screen 1: City Selection
- Search-as-you-type input filtering 263 cities worldwide
- Dropdown shows city name, estimated annual expenses, FIRE target
- Custom city fallback: if city not found, user can enter monthly expenses manually
- After selection: shows annual expenses, FIRE target (25×), vs. US average comparison card

#### Screen 2: Income Input
- Annual gross income — number input + slider (20k–500k, accepts higher via typing)
- Real-time tax calculation:
  - US cities: 2025 federal brackets + FICA + state tax
  - International: flat effective rate by country
- Displays: gross income, after-tax take-home, monthly take-home, real hourly rate, tax breakdown card

#### Screen 3: Savings Input
- Monthly savings — number input + slider (0–$10k)
- Real-time savings rate calculation and benchmark label (Very low / Average / Good / FIRE pace)
- Progress bar benchmarked against 0%, 20%, 50% savings rates

#### Screen 4: FIRE Number Reveal
- Phase 1 (Calculating): 4 calculation steps light up sequentially (620ms each), progress bar fills to 100%, 800ms pause
- Phase 2 (Reveal): number slams in with spring animation, count-up over 2.2s, orange glow effect
- Shows: FIRE target ($), freedom date/year, optional age, and city/methodology context
- "Your spending is costing you X years" or equivalent freedom-impact statement
- Guided next move: one clear monthly action that shows how the date moves closer
- Supporting delta cards: cut dining, save more, earn more, invest bonus
- CTA: save or continue the plan after the no-login aha moment

### 2. Dashboard (Logged-in)
- Supabase auth (Google OAuth)
- Projection chart (Recharts)
- Expense tracking / log
- FIRE plan display

### 3. Waitlist
- Email capture for AI roadmap feature
- POST /api/waitlist → stored in Supabase

---

## Feature Requirements by Priority

### P0 — Must work perfectly (live now)
- [ ] City search returns correct results for all 263 cities
- [ ] Custom city fallback correctly sets `state.col = monthly × 12`
- [ ] FIRE number calculation is mathematically correct (25× rule, 7% return, compound growth)
- [ ] Tax calculation is accurate for US cities (federal + FICA + state)
- [ ] FIRE reveal animation plays on every visit to screen 4
- [ ] "Continue" button disabled until city/income/savings selected
- [ ] Auth redirect: logged-in users skip wizard and go to dashboard

### P1 — High priority (next sprint)
- [ ] Stripe integration — $4.99/mo Pro tier
- [ ] Email onboarding sequence for new signups (Resend)
- [ ] Share my FIRE number — native share / clipboard copy card
- [ ] Google Search Console + analytics setup

### P2 — Medium priority (next quarter)
- [ ] AI roadmap feature (personalized monthly FIRE plan)
- [ ] City-specific SEO landing pages (`/fire-number/austin-tx`, `/fire-number/london`) framed as acquisition/trust pages, not the core product promise
- [ ] Mobile-optimized experience audit
- [ ] Scenario simulator (cut expenses / boost income sliders on reveal screen)

### P3 — Future
- [ ] Mobile app (React Native or PWA)
- [ ] Social comparison ("your FIRE number vs. others in Austin")
- [ ] Existing savings input (current portfolio balance)
- [ ] Monte Carlo simulation
- [ ] Partner/spouse mode

---

## Non-Goals (deliberately out of scope for v1)
- Investment account aggregation (Plaid) — adds regulatory complexity
- Tax-loss harvesting advice
- Social Security optimization
- Estate planning
- Advisor marketplace

---

## Success Metrics

| Metric | Target (6 months) |
|---|---|
| Monthly active users | 10,000 |
| Calculator completion rate | >60% (hero → reveal) |
| Waitlist signups | 2,000 |
| Paid conversions (at launch) | 200 users |
| MRR | $1,800 |

---

## FIRE Calculation Methodology

```
FIRE Target = Annual Expenses × 25   (the "25× rule" / 4% safe withdrawal rate)

Annual Expenses = city.col (our estimated annual living cost for that city in USD)
                OR user-entered monthly expenses × 12 (custom city)

Years to FIRE:
  Starting balance = $27,400 (assumed existing savings)
  Each year: balance = balance × 1.07 + (monthly savings × 12)
  Loop until balance ≥ FIRE Target or 65 years

Tax (US cities):
  Federal: 2025 brackets with $15,000 standard deduction
  FICA: 6.2% SS (up to $176,100) + 1.45% Medicare + 0.9% Additional Medicare (>$200k)
  State: flat effective rate by state

Tax (international):
  Single flat effective rate by country
  No FICA equivalent applied
```

---

## Design System

| Token | Value |
|---|---|
| Background | `#08080e` |
| Card | `#13131e` |
| Elevated | `#1a1a28` |
| Border | `#1c1c2e` |
| Text | `#e8e8f2` |
| Text muted | `#6e6e8e` |
| Accent (orange) | `#f97316` |
| Teal | `#22d3a5` |
| Danger | `#ef4444` |
| Purple | `#a78bfa` |
| Font display | Syne (700, 800) |
| Font body | DM Sans (300, 400, 500) |
| Font mono | DM Mono (400, 500) |
