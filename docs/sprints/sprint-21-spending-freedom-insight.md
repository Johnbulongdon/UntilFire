# Sprint 21 — Spending → Freedom Date Insight

**Date:** 2026-05-28
**Status:** ✅ Complete
**Module:** Dashboard → Overview Tab → This Month KPI Section
**Destination:** Connect the top expense category to the freedom date — make spending data feel relevant to the FIRE goal, not just budget tracking.

## Problem

The "This month" KPI section showed income, expenses, net surplus, and savings rate as raw numbers. The surplus message ("at this pace you'd reach FIRE in {year}") was a good start, but it didn't connect specific spending categories to the freedom date. Users couldn't see which category mattered most for their path to freedom.

## User story

As a user tracking my monthly expenses, I want to see which spending category has the biggest impact on my freedom date — so I know exactly where to focus if I want to get there sooner.

## Done when

- [x] When transaction data exists (`hasActuals`), after the surplus insight line, a second insight card appears showing:
  - The top expense category (highest actual spend) with its icon and name
  - Monthly spend in that category
  - Impact of a 10% cut: "X months/years sooner" (derived from `nextMoveScenarios`'s "cut expenses" scenario)
- [x] Card uses orange accent (`rgba(249,115,22,...)`) to visually distinguish from the green surplus message.
- [x] Hidden when: no actuals, no top category, cut-expenses scenario has zero impact.
- [x] Does not show when no actuals exist (the empty state CTA remains unchanged).
- [x] `npm run typecheck` passes clean.

## Out of scope

- Per-category impact calculations (requires multiple calcFIRE calls per category)
- Expanding the insight to the Reports tab
- Drill-down from the insight to the Cashflow tab

## Files changed

| File | Change |
|---|---|
| `app/dashboard/page.tsx` | Added top-category FIRE impact insight card after surplus message in the `hasActuals` branch of `DashTab` |
| `docs/sprints/sprint-21-spending-freedom-insight.md` | Sprint doc |
