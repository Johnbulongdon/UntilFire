# UntilFire — current product requirements

Reconciled 23 September 2026. These are intended constraints, not a claim that
every production flow passes. [CONTEXT.md](CONTEXT.md) owns positioning,
[DECISIONS.md](DECISIONS.md) owns rationale, and [features.md](features.md) maps
current code and feature contracts.

## First value and continuation

- Provide a useful freedom date and one understandable next move before signup,
  payment, bank connection, or feedback pressure. The initial calculator is free
  and usable without login.
- Support understandable income, spending/savings and existing savings/net-worth
  inputs. Allow gross annual or monthly take-home income and savings or spending.
  Age and retirement location are optional; skipped location must not block value.
- Keep assumptions transparent and units consistent. Distinguish missing from zero,
  handle unreachable targets honestly, avoid double-counting and round at the
  appropriate boundary. Test relevant financial logic.
- After value, offer a clear, low-pressure save/continue path. Share only safe
  insights; do not put raw financial data into public URLs or analytics.
- Feedback must be optional, deliberate and non-submitting until the user acts.
  Dismissal should be respected. The feedback deep-link behavior and the
  calm-startup guard are a recorded verification discrepancy, not silently
  resolved by these requirements.

## Ongoing product

- Show a useful next move based on actual inputs and deterministic calculations.
  Do not imply that an AI adviser or named-asset recommendations are approved.
- Let Money manage actual finances, budgets and upcoming payments; let Plan own
  long-term projections, scenarios and contribution targets. Home has no separate
  financial input model. Use the [navigation contract](design/app-structure.md).
- Preserve household boundaries and avoid counting confirmed shared accounts
  twice. See [family accounts](design/family-accounts.md).
- Follow the [Contributions contract](design/next-contribution.md); a Home card
  and an email must not derive different steps from the same plan. Monthly email
  remains unfinished, and live persistence/derivation needs separate QA.
- Pricing copy must follow `lib/pricing.ts`; live billing needs its own verification.
  Historical pricing and packaging brainstorms do not override this contract.

## Interaction and evidence

Use [the design system](design/design-system.md) and the shared verification
requirements in [AGENTS.md](../AGENTS.md): labeled inputs/errors, keyboard and
focus support, touch targets, reduced motion, light/dark checks, mobile/desktop
browser QA and overflow checks. Target WCAG 2.2 AA without claiming compliance.

Maintain the [analytics contract](analytics/EVENTS.md) alongside emitters. Measure
intent/transitions without private financial values or free-text feedback bodies.

The roadmap is a plan; source code is implementation evidence; production checks
are live evidence. Investigate conflicts. Older detailed wizard specifications
remain retrievable at app commit `8775078` and in the vault snapshots listed in
[the reconciliation record](history/vault-reconciliation.md). They are historical
and must not be used to restore old screen counts, palettes, or absent features.
