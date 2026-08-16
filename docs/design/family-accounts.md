# Family (Household) Accounts

Confirmed with John on 2026-08-16. Two partners link accounts and see one
combined FIRE plan — a shared freedom date instead of two separate ones.

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

- **P0 — done.** Schema (4 tables) + RLS + the two helper functions.
  SQL-only; no app code touches this yet. Verify with direct SQL queries as
  a different simulated user before building UI on top.
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
