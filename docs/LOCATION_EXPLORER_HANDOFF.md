# Public location explorer handoff

Status: implementation in review; not deployed.
Baseline: GitHub main d54af525, reconciled October 7, 2026 through the GitHub plugin after git transport failed.

## Integration

- `LocationExplorer` is the shared canvas renderer and lookup/comparison UI.
- `location-catalog` adapts main's existing city costs and coordinates.
- `CityLocationExplorer` provides the Austin pilot. Other city routes retain
  their current implementation until the pilot and PR #186 are reconciled.
- `PublicExpatLocationExplorer` uses calcFIRE and the public calculator's
  projected portfolio. Dashboard GeoArbitrageGlobe is unchanged.
- Selecting a city now stays in the explorer so flight and shortlist work.
  Open plan comparison explicitly invokes the existing navigation callback;
  that existing destination requires a saved calculator plan. City guides
  remain accessible separately without that prerequisite.

## Verified locally

- Full npm run validate passed (existing repository warnings, no errors).
- FIRE projection regression and city-page SEO checks passed.
- Changed TypeScript components pass typecheck and targeted lint.
- Austin and public Expat render at 1280px and 390px without horizontal overflow.
- Austin selection starts an animation; reduced motion settles immediately.
- Search distinguishes missing city from coverage-filter exclusion and recovers.
- Keyboard comparison removal returns focus to the selected city heading.
- Expat timeline changes the shown portfolio, remaining years and readiness.
- Dark theme inspected at 1280px and 390px in a temporary local harness;
  the harness was removed before commit.

## Practical limits

The catalog has approximate city centers and finite coverage, not a universal
city database. Zoom changes the nearby choices, not the cost assigned to a city.
International costs remain illustrative USD references. Land/state boundaries
are bundled Natural Earth geometry; no street-level tile service is provided.

Canvas interaction is supplemented by keyboard city buttons and zoom controls.
Touch handling preserves vertical page scrolling; physical phone testing is
still recommended. No native app renderer or production analytics were changed.

## Claude integration

Preserve D-36 math fixes. Reconcile this Austin insertion with PR #186's
NearbyCityMap section so the page has one map, while retaining its static links
and source text. Review the pilot before broad city rollout. The claude/* branch
is preview-disabled by current vercel.json; no merge or deployment is performed
by this handoff.
