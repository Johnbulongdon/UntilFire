# Android 0.2.1 release

Requested by John on 29 October 2026: build and submit the approved UntilFire branding update. Baseline: GitHub main b57b9665885d36e80f61ee37816c5d7ab516bb9d.

- Package: com.untilfire.app; Expo project 4a8066dc-ad65-4ae0-9c9e-ebcc906cf72b.
- Production build profile; remote auto-incremented Android version code; app-version runtime 0.2.1.
- Google Play submission profile: alpha track, draft status. Uploading does not publish the release to testers or public production.
- Includes the merged horizon icon/adaptive icon/splash, Inter fonts, pastel categories, onboarding and payday interaction updates. Browser-only calendar changes are not represented as native calendar redesigns.
- Keep SDK 57 and the existing signing identity. SDK58 PR #306 and account/refund migration PR #320 are separate.

Release preparation removes the deprecated duplicate expo.splash field while retaining the splash plugin, adds the SDK-compatible expo-asset peer required by expo-audio, and excludes local credentials/tooling from the EAS upload. No mobile scripts were added.

Checks: mobile TypeScript and Android export passed. The archive was inspected locally: required app/logo/shared code present, local key/session/tooling files excluded. Expo Doctor now passes schema and required peers (19/21); remaining React Native Directory/Plaid and SDK/Sentry-version warnings are retained, not suppressed. Broad web-rule lint reports pre-existing unescaped-text errors outside the release changes; release-file lint is checked separately. Physical-device verification remains required after installing the new binary.

Build/submission results will be linked in the release PR after EAS completes.
