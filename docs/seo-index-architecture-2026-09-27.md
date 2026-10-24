# SEO index and internal-link audit — 27 September 2026

Baseline: `2561b75` from latest pushed `origin/main`.

## Evidence

The local production build exposed 361 sitemap entries. A Googlebot-style crawl
found no non-200 response, missing title, missing description, missing canonical,
or accidental noindex among them. It did find:

- two rendered `h1` elements on the homepage;
- twelve useful calculator, US comparison, and regional pages with fewer than
  two distinct internal linking pages;
- raw state codes on the FIRE-number hub because its local state-name map had
  drifted from the complete shared map;
- one duplicated sitemap entry for `/fire-number/fire-by-state`;
- internal state keys such as `AR_US` visible in US ranking tables;
- 28 titles over 65 characters and 162 descriptions over 165 characters,
  mostly from shared location templates.

Long metadata is a review signal, not proof of truncation or weak ranking.
Recent city snippets need a complete post-deployment window before another
rewrite. This batch therefore leaves those templates unchanged.

## Bounded improvement

- Keep one homepage `h1` while preserving the visible secondary calculator
  explanation as an `h2`.
- Link the US net-worth-by-age calculator from the homepage calculator group.
- Use the complete shared state-name source on the main FIRE-number hub.
- Render public two-letter state abbreviations in ranking tables instead of
  internal keys such as `AR_US`.
- Link every state page to its relevant US region comparison.
- Cross-link the five US cost/tax comparison guides with a visible, contextual
  navigation block.
- Keep the repeatable sitemap crawler as `npm run audit:seo-index -- <base-url>`.

The sitemap duplicate and truthful modification dates are handled in the
separate crawl-hygiene batch to avoid overlapping edits to `app/sitemap.ts`.

## Measurement

The deterministic crawl result should move from two homepage H1s to one, from
twelve pages below two distinct internal linking sources to zero, and from raw
state codes to complete state names. These are verified architecture outcomes.

Traffic remains a delayed outcome. After deployment and the Search Console lag,
compare complete 28-day windows for the FIRE-number hub, five US comparison
pages, six region pages, and net-worth-by-age calculator. Report impressions,
clicks, CTR, and impression-weighted position, then use source-aware analytics
for calculator completion and signup. Do not claim the internal-link change
caused registrations without that funnel evidence.
