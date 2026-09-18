# Family (Household) Accounts

Confirmed with John on 2026-08-16. Two partners link accounts and see one
combined FIRE plan — a shared freedom date instead of two separate ones.

## Status check — 17 Sep 2026

Three findings from re-reading this against the live database and codebase.
The product decisions below still stand; these change what is *true* and what
to build first.

### 1. P0 was never applied — resolved, applied 18 Sep 2026

`supabase/migrations/0016_household_accounts.sql` is in the repo, but none of
it reached production. Confirmed two ways:

- `information_schema.tables` has no `households`, `household_members`,
  `household_invites` or `shared_account_links`; `pg_proc` has neither
  `my_household_id()` nor `is_household_peer()`.
- The applied migration ledger jumps straight from `csv_source_file` (0015,
  10 Jul) to `0017_admin_email` (21 Aug). 0016 was skipped.

Nothing was broken by this — no app code depended on those tables. But
anyone reading "P0 — done" would have built P1 on a foundation that wasn't
there.

**Applied 18 Sep 2026**, after a full dry run inside a rolled-back
transaction. Verified in production:

- 4 tables, 2 `SECURITY DEFINER` helpers, 9 peer-read SELECT policies
- **0 peer clauses on any write policy** — the `FOR ALL` split worked on all
  three of goals, net_worth_snapshots and expected_payments, so a partner can
  read but never write
- The two-person cap rejects a third member at slot 2 (unique violation), at
  slot 3 (check violation), and rejects a user joining a second household
- `is_household_peer()` returns false for every user and `my_household_id()`
  is null while no household exists, so behaviour is identical to before for
  all 13 existing users. Data untouched: 13 profiles, 1,338 expenses.

### 1b. `REVOKE ... FROM PUBLIC` is not enough on Supabase

0016 ends each helper with `REVOKE ALL ... FROM PUBLIC` then `GRANT EXECUTE
... TO authenticated`, and its comment claims the helpers are therefore
exposed only to signed-in users. The linter disagreed the moment it was
applied, and the linter was right: Supabase ships `ALTER DEFAULT PRIVILEGES`
granting EXECUTE on new `public` functions to anon, authenticated and
service_role *individually*, so the ACL already reads
`{...,anon=X/postgres,authenticated=X/postgres,...}`. Revoking from PUBLIC
removes only the PUBLIC entry; the per-role grants are separate and survive.

Closed by `0035_household_revoke_anon.sql`. It was never exploitable — both
helpers key off `auth.uid()`, which is NULL for an anonymous caller, so they
return null and false for every input and enumerate nothing — but the grant
contradicted the migration's own stated intent.

**Name the roles explicitly on any future SECURITY DEFINER helper here.**

### 2. Plaid reaches the card — but it is not how this household's money arrives

The motivating case is seeing a partner's credit-card spending. Plaid is the
assumed mechanism. The production data says it mostly isn't the mechanism
here already:

| Signal | Value |
|---|---|
| Plaid items connected | 4 — Wise (US), Capital One, Interactive Brokers – US, Non Custodial Wallet |
| `create-link-token` country codes | `[CountryCode.Us]` only |
| Transactions from Plaid | 43 of 1,338 — **3%** |
| From manual entry | 842 — 63% |
| From CSV import | 453 — 34% |
| Spending currency | CNY 1,132 (85%), HKD 139 (10%), USD 67 (5%) |

Every Plaid item is a US investment or transfer account. Actual day-to-day
spending is overwhelmingly CNY and HKD, and it arrives by manual entry and
CSV — which is why the WeChat Pay Excel importer and the PDF statement
reader exist.

**Plaid has no coverage in mainland China or Hong Kong.** For a card issued
there, no amount of work on this feature connects it. That is vendor
coverage, not a gap in our integration.

This does not kill the feature; it reorders it. The household layer is
identical whichever way transactions arrive — only the ingest differs. So:

- **Partner's card is US-issued** → Plaid works as designed. P2's duplicate
  detection (`institution_id` + `mask`) applies.
