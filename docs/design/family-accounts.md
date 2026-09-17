# Family (Household) Accounts

Confirmed with John on 2026-08-16. Two partners link accounts and see one
combined FIRE plan — a shared freedom date instead of two separate ones.

## Status check — 17 Sep 2026

Three findings from re-reading this against the live database and codebase.
The product decisions below still stand; these change what is *true* and what
to build first.

### 1. P0 is not done. It was never applied.

`supabase/migrations/0016_household_accounts.sql` is in the repo, but none of
it reached production. Confirmed two ways:

- `information_schema.tables` has no `households`, `household_members`,
  `household_invites` or `shared_account_links`; `pg_proc` has neither
  `my_household_id()` nor `is_household_peer()`.
- The applied migration ledger jumps straight from `csv_source_file` (0015,
  10 Jul) to `0017_admin_email` (21 Aug). 0016 was skipped.

Nothing is broken by this — no app code depends on those tables yet. But
anyone reading "P0 — done" would build P1 on a foundation that isn't there.

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

## Data model

```
households               id, name, created_by, created_at
household_members        household_id, user_id, role('owner'|'member'), joined_at
                          PK(household_id, user_id) · UNIQUE(user_id)
                          — one household per user in v1; deleting this row
                            is how a member leaves or is removed
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

`subscriptions` gets a nullable `household_id` column (not added by the P0
migration — comes with this phase, once the app-side Pro-check logic exists
to go with it). The Pro check becomes "any active subscription owned by me,
or by my household." Owner pays; leaving reverts the leaver to free
immediately per the instant-revoke decision above.

## Phasing

- **P0 — written, NOT applied.** See "Status check" at the top: the
  migration file exists but none of it is in the live database. Applying it
  is the first task, not a completed one.
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
- **P5 (later, not scoped)** — more than two members, shared editing
  (currently read-only for a partner), manual-entry dedup tags for unlinked
  shared costs.

## Open product idea (not yet decided)

A "Planning with a partner? Invite them →" CTA after the reveal could double
as a referral/growth loop — worth revisiting once P1 ships and there's a
real invite flow to point it at.
