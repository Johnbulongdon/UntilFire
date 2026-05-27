# Sprint 12 — AI Adviser MVP

**Date:** —  
**Status:** 🔲 Planned  
**Module:** AI Adviser → v1.0  
**Destination:** A logged-in user can open the Adviser tab, ask a FIRE question, and get a streamed response that references their actual numbers — not generic advice.

## Problem

UntilFire gives users their FIRE number but doesn't help them act on it. "You need $1.2M" is informative but not actionable. An AI adviser that knows your numbers, city, savings rate, and timeline can give specific, personalised guidance — which is the core $4.99/mo value proposition.

## User story

As a logged-in user who knows my FIRE number, I want to ask questions like "how do I get there faster?" and get advice that accounts for my actual situation — not generic tips I could find anywhere.

## Done when

- [ ] `POST /api/adviser` route created — streams Claude API response via `@anthropic-ai/sdk`
- [ ] System prompt seeded with: FIRE target, years away, savings rate, city, monthly income, investable assets
- [ ] Dashboard gains an "Adviser" tab (5th tab, after Transactions)
- [ ] Adviser tab: message list (user + assistant bubbles) + text input + send button
- [ ] Response streams character-by-character (SSE / ReadableStream)
- [ ] No paywall in this sprint — open to all logged-in users (paywall in Sprint 13)
- [ ] Error state: if API call fails, show "Something went wrong — try again"
- [ ] `npm run build` passes clean

## Out of scope

- Conversation history persistence (session-only, clears on refresh)
- File/document upload
- Suggested prompts (can add later)
- Paywall (Sprint 13)

## Model choice

Use `claude-haiku-4-5-20251001` for low latency + cost. Upgrade to Sonnet if quality is insufficient after testing.

## Files

| File | Change |
|---|---|
| `app/api/adviser/route.ts` | CREATE — streaming Claude API endpoint |
| `app/dashboard/page.tsx` | Add Adviser tab + chat UI component |
