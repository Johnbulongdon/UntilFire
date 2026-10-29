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

## Type and shape

Inter 400, 500, 600, 700, 800, bundled locally on web and native. Tabular numerals for financial values. Clear bold headings, short labels, one idea per card. Rounded cards 24–28px; black pill actions; equal full-width welcome actions on phone. No serif display typography, heavy button lips, mascot, decorative glow or media-player controls.

## Journey

Goal → City → Pay frequency → Monthly income → Monthly expenses/saved → Saved and invested → Age → Worry → Housing → Investing → Freedom date → Life → Freedom number → Monthly picture → Try one improvement → Save account → Home. Optional questions allow Skip. Required money fields accept explicit numbers. Preserve the real projection, currency conversion and account saving; example data is labelled and only belongs on public examples.

Monthly savings is the default. A single improvement button says Use updated plan when changed and Use original plan at its original amount. No assumptions links or Change my answers prompt at the final review; inputs remain editable after Home. Bank connection remains optional after value. Typical city savings is a research to-do, never invented data.

## Motion and accessibility

Short coordinated transitions and reactions; reduced-motion support; numeric focus must survive edits. Keyboard access, labelled inputs, visible focus and sufficient contrast remain required. Use flexible layouts at 390px and desktop widths; never hide actual content behind a mock toolbar.

## Release

This migration is reviewed on `codex/next-horizon-rebrand`, based on origin/main d8ad674a71fddf284a96718ea8be7c3b30c57a2b. It is not a production release. Keep money logic and current security work separate. Native icon/splash changes need a store build and a separately authorized phone release.
