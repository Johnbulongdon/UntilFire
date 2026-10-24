# SEO measurement and crawl hygiene — 27 September 2026

Baseline: `2561b75` from latest pushed `origin/main`.

## Problem

Search Console data was syncing successfully, but there was no operator view
that compared equivalent settled windows. The sitemap also stamped most URLs
with the request time, making unchanged pages look newly modified whenever a
crawler fetched it. Login and admin pages had no route-level noindex metadata;
the older Search Console export already contained impressions for `/login`.

The analytics funnel accepted an internal `?source=` label, but an organic
visitor arriving from a search engine without that parameter was recorded like
a direct visitor. That prevented an organic landing from being followed through
calculator completion and signup.

## Change and measurement contract

- `/admin` → SEO compares the latest 28 days available in the stored Search
  Console totals with the preceding 28 days. Position is weighted by
  impressions. Query and page tables keep their own dimensions separate.
- Branded and non-branded query summaries are separate. Rare-query
  anonymisation is shown as a limitation; query totals are not presented as the
  property total.
- Organic and external referral visits receive a privacy-safe source label from
  the referrer hostname. Full referrer URLs and search terms are not stored.
- Login, admin, authenticated app routes, invite/unsubscribe utilities and
  parameterised share/result pages are noindex with route-level canonicals.
- Sitemap `lastModified` is omitted when the repository has no truthful content
  date. Learning articles use their own `updatedAt` or `publishedAt` value.
- `/fire-number/fire-by-state` is emitted once through the ranking-page set
  instead of appearing in both the base and generated sitemap groups.

## What counts as a result

Use a complete 28-day post-deployment window plus Search Console reporting lag,
compared with the immediately preceding 28 days. Report impressions, clicks,
CTR and impression-weighted position. Then filter the existing PostHog funnel
to `landing_source=organic-*` and report calculator result and signup completion.

Do not join Search Console query rows to page rows: the stored dimensions are
separate. Do not call a ranking change a user result, and do not attribute total
registrations to SEO. Low volumes are directional evidence and may require a
longer window.
