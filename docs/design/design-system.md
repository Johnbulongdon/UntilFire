# UntilFire Design System — Next Horizon

Approved by John, 29 October 2026. This replaces the v3 Warm presentation across the website, native app, public pages and admin. Historical choices remain in the decision log; this file defines the current visual contract.

## Brand

Black sunrise and winding path, paired with the outlined Inter UntilFire wordmark. Masters and exports live in `public/brand/`; compatible legacy logo URLs resolve to the new artwork. Use the supplied geometry, never redraw the mark or typeset an approximate lockup. Black artwork on light/yellow; white artwork on charcoal. Keep one mark-height of clear space. Do not distort, rotate, add shadows or gradients.

## Colours

| Role | Hex |
| --- | --- |
| Ink / primary action | #151719 |
| Freedom / main accent | #FFE58A |
| Mint | #E3F7EF |
| Lilac | #EEE9FA |
| Blue | #E8F3FF |
| Pink | #FBE7F2 |
| Ground | #F8F8FB |
| Card | #FFFFFF |
| Secondary ink | #5C6170 |

Pastels group content. They do not replace positive, warning or negative financial meanings. Use black text on pastel cards in either theme. Dark mode uses charcoal surfaces, readable light ink and the same accents. Legacy `green` and `teal` token names remain compatibility aliases; they no longer mandate those hues.

## Category fills — lighter palette B

Approved 29 October: blue `#B9D9F7`, peach `#FFD4B8`, mint `#BCE9DA`, yellow `#FFE58A`, pink `#F4CEE3`, lime `#CDE6AE`, lilac `#D9CEF3`, rose `#F7C6CB`, neutral `#DED8CD`. Shared source: `lib/categories.ts`, used by web and phone. Use readable theme ink for labels; category fills are not text colors. Keep semantic loss/shortfall ink and patterns. Legacy saved hues map to their matching pastel family at display time without changing stored financial data.

## Type and shape

Inter 400, 500, 600, 700, 800, bundled locally on web and native. Tabular numerals for financial values. Clear bold headings, short labels, one idea per card. Rounded cards 24–28px; black pill actions; equal full-width welcome actions on phone. No serif display typography, heavy button lips, mascot, decorative glow or media-player controls.

## Journey

Goal → City → Pay frequency → Monthly income → Monthly expenses/saved → Saved and invested → Age → Worry → Housing → Investing → Freedom date → Life → Freedom number → Monthly picture → Try one improvement → Save account → Home. Optional questions allow Skip. Required money fields accept explicit numbers. Preserve the real projection, currency conversion and account saving; example data is labelled and only belongs on public examples.

Monthly savings is the default. A single improvement button says Use updated plan when changed and Use original plan at its original amount. No assumptions links or Change my answers prompt at the final review; inputs remain editable after Home. Bank connection remains optional after value. Typical city savings is a research to-do, never invented data.

## Motion and accessibility

Short coordinated transitions and reactions; reduced-motion support; numeric focus must survive edits. Keyboard access, labelled inputs, visible focus and sufficient contrast remain required. Use flexible layouts at 390px and desktop widths; never hide actual content behind a mock toolbar.

## Release

This migration is reviewed on `codex/next-horizon-rebrand`, based on origin/main d8ad674a71fddf284a96718ea8be7c3b30c57a2b. It is not a production release. Keep money logic and current security work separate. Native icon/splash changes need a store build and a separately authorized phone release.

## Until payday — C

Approved 29 October: show future cash from today to payday at real date spacing, with one readout above the chart and individually selectable bills. Mouse movement and horizontal touch dragging inspect points. Keep keyboard/screen-reader adjustment and Previous/Next buttons. No visible range slider, stacked category icons or +N aggregation. Keep Money navigation separate from inspection. Negative cash keeps an explicit shortfall label and zero reference. Shared presentation helpers: lib/payday-chart.ts. Money calculations remain lib/payday-line.ts / Until payday D-90; no changes to amounts or saved data.

