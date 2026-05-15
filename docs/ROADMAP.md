# UntilFire — Product Roadmap
Last updated: March 2026

---

## Phase 0 — Foundation ✅ (Complete)

*Goal: Working product live at untilfire.com*

- [x] Next.js 15 app deployed on Vercel
- [x] Supabase auth (Google OAuth)
- [x] Basic FIRE calculator (single screen)
- [x] Dashboard with expense tracking
- [x] Projection chart (Recharts)
- [x] Waitlist API (`/api/waitlist`)
- [x] SEO basics (robots.ts, sitemap.ts)
- [x] Domain: untilfire.com live

---

## Phase 1 — Better Calculator ✅ (Complete, March 2026)

*Goal: World-class calculator experience that users want to share*

- [x] 5-screen wizard flow (Hero → City → Income → Savings → Reveal)
- [x] 263 cities worldwide with real cost-of-living data
- [x] Search-as-you-type city dropdown
- [x] Custom city fallback (enter monthly expenses manually)
- [x] Full US tax calculation (2025 federal brackets, FICA, all state rates)
- [x] International tax rates (flat effective rates by country)
- [x] Cinematic FIRE number reveal (slam animation, count-up, glow)
- [x] Delta cards (how small changes affect FIRE date)
- [x] Extracted all data/logic to `lib/fire-data.ts`
- [x] FIRE number display fixed (DM Mono font, proper sizing)

---

## Phase 2 — Distribution & Monetisation 🔄 (Current Focus)

*Goal: Get first 1,000 users, first $1k MRR*
*Timeline: April–June 2026*

### Growth
- [ ] Reddit launch post (r/financialindependence) — post drafted in `docs/LAUNCH_POSTS.md`, post Wednesday March 25 in weekly promo thread
- [ ] Product Hunt launch — planned after initial traction, prep notes in `docs/LAUNCH_POSTS.md`
- [x] Google Search Console setup + domain verified
- [ ] First 5 city SEO landing pages (`/fire-number/austin-tx`, `/fire-number/london`, etc.)
- [x] X account live (@GetUntilFire) — 4-week content calendar ready in `docs/X_CONTENT_CALENDAR.md`
- [ ] Hacker News Show HN post — drafted in `docs/LAUNCH_POSTS.md`

### Product
- [ ] Share my FIRE number — native share card + clipboard copy
- [ ] "Adjust inputs" flows smoothly back to savings screen (currently basic)
- [ ] Income screen: add preset buttons ($50k, $75k, $100k, $150k)
- [ ] Mobile UX audit — fix any layout issues on small screens
- [x] Add existing savings input (current portfolio balance) to FIRE calc

### Monetisation
- [ ] Stripe integration — $9/mo Pro tier
- [ ] Paywall on dashboard: free users see FIRE number but Pro unlocks real-time updates
- [ ] Email onboarding sequence (Resend): Day 1 / Day 3 / Day 7

---

## Phase 3 — AI Roadmap Feature 📅 (Q3 2026)

*Goal: Launch the waitlisted AI feature, drive paid conversions*
*Timeline: July–September 2026*

### Core AI Feature
- [ ] Personalised monthly FIRE action plan based on actual spending
- [ ] "This month: cut dining by $200, you'll retire 4 months earlier"
- [ ] Powered by LLM with spending context from dashboard
- [ ] Waitlist users get early access at locked $9/mo price

### Supporting Features
- [ ] Bank connection via Plaid (auto-import transactions)
- [ ] AI expense categorisation
- [ ] Monthly spending recap email
- [ ] Coast FIRE + Barista FIRE scenario modelling

---

## Phase 4 — Scale & Depth 📅 (Q4 2026–Q1 2027)

*Goal: 10,000 MAU, $10k MRR, become the default FIRE entry point*

### Product Depth
- [ ] Monte Carlo simulation (probability of FIRE success)
- [ ] Scenario simulator on reveal screen (cut expenses / boost income sliders)
- [ ] Partner/spouse mode (two-income household FIRE calc)
- [ ] Social Security income input (for older users)
- [ ] Existing investments input (portfolio balance as FIRE starting point)

### Growth
- [ ] City SEO — 50+ landing pages
- [ ] YouTube / podcast partnership outreach (ChooseFI, Afford Anything)
- [ ] Referral program ("Share with a friend, get 1 month free")
- [ ] International expansion content (China, India, Singapore focused)

### Platform
- [ ] Progressive Web App (PWA) — installable mobile experience
- [ ] API for embedding FIRE calculator on partner sites

---

## Metrics Targets

| Metric | Phase 2 (Jun 2026) | Phase 3 (Sep 2026) | Phase 4 (Dec 2026) |
|---|---|---|---|
| Monthly active users | 1,000 | 5,000 | 10,000 |
| Calculator completions/mo | 600 | 3,000 | 6,000 |
| Registered users | 300 | 1,500 | 4,000 |
| Paid subscribers | 50 | 300 | 800 |
| MRR | $450 | $2,700 | $7,200 |
| Waitlist size | 500 | 2,000 | — |

---

## What We're Deliberately NOT Building (Yet)

- Investment account aggregation (Plaid for investments) — regulatory complexity
- Tax-loss harvesting advice — requires RIA licence
- Social Security optimizer — relevant only for 50+ users (not core persona)
- Estate planning — out of scope
- Advisor marketplace — not aligned with direct-to-consumer positioning
- Native mobile app — web-first until product-market fit is proven
