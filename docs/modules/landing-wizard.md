# Module: Landing & Calculator Wizard

> Historical snapshot retained for context. Prices, feature status, research
> claims, dates and proposed actions below are not current requirements or
> authorization. Start with [project memory](../KNOWLEDGE.md),
> [decisions](../DECISIONS.md) and [current feature contracts](../features.md).

**Current version:** v1.2  
**Status:** Live  
**Primary routes:** `/`, `/share`, `/api/og`  
**User:** Anonymous (no login required)

## What it does

The entry point for all users. A 5-screen wizard (city → income → expenses → review → reveal) that produces a personalised FIRE number and retirement date. The share card lets users share a city-level discovery to social media with a dynamically rendered OG image.

## Version history

| Version | Date | Sprint | Change |
|---|---|---|---|
| v1.0 | — | — | Initial 5-screen wizard, FIRE number reveal, basic share modal |
| v1.1 | 2026-04-10 | Sprint 01 | City-discovery share card: `/api/og` edge route, `/share` server page, ShareModal reframed (no dollar amount) |
| v1.2 | — | Sprint 05 | Reveal screen cleanup: single CTA, remove WaitlistInline, 4% rule explainer |
| v1.3 | — | Sprint 10 | Email capture on reveal: anonymous users can save results by email |
| v1.4 | — | Sprint 11 | Social proof row + testimonials on landing page |

## Key components

| File | Purpose |
|---|---|
| `app/page.tsx` | Full wizard + all screen components + ShareModal |
| `app/api/og/route.tsx` | Edge route for dynamic OG image |
| `app/share/page.tsx` | Server component for social share landing page |
| `lib/fire-data.ts` | `calcFIRE()` engine, 263 cities, tax logic |
