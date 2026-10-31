# Mobile welcome verification

final result: passed for implementation and browser smoke checks; native device acceptance remains pending.

Baseline: origin/main cd78930. Selected source: reference.png, original option 3.

## Fidelity

Compared the selected mock with the actual Expo welcome route at a measured 390 x 844 CSS viewport. Same two-line headline, supporting copy, small lockup, overlapping yellow freedom-date and mint payday examples, equal full-width actions, and reassurance. Reused the existing logo and Inter typography. Artwork is illustrative and clearly labelled; no account figures are displayed. Intentional dark-theme adaptation follows the existing phone theme: dark background, reversed logo and action colours. Product cards retain their light palette.

Fixed an issue found during verification: React Native Web used the image's intrinsic 1330-pixel height; an explicit proportional height now keeps it within the phone layout. Final button bounds: Get started 342 x 56 at y668, sign-in 342 x 56 at y734. No horizontal overflow at 390 CSS pixels. Screenshot: C:/Users/Chunky SEAL/.codex/visualizations/2026/10/19/01a15267-d11c-7b30-9624-f0d85edfe90a/mobile-welcome/dark-390.png.

## Behaviour and accessibility

- Actual Get started opens the existing goal question; Back returns to welcome.
- Actual existing-account action opens the real sign-in form; Cancel returns. No credentials submitted or financial data changed.
- Both actions expose button roles and labels, with a 56-pixel minimum height.
- Heading and descriptive image accessibility label verified in the rendered accessibility tree.
- No console errors during the verified welcome/navigation smoke test.
- All four entrances explicitly respect ReduceMotion.System; no continuous animation.
- ScrollView, content-based text layout and existing system font scaling retained for short screens and larger text.

## Validation and limits

Mobile TypeScript, focused ESLint, diff whitespace check and Expo Android/iOS/web bundle exports pass. These are bundle checks, not installed-device tests. Hooks and shared-button changes reviewed: no conditional hooks, new dependency, altered existing button kind, auth flow, account state or financial calculation.

Physical Android/iOS, Dynamic Type, VoiceOver/TalkBack and light-theme rendering were not exercised in this environment. A requested 320 x 568 browser override changed screenshot clipping but the measured CSS viewport stayed 390 x 844, so it is not counted as compact-device verification. Verify these device cases before a phone release. No merge, OTA update or store build has been published by this task. A/B testing remains deferred.