## Browser interaction and motion

Short feedback, not constant movement: 120–160ms hover/press, 180ms disclosures, 240ms section/result entry, up to 300ms question choreography. Preserve focused fields, original answers and financial values. Animate section containers without remounting their editors. Respect system reduced motion and cancel active section motion if that preference changes. Decorative onboarding panels collapse at narrow widths; useful monthly numbers stay. Loading placeholders announce loading and never display invented balances. Public example controls are clearly labelled and use the existing engine; they do not save to an account.

## Browser calendar — marked dates B

Transactions calendar and Money → Calendar use the same marked month: Sunday-first, quiet date cells, pastel category payment labels, yellow incoming-payment labels and full selected-day details below. Keep every same-day payment. Narrow cells use compact amounts in the display currency, with exact amounts in accessible labels and details. Keep line/bars alternatives and the existing recorded/expected distinction, recurrence sources and cash/contribution actions. This browser presentation does not change native money logic or release the phone app.

Calendar clarification (29 October): only scheduled bills and income/payday appear in date cells and selected-day details. Do not fill the calendar with bank transactions. Preserve original occurrence dates as today advances. Forecast catch-up dates are for cash planning only, never for calendar placement.

## Public landing — connected example (30 October 2026)

John selected original landing option 2, with space reserved for directory badges. Use a centered hero, three pastel product regions (monthly picture, freedom projection, marked bills calendar), a single connected preview without Home/Money/Plan selectors and a separate extra-income-saved scenario. Keep public examples explicitly labeled and separate from saved accounts. Use the shared calculation helper, whole monthly amounts and the established logo/palette/type. Preserve all directory verification links and images in a wrapping Listed on tray near the footer, with readable link fallbacks when images fail. Preserve pricing, metadata, useful calculator/city navigation and the existing onboarding entry. John subsequently requested no landing FAQ or article appendage: end with grouped navigation and legal links, after the badge tray; keep detailed explanations on existing Learn/calculator pages. Remove FAQ schema when removing the FAQ. Implemented on `codex/landing-connected-preview`; review and publication pending.

Landing closing section follow-up: make the free starting plan a full mint invitation with an included-plan visual and a working onboarding action, using library icons and the approved logo. Keep Pro prices secondary and badges compact; preserve the rest of the approved landing.

Landing conversion selection: Include 1 (hero message), 2 (reassurance), 3 (multiple rotating user stories); skip 4 (founder) and 5 (savings-result redesign). Use genuine attributed quotes and approved portraits, never fabricated testimonials. Until supplied, the public story list is empty/hidden; localhost ?preview-stories=1 previews four visibly labeled placeholder cards. Superseded: the one-card rotator was rejected. Follow the approved compact multi-card mock: continuous right-to-left rail, three visible cards plus a next-card glimpse on desktop, one plus a glimpse on phone, drag/swipe and previous/pause/next. Pause on hover/focus and with reduced motion. Membership duration is optional and computed only from an approved date. Human presentation comes from real attribution and portraits when supplied.

Approved review-rail visual target: exec-30a09b8a-4004-4fc8-87de-a5f7ed32b35a.png from the task generated-images folder. Keep the section on the page base, using individual lilac, butter, mint and blue cards; no giant enclosing lilac panel. Fictional sample portraits and quotes match the local concept and remain behind the explicit localhost preview flag. The public approved story list remains empty pending genuine testimonials. Generated demo portrait asset: public/landing/testimonial-demo-portraits.webp, built-in ImageGen, four fictional candid portraits, never real customers.

Final review-rail refinement (30 October): remove all visible arrow/playback buttons and progress dots. Preserve continuous scrolling, hover/focus pause, card tap/click pause/resume, swipe/drag, Space pause/resume and arrow-key browsing. Reduced motion stops auto-scroll. Keep membership dates optional and approved. The labeled fictional demo is local-only; genuine public stories remain pending.