- **Partner's card is HK or mainland** → she imports statements through the
  path that already carries 97% of the data. P2's Plaid-based dedup does not
  apply.

**Resolved 17 Sep 2026: the card is US-issued.** Plaid works, P2 stands as
written, and no ingest rework is needed. Worth keeping the table above
anyway — the household's own spending is 85% CNY, so the *combined* view
still has to reconcile a US-Plaid card against CNY/HKD imports, and the FX
layer (`FALLBACK_RATES`, `convertUSDAmount`, live rates from Frankfurter in
`app/dashboard/page.tsx`) is load-bearing for the household totals from day
one, not a later polish item.

### 3. Exactly one query would silently go household-wide

The RLS plan below extends each SELECT policy to
`auth.uid() = user_id OR is_household_peer(user_id)`. That widens what a
query *can* return, so any client-side read that does not also filter
`user_id` explicitly would start returning both partners' rows with no code
change and nothing in the diff.

A scan of all 213 files in `app/`, `components/` and `lib/` found exactly
one such read:

```
app/dashboard/page.tsx:5561   net_worth_snapshots
```

It is the "actual progress" chart line — `.select("portfolio_value,
captured_at").order("captured_at").limit(120)` with no `user_id` filter.
Under widened RLS it would interleave both partners' snapshots into one
line, and `limit(120)` would then truncate across both histories — so it
would render a *wrong* line rather than an obviously merged one, which is
the harder kind to notice.

**Add `.eq("user_id", userId)` there as part of P0**, before the policies
change. Everything else already filters explicitly, and the five unfiltered
reads in `app/api/` are admin and cron routes on the service-role client,
which bypasses RLS regardless.

### 4. The migration was missing three tables — now added

0016's six live-policy names all still match production, so it has not
drifted in that sense. But it was written on 16 Aug and 0017-0034 landed
afterwards. Re-checking the live schema found three financial tables it does
not cover. All three are now amended in the file:

- **`scenarios` — this one would have broken the headline feature.**
  `scenario_assumptions` was already extended, but every read of it goes
  through `lib/fire/scenarios.ts`, which selects
  `scenarios!inner(user_id, is_default)`. A PostgREST embedded resource is
  filtered by its *own* SELECT policy, so with `scenarios` unextended the
  inner join drops the peer's assumptions row and returns nothing. P3's
  combined freedom date is computed from exactly that query — the one number
  this whole feature exists to produce.
- **`user_budget`** — the legacy fallback in `loadDefaultScenario()`. Without
  it a peer on an older account silently falls back to defaults.
- **`expected_payments`** — created by 0019, five days after 0016 was
  written. Carries the same single `FOR ALL` policy that goals and
  net_worth_snapshots had, so it needed the same four-way split rather than
  an in-place OR-extension, for the same reason: Postgres reuses `USING` as
  `WITH CHECK`, which would have handed a partner write access.

The lesson generalises: **an unapplied migration keeps ageing.** Re-run the
live-schema check against `pg_policies` and `information_schema.tables`
immediately before applying 0016, not just before writing it.

### 5. The one unfiltered read is fixed

`app/dashboard/page.tsx` now filters `net_worth_snapshots` by `user_id`
explicitly. A repo-wide scan of all 213 files in `app/`, `components/` and
`lib/` reports **zero** client-side reads on a to-be-widened table that rely
on RLS alone, so the peer policies can land without silently changing any
existing screen. Re-run that scan before applying.

## Product decisions (confirmed 2026-08-16)

- **Aggregate, not pooled.** Each partner keeps their own accounts, income,
  and portfolio. The household view *sums* the two into one combined number.
  Nothing about an individual's own dashboard changes — the household view is
  additive on top.
- **Full transparency within a household.** Both members see each other's
  exact income, balances, and expenses. No totals-only / redacted mode in v1.
- **One Pro subscription covers the whole household.** The owner pays; both
  members get Pro. (Billing wiring is P4 — not built yet.)
