# Directory badge audit — 2026-10-31

Date: 2026-10-31 (Asia/Shanghai). Baseline: `cd7893004b844ef7cdd02c05eec579799d79a9a4`.

## Inventory and reconciliation

Production homepage and /directory-partners both returned HTTP 200. Their raw HTML contains the same 17 image badges plus CurlShip text link in current main's active DirectoryBadges component, and two partner-page badges: 20 reciprocal directory destinations total. The older LandingPage.tsx contains historical badge markup but has no current importer; HomeClient imports NextHorizonLanding. No extra published badge route was found in the current source/sitemap inventory. Search crawler text omitted most homepage badges; raw production HTML was used instead. No active-source/production badge difference was observed.

Git fetch refreshed origin/main to the baseline, but automatic gc reported an existing bad tree object. Local working-tree/status access is restricted; a targeted comparison reports local drift. No local tracked file, checkout, index or unrelated branch is replaced. The audit uses pinned pushed source. PR #300 has newer acquisition receipts than main; its receipts were consulted and preserved on that separate branch. PR #296 preparation was not assumed to be submission proof.

## Verified direct links — keep

All listing pages below returned HTTP 200. Each recorded anchor points directly to UntilFire, with no nofollow, ugc or sponsored token and no directory redirect intermediary. All outbound destinations were fetched and returned HTTP 200; final destinations remain on www.untilfire.com, preserving the shown query (bare-host/no-slash URLs normalize to /). One referring domain per row, regardless of anchor count. Location H = homepage directory area; P = /directory-partners.

| Directory | Badge location | Public listing | Direct outbound href | Actual rel | Decision |
| --- | --- | --- | --- | --- | --- |
| SaaSLineup | H | https://saaslineup.com/product/untilfire | https://www.untilfire.com/?utm_source=saaslineup.com&utm_medium=referral | `noopener` | Keep; HTTP 200 listing and destination |
| TheSaaSDir | H | https://thesaasdir.com/product/untilfire | https://www.untilfire.com/?utm_source=thesaasdir.com&utm_medium=referral | `noopener` | Keep; HTTP 200 listing and destination |
| TheMicroSaaSDir | H | https://themicrosaasdir.com/product/untilfire | https://www.untilfire.com/?utm_source=themicrosaasdir.com&utm_medium=referral | `noopener` | Keep; HTTP 200 listing and destination |
| IndieLineup | H | https://indielineup.com/product/untilfire | https://www.untilfire.com/?utm_source=indielineup.com&utm_medium=referral | `noopener` | Keep; HTTP 200 listing and destination |
| SaaS Cubes | H | https://saascubes.com/saas/untilfire | https://www.untilfire.com/?utm_source=saascubes.com&utm_medium=referral&utm_campaign=listing&utm_content=visit_button | `noopener` | Keep; HTTP 200 listing and destination |
| Toolcurio | H | https://toolcurio.com/products/untilfire | https://www.untilfire.com/?via=toolcurio | `noopener noreferrer` | Keep; HTTP 200 listing and destination |
| Startup Fast | H | https://startupfa.st/projects/untilfire | https://www.untilfire.com/ | `noopener` | Keep; HTTP 200 listing and destination |
| Uneed | H | https://www.uneed.best/tool/untilfire | https://www.untilfire.com/?ref=uneed.best&ref_type=adv&utm_source=uneed.best&utm_medium=referral | `noopener` | Keep; HTTP 200 listing and destination |
| Launchstag | H | https://launchstag.com/p/untilfire | https://www.untilfire.com/?ref=launchstag | `noopener noreferrer` | Keep; HTTP 200 listing and destination |
| Noonlaunch | H | https://noonlaunch.com/product/untilfire | https://www.untilfire.com?ref=noonlaunch&utm_source=noonlaunch&utm_medium=referral&utm_campaign=listing | `noopener` | Keep; HTTP 200 listing and destination |
| ToolDirs | H | https://tooldirs.com/product/untilfire | https://www.untilfire.com | `empty` | Keep; HTTP 200 listing and destination |
| First Look | H | https://firstlook.tools/product/untilfire | https://www.untilfire.com | `empty` | Keep; HTTP 200 listing and destination |
| ShowMySites | H | https://www.showmysites.com/ngjohn101/untilfire/ | https://www.untilfire.com/ | `noopener` | Keep; HTTP 200 listing and destination |
| Launchpadly | H | https://launchpadly.co/startup/untilfire | https://www.untilfire.com/?ref=https%3A%2F%2Flaunchpadly.co%2F | `noopener noreferrer` | Keep; HTTP 200 listing and destination |
| CurlShip | H | https://curlship.com/l/2162 | https://www.untilfire.com/?ref=curlship | `noopener` | Keep; HTTP 200 listing and destination |
| Discoverly | P | https://discoverly.tech/apps/untilfire | https://www.untilfire.com/?ref=discoverly.tech | `noopener` | Keep; HTTP 200 listing and destination |

