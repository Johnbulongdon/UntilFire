# Motion and the future mobile app

Decision date: 2026-10-05. Status: user-approved direction; website examples require visual approval before production integration.

## Direction

Improve the mobile website first, keeping calculations, validation, data models and backend services independent of rendering components. Reuse these foundations when developing a native app. Shared authentication and billing services still need platform-specific integration and policy review; reuse is not automatic.

Use Motion for React for new website UI interactions. If a native Expo/React Native app is chosen, use Reanimated with the same motion specification. A PWA or web wrapper can retain web implementations, but native screens and animation components need adaptation. Do not promise zero rework or rewrite the website around React Native prematurely.

Share timing, easing, color, spacing and behavior specifications, rather than browser-specific animation code. Build a small native proof of concept with sign-in, loading a saved plan, changing an input and viewing the result before committing to a full app architecture.

## Why

The user expects phones to become the main product surface and wants today's work to contribute to the app rather than be discarded. A working mobile website provides immediate value while preserving the financial engine and product decisions. Desktop remains useful for detailed planning.

## Existing mobile work

Latest main already contains an Android Trusted Web Activity using `android-browser-helper` (`android/app/src/main/AndroidManifest.xml`), not a React Native app. Assess this existing web-based path and its build status before choosing a new native framework. No claim is made here that the Android app is built, published or production-ready. Reanimated is conditional on choosing native React Native, not a mandated migration.

## Incremental adoption

Main already includes GSAP and existing CSS/custom animations. Do not replace these wholesale or add two animation owners to the same element. Motion is the preferred new UI layer, not permission to rewrite existing working motion. GSAP remains available for genuinely complex marketing choreography; Remotion is for video export, not normal app interactions.

Financial answers must be calculated independently of animation. Inputs respond immediately; animation never determines correctness, delays navigation, or invents intermediate financial results. Keep cubes identifiable as years when they move between groups.

## Initial specification

- Button feedback: 160–200ms, subtle press, visible keyboard focus, at least 44px touch target; no hover-only meaning.
- Step changes: about 240ms, small directional movement and opacity; preserve entered data and move focus to the new step heading without waiting for motion.
- Disclosures: animate height for about 240ms; keep expanded state and label accessible. Hidden content must not remain focusable.
- Result changes: about 650ms where useful, with final values immediately available to assistive technology. No fake dates, fixed examples presented as user results, or moving chart axes.
- Respect system reduced motion, offer a user control, and suppress decorative motion. Essential content must remain visible without animation.
- Test repeated/reversed input, interrupted transitions, keyboard, touch, 390px/1280px, overflow and reduced motion in a real browser. Build success alone is not visual verification.

## Approval and evidence

`prototypes/motion-review` is an isolated interaction study, not a production route or faithful screenshot. Its sample fields do not save or calculate a plan. Latest-main source and the public homepage informed the chosen interactions; browser visual inspection was unavailable at authoring time. Mint colors are the user's current preview preference, not authorization to reskin production.

Source: user's October 5 website/app discussion and request to record the decision and preview Motion interactions. Revisit when an app platform is selected or real-device testing contradicts the patterns.

Official references: [Motion](https://motion.dev/docs/react), [MotionConfig](https://motion.dev/docs/react-motion-config), [Reanimated web support](https://docs.swmansion.com/react-native-reanimated/docs/guides/web-support/).
