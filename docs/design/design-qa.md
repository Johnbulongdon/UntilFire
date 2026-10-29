# Next Horizon visual and journey QA

29 October 2026. Baseline: origin/main d8ad674a71fddf284a96718ea8be7c3b30c57a2b. Implementation: codex/next-horizon-rebrand, in F:\Claude-Untilfire.

## Compared target

Approved website mock, Reveal screen (`web-onboard-11.png`) versus the real compiled route. Both full captures are 1440 × 1000 pixels at CSS viewport 1440 × 1000. The comparison below crops each yellow panel and normalises both to 700 × 370. Mock toolbar and browser surroundings are excluded. It contains fictional example data only; signed-in account screenshots are private and are not committed.

![Approved mock and implemented reveal](next-horizon-qa/reveal-comparison.png)

The newer approved horizon/path mark and outlined Inter wordmark supersede the older wordmark visible in the mock. The actual calculator produces age 48 for the example instead of the mock's illustrative age 49. The curve is calculated from the entered starting balance, saving and growth; it is not the mock's illustrative line. The larger year remains the primary hierarchy. These are intentional adaptations rather than missing implementation.

## Findings and fixes

- P1, fixed: phone amount input exceeded its container and scrolled sideways. Added minWidth/width constraints. At 390px, its measured bounds are inside the viewport; decimal input stays focused.
- P1, fixed: dark native theme leaked a dark surface into the yellow saving-pace result card with black text. The yellow frame now sets a light local card role and an explicit black primary action. Rechecked at 390 × 844.
- P1, fixed: final phone save screen used a black mark on dark ground. It now selects the inverse mark, visibly verified in the final exported app.
- P1, fixed: monthly summary compact rounding displayed $1,500 as $2k. Exact currency formatting replaces compact formatting for monthly figures; a regression check and the final compiled browser screen both verify $1,500 and $3,000. Compact formatting remains for large targets.
- P2, fixed: reveal padding and primary action were outside the approved canvas composition. Final screenshot measures 48px interior padding and a single Continue action inside the panel.
- P2, fixed: old green actions persisted in bank connection, transaction entry and feedback. Final feedback action computes to rgb(21,23,25); categorical and positive/negative financial colours remain distinct.

## Required fidelity surfaces

- Typography: local Inter 400–800, bold sans headings, tabular financial values. Outlined vector wordmark. No serif display face in the active routes reviewed.
- Layout rhythm: rounded desktop split canvas; responsive question flow; one Home column with Today first; Housing and Investing are separate questions. No horizontal overflow in reviewed 390px Profile/Home or 1440px public screens.
- Colours: approved warm yellow and black with mint/lilac/blue/pink roles. Yellow web charts retain readable light fills in either theme. Native Home chart ink and range pills use a fixed contrast palette on the yellow surface.
- Image quality: SVG marks/lockups, opaque app icons, transparent Android adaptive foreground/monochrome layers. Public OG routes return PNG successfully.
- Copy/content: monthly amounts, concise starting-point wording, no final Change my answers link, conditional Use original/updated plan, no invented city savings statistics.

## Functional evidence

Browser journey: ten questions → 2042 reveal → life → freedom number → monthly picture → savings pace → real Save with Google/Apple screen. Keyboard slider change moved December to August 2042, and restoring it returned the original plan and label. No sign-up or terms acceptance was performed.

Phone web build: all questions → reveal/life/number → monthly picture → saving pace → reminder skipped → Your plan → save account. Slider changes $1,500 to $1,510 and back, switching the single action correctly. Native iOS and Android retain the native slider; the web adapter uses an accessible range input. No notification permission or account creation was performed.

Signed-in web: Home, Money, Plan and Profile viewed read-only, desktop and 390px navigation checked, light/dark logo variants reviewed. No financial records were edited. Admin denied access to this login; no authorization bypass was attempted. Admin palette and journey source are updated, and all 22 journey routes/order checks pass, but authenticated admin visual review remains unverified.

Validation: npm run validate passed; final targeted builds/type checks and root lint passed with warnings. Phone lint/type checks passed (React Native Image alt warnings remain from using a web-oriented lint configuration). iOS, Android and web exports passed. Financial consistency 38/38, money rules, FIRE projection, currency selection, savings pace including FX round trips, save handoff including exact monthly values, achieved-target rendering, startup splash, calm startup, start CTAs, reveal tracking and journey guards passed.

## Scope of result

final result: passed

This result covers the compared public reveal and the reviewed responsive/functional surfaces described above. It is not a claim of pixel-for-pixel identity for every app state. Authenticated admin screenshots and physical-device/store-build verification remain release checks. New native icons/splash require a separately authorised store build. No production merge or phone release was performed.

![Exact monthly picture](next-horizon-qa/monthly-picture.png)

![Phone saving pace with readable contrast](next-horizon-qa/phone-saving-pace.png)
