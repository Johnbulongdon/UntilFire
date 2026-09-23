# Next contribution

Where this month's money goes. Ports a spreadsheet the founder already uses
every month into the product, as a recurring reason to open it.

## Why

Retention is the weakest link in the funnel: once you have your freedom date
there is no reason to come back until something changes. This gives a monthly
one, and it extends the promise the landing page already makes — "and the
moves that bring it closer". Allocating this month's contribution *is* a move.

It is also a natural Pro feature, and it is the first surface where the
product tells you to do something specific with money.

Call it **Next contribution**, not "rebalancing" — it is what the user wants
to know, in their own words.

## The model

Per asset, per period:

```
currentPct = value / total
deviation  = targetPct − currentPct          (percentage points)
standard   = targetPct × budget              (the untilted split)
adjusted   = standard × (1 + deviation)      (deviation read as a fraction)
```

An asset 10.4pp under target receives 10.4% more than its plain share.

This is a **proportional nudge, not a rebalance**. An asset far over target
still gets something, just less. In the sheet's December row BTC was 60pp
over target and still received $5, where a gap-filling rebalance would have
given it nothing. That is gentler, it keeps every position accumulating, and
it is what the founder's own process does, so it is kept.

`lib/contribution.ts` implements it. `scripts/verify-contribution-plan.mjs`
checks it against four real rows from the sheet, to the dollar.

## Two places this departs from the sheet

**1. The total is normalised to the budget.** Each leg is tilted
independently, so nothing pulls the sum back: the sheet's $100 December
budget produced $114 of instructions, and May produced $128. Normalising
scales every leg by the same factor, so the tilt survives exactly while the
total is spendable. You cannot follow an instruction to invest $114 when you
have $100.

**2. Bands use the 5/25 rule, not a flat ±5pp.** An asset is out of band when
it is off by 5 percentage points *or* 25% of its own target, whichever is
tighter.

| target | absolute ±5pp | relative ±25% | band used |
| ------ | ------------- | ------------- | --------- |
| 45%    | 40–50         | 33.8–56.3     | **40–50** |
| 20%    | 15–25         | 15–25         | they meet |
| 3%     | −2–8          | 2.25–3.75     | **2.25–3.75** |

A flat ±5pp band is unusable at small weights: on a 3% target it spans −2% to
8%, so it can never report "too low" and tolerates nearly 3× the target before
it reports "too high". A flat relative band is unusable at large weights,
where ±25% of 45% is ±11pp. The tighter of the two gives every asset a
proportionate leash, which was the explicit requirement — treat small and
large holdings equally. The rules cross at exactly a 20% target.

Per-asset overrides are supported, so a deliberate manual band (the sheet has
ETH at 2–8 on a 5% target) survives as an override rather than the default.

## Where it lives

`docs/design/app-structure.md` rule 5: a feature that fits two groups is two
features.

- **Money → Net Worth** — what you hold. Largely exists.
- **Plan → Contributions** — targets, drift, the split, the warnings. Implemented
  in the 22–23 September commits; repository status is not production verification.

Rule 6 applies: keep the tab in `PLAN_SECTIONS`, its sidebar group membership,
and the deep-link `valid` array, or it becomes unreachable or loses navigation state.

## Prices

Already solved. `app/api/plaid/holdings/route.ts` calls
`investmentsHoldingsGet`, which returns `institution_price` and
`institution_value` per security. No market-data vendor and no pricing cron.

Two gaps: Plaid investments will not cover crypto on an exchange or in self
custody, and holdings are fetched live and never stored, so there is no
history to draw drift over time from.

## Data model

Two stores, not the four tables sketched when this was first planned. 0037 set
the precedent and the reasoning holds here: a thing that is exactly one per
user and is a *preference* goes on `profiles`, where the row already exists
and the RLS is already right. Only the thing that is many-per-user and is a
*record* earns its own table.

- `profiles.contribution_plan` (JSONB) — targets, holdings, budget, frequency.
  One per user, overwritten wholesale. NULL means never set up, which is not
  the same as an empty plan.
- `contribution_snapshots` — user_id, month, total, budget, per-asset detail.
  Unique on (user_id, month), upserted, so a second visit in a month updates
  it rather than adding a row.

Shipped as `0041_contribution_plan.sql`.

