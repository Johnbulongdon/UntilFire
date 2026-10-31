# Web style consistency — 31 October 2026

Baseline: origin/main 4ec5eea3e5156863892b46b006186beb03f8b447. Working folder F:/Claude-Untilfire; branch codex/web-style-consistency. No changes to money rules, import parsing, account mutations or native release.

Implemented: theme-aware budget/import dialogs; readable transaction tags; mint Explore cards and yellow amount pills; light medal ink; lilac/mint referral bands; shared portfolio logo and theme; pastel allocation fills with separate semantic grade colors; fixed light export/report palettes; theme-aware admin panels/canvas controls and pill navigation; rounded Learn/calculator cards; theme-aware unsubscribe; visible Log in next to Get started including phone.

Validation: full npm run validate passed. Subsequent production builds including latest header/contrast changes passed type/lint checks. Existing repository warnings remain. test:seo, test:csv-import (7), test:journey-canvas, test:journeys (22), test:start-ctas (7 public actions) passed. Two portfolio export endpoints returned HTTP 200 and example report was visually inspected.

Browser verification: production build at port 4207. Portfolio example input and result navigation worked; its rules-based result remained A. Price-history service was unavailable locally and displayed the existing performance-unavailable state. Explore mint cards, yellow amounts and real geographic outlines inspected. Referral pitch/embedded calculator loaded; an earlier stale-chunk error caused by rebuilding while the preview was running was rejected and cleared by restarting and reloading the final build. Learn cards inspected. Phone header at 390px shows both Log in and Get started, no horizontal document overflow (document 375px including browser scrollbar handling); Log in navigates to the existing Google/Apple sign-in card. Screenshots beside this report are public examples, not user financial data.

Follow-up signed-in review: Home, Money, Plan and Profile inspected in light/dark, Money import dialog opened/closed in both themes, budget edit/guided setup opened and dismissed without advancing or saving. Home at 390px showed no horizontal document overflow (document 386px). Theme restored to light and viewport override reset. Private account captures remain local and are not included in this PR.

The review found Explore mint cards inherited a dark tint while keeping fixed dark ink. Keep the card mint fixed in both themes; apply the same rule to referral hero/closing pastels. Dialog inline buttons now use pill corners and 44px targets. Final corrected build/visual checks recorded below.

User clarified the supplied old Explore image is a Claude mock, not a product asset; do not change it. Actual source is the target. A separate existing mobile Free versus Profile Pro label discrepancy was observed; no entitlement data or subscription behavior changed in this style PR.

Limits: admin and all deeper modal/account states are not yet fully reviewed; opening import does not validate a real customer import. No customer financial data was edited. Merge/deployment pending review.

Final signed-in correction: production build passed after fixed pastel surfaces and 44px/pill dialog controls. Refreshed signed-in desktop Explore dark mode visually confirmed mint cards and readable labels (public card crop 07-explore-dark-cards.webp). Guided budget setup and import upload screen opened/dismissed without submitting changes. Admin route denies access in this local environment, so admin visual review remains blocked by normal authorization; no access checks changed. User supplied old card image was confirmed to be a separate Claude mock and intentionally untouched.
