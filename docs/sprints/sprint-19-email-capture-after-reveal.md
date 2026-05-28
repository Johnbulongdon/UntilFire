# Sprint 19 — Email Capture After Reveal

**Date:** 2026-05-28
**Status:** ✅ Complete
**Module:** Landing & Wizard → Result Screen
**Destination:** Convert anonymous result viewers into email leads after the aha moment — not before it.

## Problem

Users reach the result screen, see their freedom date, and then leave — with no way to re-engage them. The existing "Save my plan →" CTA requires account creation, which adds friction before trust is fully established. Without a lighter capture mechanism, the first-visit conversion to any ongoing relationship is close to zero.

## User story

As someone who has just seen my freedom date, I want an easy way to save my result and next move without creating an account — so I can come back to it later without pressure.

## Done when

- [x] A "Get this plan in your inbox" card appears at the bottom of the result screen after the disclaimer.
- [x] The card appears only after the result is revealed (inside the `{revealed && ...}` block).
- [x] Card shows: headline, one-line subtext ("no financial details shared, no spam"), email input, submit button.
- [x] On submit: POST to `/api/waitlist` with `{ email }` — existing hardened endpoint.
- [x] Success state: "✓ Your plan is on its way" with the submitted email shown.
- [x] Loading state: button shows "…" and is disabled during submission.
- [x] If the API returns an error (rate limit, etc.), the form returns to idle so the user can retry.
- [x] "No thanks" link dismisses the card for the session.
- [x] Card is hidden after dismiss and after successful submission.
- [x] No financial details (FIRE number, portfolio balance, income) are sent — only the email is captured.
- [x] `npm run typecheck` passes clean.

## Out of scope

- Actually sending an email (requires Resend template + transactional email sprint)
- Storing the freedom date alongside the email in the waitlist row
- A/B testing card copy
- Personalising the email with the user's city or result

## Files changed

| File | Change |
|---|---|
| `app/page.tsx` | Added `emailPhase` + `emailValue` state; inserted email capture card after disclaimer in `RevealScreen` |
| `docs/sprints/sprint-19-email-capture-after-reveal.md` | Sprint doc |
