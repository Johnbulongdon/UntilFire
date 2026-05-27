# Sprint 13 — Stripe Subscription + Paywall

**Date:** —  
**Status:** 🔲 Planned  
**Module:** AI Adviser → v1.1  
**Destination:** Free users see an upgrade card on the Adviser tab. Paying $4.99/mo unlocks full access. The subscription is tracked in Supabase and survives page refreshes.

## Problem

The AI Adviser (Sprint 12) is open to all logged-in users. That's fine for testing but not a business. Sprint 13 gates the adviser behind a subscription — turning UntilFire into a product that generates recurring revenue.

## User story

As a free user, I want to understand what the paid tier offers and be able to upgrade in one click — so there's no friction between deciding to pay and accessing the feature.

## Done when

- [ ] Supabase `profiles` table has a `subscribed` boolean column (migration applied)
- [ ] Dashboard load reads `profiles.subscribed` for the current user
- [ ] Free users on Adviser tab see an upgrade card: *"Unlock your AI FIRE adviser — $4.99/mo"* + "Upgrade →" button
- [ ] "Upgrade →" hits `POST /api/stripe/checkout` → redirects to Stripe Checkout
- [ ] Stripe webhook (`/api/stripe/webhook`) marks `profiles.subscribed = true` on `checkout.session.completed`
- [ ] Subscribed users land back on dashboard with Adviser tab fully unlocked
- [ ] Cancellation via `POST /api/stripe/portal` — sets `subscribed = false` on webhook
- [ ] `npm run build` passes clean

## Out of scope

- Trial periods
- Annual pricing
- Multiple tiers
- Proration or plan changes

## Prerequisite

- Stripe product and price ID created in Stripe Dashboard
- `STRIPE_PRICE_ID` env var set in Vercel

## Files

| File | Change |
|---|---|
| Supabase migration | ADD `subscribed boolean default false` to `profiles` |
| `app/api/stripe/webhook/route.ts` | Handle `checkout.session.completed` + `customer.subscription.deleted` → update profiles |
| `app/dashboard/page.tsx` | Read `subscribed` from profile, conditionally gate Adviser tab |
