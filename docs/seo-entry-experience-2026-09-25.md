# Savings-rate landing experience — 25 September 2026

Baseline: `cd2b2faa88c741869110464555ded0ef87b9cd34`. The user asked that SEO
pages serve real visitors well and help them continue toward registration.
This pass follows the existing free-value-before-signup direction (D-02),
without changing the calculator model or introducing an early account gate.
Reconciled with `bc43982c21b6c95c68f8fee2de9cc7f4501659ee` before handoff,
preserving the new net-worth comparison. Its regression guard also passed.

## Observed friction

The live savings-rate page matches main. At 390px, navigation crowds the logo,
and the three-column result breaks the timeline onto separate lines. All three
inputs have visible labels but no programmatic label association, and their
inline styles suppress the focus outline. After the comparison, readers get
explanatory text and indirect links, but no prominent continuation step.

## Changes and boundaries

Use existing Field/Input, Card and Stat components with a scoped responsive
layout and visible focus. Stack results at narrow widths and allow navigation
to wrap. Add a clear next step after the free comparison: open the main calculator,
see the freedom date, then choose whether to register and save a plan.

The new link carries only `source=calculator-savings-rate-result`, through the
existing acquisition mechanism. Inputs are not transferred or put into URLs.
The copy does not claim they are saved. This source measures continuation into
the main funnel; it does not identify organic traffic on its own. Search titles,
canonical, FAQ, formulas, defaults, and main onboarding are untouched.

## Success criteria after confirmed deployment

Monitor savings-rate page search clicks and engaged landings, then calculator
starts, reveals and signup completion for the new source. Separate organic
referrers from other sources where reporting supports that distinction. Verify
event receipt and source persistence before drawing conversion conclusions.
Compare complete 28-day windows, excluding internal traffic and accounting for
reporting lag; low counts and overlapping releases limit causal claims.

Readability and accessibility fixes are directly verifiable. A registration or
ranking lift remains a hypothesis until production data supports it. Do not
equate an added CTA with an additional registered user.

## Integration

Verification: production build, focused ESLint, SEO guard and FIRE projection
guard passed. Browser checks confirmed named inputs, visible 2px keyboard focus,
the 30% / $1,500 example, a 48px continuation target, and source persistence in
the main calculator. No overflow at 320px, 390px, 768px and 1280px. Mobile light
and desktop dark screenshots reviewed. The primary link's text contrast is
4.58:1 in light mode and 5.94:1 in dark mode. This is targeted verification,
not a claim of full-site accessibility compliance or live event receipt.

Prepared separately from brand PR #134 and Coast FIRE PR #135. Preserve their
changelog entries during integration. No migration, dependency, environment or
deployment configuration changes. Claude remains the integration owner.