- **v1 scope is two partners.** Schema allows more (household_members is a
  proper join table), but product/UI is designed for exactly one other
  person in v1.
- **Duplicate bank accounts: flag and confirm, not silent auto-merge.**
  Plaid gives us `institution_id` + account `mask` (last 4 digits) per linked
  account — enough to *detect* "you both linked what looks like the same
  account," not enough to be certain (two different real accounts can share
  those two fields by coincidence). So: detect → prompt either partner
  ("Looks like you both linked Chase •••• 4821 — same account?") → on
  confirm, count it once in the household total going forward. Until
  confirmed, it's counted for both (the safe default — overstating the
  household number is a smaller failure than silently understating it).
- **Manual/unlinked shared costs are out of scope for v1.** Rent paid by
  Venmo, cash expenses, a manually-entered joint savings goal — none of that
  gets deduped. Only Plaid-linked accounts go through the detect-and-confirm
  flow above. The combined-total UI should say so in one line
  ("Manually entered balances aren't deduplicated yet") so the number reads
  honest rather than silently wrong.
- **No historical backfill on join.** The combined household view starts
  counting from the day the household forms. Each person's own historical
  charts (net worth over time, past expenses) are completely unaffected —
  nothing is retroactively merged or recomputed.
- **Leaving is instant and total.** The moment a member leaves (or is
  removed): they lose all read access to the ex-partner's data immediately,
  and if they were riding the owner's Pro plan, they revert to free
  immediately. No grace period. This is also how the schema is built —
  deleting the `household_members` row *is* the revoke, since every
  peer-read policy keys off that table.

## Decisions — 18 Sep 2026

### Exactly two people, enforced in the schema

Committed to two. `household_members` gains `member_slot SMALLINT CHECK (IN
(1,2))` with `UNIQUE (household_id, member_slot)` — a slot rather than a
trigger, because a unique index cannot be raced where a count check can.

This matters because **nothing else caps membership.** `is_household_peer()`
is a set-membership join that works for any N, so a third member would have
received full read access while P3's combined math still assumed two.

Households of three or more are common — multi-generational ones especially,
and that is the norm in the CNY/HKD market this household actually spends in.
But households sharing *one freedom date* are not. Parents living with the
couple share costs and have their own, usually already-retired, finances; an
adult child shares rent and has their own freedom date decades out. If that
becomes a real ask it is a **shared-expenses** feature, not this one — rule 5,
two groups means two features. Raising the CHECK later is one line;
un-shipping a broken three-person experience is not.

### Power is four axes, not one — and three of them are symmetric

"Owner vs member" overstates the hierarchy. Splitting it out:

| Axis | Design | Equal? |
|---|---|---|
| Seeing each other's money | both see everything | yes |
| Editing each other's money | neither, ever | yes |
| Paying | one card is charged | no — Stripe, not hierarchy |
| Admin | **symmetric Disconnect** | yes, as of this decision |

Neither person is a sub-account. `role` stays in the schema because billing
needs to know whose card is on file, but it no longer confers authority.

**Disconnect replaces leave-vs-remove.** At exactly two, and with symmetric
visibility, "I leave" and "I remove you" have the identical outcome: the
household ends and both stop seeing each other. So they are one action either
person can take instantly, without the other's approval. This is both fairer
and less code — and it is *only* available because the cap is two. At three,
leave and remove diverge and real roles come back.

### When the payer leaves

Not previously covered. Household Pro runs to `current_period_end` and then
stops for both. The period is paid for; cutting a partner off mid-month
because the other cancelled reads as a bug and feels punitive.

### `household_has_pro()` rather than peer-readable subscriptions

P4 below says the Pro check becomes "any active subscription owned by me, or
by my household." Do not implement that by extending `subscriptions` RLS: the
row carries amount, status, renewal date and Stripe IDs, so a partner would
learn the billing detail, not just the entitlement.

A `SECURITY DEFINER` function returning a boolean instead. The partner learns
*the household is Pro*, never *your card renews on the 14th*. `subscriptions`
RLS stays exactly as it is, which is what 0016 already assumes.

