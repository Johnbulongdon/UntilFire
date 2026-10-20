# Replay repairs, tax pause and fixed Home

Baseline: latest pushed main `8ae9fa6f529d422956029b73b038a83b0f27571f`.
Scope: mobile website replay repairs, the requested web/phone tax pause, and the
October 20 instruction to remove Home arrangement editing (D-94).
No raw replay, screenshots, analytics identifiers or customer financial details
are included in this public repository. Review evidence is local/private.

## Confirmed scope and draft proposals

The founder approved continuous number entry and previously requested the tax
pause. Their October 20 review rejects proposed editor-toolbar and recovery-card
repairs (old review items 6 and 7), replacing both with removal of the editor.
Date consistency, city entry, saved-profile loading, direct calculator entry and
landing-event deduplication remain implemented draft proposals pending review.
Do not interpret their presence in this draft as approval to merge or deploy.

Home now uses the standard card visibility, order and widths. There are no drag,
resize, hide/restore, inventory, reset, editor recovery or layout-save operations.
Old stored preferences are ignored, not deleted. Empty conditional cards leave
no grid slot. The native Home already uses a fixed composition; its obsolete
editor route redirects to Home and its editor mutation is removed.

Stable onboarding asks for monthly take-home pay. D-93 pauses tax estimators,
comparisons and model gross-up while preserving saved tax values. Historical
income has no gross/net provenance and is not silently rewritten.

## Visual evidence correction

The earlier component-only screenshots contained review labels and a placeholder
chart; they did not represent complete app pages and are superseded. New captures
use actual /dashboard and public calculator routes, including navigation and
real charts. Notes remain outside the app screenshots. Fictional local account
data substitutes for the unavailable authenticated environment. The temporary
data adapter and preview configuration were removed before release-code checks;
neither is committed. These are mobile-web captures, not native-device proof.

Local browser checks cover uninterrupted numeric/decimal entry and Enter submit,
Home/Plan date agreement for reached and future targets, city replacement and
keyboard selection, absence of tax/editor controls, and fixed Home despite old
hidden-card preferences. Light/dark and 390px/1280px reflow were checked without
horizontal document overflow. A deliberately pending local profile response
verifies the loading shell, not production save/reload.

Focused regressions check actual onboarding/date rendering, native tax-gate
behavior, standard Home cards, absence of layout persistence, and retirement of
the native editor. Legacy layout serialization tests remain for compatibility.
October 20 checks passed: npm run validate (both production builds, web TypeScript and lint), native TypeScript, changed-file native lint, test:replay-repairs, test:dashboard-layout, and whitespace review. Existing web lint warnings remain; no lint errors.

## Integration and release limits

Existing drafts #214 (assumption editors) and #269 (billing/API/projection repairs)
overlap files but were not merged or modified. Their eventual integration must
retain D-93/D-94 and reconcile the moved onboarding and exact-date display.

Google login and authenticated real profile save/reload were not exercised.
Physical iPhone Safari and native-device touch/rendering checks remain. No
migration or new dependency is needed. No merge or deployment is authorized.

Handoff: not ready
