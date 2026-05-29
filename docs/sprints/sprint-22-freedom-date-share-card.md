# Sprint 22 — Freedom Date Share Card

**Date:** 2026-05-29
**Status:** ✅ Complete
**Module:** Landing → RevealScreen → ShareModal
**Destination:** Let users share their actual freedom date — the product's emotional core — not just a FIRE type label or savings benchmark.

## Problem

The share modal offered two cards: "FIRE Type" (e.g. "I'm a Lean FIRE Chaser") and "Savings Benchmark" (savings rate vs average). Both are interesting, but neither surfaces the product's main promise: the freedom date itself. The most emotionally resonant thing a user can share is "My freedom date is September 2038" — it's personal, concrete, and makes someone else ask "how do I find mine?"

## User story

As someone who just saw my freedom date, I want to share that moment with my community — so I can celebrate the milestone and bring others to UntilFire.

## Done when

- [x] ShareModal has a third card: "Card C · Freedom Date"
- [x] Card shows: `My freedom date: [Month Year]` (e.g. "My freedom date: September 2038")
- [x] For already-FIRE users: "I've reached FIRE 🔥"
- [x] Card's share text: freedom date line + work optionality framing + untilfire.com
- [x] Card's privacy disclaimer updated to reflect what IS shared (date) and what is NOT (income, FIRE number, savings)
- [x] Share modal subheading updated to accurate framing: "No income, savings, or FIRE number is ever shared — just the insight."
- [x] Preview card label updates to "Freedom Date" when Card C is selected
- [x] `source=share-date` in share URL for analytics attribution
- [x] `npm run typecheck` passes clean.

## Out of scope

- Generating a custom OG image for the freedom-date share URL
- Storing shared freedom dates server-side
- A/B testing card order

## Files changed

| File | Change |
|---|---|
| `app/page.tsx` | Added `"date"` to `ShareCardKind`; added `freedomDate` + `isAlreadyFire` props to `ShareModal`; added Card C to `shareCards`; per-card privacy strings; updated subheading and preview label |
| `docs/sprints/sprint-22-freedom-date-share-card.md` | Sprint doc |
