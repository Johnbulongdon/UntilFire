# Sprint 05 — Reveal Screen Cleanup

**Date:** —  
**Status:** 🔲 Planned  
**Module:** Landing & Wizard → v1.2  
**Destination:** The reveal screen has one dominant CTA, no confusing waitlist, and a one-sentence explainer that helps beginners understand the FIRE number.

## Problem

The reveal screen has three competing CTAs: "Make this more accurate", "See full wealth projection", and a waitlist form that says "Launching at $4.99/mo" — even though the product is already live. There's no explanation of what the FIRE number means. First-time visitors are confused; the most important action (sign up) doesn't stand out.

## User story

As someone seeing my FIRE number for the first time, I want to know what the number means and have one obvious next step — so I don't bounce trying to figure out what to do.

## Done when

- [ ] One dominant CTA: `"Track your progress to $1.2M — free →"` (uses actual FIRE target)
- [ ] `WaitlistInline` component removed from RevealScreen entirely
- [ ] One-sentence explainer beneath the FIRE number: *"Based on the 4% rule — if you save this amount, investment returns cover your expenses and you never run out of money."* (small, muted)
- [ ] Secondary "← Adjust inputs" button remains
- [ ] Share button remains
- [ ] No dollar amount visible in ShareModal preview
- [ ] `npm run build` passes clean

## Out of scope

- Redesigning the FIRE number animation
- A/B testing CTA copy
- Removing WaitlistInline from other pages (only RevealScreen)

## Files

| File | Change |
|---|---|
| `app/page.tsx` | RevealScreen: update primary CTA copy, add 4% rule sentence, remove WaitlistInline |
