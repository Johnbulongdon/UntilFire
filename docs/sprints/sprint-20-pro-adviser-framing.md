# Sprint 20 — Pro Upgrade: Adviser Framing

**Date:** 2026-05-28
**Status:** ✅ Complete
**Module:** Dashboard → UpgradeModal
**Destination:** Replace the generic feature-list upgrade modal with outcome-led "personal FIRE adviser" copy that matches the product's actual promise.

## Problem

The UpgradeModal led with "Upgrade to Pro" and listed capabilities ("Unlimited bank connections", "Full cashflow tracking") — the language of a SaaS feature matrix. Users who've just seen their freedom date don't need a feature list; they need to understand what changes about their experience if they subscribe. The framing didn't connect to the product's core promise ("UntilFire does it with you").

## User story

As someone who just got their freedom date and wants to keep moving toward it, I want to understand what Pro actually does for me — not what features it unlocks — so I can decide whether $4.99/month is worth it.

## Done when

- [x] Modal headline: "Your personal FIRE adviser" (was "Upgrade to Pro").
- [x] Subtitle explains the promise in plain language: "a monthly plan, real progress, and a path that keeps moving."
- [x] Three outcome-led benefit cards replace the flat feature list:
  - "Monthly plan that moves your date closer" — specific monthly action based on real numbers.
  - "Track progress against your plan" — on-track vs target, freedom date responds.
  - "Auto-sync bank & brokerage accounts" — no manual entry.
- [x] Each benefit shows icon + title + one-line explanation (not a checkbox list).
- [x] CTA button: "Start my adviser plan →" (was "Subscribe now →").
- [x] Price anchor: "less than one coffee" subtext added.
- [x] Checkout flow, Stripe integration, analytics events unchanged.
- [x] `npm run typecheck` passes clean.

## Out of scope

- A/B testing copy variants
- Pricing page update (separate sprint)
- Inline upgrade nudges from specific feature gates

## Files changed

| File | Change |
|---|---|
| `app/dashboard/UpgradeModal.tsx` | Rewrote header, benefit list, and CTA copy; kept all Stripe/analytics logic intact |
| `docs/sprints/sprint-20-pro-adviser-framing.md` | Sprint doc |