Launchstag also has a secondary nofollow text link; its primary Visit link above is followed. Startup Fast and Uneed are award badges as well as directory links; they remain intact regardless of reciprocal-link policy. Discoverly is newly promoted from pending receipt in PR #300 to a verified public link; finding the live page does not assert who submitted it. IndieLineup is likewise currently live, superseding the older not-submitted main row. CurlShip's API response alone was not counted: its actual /l/2162 anchors were checked.

## Inconclusive — retain, do not count as currently verified

| Directory | Badge location | Known listing / HTTP | Outbound destination and rel | Evidence and decision |
| --- | --- | --- | --- | --- |
| DodoDirectory | H | https://dododirectory.com/item/untilfire — 200 on initial fetch and retry | Not observable in static HTML | Current response is a client-rendered shell with no UntilFire website anchor. Homepage/sitemap fetched; sitemap did not identify a replacement. Browser provider iab is unavailable during this run, so hydrated inspection is blocked. Preserve badge; do not infer loss from this limitation. Historical live-follow evidence remains historical. |
| SumoDir | H | https://sumodir.com/item/untilfire-wwwuntilfirecom — 200 on initial fetch and retry | Not observable in static HTML | Client-rendered shell; no UntilFire website anchor in raw response. Sitemap fetched without a replacement UntilFire entry. Hydrated inspection unavailable as above. Preserve badge; no deletion based on missing hydration. |

## Confirmed absence after repeated checks — removal proposed, not deployed

| Directory | Badge location | Listing / HTTP | Outbound destination and rel | Evidence and decision |
| --- | --- | --- | --- | --- |
| Toolfio | H | https://toolfio.com/item/untilfire — repeated HTTP 404 | None; no current public anchor | Known listing from the 2026-07-21 accepted/live submission was retried multiple times. Official /search?q=untilfire returned 200 with Nothing found on the initial check and no product result on retry; /search?search=untilfire also checked. Official sitemap returned 200 without an UntilFire listing; external site search found no replacement. Homepage itself works. Propose removing only the Toolfio badge after month-end failed reciprocity. This is loss of an existing listing, not a new rejection or resubmission. |
| LaunchesHQ | P | Expected /products/untilfire and /product/untilfire — HTTP 404 | None; no current public anchor | /products?q=untilfire and case variant returned 200 with empty results; official sitemap had no UntilFire entry. Main and newer PR #300 evidence both say not-submitted after badge preparation/sign-in gate, without a receipt. No account or new submission attempted. Propose removing only the LaunchesHQ reciprocal badge section at month end; do not claim submission or rejection. |

No honorary-only award removed. No payment, account creation, CAPTCHA solving, outreach, resubmission, merge or deployment performed. Monthly monitoring should continue and rediscover future badges. Full interactive/visual QA is unavailable; this narrow change removes one array entry and one independent partner section, preserving all other markup.

Verification: both changed TSX files transpile. Actual React server-rendered anchor inventories before/after differ only by https://toolfio.com and https://launcheshq.com; all other anchors are preserved. git diff --check passes. Interactive desktop/mobile visual QA was unavailable because the browser provider was absent. No broad application build was run for this two-entry removal.
