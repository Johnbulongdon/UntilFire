# UntilFire — decision log

Reconciled 23 September 2026. This records why a choice exists, not just what
shipped. [Project memory](KNOWLEDGE.md) defines maintenance and document ownership.
Sources and both vault branch snapshots are recorded in
[the reconciliation record](history/vault-reconciliation.md).

## Active decisions

### D-15 — September 24: flexible tasks, Claude integrates ready handoffs

**Status:** Active workflow direction, as authorized by the user; publication of
this instruction change is itself a PR handoff.
**Decision:** Either agent can work on any task, using separate worktrees and
branches during concurrent work. Codex prepares explicit ready PR handoffs;
Claude is the default integration owner and checks them during publishing tasks.
Claude can ship independent verified work first, then refresh, verify and
integrate eligible PRs one at a time. The user may reassign the role per task.
**Why:** Preserve the user's Claude-to-live-site testing workflow while allowing
parallel work, without requiring the user to resolve Git conflicts.
**Supersedes:** Mandatory permanent file ownership in the former collaboration
rule. D-06's latest-main baseline, history preservation and publication
authorization requirements remain in force.
**Trade-off:** PRs are durable handoffs, not a live inter-app channel or an idle
session wake-up mechanism. A ready marker is not blanket publication permission;
blocked PRs wait while independent work can ship. Automatic Git merges still
need checks for incompatible behavior.
**Source:** User's September 24 collaboration discussion and request to record
the agreed workflow; [AGENTS.md](../AGENTS.md#codex-and-claude-handoff-sop) owns the SOP.
**Revisit:** Explicit user reassignment or a separately configured and authorized
automation mechanism; do not silently introduce a second publisher.

### D-01 — 2026-09-23: one maintained home in the app repository

**Status:** Active project direction; user authorized direct publication to main on September 24.
**Decision:** Keep public-safe agent rules, product direction, decision history,
feature/design contracts, roadmap and changelog together in this repo.
**Why:** Separate vault updates and branches were missed by agents. The user
wants the path to a conclusion retained so future sessions do not reverse it
without understanding why.
**Supersedes:** The May 20 repo/vault split and cleanup plan, which proposed
moving most documentation out of the repo. Do not execute that old deletion plan.
**Trade-off:** A public repo cannot store all raw research or personal notes.
Keep sensitive originals private and retain safe conclusions and provenance here.
**Revisit only if:** a replacement has a reliable mandatory read/update workflow
and explicit user approval; convenience alone is not a reason to split again.
**Source:** User's September 23 reconciliation request; vault Operating Log,
Repo and Vault Boundary, and May 28 structure audit.

### D-02 — May 2026, clarified July 16: freedom and guidance after free value

**Status:** Active.
**Decision:** Lead with freedom date, useful next move and work optionality.
City/tax precision supports trust; no login, bank or payment barrier before value.
**Why:** Early qualitative feedback asked for clarity and practical guidance,
not another tracking surface. Treat that small sample as directional evidence.
**Rejected:** Calculator-only positioning, early commitment asks, and the older
Duolingo/streak analogy. The July update explicitly chooses monthly continuity
without daily gamification.
**Trade-off / revisit:** Fewer early lead captures; evaluate post-result
continuation with current evidence instead of hiding first value.
**Source:** Vault Decision Log (May), Product Positioning (July 16),
Gentle Onboarding Principles; current [requirements](PRD.md).

### D-03 — July 16: deterministic guidance before an AI adviser

**Status:** Active sequencing; named allocation recommendations unresolved.
**Decision:** Build useful guidance from real inputs and transparent calculations
before adding AI advice. User-chosen allocation execution is distinct from
recommending what assets someone should own.
**Why:** Earlier AI recommendations were reported as generic. More automation
does not fix a weak underlying model.
**Rejected:** Treating the old AI-chat sprint or an acceptance disclosure as
approval to ship personalised asset recommendations.
**Revisit only if:** real guidance quality and a separately approved product scope
justify it; resolve the recorded legal-input question before named suggestions.
**Source:** Vault Product Positioning; [Next contribution](design/next-contribution.md).
No legal determination is made by this log.

### D-04 — August 27: v3 Warm with a stable visual vocabulary

**Status:** Active; supersedes the April white/green and older dark/orange defaults.
**Decision:** Follow [design-system.md](design/design-system.md): warm light/dark,
green primary actions, neutral secondary controls, red destructive actions,
teal freedom/progress. Financial data uses DM Mono; a prominent freedom-date
display may use Fraunces. Reuse primitives and their bounded sizing exceptions.
**Why:** Approximating the last screen produced inconsistent sizes, colors and
controls. Shared primitives reduce drift; teal preserves a specific meaning.
**Trade-off:** Adopt on touch instead of a broad reskin. Tokens still require
visual/accessibility verification. Marketing exceptions are explicit.
**Source:** App `c941388` and design contract. Revisit with an explicit design
decision and visual evidence, not an older branch screenshot.

### D-05 — August–September: input ownership and navigation

**Status:** Active.
**Decision:** Money owns actual finances and operational budgeting/upcoming
payments; Plan owns projections and assumptions; Home synthesises both with
customisable layout but no independent financial inputs. Profile keeps account,
household setup and FIRE personality/type.
**Why:** Mixed placement created links out to Profile just to edit planning
inputs, and duplicate navigation lists made existing tabs unreachable.
**Supersedes:** Older Home/Money/Freedom maps and Profile-as-planning-input-owner.
**Trade-off / revisit:** Split cross-cutting features by responsibility; change
placement only with an explicit need and updates to arrays and deep links.
**Source:** [App structure](design/app-structure.md), September 18 changelog.

### D-06 — April baseline rule; July deployment lesson; September review workflow

**Status:** Active.
**Decision:** Latest pushed `origin/main` is the default baseline; preserve local
drift. Baseline does not mean direct-to-main publishing. Use a review branch/PR
when requested; inspect deployment configuration before any push.
**Why:** Vault Development Log records a July 7 incident where promoting an
unrelated preview restored an older design. App merge `1eff2d8` records the
subsequent integration; the incident itself is a source report, not newly audited
deployment evidence.
**Rejected:** Arbitrary preview promotion, silently overwriting history through
full-file connectors, and a standing instruction to impersonate an owner.
**Trade-off / revisit:** Use environment-authorized access and diagnose failures;
do not bypass permissions, hooks, or divergence protection.
**Source:** [AGENTS.md](../AGENTS.md), historical vault development log.
This supersedes the old universal-preview and forced-author-identity guidance below.

### D-07 — August 16 / September 2: honest projection assumptions

**Status:** Active.
**Decision:** Monte Carlo Confidence Check was removed; do not recreate it from
the April probability-score proposal. Keep projection periods, currencies,
real/nominal assumptions and boundaries explicit and consistent.
**Why:** The removed feature overstated its simulation count and used a horizon
disconnected from the user's target age. Later code unified mixed 10%/7% return
assumptions to one 7% real assumption.
**Trade-off / revisit:** Any confidence model needs an approved redesign and
focused regression checks, not a resurrected historical plan.
**Source:** App `15acd8d` (August 17 commit; changelog records August 16),
`f79d688`; [changelog](../CHANGELOG.md).
The March fixed-starting-balance and mixed-default details below are superseded.

### D-08 — September 22–24: a contribution plan that fits real money

**Status:** Active implementation contract; live verification remains separate.
**Decision:** Normalise tilted allocations to the available budget, use 5/25
bands with overrides, share Home/Plan derivation, select emergency-fund accounts
explicitly, and snapshot on visits. Separate payday from buy-in frequency.
Derive the safe contribution from the cycle's lowest projected balance, with a
traceable dated ledger; count overdue bills but exclude overdue income. Compare
budget spending against expected payments without inventing dated transactions.
*(The last sentence is refined by D-10: budget spending is now included, as a
labelled estimate rather than as invented dated transactions.)*
**Why:** The source spreadsheet could allocate more than the available budget;
a flat band distorted small targets; cash reserved for spending/investing is
not automatically emergency savings. Duplicate derivations can disagree.
A balance only on contribution day missed bills immediately afterward; ignoring
income and counting recurring bills once also misrepresented available cash.
**Trade-off:** Unvisited months have no snapshot; user overrides must stay distinct
from following account values. Email is a separate unfinished return channel.
*(Where the accounts are selected is refined by D-12: in Money → Net Worth, not
on the Contributions page.)*
**Source:** [Next contribution](design/next-contribution.md), app
`96e9d63` through `2af3cb8`. Preserve its rationale before changing the algorithm.

### D-09 — September launch planning: prove retention before expanding

**Status:** Conditional plan, not approval to launch or send outreach.
**Decision:** Prioritise activation and useful monthly continuity; retain a
readiness gate for the proposed January relaunch and bound country SEO as an
experiment rather than endlessly adding pages.
**Why:** The source reports traffic without reliable ongoing use; launch traffic
alone does not establish a product that retains.
**Trade-off / revisit:** Refresh dated analytics and eligibility before action.
The older sprint sequence and first-launch checklist are historical.
**Source:** [Launch context](planning/launch-context.md), vault Launch Runway.

### D-10 — September 24: plan the month from dated payments, estimate the rest

**Status:** Active. Authorised by the founder on 2026-09-24. **The allowance's
source is superseded by [D-11](#d-11--september-24-day-to-day-spending-from-last-months-needs):**
it is now last month's need-tagged spending, with this Budget-based figure as the
fallback. The month view, labelled estimate lines and no-double-counting rule stand.
**Decision:** Expected payments are the dated half of a month's budget. Money →
Expected opens on a month view in date order: every expected payment in and out,
repeats included, then one **day-to-day spending** line for the budget's spending
that has no date, then In / Out / Left for the month. The contribution forecast
includes the same allowance, spread evenly per day, as its own labelled estimate
lines between dated payments. The allowance is the Budget's monthly spending less
the repeating bills already on the Expected list, so no bill is counted twice.
The category Budget remains the source of the monthly total.
**Why:** Budget totals have no dates; expected payments do. Without the
allowance, the forecast's balance only fell on bill days, so the safe figure
overstated what was spare by everything spent in between — the same
overstatement D-08 exists to prevent, one step removed.
**Rejected:** (a) Dated items only — honest but kept overstating for anyone who
spends from the connected accounts. (b) Replacing the Budget with Expected, entering
groceries as a weekly item — one source, but it retires the monthly category
Budget users already maintain and asks every user to date their groceries. (The
category Budget has no decision entry of its own; the log's only recorded reasoning
on the unit is "[2026-03] Custom city fallback": monthly is the unit people think in.)
**Trade-off:** An even daily spread is an estimate; real spending is lumpy, and
card spending leaves the connected account on the statement date, not the day of
purchase. Every estimate line is labelled, shows its days × rate, and moves onto a
real date as soon as the payment is added to Expected.
**Evidence:** `npm run test:cashflow-forecast` (UTC+8 and UTC−7): every ledger line
still accounts exactly for its change in balance with the allowance included;
dated bills plus the allowance equal the Budget's spending, so the month's surplus
matches the Budget's. Browser checks of both surfaces. Live behaviour not yet
observed with a real account.
**Revisit when:** users routinely pay day-to-day spending by card (the even
spread then lands on the wrong days — model the card statement instead); or
Expected lists most spending, making the allowance small enough to drop; or users
ask to set the allowance directly rather than derive it from the Budget.
**Source:** [Next contribution](design/next-contribution.md) · `lib/cashflow-forecast.ts`.

### D-11 — September 24: day-to-day spending from last month's needs

**Status:** Active. Authorised by the founder on 2026-09-24. Supersedes D-10's
allowance source. *One-off months are handled by per-category exclusions
(D-14) rather than the multi-month median listed under "Revisit when".*
**Decision:** The day-to-day line in the contribution forecast and in the Expected
month view is last complete month's **need-tagged** spending divided by that
month's days, less any need already on the Expected list. A need is left out when
its name matches an expense on the list, when its category is the category of a
repeating bill on the list, or when its category's total is within 5% of an
unclaimed repeating bill's monthly amount (rent paid as transfers to a person has
no merchant name to match). Each bill accounts for at most one category. Wants
and untagged spending are not counted, but they are reported beside the figure.
With no tagged needs last month, the D-10 figure (Budget spending less repeating
bills) is the fallback. With neither, there is no estimate.
**Why:** The founder's Budget total included one-off and discretionary spending,
so the daily estimate ran several times higher than their actual daily needs.
Travel dominated last month's untagged spending. A daily rate built from it
charged every future day for a trip that happened once, so the safe contribution
understated what could go in. Needs are the part of spending that recurs.
**Rejected:** (a) All of last month's spending per day, which counts the trip
every day. (b) Keeping the Budget figure, which is a plan, not what was spent, and
includes the same dated bills in another form. (c) A multi-month needs average,
which smooths lumpy months but lags a real change such as a rent rise. Last month
matches what "what I spend" usually means and the Emergency Fund's default month.
**Trade-off:** Accuracy depends on tagging. An untagged grocery run is left out
and understates the estimate, so the note names the untagged total and says to
tag it. The amount match can remove a category that coincidentally equals a bill.
The note lists every exclusion with its reason so a wrong one is visible. Matching
names needed Unicode-aware tokens: the old a–z tokenizer reduced Chinese merchant
names to nothing, so they never matched.
**Evidence:** `npm run test:cashflow-forecast` (UTC+8 and UTC−7) covers name,
category and amount exclusions, one bill per category, one-offs and the null case.
`test:contribution-ladder` covers the needs source, wants and untagged excluded,
the budget fallback, and the forecast using the same rate. A browser preview with a
fixture shaped like a real month showed the ledger note and a month line agreeing
at $11.36/day. Live behaviour on a real account has not been observed yet.
**Revisit when:** users rarely tag needs (consider a suggested need/want split
first); a lumpy month makes the figure swing noticeably (consider a two- or
three-month median); or users ask to set the day-to-day figure themselves.
**Source:** [Next contribution](design/next-contribution.md) ·
`lib/cashflow-forecast.ts` (`needsAllowance`) · `lib/contribution-ladder.ts`
(`dayToDayAllowance`).

### D-12 — September 24: choose emergency-fund accounts where accounts are organised

**Status:** Active. Authorised by the founder on 2026-09-24. Refines D-08's account
selection.
**Decision:** Each cash account on the Money → Net Worth "Connected Bank Accounts"
card has an **Emergency fund** tick. Plan → Contributions, the Home card and the
Emergency Fund card all read that one saved choice. Contributions shows where its
figure comes from and links to Net Worth instead of keeping its own picker. The
choice stays in the stored contribution plan (`ladder.efAccountIds`), so no
migration is needed. Saving it patches only that field, creating an empty plan if
none exists. `null` still means "my savings accounts". An explicitly empty list
now means none: unticking every account is honoured, rather than falling back to
savings. The relink fallback remains, so stale IDs matching no account still read
as savings.
**Why:** The founder asked for one place to organise bank accounts. Which account
is a buffer is a fact about the account, not a planning assumption (D-05: Money
owns actual finances). A picker on Contributions changed a figure on three pages
from a page about something else. The old empty-list fallback re-ticked savings
the moment the last box was cleared and overstated the fund, the one direction it
must not be wrong in.
**Rejected:** (a) Keeping the picker on Contributions, which is the second place
the founder asked to avoid. (b) Having both, which gives two controls for one fact.
(c) A new column on `plaid_accounts`, which is cleaner storage but needs a
migration and a second source during rollout. The plan field already syncs
through local and account storage.
**Trade-off:** The choice lives in the contribution plan rather than on the
account, so it will not reach any future surface that doesn't read the plan. If
another surface needs it, move it to the account.
**Evidence:** `test:contribution-plan` covers creating a plan, changing nothing
else, the `null` reset and copying the list. `test:emergency-fund-accounts` covers
empty meaning none and the relink fallback. A browser preview of the real Net Worth
component, in light and dark at 1280 and 390, confirmed that ticking updates the
card's summary and the saved plan, that Contributions reads it after remounting,
and that reset, keyboard toggling and focus rings work. The signed-in dashboard
itself was not exercised.
**Revisit when:** a second feature needs "is this account a buffer?" (move it to
the account row), or households need per-person emergency funds.
**Source:** [Next contribution](design/next-contribution.md) ·
`lib/contribution-store.ts` (`saveEmergencyAccountIds`) · `app/dashboard/page.tsx`
(Net Worth).

### D-13 — September 24: the FIRE Type quiz stays off onboarding; the homepage links to it

**Status:** Active. Authorised by the founder on 2026-09-24.
**Decision:** The homepage hero offers "Take the FIRE Type quiz" as a secondary
link beside "Find my freedom date" (`/fire-type?source=homepage-secondary`). The
quiz is not added to the calculator's onboarding, in full or in part.
**Why:** The quiz result does not feed the product yet. It changes no projection
and no guidance, so questions before the result would only add steps before
first value, against D-02 and CLAUDE.md's required-inputs rule. On the homepage
it is an optional, shareable way in for visitors who are curious but not ready
to enter numbers. The link had been in the hero (`c81693d`) and was lost without
a recorded reason when the landing page was redesigned (`274a215`).
**Rejected:** Three quiz questions in onboarding. The type is four letters from
eight questions, two per trait, so three questions leave at least one letter a
guess and the rest resting on a single answer. That is less accurate than the
quiz people share, and it costs activation.
**Trade-off:** A second button in the hero competes a little with the primary
one. It is styled as the secondary variant and placed after the start button.
**Evidence:** `test:seo` checks that the rendered hero carries the link, after
the start button. Browser check at 390 and 1280 px in both themes: the link
stacks under the start button on phones, is keyboard-reachable with a visible
focus ring, has at least 14.9:1 text contrast, and opens the quiz with its source.
**Revisit when:** the quiz result starts to shape the product (for example
personalised guidance or defaults). Integrate it after the first result then,
not before it.
**Source:** `app/components/landing/AnimatedHero.tsx`, `app/fire-type/quiz-data.ts`.

### D-14 — September 24: let people leave a one-off out of the day-to-day estimate

**Status:** Active. Authorised by the founder on 2026-09-24. Refines D-11.
**Decision:** The per-day figure opens a breakdown of last month's counted needs
by category, with amount and share. Each category has a **Leave out** tick.
Ticking asks: **just this month** or **always**. "Just this month" is stored
with the basis month it was made for (`2026-08`) and stops applying once
another month becomes the basis. It lapses by itself, and stale entries are
dropped on the next change. "Always" stays until the category is ticked back
in. Exclusions live in the saved ladder (`allowanceExclusions`), so
Contributions, the Home card and the Expected month view take the same figure.
They apply only to categories that would otherwise be counted; needs already
dated on the Expected list stay attributed to their bill.
**Why:** One month is the basis (D-11), so one unusual month moves the whole
figure. The founder's example was travel booked as a need that won't recur.
The person knows which spending was a one-off; the app can't tell.
**Rejected:** (a) A three-month median per category: automatic, but slower to
reflect a real change, and it hides why the figure moved. (b) "Always" only:
simpler, but a real recurring cost could stay hidden long after the one-off.
(c) "This month" only: a category someone never counts, such as a quarterly
bill already budgeted elsewhere, would need ticking every month.
**Trade-off:** The estimate depends on the person's judgement. The breakdown
shows every exclusion with its scope and a way to undo it, and the explanation
note under the ledger repeats them, so nothing is left out silently.
**Evidence:** `test:cashflow-forecast` covers month scope, lapse the next month,
always, always winning over month, bill attribution and leaving everything out.
`test:contribution-plan` covers save/reload and malformed entries.
`test:contribution-ladder` covers the forecast and the Home card using the
stored choice. Browser check (light/dark, 390/1280, keyboard): hover, click and
tap open the breakdown; the dialog offers both scopes; the choice saves, and
the Expected month view agrees after a reload.
**Revisit when:** people exclude the same category month after month (offer
"always" first), or exclusions become common enough that a median would serve
most people without ticking.
**Source:** `app/dashboard/AllowanceBreakdown.tsx`, `lib/cashflow-forecast.ts`
(`needsAllowance`), `lib/contribution.ts` (`allowanceExclusions`).

### D-16 — September 24: refresh connected banks daily; ask only investment connections for holdings

**Status:** Active. Authorised by the founder on 2026-09-24, from the audit of
the same day.
**Decision:** (1) A Vercel cron (`/api/cron/plaid-sync`, 09:00 UTC, an hour
before the retention email) syncs every Plaid connection once a day. It
runs the same code as the Sync button (`lib/plaid-sync.ts`): transactions,
cached balances from `accountsGet`, and the person's need/want rules. It
takes the longest-unsynced connection first, and stops starting new ones
near the time limit, so leftovers go first the next day. Each run is
logged in `job_runs` as `plaid_sync` and expected daily. A connection
waiting for its owner to log in again is listed there without failing the
run. Any other failure fails it.
(2) Holdings are requested only from connections that hold an investment
account. "Reconnect" is shown only for errors that reconnecting fixes. Data
that is not ready, or not offered, is quiet.
(3) Migration `0042_function_security`: `rls_auto_enable()` is no longer
callable through the API, and `update_updated_at_column()` has a fixed empty
`search_path`.
**Why:** Balances only moved when someone pressed Sync, so the safe-to-contribute
figure, the emergency fund and last month's needs were as old as the last press,
which was months for some connections. The holdings request went to every bank, and a bank with only
current and savings accounts was refused for lack of investments consent,
so Net Worth told people to reconnect a working bank on every visit. The
advisor showed a SECURITY DEFINER function callable by signed-out visitors.
**Rejected:** (a) Plaid webhooks (`SYNC_UPDATES_AVAILABLE`): fresher, but they
need a verified public endpoint and the webhook URL set on every existing
connection, and daily is enough for a monthly plan. (b) Syncing on dashboard
load: it only helps people who open the app, and the email and Home card
would still read stale balances for everyone else. (c) Real-time
`/accounts/balance/get` or `/transactions/refresh`: both are billed per call.
Plaid's cached balances are refreshed on its own schedule.
**Deferred:** Supabase leaked-password protection needs the Pro plan; the
founder chose to wait. The household functions (`household_has_pro`,
`is_household_peer`, `my_household_id`) stay SECURITY DEFINER for signed-in
users on purpose: row level security calls them, and anon was already revoked
in `0035`.
**Trade-off:** One run a day means a balance can be up to a day old. It adds
no Plaid cost: Transactions is billed per connection per month however often
it syncs, and `accountsGet` is free (checked against the team's Pay as you go
rates, D-17). The stale-balance warning in the ledger now means a refresh
failed rather than that nobody pressed Sync.
**Evidence:** `test:plaid-refresh` (18 checks: which connections are asked for
holdings, what each error means, how a run is summarised, the schedule, the
cron secret, `job_runs` logging and the shared sync code). End to end against a
stubbed database: a missing or wrong secret gets 401, and the right one opens a
`plaid_sync` run, pages through connections oldest first and records each
failure by name. On production, after `0042`: `anon` and `authenticated` can no
longer execute `rls_auto_enable()` while `service_role` can; a new table still
gets row level security; `updated_at` still moves on update (both checked
inside rolled-back transactions); the advisor lists only the deferred items above.
**Revisit when:** a day is too slow (move to webhooks), connections grow past
what one run finishes (the deferred count in `job_runs` shows it), or the
project moves to Supabase Pro (turn on leaked-password protection).
**Source:** `app/api/cron/plaid-sync/route.ts`, `lib/plaid-sync.ts`,
`lib/plaid-errors.ts`, `lib/plaid-holdings.ts`, `app/api/plaid/holdings/route.ts`,
`supabase/migrations/0042_function_security.sql`.

### D-17 — September 24: stop paying Plaid for connections nobody uses; keep Pro at $3 for now

**Status:** Active. Authorised by the founder on 2026-09-24, after reviewing
the team's Plaid rates.
**Decision:** (1) A bank connection's row is deleted only once Plaid confirms
the connection is gone (`lib/plaid-remove.ts`). Deleting an account, whether
by the person or from admin, disconnects every bank first. If Plaid refuses,
the account is not deleted and the person is told which bank to retry.
Disconnect keeps the connection listed with an error instead of dropping the
row. (2) New connections require Transactions only, and ask for Investments
through `required_if_supported_products`. Investments is then added, and
billed, only when the person picks an investment account. (3) Pro stays at
$3 a month or $30 a year.
**Why:** Plaid bills Transactions and Investments monthly for each connection
it still has, used or not, and only `/item/remove` ends that. It needs the
access token, which only our row holds. Account deletion cascaded the rows
away without calling it, so each deleted account would have kept billing
with nothing left to stop it. The person would also have believed their bank
was disconnected. Disconnect dropped the row even when Plaid refused.
Listing Investments in `products` billed it on every connection. It also
limited Link to banks that offer both products, with an account for each.
**Pricing:** Each connection's monthly fees are small next to $3, but Pro
allows unlimited connections, the 90-day trial pays Plaid before Stripe pays
anything, and a free user's one bank earns nothing. With no paying users,
price is not the constraint. Fix the leaks first.
**Rejected:** (a) Raise the price now: no conversion data to price against,
and the leaks cost money at any price. (b) Delete the account anyway when
Plaid refuses: it leaves a connection billing with no token to remove it.
(c) `additional_consented_products` for Investments: it also avoids the fee
until first use, but `required_if_supported_products` is Plaid's documented
choice for keeping every bank listed while still loading investments where
they exist.
**Trade-off:** A Plaid outage can hold up an account deletion until a retry.
Investment connections still pay the Investments fee, as they should.
**Evidence:** `test:plaid-billing`: removal outcomes, both deletion routes
disconnecting before deleting the user, disconnect keeping a refused
connection, and the Link products. On the code before this fix, six of its
checks fail. End to end against a stubbed database with Plaid unreachable:
deletion returns 502 naming both banks and deletes nothing. A user with no
banks is deleted without calling Plaid. Plaid's usage records for the team
showed no billable connections through 2026-09-24, and its Link analytics
were too few to show whether anyone was turned away.
**Revisit when:** 20–50 people pay, Plaid costs pass about 40% of what a Pro
subscriber nets, or a Pro user regularly holds more than about five connections.
Price is then a positioning question for the $3k MRR goal as much as a margin one.
**Source:** `lib/plaid-remove.ts`, `app/api/user/delete/route.ts`,
`app/api/admin/users/[id]/route.ts`, `app/api/plaid/disconnect/route.ts`,
`app/api/plaid/create-link-token/route.ts`, `lib/pricing.ts`.

## How to add or supersede a decision

Use a stable D-number, date, status, decision, rationale, alternatives/trade-offs,
evidence, and revisit conditions. Update both the old status and replacement
link when superseding. Update the relevant contract in the same PR. Do not invent
historical approval or infer correctness from tests alone.

## Original March–April record — retained history

The original record follows unchanged so the reasoning is not lost. Its
implementation descriptions, numerical claims, providers, and operational
instructions are historical, not current requirements or verified advice.

| Original choice | Current interpretation |
| --- | --- |
| No login wall; searchable city input | Core intent retained in D-02 and PRD; old screen counts are historical |
| USD custom-city fallback; fixed starting balance / 7% assumptions | Implementation details superseded; inspect current calculator and D-07 |
| All wizard state in app/page.tsx with no persistence | Historical architecture; now consult HomeClient and journey helpers |
| DM Mono versus Syne; white/green palette; inline styling | D-04 and the current design system supersede old styling defaults |
| All city data static, no admin/database path | Historical; current source rationale is in cost-of-living.md |
| Auth/database platform selection | Rationale retained; use current code/setup docs for implementation |
| Vercel previews for every PR; prescribed commit identity | Superseded by D-06 and AGENTS.md; deployment exclusions/access controls apply |
| Latest pushed main as baseline | Retained and clarified by D-06 |

---

### Original decision log
Last updated: April 2026

> This file records **why** we chose X over Y. Critical context for any AI or new team member.

---

## Product Decisions

### [2026-03] No login wall on the calculator
**Decision**: Users can complete the full 5-screen wizard and see their FIRE number without creating an account or providing an email.

**Rationale**:
- The core insight (your FIRE number) is the hook 鈥?gating it destroys the viral loop
- ProjectionLab's free tier (no save) converts users because they see value first
- Reddit and social sharing only works if the experience is frictionless end-to-end
- First-time visitors from referral links have zero trust 鈥?don't ask for anything before delivering value

**Trade-off**: Harder to capture leads from single-visit users. Mitigated by waitlist form at bottom of page.

---

### [2026-03] Search-as-you-type city (not country 鈫?state 鈫?city cascade)
**Decision**: Single text input that filters 263 cities in real time. A "custom city" option always appears at the bottom of the dropdown.

**Rationale**:
- Country 鈫?State 鈫?City requires 3 interactions and doesn't work well for international cities (no "state" in most countries)
- Search-as-you-type is familiar (Google, Airbnb, every modern app)
- 263 cities covers ~95% of FIRE-relevant user locations 鈥?the long tail is handled by custom fallback
- Validated with user: confirmed preference over cascade approach

**Trade-off**: Users in truly obscure cities get the custom fallback 鈥?requires them to know their monthly expenses. Acceptable 鈥?these users are more financially aware than average.

---

### [2026-03] Custom city fallback uses monthly expenses in USD
**Decision**: When a city isn't in the list, users enter their estimated monthly expenses in USD. We multiply by 12 to get `state.col` (annual expenses), then apply the 25脳 FIRE rule.

**Rationale**:
- Monthly spend is the most intuitive unit for most people ("I spend about $2,500/month")
- Annual figures feel abstract; monthly is how people budget
- No good alternative: asking for annual is worse, asking for a COL multiplier is too technical
- For international users, USD is the lingua franca of FIRE community

**Trade-off**: Loses city-level tax accuracy (defaults to `tx` 鈥?no state income tax). Acceptable trade-off as custom city users are typically international anyway where US state tax is irrelevant.

---

### [2026-03] 25脳 rule with 7% real return
**Decision**: FIRE target = annual expenses 脳 25. Years to FIRE calculated with 7% annual compound return.

**Rationale**:
- 25脳 / 4% withdrawal rate is the FIRE community standard (Trinity Study)
- 7% real return (after inflation) is the historical S&P 500 average 鈥?widely cited and accepted in FIRE circles
- Using the community standard builds trust 鈥?FIRE-literate users will recognise it
- Deviating would require explanation and create doubt

**Trade-off**: Ignores existing savings balance (assumes starting from ~$27,400). Will add as a P1 input in Phase 2.

---

### [2026-03] All wizard state in app/page.tsx, not URL params
**Decision**: City, income, and savings values live in React `useState` inside `app/page.tsx`. Not stored in URL params, localStorage, or global state.

**Rationale**:
- Simplicity 鈥?no routing complexity for a 5-screen wizard
- No need for deep linking into specific wizard steps
- State doesn't need to persist between sessions (calculator is designed to be re-run)
- URL params would expose user financial data in browser history

**Trade-off**: Browser back button doesn't work within the wizard. Mitigated by "Back" button on each screen.

---

### [2026-03] DM Mono for the FIRE number, not Syne
**Decision**: The big FIRE number on the reveal screen uses `DM Mono` (monospace), not `Syne` (the display/headline font).

**Rationale**:
- Syne is wide and heavy 鈥?at large font sizes, a 7-digit number like "$1,375,000" overflows the container on most screens
- DM Mono is narrower per character by design 鈥?monospace fonts allocate equal width to each character, so long numbers stay contained
- Monospace also feels "calculated" and "precise" 鈥?appropriate for a financial number
- Already loaded via Google Fonts (no extra load)

**Trade-off**: Less "dramatic" visually than Syne at large sizes. Compensated by the slam animation and glow effect.

---

## Architecture Decisions

### [2026-03] All city data in lib/fire-data.ts, not a database
**Decision**: City COL data, tax rates, and FIRE calculation logic are hardcoded TypeScript in `lib/fire-data.ts`, not stored in Supabase.

**Rationale**:
- 263 cities is manageable as a static file 鈥?no database query latency
- No need for admin UI to update city data at this scale
- TypeScript typing catches errors at build time (wrong key names, missing fields)
- Zero infrastructure cost 鈥?no DB reads for every calculator use
- COL data doesn't change frequently 鈥?quarterly manual updates are fine

**Trade-off**: Updating city data requires a code deploy. Acceptable at current scale.

---

### [2026-03] CSS-in-JS via template literal in page.tsx, not Tailwind-only classes
**Decision**: The calculator wizard styles are written as a `<style>` tag with a template literal inside `page.tsx`, not as Tailwind utility classes.

**Rationale**:
- The wizard was converted from a standalone HTML prototype 鈥?keeping styles co-located with components reduces context switching
- Custom CSS variables (`--bg`, `--accent`, `--teal`) are deeply embedded in the design system 鈥?hard to replicate with Tailwind alone
- Complex animations (`revealSlam`, `fireGlow`, `pulseBorder`) are cleaner in raw CSS keyframes
- Tailwind v4 (in use) has different configuration from v3 鈥?existing Tailwind in the project uses v4 conventions

**Trade-off**: Not consistent with Tailwind used in the rest of the app. Acceptable for now 鈥?will standardise in Phase 3 if needed.

---

### [2026-03] Supabase for auth + database
**Decision**: Supabase handles Google OAuth and user data storage.

**Rationale**:
- Row Level Security (RLS) out of the box 鈥?no custom auth middleware needed
- `@supabase/ssr` integrates cleanly with Next.js App Router
- Generous free tier for early stage
- Open source 鈥?can self-host if needed later
- Auth UI React components speed up login page development

**Trade-off**: Vendor dependency. Mitigated by open-source nature and SQL portability.

---

### [2026-03] Vercel for hosting
**Decision**: Deployed on Vercel with automatic GitHub deployments.

**Rationale**:
- Zero-config Next.js deployment
- Preview deployments for every PR
- Edge network for global performance
- Vercel Analytics already integrated

**Trade-off**: Vercel Hobby plan doesn't support collaboration from non-owner GitHub committers. Solution: all commits must use the `Johnbulongdon` GitHub identity (`126181192+Johnbulongdon@users.noreply.github.com`).

---

### [2026-04] `origin/main` is the canonical implementation baseline
**Decision**: For future work, the latest pushed GitHub version on `origin/main` is the default baseline. Local unpushed workspace changes are not baseline by default.

**Rationale**:
- The product is edited from multiple machines, so local workspace state on one machine is not a reliable source of truth
- Vercel auto-deploys from GitHub, which means pushed remote state is the most consistent cross-machine implementation reference
- Using local history as the baseline caused design regressions by reviving an older dark/orange branch that did not match the intended pushed state

**Trade-off**: A local machine may contain newer exploratory work that is intentionally not yet pushed. In those cases, the user must explicitly state that local work should override the remote baseline.

**Operational rule**:
- fetch `origin/main` before starting
- compare local workspace drift against `origin/main`
- reason from `origin/main` unless the user explicitly names another base
- treat deployment/build IDs such as `6Tb7dySgE` as deployment references unless verified as git revisions


### [2026-04] White/green product system is the active UI baseline
**Decision**: Visible product routes should align to the white/green UntilFire system rather than the older dark/orange calculator prototype styling.

**Rationale**:
- The current brand direction uses white app frames, green actions, and dark green hero sections
- Multiple visual systems in one repo made routine UI work error-prone and caused accidental regressions
- Shared colors and page shells make it easier to extend dashboard, calculators, and learning content consistently

**Trade-off**: Some legacy inline styles still remain in route files, but future work should move toward shared tokens and reusable shells instead of introducing another page-specific palette.
