# UntilFire Motion interaction review

Approval prototype only; no production route imports it. Uses Motion for React, actual unchanged horizon logo and the user's Mint preview palette. Sample fields are local state, not a working financial calculator. The production manifest is unchanged.

Run `npm install` (commit the generated lockfile, then use `npm ci` for repeatable installs) then `npm run dev` in this directory. Open http://127.0.0.1:4186/. Build with `npm run build`.

Review: tap the primary button; use Continue and Back repeatedly and check input preservation; open/close assumptions; compare Motion off; enable reduced motion; check keyboard focus and 390px/1280px widths. No delayed navigation or saving, authentication, analytics or network submission.

Source targets: `app/HomeClient.tsx` onboarding, shared `.uf-btn` styles, and `app/components/landing/AnimatedHero.tsx` assumptions. Examples are proposed interaction patterns, not a screenshot clone. Existing GSAP remains untouched.

Visual QA is pending. Do not integrate into production or mark ready for Claude until actual browser interaction, touch, viewport and reduced-motion checks pass and the user approves the direction.
