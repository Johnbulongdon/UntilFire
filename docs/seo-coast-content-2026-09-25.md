# Coast FIRE content review — 25 September 2026

Baseline: `cd2b2faa88c741869110464555ded0ef87b9cd34`. Live page text and
appearance matched the relevant main files during review. Brand PR #134 remains
independent. This review preserves the September 21 calculator/content work;
recent search data cannot yet establish that work's ranking effect.

## Why this change

The live page repeated the Barista FIRE heading, described only three target
assumptions while its formula also uses withdrawal rate, and overstated the
relative effect of return versus spending. The input hint presented 7% real
return without qualification, and the explanation blurred a constant-return
projection with actual post-retirement outcomes.

Correct those issues and explain the existing model: today's-money inputs,
nominal-to-real conversion, contributions annualised at year-end, no withdrawals
during coasting, and the ten-year chart horizon after retirement. Add an
independently calculated sensitivity example and an internal link to the existing
sequence-of-returns explanation. Generate FAQ markup and visible answers from
the same content. No formulas, defaults, controls or tracking are changed.

The 30-year example uses $50,000 spending / 4% = $1,250,000. Discounting that
target gives $164,209 at 7%, $289,222 at 5%, and $514,983 at 3%, rounded to the
nearest thousand in the text. These are hypothetical real returns, not forecasts.
The inflation example is `(1.07 / 1.03) - 1`, about 3.9%.

Google's [helpful-content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
supports correcting factual errors and giving useful explanations. This is not
evidence that these changes will produce a specific ranking increase. The fee
explanation links to the [SEC investor bulletin](https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins/updated).

## Measurement after publication

Record the confirmed production date before starting the comparison. Compare
28 complete days before and after, excluding reporting-lag days, using Search
Console page clicks, impressions, CTR and impression-weighted position. Review
Coast FIRE query variants separately; stored page and query rows are not joined.
Do not attribute a query's performance to this URL without query/page evidence.

The business benchmark is qualified organic visits that continue to useful
calculator results and saved plans. Verify event and landing-source coverage
before claiming conversion improvements. Low traffic and overlapping releases
limit causal conclusions. Do not churn titles or add pages while waiting for data.

## Verification scope

Review the complete diff; run the production build, focused ESLint and SEO guard.
Check rendered FAQ/schema agreement, one main heading, canonical, internal-link
destination, unchanged example results, and 390px/1280px light/dark layouts.
No deployment or production configuration is part of this change.