Snapshots are written when the tab is opened, not by a cron. There is no
server-side price source to run a cron against — holdings are priced by Plaid
at request time — so a month nobody opens the tab in has no row and cannot be
reconstructed afterwards. That gap is a property of the design, not a bug to
paper over.

## Build order

1. **The maths, no persistence.** `lib/contribution.ts` plus the guard. Done.
2. **The tab.** Manual targets and holdings, the split, band warnings. Done —
   `app/dashboard/ContributionsTab.tsx`, persisting to localStorage.
3. **Import from Plaid.** One button; reconcile by ticker, manual rows for the
   rest. Done. Matching is case-insensitive, one ticker held across several
   accounts is summed, and positions with no ticker (cash sweeps, some funds)
   are reported rather than dropped — their value would otherwise shift every
   percentage on the screen without appearing anywhere.
4. **Persist and snapshot monthly.** Done. Everything typed on the page is
   saved — the allocation, the budget, and the ladder's own inputs (employer
   match, tax-advantaged room, the cheap-loan overpayment, the debts, which
   rungs are switched off, and the three overrides). Whichever copy was
   written later wins: the account write is debounced, so leaving the tab
   mid-edit cancels it and the local copy is a keystroke ahead, and handing
   that user back the older plan is the thing this is here to prevent.
   Whichever wins is pushed to the account. Every call treats a missing column
   or table as "no cloud plan", so the tab keeps working off localStorage
   until the migration is applied.

   The two account-backed figures each carry a choice, because the app
   knowing a number is not the same as it knowing which number you mean.
   Cash is not one pot: the emergency fund reads from savings and money
   market, never a current account (this month's spending) or brokerage cash
   (waiting to be invested), and the user can tick exactly which accounts
   count — `lib/emergency-fund-accounts.ts`, guarded by
   `test:emergency-fund-accounts`. Needs vary month to month, so the expenses
   field follows the last complete month by default, or the average, or a
   number the user sets. A stored account list whose ids no longer match
   anything falls back to savings rather than reporting a buffer of zero:
   relinking a Plaid item reissues every id.

   Two more details that are easy to get wrong. An override is `null` when it
   is following the account, not the account's current number — storing the
   number would freeze the emergency fund at last month's balance and quietly
   stop tracking. And nothing is written until the user changes something, so
   the worked example is never stored as if it were their plan.
5. **The return hook.** Half done. The Home card ships —
   `app/dashboard/NextContributionCard.tsx`, registered in
   `lib/dashboard-layout.ts` — so opening the app shows this month's step
   without going looking for it. It is read-only per the Home rule and shares
   its derivation with the Contributions page
   (`lib/contribution-ladder.ts`), because a card naming a different step
   from the page it links to is worse than no card. Still missing: the
   monthly email. `app/api/email/retention` only sends day-1/3/7 onboarding
   nudges, so nothing yet reaches someone who has not opened the app.

   The loop also depended on a fix nowhere near either screen. Plaid's sync
   wrote `tags: []` on every import and the user's need/want rules were only
   applied at the moment they were set, so next month's groceries arrived
   untagged and the measured needs figure read low — which makes the
   emergency-fund target too small and sends money past a buffer the ladder
   believes is nearly full. The sync now applies the rules
   (`lib/classification-rules.ts`), never overwriting a tag the user set.
6. **Frequency.** Monthly/weekly/daily allocation output is implemented via the
   "Buy in" selector and `planContribution`; the budget input remains
   "Contribution per month". Entering a weekly/daily budget directly is still
   a follow-up, distinct from the existing per-period output.

## The open question

Steps 1–4 only execute an allocation the user chose: they answer "how do I hit
my own target", never "what should I own". The founder's decision is that the
product should go further and also suggest allocations and rank assets, behind
a disclosure the user accepts.

That is a product decision, and it is theirs. The engineering note attached to
it: in the US, personalised recommendations about specific securities are what
can make a business an investment adviser requiring registration, and the
publisher's exemption covers impersonal, general advice. An accept-to-continue
disclosure does not convert personalised advice into impersonal advice. The
distinction that matters is whether the output is generic ("a three-fund
portfolio looks like this") or personalised ("you should hold 20% AVDV").

This does not block steps 1–4, which contain no recommendation. It should be
settled with a lawyer before step 5 puts anything in an email.
