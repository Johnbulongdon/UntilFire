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
| **Money** | What already happened?  | Facts you record. Real, historical numbers. |
| **Plan**  | What might happen?      | Hypotheses you test. Levers and targets.    |
| **Home**  | What does it mean?      | The synthesis of both. Read-only.           |

Home is where you view. Plan is where you make the edits. Results of both flow
back to Home.

## The map

```
Home                          synthesis · read-only
  └ Freedom date · progress · next moves

Money                         what already happened
  ├ Cashflow
  │   ├ Transactions
  │   ├ Recurring
  │   ├ Expected
  │   ├ Categories
  │   └ Budget
  ├ Net Worth
  ├ Debts
  └ Insights

Plan                          what might happen
  ├ Freedom Date
  ├ Scenarios
  ├ Goals
  ├ Expat FIRE
  └ Learn

Profile                       account, not money — lives in the user menu
```

## The placement rules

1. **Money** — if it records something that already happened, it goes here.
2. **Plan** — if it models something that hasn't happened yet, it goes here.
3. **Home** — if it interprets the other two, it goes here. Home never gets its
   own inputs.
4. **Profile** — if it's about the account rather than the money, it goes here.
5. If a feature seems to fit two groups, it is **two features**. Split it.
6. Every tab must be reachable from a nav array. **One array per nav — never a
   hand-kept second copy.**

Rule 6 is not housekeeping. Two hand-kept copies of the Cashflow sub-nav are
exactly how Categories and Recurring became unreachable while still rendering.

## Where the arrays live

All in `app/dashboard/page.tsx`. Adding a tab means adding it to the relevant
array and nowhere else:

- `SIDEBAR_ITEMS` — the three sidebar groups, and which tabs each one owns
  (`activeTabs`, which drives the active highlight).
- `MONEY_SECTIONS` — the Money group's tabs. Feeds both the sidebar sub-nav and
  the horizontal section switch.
- `CASHFLOW_SUB_TABS` — the five Cashflow sub-tabs. Feeds both the sidebar
  sub-sub-nav and the horizontal switcher.
- `MOBILE_PRIMARY_ITEMS` — the four mobile bottom-nav destinations.
- The Plan section switch is still inline in the render, since Plan's items map
  to a mix of tabs and sub-tab states rather than to tabs alone.

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

## Known gap — not fixed by this structure

Regrouping is a *findability* fix. It helps a user who knows what they want.
The reported confusion is a **sequence** problem: the setup checklist hands a
new user four steps and sends them to four different destinations (onboarding
modal → Cashflow → Net Worth → Profile) before any value appears. The app's own
setup flow contradicts its own navigation.

The fix for that is a single guided flow that never leaves Home, with the
sidebar staying quiet until a freedom date exists. Tracked separately.
