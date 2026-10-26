# UntilFire — current product context

Reconciled 23 September 2026. Decisions and their history live in
[DECISIONS.md](DECISIONS.md); document ownership lives in [KNOWLEDGE.md](KNOWLEDGE.md).

UntilFire is a **financial freedom app**.

**Headline:** See beyond your balance. Open up your life.

**Supporting sentence:** See your whole financial picture, understand your choices, and build toward the life you want.

Updated 27 October 2026 by founder decision (D-109). “See beyond” means both
understanding more than a current balance and seeing future possibilities.
“Open up your life” connects financial clarity to the user's own goals, without
requiring early retirement as the goal. Freedom date, useful next moves, daily
money management and progress are concrete ways the product earns this promise,
not a complete description of the product on their own.

The working customer hypothesis is busy early-career people who earn money but
lack the time or confidence to understand their overall finances and the impact
of life choices. This audience and the new copy are not yet validated. Test
whether target users can explain the product after reading the headline and
supporting sentence, rather than measuring whether they merely like the words.

The business goal remains $3k MRR. Prioritise activation, retention, trust and
conversion after value; this positioning change does not authorize feature
expansion, an onboarding redesign, or making bank connection mandatory before
value. Bank connection is setup; its value is the useful understanding revealed
afterward. Current runtime copy still needs a separate implementation and QA pass.

The previous slogan and rationale are preserved in D-109 in
[DECISIONS.md](DECISIONS.md); use the wording above for new positioning work.

## Direction and its reasons

- The first useful calculator result stays free and available without login.
  Users have little reason to trust a new financial tool before seeing value.
- Lead with freedom and a guided path. City/tax/global detail supports credibility,
  rather than becoming the main promise. Early qualitative feedback favoured
  clarity and practical next steps over more tracking; it is directional evidence,
  not proof of a market or willingness to pay.
- Guidance should use deterministic calculations and actual user data before an
  AI recommendation layer. Earlier AI guidance was reported as too generic.
- The cadence is daily (D-73, October 2026): a short Today list of one-tap items
  built from yesterday's money, with payday as the highlight. Completed days are
  counted, never streaked. This superseded the July monthly-cadence direction.
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
