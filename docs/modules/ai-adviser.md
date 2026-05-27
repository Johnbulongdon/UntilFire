# Module: AI Adviser

**Current version:** v0.0  
**Status:** Planned (Sprint 12–13)  
**Primary routes:** `/dashboard` (Adviser tab), `/api/adviser`  
**User:** Logged-in · Paid ($4.99/mo)

## What it does

A FIRE-aware AI chat interface powered by Claude. Pre-seeded with the user's actual data (FIRE target, years, savings rate, city, income) so advice is personalised and specific — not generic. Gated behind the $4.99/mo subscription tier.

## Planned version history

| Version | Date | Sprint | Change |
|---|---|---|---|
| v0.0 | — | — | Not built |
| v1.0 | — | Sprint 12 | MVP: chat interface, streaming Claude API, seeded with user FIRE data, no paywall |
| v1.1 | — | Sprint 13 | Paywall: Stripe subscription gate, upgrade card for free users |

## Planned architecture

```
/api/adviser        ← Edge route streaming Claude API (Anthropic SDK)
                       System prompt seeded with: FIRE target, years away,
                       savings rate, city, income, net worth
Dashboard
└── Adviser tab     ← Chat UI (message list + input + streaming)
                       Free users: upgrade card ("$4.99/mo")
                       Paid users: full chat
```

## Key decisions to make before Sprint 12

- Which Claude model? (Haiku for speed/cost, Sonnet for quality)
- Conversation history: session-only or persisted in Supabase?
- System prompt: how much user data to inject?
- Rate limiting: max messages per day for paid tier?
