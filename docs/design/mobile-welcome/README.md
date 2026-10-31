# Mobile welcome — product preview

Selected by John on 31 October 2026: original option 3, not the later hybrid or
pastel landscape. See [reference.png](reference.png). Code baseline:
origin/main cd78930. Scope: the phone welcome screen only.

- Keep the small approved logo, Make room for more life headline, short supporting
  sentence, yellow freedom-date example and mint Until payday example.
- The two-card illustration is a static, clearly labelled example, not financial
  data. Its image accessibility label describes the same example for screen readers.
  It keeps its light palette in dark mode; surrounding UI uses theme tokens.
- Two equally wide full-size actions. Get started opens the current goal question;
  returning users retain the existing sign-in and saved-plan recovery flow.
- A coordinated short entrance respects system reduced motion. Scrollable content
  keeps controls reachable on short screens and with larger text.
- No A/B assignment, feature flag, new analytics event, SDK/runtime/version change,
  bank prompt, dependency, or new question. A later experiment is deferred for traffic
  and measurement planning, rather than claiming this design improves conversion.

Artwork: built-in ImageGen, derived from the selected mock; illustrative labels and
figures remain inside the image. Source image exec-66cf8540-e60b-4dfd-b963-d04b82467949.png;
bundled copy mobile/assets/welcome/product-preview.png. Existing brand lockups reused.

Phone distribution remains subject to the existing release process. This PR does
not reconcile the unmerged Android 0.2.1 release branch, publish an update, or submit
another store build.
