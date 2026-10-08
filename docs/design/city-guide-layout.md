# City guide layout

Approved by the user on 7 October 2026 after the Austin map preview.

Existing city routes share an answer-first mobile layout: a USD estimate,
monthly spending baseline and visible uncertainty, a single personal-plan
action, map comparisons, then expandable sources and deeper scenarios.
Keep the established metadata, canonical paths, redirects and crawlable links.
Detailed sources are rendered with the page, not fetched after a click.

The plan action opens existing onboarding with the published city selected.
Unknown query values fall back to city selection. It does not create an account
or change financial projection assumptions. Signup stays at the save-plan step.

Maps use approximate city-center coordinates from `lib/city-coords.ts` and
the closest other published city guides within the same country group. They
do not imply neighborhood-level accuracy. Singleton groups show one city;
missing coordinates omit the map rather than inventing locations. Text city
comparisons and links remain accessible independently of map tiles.

Only visible map tiles load, directly in the browser with normal caching and
visible OpenStreetMap attribution. There is no tile prefetch, offline download,
map SDK, paid service or new dependency. Tile service is best-effort; errors
show a text fallback. City-level USD baselines are compared consistently;
international baselines remain explicitly illustrative, not local-currency quotes.

Measure mobile city-page visitors → `funnel_city_plan_started` → calculator
reveal → signup completed → first dashboard view. Join sessions/persons and
use the `fire-number-{slug}` acquisition source. Clicks are not signups or
activation. Exclude internal sessions and compare equivalent complete windows.
Do not promise conversion or ranking gains from this layout alone.

Research: NerdWallet cost-of-living comparison (answer before explanation),
Livingcost Austin (compact summary), Monarch planning (goal-to-progress value).
Google mobile-first guidance permits equivalent content in accordions. These
are design references, not published conversion evidence for UntilFire.
