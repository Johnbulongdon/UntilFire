# Sprint 17 — Result Screen Product Moment

**Date:** 2026-05-28
**Status:** ✅ Complete
**Module:** Landing & Wizard → Result Screen
**Destination:** Turn the reveal from "interesting result" into "useful guidance."

## Problem

The freedom-date reveal is the hook, but it stopped too early. A user could get a result without getting enough help to answer:

- Where do I stand?
- What should I do next?
- Why that move?

If the result feels like only a calculator output, the UntilFire "does it with you" positioning is not yet real.

## User story

As someone who has just seen my freedom date, I want the result screen to tell me what to do next and why it matters — so the product feels like a guide, not only a calculator.

## Done when

- [x] Freedom date / timeline remains the hero of the page.
- [x] A **Your next move** card appears below the identity row.
- [x] The top move is concrete and stage-appropriate:
  - `savingsRate < 5%` + no portfolio → "Open an investment account and automate any amount monthly"
  - `savingsRate < 10%` → "Build a 3-month emergency fund, then invest the surplus"
  - `savingsRate < 20%` → "Capture your full employer match before anything else"
  - `savingsRate < 30%` → "Increase your savings rate by 5 percentage points this year"
  - `savingsRate ≥ 30%` → "Stay consistent — let compounding do the work"
  - FIRE achieved → "Design your withdrawal sequence"
- [x] A short **Why this matters** explanation appears under the move.
- [x] A low-pressure **Track my progress →** link appears in the card (login CTA, not forced).
- [x] A **What moves your date fastest?** compare grid shows 4 pre-calculated scenarios:
  - Save $200 more/month
  - Save $500 more/month
  - Spend 10% less (reduces both savings gap and FIRE target)
  - Earn 10% more (channeled to savings)
- [x] Each compare card shows years/months saved in plain language.
- [x] Compare grid is hidden when FIRE is already achieved.
- [x] `npm run typecheck` passes clean.

## Out of scope

- Full monthly adviser system
- Deep scenario modeling with many controls
- Aggressive login, paywall, or bank prompts
- Reworking the dashboard

## Files changed

| File | Change |
|---|---|
| `app/page.tsx` | Added `cSave200`, `cSave500`, `cSpendLess` scenario calcs; added `topMove` derivation; inserted "Your next move" card and "What moves your date fastest?" compare grid after identity row |
| `docs/sprints/sprint-17-result-screen-product-moment.md` | Sprint doc |
