# Learning article template — 25 September 2026

Baseline: `bc43982c21b6c95c68f8fee2de9cc7f4501659ee`. This is a shared-template
repair, not a new content campaign or a rewrite of recently changed calculators.
Reconciled with `614f1b0000a95a27b1292a52d2875e2c9448684f` before handoff,
preserving the integrated brand and Coast FIRE changes and both changelog entries.

## Evidence and rationale

Live `/learn/sequence-of-returns-risk` matched the source template. In dark mode,
the title inherited a light foreground while the article retained a fixed white
background. Cards, lists and related links used separate fixed colors. Theme
tokens now keep the article and its navigation readable together; the CSS is
scoped to article routes, leaving learning hubs and other pages alone.

The template attached `breadcrumb` to Article, while
[Schema.org defines it on WebPage](https://schema.org/breadcrumb). Emit connected
Article, WebPage and BreadcrumbList nodes, with the page referring to its trail.
Render the same Home / Learn / stage / article trail as an accessible navigation
list. Keep the current page identified and let long titles wrap on small screens.
This follows [Google's breadcrumb guidance](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb);
it does not guarantee a rich result or improved rankings.

No article text, publication date, canonical URL, indexing policy, calculator
math or registration flow changes. Preserve existing related calculator links
and the `learn-article` source on the main calculator CTA. No new client-side
JavaScript or tracking events are needed.

## Verification and measurement

Verify the production build and rendered Article/WebPage/BreadcrumbList graph,
including agreement with visible breadcrumb links. Check long titles, navigation,
one main heading, keyboard focus, mobile/desktop layout and light/dark readability.
Production build, focused ESLint and SEO guard passed. Rendered output checks
covered all 16 article routes: connected graph nodes, four breadcrumb positions
and one h1. Browser checks confirmed visible-path/schema agreement, stage-link
navigation and no overflow at 390px and 1280px; both themes were inspected.
Keep Google's live URL Inspection and Rich Results verification as post-deployment
checks; local validation does not prove Google's crawl or presentation.

After confirmed publication, compare complete 28-day learning-page search clicks
and continuation into calculators, allowing for reporting delay. Segment organic
visits where available and exclude internal use. Low traffic and overlapping
releases prevent attributing changes in signup totals to this template alone.
The immediate outcome is corrected markup and readable pages, not measured growth.

## Integration

Claude remains the integration owner. Review older open learning PRs before
integrating any of them; this change does not authorize that backlog. The template
overlaps old learning-template work (including #68), so preserve both intended
contributions if later integrating it. Shared changelog additions from the other
SEO handoffs must also be preserved. No dependencies, migrations or environment
changes are required.
