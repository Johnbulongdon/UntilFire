# Sprint 18 — Monthly Discipline Loop

**Date:** 2026-05-28
**Status:** ✅ Complete
**Module:** Dashboard → Monthly Guidance Loop
**Destination:** Solve "staying disciplined" with the smallest useful system.

## Problem

Users understand their freedom date but struggle to stay consistent month after month. Without a simple plan and check-in loop, UntilFire risks feeling like a one-time answer instead of ongoing support.

## User story

As a user trying to get closer to financial freedom, I want a simple monthly plan and check-in flow — so I can stay consistent without feeling overwhelmed or judged.

## Done when

- [x] Dashboard Overview tab shows a **[Month]'s plan** card above the "Highest-Impact Move" section.
- [x] The plan card includes:
  - Target contribution (annualSavings ÷ 12, from projection)
  - "Surplus so far" vs target if transaction data exists
  - 2 stage-appropriate monthly moves (based on savings rate)
- [x] Monthly moves are stage-appropriate:
  - `savingsRate < 10%` → set up automatic transfer + track biggest expense
  - `savingsRate < 20%` → confirm employer match + hit target contribution
  - `savingsRate ≥ 20%` → invest as planned + review expense categories
- [x] Check-in button opens a 3-option response: **Yes, fully / Mostly / Not this month**
- [x] "Yes" → 🎉 done state with streak count
- [x] "Mostly" → ✓ "Progress counts" — affirms partial effort
- [x] "Not this month" → calm recovery flow: "That's okay — what would half look like?" with suggested half-target amount
- [x] Recovery flow links back to the plan view
- [x] Streak persists in localStorage across sessions
- [x] Card does not render if income is 0 (plan is not meaningful without data)
- [x] `npm run typecheck` passes clean.

## Out of scope

- Backend persistence of check-in data
- Push notifications or email reminders
- Gamification beyond the streak counter
- Full AI adviser personalization engine

## Files changed

| File | Change |
|---|---|
| `app/dashboard/page.tsx` | Added `MonthlyPlanCard` component; wired into `DashTab` between "This month" KPI row and "Highest-Impact Move" card |
| `docs/sprints/sprint-18-monthly-discipline-loop.md` | Sprint doc |
