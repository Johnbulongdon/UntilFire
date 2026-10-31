# Connected landing release verification

final result: passed

Baseline: origin/main e2d1f36c338827680ea2136e8f00459c9157117e, fetched again immediately before release. Work stays in F:/Claude-Untilfire on codex/landing-connected-preview. John explicitly authorized build and merge.

## Selected design and intentional changes

Selected centered landing option 2 plus the approved mint closing card, compact badges, grouped footer and multi-card review mock. The single connected example replaces misleading Home/Money/Plan selectors. The FAQ/article appendage and its FAQ schema are removed. Existing onboarding action, metadata, directory URLs and financial calculation helpers are preserved.

The latest request removes all visible review arrows, playback buttons and pagination dots. The rail retains continuous right-to-left motion, mouse dragging, touch swiping, hover/focus pause, click/tap toggling and keyboard Space/arrow controls. Reduced-motion disables automatic movement. Join labels use approved dates only.

## Evidence

- npm run validate: exit 0 (production build, TypeScript, repository lint, second production build). Existing lint warnings remain; no errors.
- npm run test:landing-stories, test:seo, test:start-ctas: passed. Seven public start buttons retain onboarding actions.
- Final Chrome preview at 1280x844 and 390x844: zero buttons inside #stories, no dots/arrows/pause UI, document width equals viewport width. One footer landmark.
- Light and dark phone/desktop screenshots inspected. Loop position advanced from 1887 to 2132; actual phone-emulation tap resumed motion (1362 to 1902); keyboard browsing and Space exercised. Mouse drag/native phone swipe and reduced-motion behavior were checked during the prior rail verification; unchanged handlers retained.
- Console contains browser-extension errors and the expected local Vercel Analytics endpoint 404. No new landing runtime exception observed.
- docs/design/landing-connected/review-reference-comparison.webp was opened and compared: approved mock above, rendered implementation below. Controls/dots removed deliberately; optional membership attribution replaces context for demo cards. Captures are cropped to public example content, with browser/account chrome excluded.

## Content and release limits

LANDING_STORIES remains empty until genuine quotes and permitted attribution are supplied. Fictional people, quotes, dates and generated portrait artwork are clearly labeled and restricted to explicit localhost preview-stories=1. They cannot be enabled through that query on the public hostname. No customer count or fake rating is published. No database, financial data, phone release or billing change is included.

Generated assets: connected-horizon.webp is the approved decorative backdrop; testimonial-demo-portraits.webp contains generated fictional portraits used only by the labeled local design preview. Existing brand/logo-horizontal.svg is reused.

This report verifies the implementation locally. GitHub PR/CI and deployment status record merge/publication separately.
## Native pastel surface refinement — 31 October 2026

Money/Plan/Profile component verification: [scope, checks and limits](docs/design/mobile-pastels/README.md). Actual components checked in both themes at a phone-width container. Physical-device and complete signed-in checks remain pending; no release is claimed. Earlier landing verification above is preserved.
