# Pill controls — October 9 review

Compact values rest in a pill and open a focused editor. Long text remains a text field; exact numeric entry stays available inside editors.

## Implementation

Plan assumptions adopt this pattern: age, retirement city, lifestyle, tax home, growth and retirement tax. Phone age uses a centered wheel; desktop uses a native select. City choices are keyboard-accessible buttons, with typed fallback preserved. Editors keep existing callbacks and calculations, close with Done or Escape, and return focus. Shared Select now has pill styling and minimum 44px height. Other hand-built controls require explicit migration.

Feedback says Updated rather than Saved: database confirmation belongs to the dashboard persistence status. Opening the wheel must not overwrite missing or out-of-range ages before interaction. The existing 18–100 range is retained.

## Baseline and verification

Clean isolated branch based on latest pushed main 9672e65. Claude's onboarding, transaction and dashboard work is preserved. Existing warm tokens are retained. UNTILFIRE_DEFAULTS.md is absent from this baseline; maintained design-system.md supplies the available visual contract.

- Full npm run validate passes: production builds, TypeScript and ESLint.
- Single-location regression passes 9/9.
- Plan freedom-date guard passes. Its tax-card assertion now checks the JSX attribute, preserving the retirement-target requirement while removing an obsolete 120-character text limit.
- Component browser QA: desktop age and city selection, Escape, focus return, phone wheel layout and light/dark overflow checks.
- Authenticated save/reload remains pending: this worktree has no app environment configuration or signed-in local session. Source tracing confirms the existing callbacks feed the debounced user_budget persistence path; this is not runtime verification.
- Physical-device touch remains pending; a narrow preview does not establish it.

## Integration gate

Handoff: not ready. Keep the PR draft until authenticated edits survive reload and the wheel is verified with touch. No migration or dependency change is introduced. No merge or deployment is authorized in this task. Then refresh main, reconcile overlap, reverify and hand off to Claude.
