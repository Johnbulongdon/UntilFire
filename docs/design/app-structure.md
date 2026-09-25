# App Structure — the backbone

Confirmed with John on 2026-08-26. This is the spine of the logged-in app. It
exists because the structure kept shifting: features were placed by feel, one at
a time, until `Plan` had become a catch-all holding six unrelated tabs and two
fully built tabs (Categories, Recurring) had fallen out of the navigation
entirely without anyone noticing.

The point of this document is that **placement is decided by a rule, not by
judgement call**, so the next twenty features place themselves.

## The axis

Every surface in the app answers one of three questions. This is the axis —
not "view vs edit", which breaks immediately (Money is editing too).

| Group     | Question                | Contains                                    |
| --------- | ----------------------- | ------------------------------------------- |
| **Money** | What do I have and manage? | Actual finances, operational budgets and upcoming payments. |
| **Plan**  | How can I reach freedom?   | Long-term projections, scenarios, assumptions and targets. |
| **Home**  | What does it mean?         | Synthesis and next moves; no independent financial inputs. |

Money owns actual-finance and operational edits; Plan owns projection inputs.
Both flow back to Home. Home layout customisation (reorder, resize, hide/restore
cards) is allowed and does not introduce a second set of financial inputs.

## The map

```
Home                          synthesis · customisable layout
  └ Freedom date · progress · next moves

Money                         actual finances and operational planning
  ├ Cashflow
  │   ├ Transactions
  │   ├ Upcoming (expected payments, with recurring detection suggestions)
  │   ├ Categories
  │   └ Budget
  ├ Net Worth
  ├ Debts
  └ Insights

Plan                          long-term projections and scenarios
  ├ Freedom Date
  ├ Scenarios
  ├ Goals
  ├ Contributions
  ├ Expat FIRE
  ├ Citizenship
  └ Learn

Profile                       account, household setup, FIRE personality/type
                              lives in the user menu
```

## The placement rules

1. **Money** — actual balances, debts and transactions, plus operational budgets
   and expected payments. It is not limited to the past.
2. **Plan** — long-term freedom-date assumptions, projections, scenarios and
   contribution targets. An upcoming bill belongs in Money, not here merely
   because it has not happened yet.
3. **Home** — if it interprets the other two, it goes here. Home never gets its
   own independent financial inputs. Layout preferences are allowed.
4. **Profile** — if it's about the account rather than the money, it goes here.
5. If a feature seems to fit two groups, it is **two features**. Split it.
6. Every tab must be reachable from a nav array. **One array per nav — never a
   hand-kept second copy.**

### Worked example: the FIRE profile, moved 18 Sep 2026

Age, retirement target city, lifestyle target and tax home sat in Profile
until this date. Every one of them models something that hasn't happened yet,
so rule 2 puts them in Plan — and the card said so itself: *"These assumptions
personalize your freedom date across the dashboard."*

What makes this worth recording is how the app grew around the mistake instead
of fixing it. Plan carried a tile titled **"Profile Assumptions"** whose entire
purpose was a button reading *"Edit in Profile →"*, and Expat FIRE carried a
second one. Its description even rationalised the placement: *"Keep your age,
target city, lifestyle, and FIRE type in Profile so every freedom-date
calculation uses the same source of truth."* Single-source-of-truth needs
**one** edit location; it never required that location to be Profile.

**A tab that needs a permanent link out to account settings to edit its own
inputs is the structure telling on itself.** When you find one of those
buttons, move the input rather than keep the link.

The FIRE *type* stayed in Profile — a personality result is not a projection
input, and the onboarding rules place it outside the planning flow. That split
is rule 5 doing its job: one card was two features.

Rule 6 is not housekeeping. Two hand-kept copies of the Cashflow sub-nav are
exactly how Categories and Recurring became unreachable while still rendering.

## Where the arrays live

All in `app/dashboard/page.tsx`. Update the relevant navigation array and its
group membership, rendering, and deep-link handling together:

- `SIDEBAR_ITEMS` — the three sidebar groups, and which tabs each one owns
  (`activeTabs`, which drives the active highlight).
- `MONEY_SECTIONS` — the Money group's tabs. Feeds both the sidebar sub-nav and
  the horizontal section switch.
- `CASHFLOW_SUB_TABS` — the four Cashflow sub-tabs. Feeds both the sidebar
  sub-sub-nav and the horizontal switcher.
- `MOBILE_PRIMARY_ITEMS` — the four mobile bottom-nav destinations.
- `PLAN_SECTIONS` — Plan destinations, including tab and sub-tab states. Feeds
  both the sidebar sub-nav and mobile section switch.

The `valid` array in the URL-parsing effect must also list any new tab, or it
won't be deep-linkable. `goals` was missing from it for exactly this reason.

## Deliberately decided

- **Learn is not a top-level group.** There is already a full public `/learn`
  (stages, articles, topics). A sidebar group duplicating it splits the content
  and spends a nav slot on something nobody opens the app to do. It sits inside
  Plan, next to the levers it explains.
- **Expat FIRE sits in Plan.** It's a hypothesis tool and a real differentiator.
  Long-term it is arguably a *mode* of Scenarios — "what if I move to Lisbon"
  and "what if I save 5% more" are the same question — and the two will start
  feeling redundant as Scenarios grows. Merge then, not now.
- **Net Worth and Debts moved from Plan to Money.** They record what you have
  today; they are the same kind of thing as Cashflow, not a plan.
- **Which accounts are the emergency fund is set in Net Worth** (D-12). It is a
  fact about an account, so it lives on the Connected Bank Accounts card where
  accounts are organised. Plan → Contributions and Home read it and link back
  rather than offering a second picker.
- **How you compare sits on Home** (D-19). It interprets two things Home
  already has, the net worth it shows and the age set in Plan → Freedom Date,
  so it adds no input; its "Change" link goes to that Plan setting.

## Known gap — not fixed by this structure

Regrouping is a *findability* fix. It helps a user who knows what they want.
The reported confusion is a **sequence** problem: the setup checklist hands a
new user four steps and sends them to four different destinations (onboarding
modal → Cashflow → Net Worth → Profile) before any value appears. The app's own
setup flow contradicts its own navigation.

This is historical problem context, not a fresh audit or permission to add Home
financial inputs. A guided setup flow remains a separate proposal: reconcile it
with current onboarding and input ownership before implementing it. This document
preserves current navigation; it does not authorize a redesign.
