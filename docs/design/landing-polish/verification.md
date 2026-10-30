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

Scope: public landing presentation only; financial calculations, native app, account data and production deployment unchanged. Ready for review; this follow-up has not been merged or deployed.

Follow-up requested by John: fill Pro with seven bank icons plus a Plus icon (the text still says unlimited); align bill rows with dedicated name, date and amount grid columns. Globe directions discussed only, not implemented: compact global-planning chapter preferred, currency-led alternative, or city-exploration alternative. Existing WorldGlobe, supported currency list and city pages provide grounding; Plaid bank coverage is configured separately and defaults to US. Do not claim universal bank coverage. Follow-up build/visual checks recorded after completion.

Follow-up verification: final build, changed-component ESLint, SEO/start-action guards and diff checks passed. Browser confirmed seven Pro icons plus Plus, and consistent right-aligned date/amount columns in the 1036px example preview; narrow 466px layout also inspected for the Pro tile. Motion remains a separate local-only study at port 4205. Production unchanged.
