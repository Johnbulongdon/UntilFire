# SEO priority batch — October 10, 2026

Status: prepared for review, not a production or ranking outcome.
Baseline: `5c820933bcec94bc6ed2993df667d57da12abcdf`.

## Priority order

1. **High priority, simple:** make homepage metadata describe the free FIRE
   calculator; remove the second how-it-works block already covered in the
   landing page; explain the 25× estimate without implying guaranteed lifetime
   funding. Preserve the freedom-led hero, no-login path and all calculator/city
   destinations. This batch implements those content changes.
2. **High priority, difficult:** diagnose organic entrance → useful result →
   signup → first dashboard use. Verify event coverage before attributing a
   drop to UX. The main wizard's events do not represent every inline calculator
   interaction. Inspect the highest-traffic entrances and their existing product
   handoffs before proposing a competing flow. Aggregate PostHog queries were
   available, but the small observed sample is insufficient to establish a
   redesign or a conversion uplift. Entrance-path retrieval timed out. Keep
   private analytics counts out of this public note.
3. **Low priority, simple:** evaluate snippet truncation on pages with meaningful
   search impressions. Do not bulk-shorten useful titles to satisfy a character
   counter or add suggested phrases without a reader need.
4. **Low priority, difficult:** vet potential referring domains for audience fit,
   editorial context and actual links before considering partnerships. A tool's
   suggested domain list is not a validated backlink opportunity. This batch
   authorizes no submissions, outreach, payment or link purchases.

## Evidence and verification

The user-provided October 9 ideas workbook contains six homepage suggestions
with identical priority scores. It does not supply the time-on-page sample,
dates or supporting conversion evidence. Treat suggestions as hypotheses.

The isolated production build's sitemap audit covered 360 URLs. It found no
non-200 responses, missing titles/descriptions/canonicals, unexpected noindex,
duplicate titles/descriptions, H1-count failures, exposed internal state keys or
pages below the audit's two-inbound-link threshold. It flagged 27 titles over
65 characters and 162 descriptions over 165 characters. These are tool
thresholds, not Google limits or proven SEO defects. This was a local rendered
audit, not evidence that Google indexed every URL or chose its canonical.

Homepage FAQ markup continues to come from the same five visible answers.
SEO and revenue-funnel guards, reveal-step tracking checks and the production
build passed. Desktop (1280px) and phone (390px) checks found no horizontal
overflow in the reference section in light or dark mode; keyboard focus remained
visible on its links. No calculator logic or signup behavior changed.

## Measure after integration

Record the actual production deployment date and commit first. Following D-28,
compare the first 28 complete post-deployment Search Console days, after reporting
lag, with the preceding equivalent window. Filter to the homepage; keep branded
and generic queries separate. Report impressions, clicks, CTR and weighted
position together. Google can choose a different snippet, so a changed meta
description is not a promise of a changed search result.

For conversion, use production-host events, internal/test exclusions and the
same documented ordered conversion window in both periods. Keep search clicks,
recorded visitors, calculator results, completed registrations and first
dashboard use separate. Diagnose missing inline-calculator coverage rather than
labeling every missing wizard event an abandoned calculation. Do not report the
effect as causal: other product changes and small samples can explain movement.

Sources: [snippet guidance](https://developers.google.com/search/docs/appearance/snippet),
[link spam policy](https://developers.google.com/search/docs/essentials/spam-policies#link-spam),
[PostHog funnels](https://posthog.com/docs/product-analytics/funnels),
[existing SEO plan](seo-workplan.md), and [D-02 / D-28](DECISIONS.md).
