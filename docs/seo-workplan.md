# SEO work plan

Started September 25, 2026. Initial baseline `511c435`, reconciled with `cd2b2fa`.
Read [agent workflow](../AGENTS.md), [decision history](DECISIONS.md),
[Search Console setup](search-console.md) and the
[September 24 audit](seo-audit-2026-09-24.md) before continuing.
Private query exports and analytics counts stay out of this public document.

## Objective and working method

Increase qualified organic visits that complete a calculator, save a plan and
return. Rankings and CTR are intermediate measures, not substitutes for users.
Investigate, fix a bounded issue, verify it, and hand the PR to Claude. Preserve
recent product work and explicit noindex choices. Do not infer outreach, paid
tools, bought links or production-setting authorization from the SEO mandate.

Keep a deployment date and reviewed commit for each experiment. Use consistent
full 28-day windows after allowing for Search Console reporting delay. Compare
impressions, clicks, CTR and impression-weighted position by query and page;
separate branded from non-branded searches. Low counts are directional evidence,
not a statistically established uplift. Longer windows may be necessary.

## Brand investigation and first fix

The user cannot find the official site on Google's first page for "Until Fire".
September 24 checks found HTTP 200 on the www homepage, no noindex directive,
robots allowing the homepage, and a self-referencing www canonical. Search Console
contains homepage impressions, so total absence from Google's index is not
supported. No "until" queries were present in the short saved query window;
anonymisation and sparse data mean this does not prove zero brand searches.

The live title led with the generic calculator phrase. The first fix leads search,
Open Graph and Twitter titles with UntilFire; provides og:site_name explicitly;
adds the user's spaced brand variant to the existing WebSite/Organization nodes;
removes an unsupported usage-count claim; and removes a SearchAction pointing to
`/?q=` when there is no corresponding site-search feature. The official name
remains UntilFire. No new entity block or invented profile links are added.

These are identity/accuracy improvements, not a confirmed diagnosis of ranking.
[Google's site-name guidance](https://developers.google.com/search/docs/appearance/site-names)
and [title guidance](https://developers.google.com/search/docs/appearance/title-link)
support consistent descriptive signals. sameAs does not consolidate rankings or
stop directories appearing. Profile ownership and exact handles need verification
before future edits; directory listings are not automatically identity profiles.

Outstanding checks:
- Google URL Inspection: indexed state, last crawl, Google-selected canonical,
  and live accessibility. The saved performance sync does not contain this data.
- Non-www HTTPS redirect: HTTP apex redirects to HTTPS; HTTPS apex requests were
  reset from the inspection environment. Verify using another permitted network
  or project domain settings before calling this a site-wide fault or editing DNS.
- Direct Google search was CAPTCHA-blocked; do not treat another search provider's
  result ordering as a reproduction of the user's Google results.
- Vercel connector team access remains unavailable; do not repeatedly retry or
  retrieve secrets just to read already-synced performance data.

## Coast FIRE ranking work

The exact generic query is visible in Search Console well below page one.
The query "coast fire calculator singapore" has a different average position;
saved query and page dimensions are separate, so do not assign that query to the
Coast FIRE URL without a joint query/page report.

Do not repeat the September 21 changes (`40db7ff`): the page already includes a
formula, worked example, age table, FAQ, and a chart with contribution/retirement
controls. The available data initially ended September 21, so it cannot establish
the effect of that content update.

Competitor inspection on September 24:
- [WalletBurst](https://walletburst.com/tools/coast-fire-calc/) explains investment
  inputs and inflation alongside its chart. Its stated return/inflation convention
  differs from UntilFire's real-return input. Comparing default dollar results
  without reconciling assumptions is misleading.
- [Coastfirecalc.org](https://www.coastfirecalc.org/) exposes fee and inflation
  controls and links to couples/pension variants. Their presence is a scope lead,
  not evidence they caused rankings or permission to clone more pages.

Next bounded investigations, in order:
1. Obtain query/page combinations and longer settled history through an authorized
   Search Console surface. Preserve query privacy. Check canonical and index state.
2. Audit the calculator's input guidance and real/nominal return consistency with
   its linked learning articles. Fix misleading explanations before expanding copy.
3. Review existing internal links from relevant FIRE learning pages and city guides;
   add links only where they help the reader. Do not bulk-generate doorway pages.
4. Evaluate use cases such as couples or pension income against actual query demand
   and product capability. Hand product-dependent features to Claude with a clear
   contract; do not pretend the existing tool models features it lacks.
5. Inspect mobile performance and the path from organic landing to calculator
   completion. Confirm tracking before attributing visits or signups to an SEO fix.

## Integration and measurement status

- Savings-rate content: PR #130 integrated in `6030599`; verify production and
  record its deployment time before starting the post-change comparison window.
- Brand metadata: prepared for Claude review; not yet a measured ranking outcome.
- No claim that either change will take position 40 to 10. Use intermediate
  query-level progress and qualified conversions to decide the next investment.

## Austin FIRE-number experiment

The short stored page report shows the Austin guide in the first-page range
without an observed click. The sample is small, and separate query/page reports
do not identify which searches produced those page impressions. Treat this as a
bounded snippet and usefulness experiment, not proof of a CTR problem.

Lead Austin's search title and description with the estimated answer. Label the
page's planning figures as USD, and show lower, baseline and higher spending
scenarios so a visitor can see how the 25x rule changes. Keep the same canonical
URL and calculators; do not create an Austin keyword variant page. Replace its
unrelated international "nearby" cards with crawlable comparisons to Dallas,
Houston, San Antonio and Fort Worth. Do not apply this USD experiment to
international city pages without local-currency data or a properly sourced
conversion method.

After production is confirmed, wait for a complete 28-day window plus reporting
lag. Review page impressions, clicks, CTR and weighted position together, then
check continuation into a calculator result. Do not attribute registrations to
this page without a source-aware funnel, and do not rewrite the snippet again on
a few days of data.

## US city evidence and topic paths

The generic US city guides now explain the evidence behind their planning
baseline in the page itself. Each page names the September 17, 2026 review date,
labels every amount as USD, explains the Census renter-median housing input and
the $34,000 national non-housing baseline, and links to the official Census
source tables. The copy also distinguishes an estimate from a household budget and
the 25x guideline from a guarantee.

Each city now links to the corresponding state comparison page and the 4% rule
calculator from that methodology block. This creates a useful city → state and
city → calculator path without generating more near-duplicate pages. The change
does not alter cost data, formulas, metadata or indexability.
