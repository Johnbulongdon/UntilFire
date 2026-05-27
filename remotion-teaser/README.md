# UntilFire Social Teaser

This Remotion package rebuilds the teaser around the product positioning:

> Retire early is not a dream. It is a plan.

The composition is a 16 second, 9:16 social vertical spot for UntilFire. It presents FIRE as "Financial Independence, Retire Early" and frames the product as a personal finance planning tool that understands real bank-connected spending, city benchmarks, savings rate, and compounding projections.

## What It Shows

- Bank connection and spending import as a live product capability.
- Popular bank support shown with official App Store icon artwork for Capital One, Chase, Bank of America, Wells Fargo, PayPal, and Cash App.
- Brokerage connection and investment analysis shown with official App Store icon artwork for IBKR, Robinhood, Fidelity, and Schwab.
- City-aware expense benchmarks for rent, food, and subscriptions.
- Personal insights that are specific, not generic advice.
- Investment support as planning and projection, not trade execution.
- Final CTA: "Build your Financial Independence plan."

## Scripts

```bash
npm install
npm run studio
npm run stills
npm run render:vertical
```

The final render target is `1080x1920`, 30 fps, 16 seconds.

## Editing

Update `teaserData` in `src/PersonalFirePlanTeaser.tsx` to change the city, spending values, savings rate, FIRE date, timeline impact, or CTA copy.
