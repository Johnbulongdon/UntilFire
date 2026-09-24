# Module: Calculators Hub

> Historical snapshot retained for context. Prices, feature status, research
> claims, dates and proposed actions below are not current requirements or
> authorization. Start with [project memory](../KNOWLEDGE.md),
> [decisions](../DECISIONS.md) and [current feature contracts](../features.md).

**Current version:** v1.1  
**Status:** Live  
**Primary routes:** `/calculators`, `/calculators/*`  
**User:** Anonymous + logged-in

## What it does

A suite of standalone financial calculators optimised for SEO. Serves as top-of-funnel acquisition — people searching for "APY calculator" or "coast FIRE calculator" land here, understand the concepts, and convert to the main FIRE wizard. Each calculator is statically pre-rendered with full SEO metadata and Schema.org structured data.

## Version history

| Version | Date | Sprint | Change |
|---|---|---|---|
| v1.0 | 2026-04-10 | Sprint 02 | Hub page + 5 calculators: APY, Compound Interest, Savings Rate, Coast FIRE, 4% Rule. Sitemap updated. |
| v1.1 | 2026-04-10 | Sprint 02b | Renamed "4% Rule Calculator" → "FIRE Number Calculator" (better UX + keyword) |
| v1.2 | — | Sprint 09 | Nav coherence: /calculators link added to main nav, cross-links between calculators |

## Calculators

| Route | Name | Primary keyword |
|---|---|---|
| `/calculators` | Hub | "financial calculators FIRE" |
| `/calculators/apy` | APY Calculator | "APY calculator", "APR to APY" |
| `/calculators/compound-interest` | Compound Interest Calculator | "compound interest calculator" |
| `/calculators/savings-rate` | Savings Rate Calculator | "savings rate calculator FIRE" |
| `/calculators/coast-fire` | Coast FIRE Calculator | "coast FIRE calculator" |
| `/calculators/4-percent-rule` | FIRE Number Calculator | "FIRE number calculator", "4 percent rule calculator" |

## Key files

| File | Purpose |
|---|---|
| `app/calculators/page.tsx` | Hub — server component, ItemList JSON-LD |
| `app/calculators/[slug]/page.tsx` | Server wrapper with SEO metadata + structured data |
| `app/calculators/[slug]/[Name]Calculator.tsx` | Interactive client component |
| `app/sitemap.ts` | All calculator URLs at priority 0.8 |
