# Landing refinement verification — 30 October 2026

Baseline: origin/main f2da67ce31850027a67077f9d4871bc30f793152 (PR #331). Work remains in F:/Claude-Untilfire, branch codex/landing-polish. Review preview: http://127.0.0.1:4204/.

- Approved hero headline, tagline and supporting copy preserved exactly (diff and source comparison).
- Phone hero spacing reduced, reassurance pills unboxed on phone, no new copy or onboarding step.
- Slider has a direct drag prompt, accessible value text and 220ms result feedback only when reduced motion is not requested. React sibling keys are unique; pointer and rapid keyboard changes verified after the correction: +$250 / 12 months / 2041 to +$550 / 25 months / 2040, with a single result label.
- Free and Pro allowances shown using icon tiles: 1 bank connection vs unlimited, consistent with app/pricing/page.tsx. Prices and standard/referral trial labels still use lib/pricing.ts. No billing changes.
- Calendar dates enlarged to 40px high, month controls/reset/category controls to 44px high, small touched labels increased. This is not a claim of full accessibility conformance.
- DirectoryBadges.tsx is unchanged: links, source images and verification attributes preserved. Presentation is small and grayscale, full-color on hover/focus, no promotional enclosing panel.
- Browser: 1280px desktop and narrow 330px phone checked; document scroll width equals viewport width at both. Light and dark plan comparison inspected. See the cropped public-example screenshots beside this report (no browser/account chrome).
- Final npm run build passed, including Next's type and lint checks; changed-component ESLint, test:seo and test:start-ctas passed. Existing unrelated lint warnings remain.
- Local preview console reports missing PostHog token and local Vercel Analytics endpoint 404, plus CSS preload warnings. These are local environment/instrumentation limitations, not a production analytics verification. No landing runtime exception observed after the slider-key repair.

Scope: public landing presentation only; financial calculations, native app and account data unchanged. The notes below record subsequent approved work; release status is tracked in PR #332.

Follow-up requested by John: fill Pro with seven bank icons plus a Plus icon (the text still says unlimited); align bill rows with dedicated name, date and amount grid columns. Globe directions discussed only, not implemented: compact global-planning chapter preferred, currency-led alternative, or city-exploration alternative. Existing WorldGlobe, supported currency list and city pages provide grounding; Plaid bank coverage is configured separately and defaults to US. Do not claim universal bank coverage. Follow-up build/visual checks recorded after completion.

Follow-up verification: final build, changed-component ESLint, SEO/start-action guards and diff checks passed. Browser confirmed seven Pro icons plus Plus, and consistent right-aligned date/amount columns in the 1036px example preview; narrow 466px layout also inspected for the Pro tile. Motion remains a separate local-only study at port 4205. Production unchanged.


## Approved globe and motion implementation

The earlier local-only globe/motion study is now implemented as production React components, authorized for merge and shipment by John. Placement: after Less guesswork, before stories/pricing. The approved opening copy remains unchanged.

- Globe uses existing geographic data with lazy-loaded canvas, reserved layout space, direct pointer dragging, keyboard rotation, and city controls. Selecting the same city recenters after dragging.
- City examples read annual USD costs from the existing CITIES dataset: New York $77,500, Lisbon $36,000, Chiang Mai $16,000. These remain estimates, not bank-coverage claims. Explore cities links to /explore.
- Background artwork responds subtly to pointer and scroll; requestAnimationFrame settles when idle. Reduced-motion preference disables decorative transforms and city tweening. Listeners, observers and animation frames are cleaned up.
- Final npm run validate passed (production build, TypeScript and lint); changed-component ESLint and test:seo, test:start-ctas, test:landing-stories passed. Existing unrelated warnings remain.
- Actual production-build browser QA at port 4204: desktop 922px and phone 390px layouts; Lisbon-to-Chiang Mai cost updates, globe rotation, dragging, same-city recentering and keyboard rotation verified. Phone viewport and document scroll width both 390px. See globe-desktop.webp and globe-phone.webp. Reduced-motion behavior reviewed in source; not claimed as browser-emulated QA.
- Public testimonials remain sourced from the approved data file; fictional preview stories stay localhost-only. Local extension and analytics warnings described above remain outside this landing release.


Automatic rotation follow-up (30 October): production build and focused component ESLint passed. Local port 4206 pause/resume control verified in browser. Rotation uses elapsed time (5 degrees/second), viewport and document visibility suspension, reduced-motion opt-out, focus/drag pause and city-selection hold. No new dependencies or financial changes.
