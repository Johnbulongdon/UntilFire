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
- **Plan → Contributions** — targets, drift, the split, the warnings. New.

Rule 6 applies: add the tab to `PLAN_SECTIONS` *and* the deep-link `valid`
array, or it ships unreachable.

## Prices

Already solved. `app/api/plaid/holdings/route.ts` calls
`investmentsHoldingsGet`, which returns `institution_price` and
`institution_value` per security. No market-data vendor and no pricing cron.

Two gaps: Plaid investments will not cover crypto on an exchange or in self
custody, and holdings are fetched live and never stored, so there is no
history to draw drift over time from.

## Data model

- `allocation_targets` — user_id, symbol, target_pct, band overrides, sort.
  Constraint: target_pct sums to 1.
- `holdings_manual` — user_id, symbol, quantity or value, updated_at. For what
  Plaid cannot see.
- `contribution_snapshots` — user_id, month, per-symbol value, current_pct,
  deviation, allocated. Written monthly; this is what makes the history table
  and the drift chart possible.
- `contribution_settings` — budget, frequency, normalise flag.

## Build order

1. **The maths, no persistence.** `lib/contribution.ts` plus the guard. Done.
2. **The tab.** Manual targets and holdings, the split, band warnings.
3. **Import from Plaid.** One button; reconcile by ticker, manual rows for the
   rest.
4. **Persist and snapshot monthly.** Unlocks history and drift over time.
5. **The return hook.** `app/api/email/retention` exists; a monthly "here is
   where October's money goes" plus a Home card. This is the step that earns
   the retention claim.
6. **Frequency.** Weekly and daily entry amounts.

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
