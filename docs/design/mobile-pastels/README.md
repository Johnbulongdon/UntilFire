# Mobile pastel surfaces — 31 October 2026

Baseline: latest origin/main 28817af. Scope: native Money, Plan and Profile presentation. Existing lighter Next Horizon palette, exact routes, calculations and account state are preserved. Original welcome option 3 remains separate in PR #340; native 0.2.1 release preparation remains separate in PR #326.

Money shortcuts use lilac, blue, mint, yellow and pink. Plan tools use lilac What if, yellow Goals, blue Contributions and mint Explore. Profile uses coloured settings icon wells and a lilac FIRE-type well. Top summary chips use yellow freedom, blue budget, mint safety. These are grouping colours; financial shortfalls retain their existing labels and semantic colours.

Pastel wells use fixed #151719 ink in either theme. Surrounding labels follow the theme. Primary actions remain unchanged. Heavy bottom edges are removed from the changed shortcut tiles; pressed states use opacity/scale without shifting neighbouring content. Plan next-move icons and contribution step labels now use theme ink; contribution bars and funded badges use labelled pastels.

## Verification

- Mobile TypeScript and focused ESLint passed; existing unescaped apostrophes in touched JSX were escaped without changing displayed copy.
- Android, iOS and web Expo exports passed with the temporary QA route removed.
- Actual shared FeatureTile and SettingsRow components inspected in a local fixture at 390px container width (342px content), light and dark. Money retains four shortcuts per row and a visible numeric Review badge. Plan notes wrap without truncation. Profile settings labels and icons remain readable.
- Review tile callback verified with its /review destination in the fixture; production route strings preserved. No credentials or financial data used. No browser console errors.
- Hooks, imports, accessibility button labels, stable route keys and dependency footprint reviewed. No new runtime, package, SDK, analytics or financial changes.

Screenshots: C:/Users/Chunky SEAL/.codex/visualizations/2026/10/19/01a15267-d11c-7b30-9624-f0d85edfe90a/mobile-pastels/ (money-light/dark, plan-light/dark, profile-light/dark.png). Interactive local fixture: http://127.0.0.1:4211/palette-qa. Fixture and preview controls are excluded from the shipped source.

Limits: these are actual component previews, not screenshots of an installed signed-in Android build. The browser viewport override did not change CSS dimensions, so width was constrained on the fixture instead. Physical Android/iOS, TalkBack/VoiceOver, larger system text and full signed-in flows remain device acceptance checks. No merge or phone publication authorized by this task yet.

31 October release integration: John authorized the remaining palette refinements and shipment. PR #342 now integrates the original welcome (PR #340) and the already-published Android 0.2.1 configuration (PR #326), preserving both histories and all release notes. Category wells use full pastel fills with fixed dark icon ink, Plan saving/score charts use labelled pastels, and Today Start loses its heavy edge. Tax comparisons remain gated. Final combined mobile type/lint and all-platform exports pass; installed-device acceptance remains John's check. Phone workflow compatibility and production promotion results are recorded below when verified.