Two call sites: `lib/supabase.ts:81` (`isPro()`) and
`app/dashboard/page.tsx:5167` (the dashboard's own subscription load). Both
currently filter `.eq("user_id", ...)`, so both need it.

### Where it lives: no new tab, no empty widget

The sidebar is three items — Home, Money, Plan — with Profile in the user
menu. A fourth item would cost every user permanent space for something
almost none of them use, and an empty-state widget is a permanent
advertisement on the screen that is meant to feel calm. Neither. Three
conditional surfaces in places that already exist:

| Surface | Group | Renders when |
|---|---|---|
| Invite, pending state, partner, Disconnect | **Profile** | always (it is account settings) |
| Combined freedom date, You / Partner / Together | **Home** | only with a household — absent otherwise, not empty |
| `You / Together` **scope toggle** on Cashflow and Insights | **Money** | only with a household |

The toggle is the load-bearing choice. "What did *we* spend on dining" is the
same question as "what did *I* spend on dining" at a wider scope, so a
separate Household tab would duplicate every existing view and leave two of
each to maintain. **Household is not a new place; it is a new lens on places
that already exist.** It also avoids rule 6 entirely — a toggle is not a nav
entry, so there is no second array to fall out of sync.

Two consequences:

- **Discoverability is earned, not permanent.** One line in Profile, plus the
  "Planning with a partner? Invite them →" prompt *after* the reveal. That is
  the only mechanism in the product where one user brings another, so it is a
  genuine acquisition loop — but it goes after value, never as first-run
  friction.
- **The toggle must show its FX working.** This household spends 85% CNY
  against a USD card, so "Together" is always a converted figure. Say so in
  the UI. A silently converted combined total just looks wrong.

**Build order: Profile → Money toggle → Home card.** Profile ships alone with
no money data involved; the toggle needs the peer policies live; the Home card
needs P3's math. Easiest to hardest, which is also safest to riskiest.

## Data model

```
households               id, name, created_by, created_at
household_members        household_id, user_id, role('owner'|'member'),
                          member_slot(1|2), joined_at
                          PK(household_id, user_id) · UNIQUE(user_id)
                          · UNIQUE(household_id, member_slot)
                          — UNIQUE(user_id) is one household per user;
                            UNIQUE(household_id, member_slot) is two people
                            per household (see Decisions, 18 Sep)
                          — deleting this row is Disconnect: at two members
                            with symmetric visibility, leave and remove are
                            the same action, so either person may take it
household_invites        id, household_id, inviter_id, invitee_email,
                          token(unique), status, expires_at, accepted_by
shared_account_links      id, household_id, plaid_account_id_a, plaid_account_id_b,
                          confirmed_by, confirmed_at
                          — only rows here are deduped in the combined total
```

Every existing financial table (`profiles`, `scenario_assumptions`,
`expenses`, `plaid_accounts`, `goals`, `net_worth_snapshots`) is untouched in
shape. A household just links two `user_id`s, and RLS is extended so a
partner can *read* the other's rows. Nothing about how those tables store or
compute an individual's own numbers changes.

## Security model (RLS)

- `auth.uid() = user_id` (owner) stays the only way to **write** any
  financial row, on every table, forever. Household membership never grants
  write access in v1.
- Two `SECURITY DEFINER` helpers do the cross-user reads without needing a
  self-referencing RLS subquery (which either recurses or needs its own
  workaround): `my_household_id()` and `is_household_peer(target_user_id)`.
  Both are `STABLE`, pin `search_path`, and are granted `EXECUTE` only to
  `authenticated`.
- Each table's SELECT policy becomes
  `USING (auth.uid() = user_id OR is_household_peer(user_id))`.
- **`classification_rules` and `plaid_items` (which holds the raw Plaid
  access token) are deliberately never extended.** A partner doesn't need
  bank credentials or the other person's auto-categorization rules to see
  the combined numbers.
- All structural writes — create household, send/accept an invite, remove a
  member, confirm a shared account — go through server routes using the
  service-role client, the same pattern this repo already uses for Stripe
  and Plaid. The only client-writable thing for `authenticated` is a member
  deleting their *own* `household_members` row (leave).

### A schema-drift note for whoever touches this next

The P0 migration (`supabase/migrations/0016_household_accounts.sql`) was
written against the **live** database via the Supabase MCP tools, not just
the tracked migration files — the two have drifted. Two concrete surprises
found while building this:

1. Live RLS policy *names* don't always match the tracked SQL. e.g.
   `expenses`'s real SELECT policy is `"Users can view own expenses"`, not
   `"expenses owner select"` as the 0001-era files would suggest.
2. `goals` and `net_worth_snapshots` aren't in *any* tracked migration —
   they were created directly against the database — and each uses a single
   `FOR ALL` policy rather than the four-policy (select/insert/update/delete)
   shape used everywhere else. That matters: naively OR-extending a
   `FOR ALL` policy's `USING` clause would have silently also granted
   **write** access to a household peer, since Postgres reuses `USING` as
   the `WITH CHECK` for writes when no `WITH CHECK` is given. The migration
   splits both into four policies instead, so the peer clause only ever
   lands on SELECT.

**Always re-check live policy names and shapes before extending RLS** —
`select tablename, policyname, cmd, qual from pg_policies where schemaname =
'public'` — rather than trusting the tracked migration files match
production.

## Combined FIRE math (P3)

Sum both members' `scenario_assumptions`: monthly income, monthly savings,
investable portfolio (401k + Roth + taxable + cash), and expenses (net of
any confirmed `shared_account_links`). 25× combined annual expenses = the
household FIRE number → `calcFIRE` on the combined figures → one household
freedom **date**. Since a date can map to two different ages, show both:
*"Free by 2041 — you're 47, Sam's 45."* Dashboard breakdown reads
**You / Partner / Together**.

## Billing (P4)

Owner pays; both members get Pro.

**Superseded 18 Sep:** this section previously proposed a nullable
`subscriptions.household_id` and a Pro check reading "any active subscription
owned by me, or by my household". Implement it as a `SECURITY DEFINER`
function returning a boolean instead — see Decisions above. Reading the
owner's `subscriptions` row to answer an entitlement question would hand the
partner the amount, status, renewal date and Stripe IDs along with it.

Disconnecting reverts the leaver to free immediately. If the *payer* leaves,
household Pro runs to `current_period_end` and then stops for both.

## Phasing

- **P0 — applied 18 Sep 2026.** Schema, helpers and peer-read policies are
  live and verified (see Status check). `0035` follows it to revoke anon
  EXECUTE. Nothing in the app reads any of it yet — P1 is the next task.
- **P1** — invite → accept → join, leave/remove. Server routes using the
  service-role client (create household + first membership atomically, mint
  invite tokens, send via Resend, accept-by-token, self-leave).
- **P2** — Plaid duplicate-account detection (match on `institution_id` +
  `mask` across the two members' `plaid_accounts`) + the confirm prompt +
  writes to `shared_account_links`.
- **P3** — combined dashboard (You / Partner / Together breakdown, one
  household freedom date).
- **P4** — household billing (`subscriptions.household_id` + the Pro-check
  logic change).
- **P5 (later, not scoped)** — shared editing (currently read-only for a
  partner), manual-entry dedup tags for unlinked shared costs. **Three or
  more members is no longer on this list**: the cap is deliberate and the
  symmetric Disconnect depends on it. A multi-generational household is a
  shared-expenses feature, not a shared-freedom-date one.

## Decided 18 Sep: the invite prompt is the discoverability plan

The "Planning with a partner? Invite them →" CTA after the reveal is no
longer just an idea — it is how this feature gets found, since there is no
sidebar entry advertising it. It is also the only mechanism in the product
where one user brings another, which makes it an acquisition loop rather
than a nicety.

It goes *after* the reveal, never before. Same rule as feedback: user-initiated
after value, not first-run friction.
