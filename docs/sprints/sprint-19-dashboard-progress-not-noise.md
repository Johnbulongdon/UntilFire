# Sprint 19 — Dashboard Around Progress, Not Noise

**Date:** 2026-05-28
**Status:** ✅ Complete
**Module:** Dashboard → Overview Tab Hero
**Destination:** Reshape the dashboard hero so it leads with freedom date, current status, and top move — not raw financial numbers.

## Problem

The dashboard hero led with "FIRE Target Year" — a label that sounds like a tax form, not a motivating goal. Status (on track / behind schedule) was buried in a mini-stat box where users were unlikely to notice it. The monthly plan card appeared below the "This month" KPI section, making raw numbers the first supporting content instead of the user's progress plan.

## User story

As a returning user opening my dashboard, I want to immediately see my freedom date, whether I'm on track, and what my single best move is — so I feel oriented and motivated before I look at any numbers.

## Done when

- [x] Hero left-side label changed from "FIRE Target Year" to "Your freedom date".
- [x] Status pill (`statusLabel` / `statusColor`) appears inline next to the label in the hero — immediately visible without scrolling.
- [x] "Top move" line appears below the 3 mini-stat boxes, showing `nextMoveScenarios[0].label` in a soft green chip. Hidden when no scenarios are available (income = 0 or no FIRE year).
- [x] `MonthlyPlanCard` moved above the "This month" KPI section — progress plan now appears before raw actuals.
- [x] Section order: Hero → Monthly Plan → This Month KPIs → Highest-Impact Move → Chart.
- [x] `npm run typecheck` passes clean (no new errors).

## Out of scope

- Redesigning the right (dark) side of the hero card
- Removing or de-emphasizing the KPI section
- Personalising the top move copy
- Any changes to `MonthlyPlanCard` internals

## Files changed

| File | Change |
|---|---|
| `app/dashboard/page.tsx` | Hero label → "Your freedom date"; status pill added; top move chip added; `MonthlyPlanCard` moved before KPI section |
| `docs/sprints/sprint-19-dashboard-progress-not-noise.md` | Sprint doc |
