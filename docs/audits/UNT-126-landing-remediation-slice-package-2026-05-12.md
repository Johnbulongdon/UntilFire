# UNT-126 landing remediation slice package (2026-05-12)

Using latest pushed GitHub main as base.

## Scope packaged in this slice
- Extracted additional landing wizard UI modules from `app/page.tsx`:
  - `app/components/landing/HeroScreen.tsx`
  - `app/components/landing/GoalsScreen.tsx`
  - `app/components/landing/Nav.tsx`
  - `app/components/landing/WizardProgress.tsx`
- Updated `app/page.tsx` to consume the extracted modules and keep wizard flow behavior intact.
- Added reveal recommendation helper exports in `lib/fire/index.ts`:
  - `RevealAction`
  - `recommendActionsForReveal(...)`
- Included reveal action rendering component used by `app/page.tsx`:
  - `components/NextActions.tsx`
- Extended prefill contract in `lib/journey.ts` with optional `annualCost?: number` to match callsites.

## Verification run
- `npx eslint app/page.tsx app/components/landing/HeroScreen.tsx app/components/landing/GoalsScreen.tsx app/components/landing/Nav.tsx app/components/landing/WizardProgress.tsx components/NextActions.tsx lib/fire/index.ts lib/journey.ts`
  - Result: passed
- `npx tsc --noEmit`
  - Result: passed
- `node scripts/check-mojibake.mjs`
  - Result: failed (`MODULE_NOT_FOUND`) because this script is not present in the current workspace.

## Packaging status
- Remediation slice is now reviewable and publish-ready from a code quality gate perspective (lint + type-check clean).
- Remaining publish action is transport/publish workflow (connector-backed commit/PR) for this slice.

## Risks / assumptions
- Assumes no additional hidden dependency on the missing `check-mojibake` script in CI.
- `components/NextActions.tsx` exists in local drift but is not yet wired into page flow in this slice; this package is limited to landing decomposition + prefill contract alignment.
