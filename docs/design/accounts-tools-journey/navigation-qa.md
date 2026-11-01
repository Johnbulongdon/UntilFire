# Creator and account setup navigation repair

Baseline: origin/main 609b323. Scope approved by John after the navigation audit; D-131 owns placement.

## Changes

- Web Creator programme → `/invite/provider-links` → Creator programme. Profile member sharing uses the same editor with an explicit Profile return; no creator enrolment is required. Sign-in returns to the exact allowlisted editor address. The old Money editor URL forwards to the canonical route.
- Phone Profile → Creator programme owns provider editing. Give a month preserves its own return. `/provider-links` forwards to `/creator`. Explicit back callbacks match the visible labels.
- Money provider discovery reserves a handoff ticket only; it does not read/write setup progress or direct the user into Plan. Existing accounts open Money's account view.
- Plan's account picker stays within Account setup on both platforms, preserving selected provider, purpose, country and comparison state while returning to setup. The existing-account choice opens its editor directly. Explicitly choosing another account resets picker state. Web focuses the visible heading on entering/leaving the picker.
- The shared handoff helper writes setup progress only through the explicit Plan callback, after the ticket is validated. Referral attribution, approval, commissions and financial calculations are unchanged.

## Verification

- Existing real-handler scenarios: 28 pass, plus web/phone replay privacy guards.
- Existing referrals: 70/70; Journeys: 23 paths. New shared-handoff tests exercise Money without Plan writes, explicit Plan start, invalid/stale handoffs and safe sign-in return allowlisting.
- Full web validate passed; final production build and web/phone TypeScript passed after final source changes. Root and mobile changed-file ESLint use --no-ignore for mobile.
- Actual web components with isolated synthetic transport: creator-to-editor/back, ordinary-member Profile context and account switching, legacy redirect, Money handoff with zero setup rows before/after, in-place Plan browse/return, retained comparison selection, direct existing-account editor and explicit Plan handoff returning to applying state. URL stays on Account setup; heading focus verified.
- Browser layout at 1280px and narrow dark 390px: no horizontal overflow. Screenshots stay private outside Git.
- No production writes, migration, programme activation, dependency/native-config changes or release during this follow-up. Phone export and physical-device status are recorded in the PR; physical hardware-back, external browser return and screen-reader acceptance remain pending. The browser fixture is not a live production acceptance test.

## Provider eligibility clarification

- Approved catalogue providers are eligible without a connected account. The server continues to enforce live/member-enabled programmes, HTTPS domain matching and review before invitee use.
- Actual-handler coverage increased from 28 to 32 scenarios: unknown providers and domain override attempts, disabled programmes, valid submission without a connection, and mismatched stored links at approval/resolution.
- Web and phone show the approved provider website and validate mismatches before submitting. Actual web form feedback was verified using isolated synthetic accounts; no production writes.
- Targeted web/phone TypeScript, changed-file ESLint, navigation guards, all 17 partner-offer checks and diff whitespace checks passed for this clarification. The earlier full build/export evidence above predates this small client validation and copy follow-up.
