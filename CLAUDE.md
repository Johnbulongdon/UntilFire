# UntilFire — Claude entry point

Read the user's request and [AGENTS.md](AGENTS.md) first. It owns shared authority,
baseline, engineering, verification, collaboration, and publishing rules for
both Claude and Codex. Read [project memory](docs/KNOWLEDGE.md), relevant entries
in [the decision log](docs/DECISIONS.md), the roadmap, recent changelog and commits,
then inspect relevant code before editing. Use available skills and slash commands
when useful; gstack and another agent's local tool paths are not prerequisites.

## Integration responsibility

Follow the [shared handoff SOP](AGENTS.md#codex-and-claude-handoff-sop).
Claude is the default integration owner; either agent can implement any task.
Use separate worktrees and task branches during concurrent work.

Check open PRs for overlap before starting. Before finishing an authorized
publishing task, check for non-draft Codex PRs whose bodies contain
`Handoff: ready for Claude`. Confirm the user-authorized scope, reviewed head
and publication authorization; older open PRs are not an automatic merge queue.

Publish your own verified work without waiting for a pending Codex task. Then
integrate eligible handoffs one at a time from a clean workspace: incorporate
latest main, preserve both contributions, resolve conflicts and verify the
combined result before publishing. Leave blocked PRs pending with a clear reason.
Ask the user for incompatible product choices, not routine Git conflict handling.
Never force-push main.

Report what merged and confirm the resulting production deployment before telling
the user to test the live site. These checks happen during active tasks; this file
does not wake an idle session or create background automation. If GitHub access
is missing, report the limitation instead of claiming the queue was checked.

## Product constraints

UntilFire is a financial freedom app: **Personal finance that sets you free.**
Show a freedom date, one useful next move, and ongoing progress toward work
optionality. The business goal is **$3k MRR**, through activation, conversion,
retention, trust, and acquisition. Keep work bounded to the user's request.

- Keep the full initial calculator useful, free, and available without login.
- No surprise surveys, feedback, signup, payment, or bank prompts before value.
  Dashboard and Pro continue the journey after the first result.
- Required inputs stay limited to income, expenses or savings, and current
  savings/net worth. Support gross annual or monthly take-home income and monthly
  savings or spending. Age is optional. Retirement location is skippable; use
  spending-based targets when skipped.
- Feedback is user-initiated after value. FIRE personality/type is a secondary
  flow in Profile, not required onboarding or a projection input.
- Lead with freedom and the guided path; city/tax detail supports trust.
  Prefer deterministic calculations and actual user data before AI recommendations.
  No streaks or daily-engagement mechanics.

## Current navigation and design

[App structure](docs/design/app-structure.md) owns placement and navigation;
[design system](docs/design/design-system.md) owns visual contracts.

- **Money:** actual finances plus operational budgets and upcoming/expected
  payments. Cashflow (Transactions, Upcoming, Categories, Budget), Net Worth,
  Debts, Insights.
- **Plan:** long-term projections, assumptions, scenarios, and targets. Freedom
  Date, Scenarios, Goals, Contributions, Expat FIRE, Citizenship, Learn.
- **Home:** synthesis and next moves, with no independent financial inputs.
  Layout customisation is allowed.
- **Profile:** account settings, billing, household setup, and FIRE personality/type.
  Planning assumptions live in Plan (`FireAssumptionsCard`), not ProfileTab.

The current shared system is v3 Warm: cream/light and warm dark via `.dark`,
Fraunces display headings, Manrope body, DM Mono financial data with tabular
numerals. A prominent freedom-date display is the explicit Fraunces exception;
dates in data tables and `Stat` remain DM Mono. Instrument Serif is reserved for
landing/HomeClient marketing heroes.

**Green acts; teal means freedom/progress.** Primary actions use green; neutral
secondary/ghost controls and red destructive actions are valid. Teal is not a
button or generic success color. Meaning must not depend on color alone.

Reuse `components/ui/` and tokens in `app/globals.css`. Use the named type classes
and documented scales, with bounded primitive-specific exceptions in the design
system (including Button and Stat). Do not invent tokens or classes. Adopt the
system in touched UI, without unrelated reskins. Check both themes and browser
behavior using the shared QA requirements; tokens do not provide correctness for
free. Documentation edits alone do not authorize a redesign.

## Working map

- `app/page.tsx`, `app/HomeClient.tsx` — public landing and no-login flow.
- `app/dashboard/page.tsx` — dashboard shell, navigation, Home and planning views.
- `app/dashboard/ProfileTab.tsx` — account/settings and FIRE personality/type.
- `app/dashboard/FireAssumptionsCard.tsx` — planning assumptions used in Plan.
- `app/dashboard/ContributionsTab.tsx`, `app/dashboard/NextContributionCard.tsx`
  — contribution plan and matching Home step. Read
  [Next contribution](docs/design/next-contribution.md) for persistence, snapshots,
  account selection, and remaining monthly-email work. Named allocation
  suggestions remain an unresolved direction requiring legal input before shipping.
- `lib/fire-data.ts` — city, tax, and calculation helpers; `lib/fire/` — FIRE logic.
- [Cost of living](docs/cost-of-living.md) — read before changing city pricing or
  Census/BEA/housing imports.
- [Analytics contract](docs/analytics/EVENTS.md), `lib/analytics-events.ts` — events.
- [Search Console](docs/search-console.md) — source setup and analysis caveats.
- [Roadmap](docs/ROADMAP.md) — planning and implementation notes, not proof of
  missing features or live correctness; [changelog](CHANGELOG.md) and code provide
  additional evidence.
- `package.json` — executable command inventory; shared rules explain which
  checks to select, including financial regression guards.

The app repo is the single maintained home for public-safe project knowledge,
including direction and rationale. The vault is historical source material;
see [the reconciliation record](docs/history/vault-reconciliation.md). Preserve
decision history and update the relevant documents in the same PR as a change.
Do not reverse a choice without reading why it was made.
