# UntilFire — current product context

Reconciled 23 September 2026. Decisions and their history live in
[DECISIONS.md](DECISIONS.md); document ownership lives in [KNOWLEDGE.md](KNOWLEDGE.md).

UntilFire is a **financial freedom app**: **Personal finance that sets you free.**
It shows a freedom date, a useful next move, and continuing progress toward work
optionality. The business goal is $3k MRR. Prioritise activation, retention, trust,
and conversion after value; feature breadth alone is not the goal.

## Direction and its reasons

- The first useful calculator result stays free and available without login.
  Users have little reason to trust a new financial tool before seeing value.
- Lead with freedom and a guided path. City/tax/global detail supports credibility,
  rather than becoming the main promise. Early qualitative feedback favoured
  clarity and practical next steps over more tracking; it is directional evidence,
  not proof of a market or willingness to pay.
- Guidance should use deterministic calculations and actual user data before an
  AI recommendation layer. Earlier AI guidance was reported as too generic.
- The cadence is monthly progress, not streaks or daily-engagement mechanics.
  The July positioning update superseded earlier gamification analogies.
- Bank connection, payment, feedback and signup must not obstruct first value.
  Feedback is optional and user-initiated; use calm, non-judgmental language.
- Record reasoning when changing a choice so future agents can understand why
  it exists instead of repeatedly replacing it.

## Current contracts, not a second feature inventory

Navigation is Home / Money / Plan, with Profile in the user menu.
[App structure](design/app-structure.md) defines input ownership and destinations.
[Design system](design/design-system.md) defines v3 Warm and its bounded exceptions;
this context does not authorize reskinning existing production routes.

[Feature map](features.md), [roadmap](ROADMAP.md), and [changelog](../CHANGELOG.md)
describe implementation with evidence. Household, PWA/TWA foundations, scenarios
and Contributions exist in code. Monte Carlo was removed. Monthly contribution
email and named allocation recommendations must not be implied to exist.

Use `lib/pricing.ts` for current display pricing and trial copy; actual billing
must be checked against Stripe when relevant. Older $4.99 notes are historical,
not current price authority. Likewise, do not reuse old 10%/7% mixed-return
assumptions: the projection contract must state its units and real/nominal basis.

Use [PRD.md](PRD.md) for enduring requirements, [launch context](planning/launch-context.md)
for dated plans and their limits, and `package.json` for the current stack/scripts.
The vault is retained as historical source material, not a place agents must
keep updating. Its useful conclusions were reconciled in this repository.
