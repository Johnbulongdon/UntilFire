# Module: FIRE Dashboard

> Historical snapshot retained for context. Prices, feature status, research
> claims, dates and proposed actions below are not current requirements or
> authorization. Start with [project memory](../KNOWLEDGE.md),
> [decisions](../DECISIONS.md) and [current feature contracts](../features.md).

**Current version:** v1.2  
**Status:** Live  
**Primary routes:** `/dashboard`, `/calculator`, `/transactions`  
**User:** Logged-in (Google OAuth via Supabase)

## What it does

The core product — the reason someone creates an account. Shows a user's FIRE progress, wealth projection, budget breakdown, transaction history, and AI-driven insights. The main module that all other modules feed into.

## Version history

| Version | Date | Sprint | Change |
|---|---|---|---|
| v1.0 | — | — | Initial dashboard: Overview (4 KPI cards, progress bar, charts), Budget tracker, FIRE Calculator (projection charts), Transactions tab |
| v1.1 | — | — | TransactionsTab extracted to separate component |
| v1.2 | 2026-04-10 | Sprint 03 | FIRE Score hero: retirement year + countdown as dominant hero element, progress bar inside hero card, net worth + savings rate as secondary stats |
| v1.3 | — | Sprint 04 | Calculator → Dashboard handoff: localStorage prefill pre-populates dashboard on first login |
| v1.4 | — | Sprint 06 | Milestone celebrations: toast notifications at 10/25/50/75% FIRE progress |
| v1.5 | — | Sprint 07 | FIRE date delta: shows how this month's changes moved the retirement date |
| v1.6 | — | Sprint 12 | AI Adviser tab (MVP) |
| v1.7 | — | Sprint 13 | Stripe paywall on Adviser tab |

## Key components

| File | Purpose |
|---|---|
| `app/dashboard/page.tsx` | Full dashboard — all tabs, state management, FIRE engine |
| `app/dashboard/TransactionsTab.tsx` | Transaction logger component |
| `app/calculator/page.tsx` | Detailed FIRE projection (logged-in, full charts) |
| `app/transactions/page.tsx` | Standalone transactions page |

## Tab structure

```
Dashboard
├── Overview   ← main module hero (FIRE date, progress, net worth, SR)
├── Budget     ← set monthly expense targets by category
├── FIRE Calculator ← full projection charts (detailed)
└── Transactions ← log income + expenses
```
