# Onboarding interaction review — October 6, 2026

## Scope and baseline

Reviewed against latest fetched origin/main a10db26. The user approved the
interactive tap-first inputs, centred phone age wheel and desktop dropdown.
This implementation is for the existing HomeClient onboarding, not a separate
native app. No merge or deployment is performed by this handoff.

## Contract

- Income, savings/spending and net worth offer exact tap choices and optional
  precise entry. Presets are experimental anchors, not average-income claims.
- Age is optional, 16–90, with a blank initial value. At widths up to 600px with
  a coarse primary pointer, show the centred native-scroll/snap wheel. Otherwise
  show the native select. Preview-only overrides are not shipped in HomeClient.
- Back preserves visited form drafts. Hidden forms are inert. Enter searches
  only the active form and leaves native buttons/selects/listboxes alone.
- Currency changes convert retained amounts using the existing indicative rates.
  Monthly/yearly conversion and the financial projection engine stay unchanged.
- Growth editing is absent from onboarding and its reveal; the result still
  states the existing recommended real-return basis (D-30 refines D-24 placement).
- Motion confirms inputs without delaying calculation: press feedback, bounded
  selection springs, scale/opacity step entry, derived-number settling, fixed
  year-cube flips. No lateral movement. Reduced motion shows final states.

## Audit fixes

Accessible names added to precise-entry inputs and the savings slider. Retained
money is converted when currency changes rather than reinterpreted. Step entry
returns to the top of the form so a previous long screen cannot hide the next
question. Age-row taps commit immediately; leaving the wheel commits its current
scroll selection rather than waiting for a debounce. Long currency amounts use
a single-column choice layout on narrow screens to keep full values readable.

## Verification

- npm ci succeeded with certificate checks intact and unchanged lockfile.
- npm run validate passed: production build, TypeScript, lint (zero errors,
  existing warnings), and final production build; 431 routes generated.
- Focused guards passed: income-default, savings-period-input, achieved-fire-
  reveal, currency-selection, fire-projection, reveal-save-plan-cta and bounded
  spring/reduced-motion checks. The save regression loads the real YearCubes
  component rather than bypassing it.
- Production-built local app walkthrough: optional location, $6,000 monthly
  take-home, $2,400 monthly savings, yearly conversion, Back preservation, SGD
  currency conversion ($8,040 income and $38,592 yearly savings), portfolio and
  age, calculated freedom result, 100 cubes/200 faces, final save CTA to login.
- 1280px and 390px layouts had no horizontal overflow. A narrow fine-pointer
  desktop correctly kept the dropdown. Active heading focus and inert hidden
  forms were checked. Precise entry plus Enter advances only the active form.
- Phone-control harness runs the complete built app through a local proxy that
  activates the phone CSS in the fine-pointer review browser. Native scrolling
  snapped to age 28; ArrowDown selected 29, Back preserved it, and the result
  and login handoff used it. This is not physical touch-device verification.
- Browser requests reduced motion: final cube state had no animation. Explicit
  Play animations enabled uf-year-flip and restarted the reveal as designed.

## Limits and integration

Physical iPhone/Android touch, mobile Safari and native-app behavior remain
unverified. Light/dark inspection was performed in the component preview; the
full browser walkthrough used the default light theme. No completion-rate lift
is claimed. Account sign-in was not performed; the save handoff stopped at login.

Older draft PR #177 overlaps HomeClient motion and carries architecture notes.
Its published head is c4e6005, while additional 1a4cc98 work exists locally on its
worktree. This PR is independent: do not blindly combine both onboarding
implementations. Preserve #177's design rationale and reconcile separately if
that draft is pursued. No shared Button or hero assumptions changes are included.

The review branch disables its automatic Vercel preview deployment. Integration
into main can deploy production and still requires publication authorization.
After integration, repeat the real-phone walkthrough before calling mobile QA
complete; compare settled onboarding completion windows without collecting raw
financial values. See D-30 for direction and rationale.
