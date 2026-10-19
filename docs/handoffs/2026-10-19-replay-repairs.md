# Replay repairs and tax pause

Baseline: latest pushed main `8ae9fa6f529d422956029b73b038a83b0f27571f`.
Scope: mobile website replay repairs plus the user-requested web/phone tax pause.
No raw replay, screenshots, analytics identifiers or customer financial details
are included in this public repository. Review evidence is local/private.

The replay shows unstable onboarding typing, inconsistent Home duration/age,
overlapping customization controls, an empty useful-card state, repeated city
editing taps and a brief zero-profile flash after reload. A temporary profile
flash is not evidence of permanent data loss. Canvas/video replay placeholders
are recording limitations, not confirmed product failures.

Implemented: stable onboarding component, take-home-only input, shared exact date
presentation, readable edit toolbar, recovery actions, saved-data loading gates,
ordered layout writes with error feedback, keyboard/click city choices, direct
calculator entry and landing-event deduplication. D-93 pauses tax features while
preserving settings and reporting tax as excluded from the model.

Existing drafts #214 (assumption editors) and #269 (billing/API/projection repairs)
overlap files but were not merged or modified. This task does not integrate their
age-picker or cash-deficit changes. Their eventual integration must retain D-93
and reconcile the moved onboarding component and exact-date display.

Local verification: continuous multi-digit/decimal entry retains focus; Enter
submits exact values; city replacement and Enter selection work; tax controls
are absent; edit controls measure 44x44; light/dark component views and 390px/
1280px reflow checked. Projection, layout, money-rule, life-change, Explore and
city SEO checks run. The replay regression also exercises actual rendered
components, native tax-gate behavior and delayed/out-of-order save scenarios.

Local preview has no configured PostHog token. Authentication and real profile
save/reload were not exercised against a user account. Physical iPhone Safari
and native-device touch checks remain. Temporary QA routes must be removed
before commit. No merge or production deployment is authorized by this task.
