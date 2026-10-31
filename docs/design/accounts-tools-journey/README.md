# Accounts & tools — connected journey mock

**Status:** interactive mock for review, 1 November 2026. Concept approved; production integration is not implemented here.
**Baseline:** started from GitHub main af157f1; reconciled latest main 3d97d33 before publication. Kept separate from bank-health PR #352.
**Style:** John explicitly selected the current app's yellow and pastel style over the older local Mint default. Use Inter, supplied logo assets, black pill actions and Next Horizon colours.

## Open locally

The running review is http://127.0.0.1:4214/#tools . Phone-size view: http://127.0.0.1:4214/?phone=1#tools .
The mock lives in this repo under mock/. Run its dev script from that folder if restarting it is needed. No production route, financial data, referral link, native configuration or root dependency changes.

## The journey

Home's **Your next move** remains one actionable card, not a new reminders page. It opens a task within Plan. Money owns the permanent **Accounts & tools** destination.

1. Home card → Plan task: choose an existing account or explore accounts.
2. Accounts & tools → Investing/Savings filters → optional comparison of two providers.
3. Provider details → nearby reward disclosure → provider handoff.
4. Return → opened / still applying / use an existing account.
5. Contribution setup → explicitly user-reported setup completion → Home updates its next step.

The handoff screen is labelled as a mock simulation, not an app page. It never opens a referral URL. Official provider-information links can open their public documentation. Preview controls sit outside the app.

Existing-account users bypass referrals and do not have to connect a bank. A savings provider cannot silently become the destination of an investing step: its explicit goal action opens a savings task first. Not now hides the Home card while leaving Plan reachable. A changed task clears that visit's dismissal.

## What is illustrative

All financial values, account status, dates and people are examples. State is memory-only and resets on refresh. Clicking a provider never marks an account opened. User-reported setup never changes balances or claims that money was transferred/invested.

Fidelity/Interactive Brokers/Robinhood are examples, not approved live offers, endorsements or a suitability assessment. No referral bonus, rate, fee or eligibility promise is invented. Savings-provider examples still need terms research. IBKR uses a neutral globe icon, not a fabricated brand logo.

The outside preview control shows an illustrative inviter link for IBKR; other examples fall back to UntilFire. This is not the production attribution resolver and does not assert provider-program approval.

## Production integration to follow visual review

- Extend existing Money → Offers (D-81); preserve existing offers deep links. Approved live data must come from the existing curated registry, not this hard-coded example list.
- Home retains the existing next-move priorities. Account setup is a relevant substep for the user's active plan; it must not outrank urgent cash/budget/debt issues or become an unsolicited broker advert.
- Keep setup progress owner-scoped on the server so it survives reload, sign-in and phone/web changes. Reuse Plan → Contributions and existing account/manual-activity tools for ongoing financial tracking.
- Resolve each provider's approved inviter link from existing attribution (D-27), otherwise the approved UntilFire link. Check allowed domains, geographic eligibility, terms approval and expiry. Never accept a beneficiary from an untrusted URL or copy auth credentials into a provider link.
- Keep click, self-reported opening, verified account connection and observed contribution separate. Existing outbound clicks do not prove conversion.
- A returning browser/app can offer the persisted step but cannot infer an account was opened from a tab switch. Do not nag on every foreground event.
- The existing legal/program-review question in D-03/D-81 remains before any brokerage referral offer is enabled. This mock adds no programme permissions or live payout claims.
- Preserve the bank-health feature, financial calculations, refund protections, contribution allocation and existing paid/free entitlements.

## Evidence

See mock/design-qa.md. Vite build and the template's four hosting-packaging tests pass. Browser checks covered both branches, comparison, keyboard filters, unsupported-location state, referral-credit/fallback examples, Not now and manual-account setup. Local screenshots stay outside Git in .audit-financial/accounts-tools-journey/.

Provider feature descriptions checked against official pages on 1 November 2026:
- Fidelity: https://www.fidelity.com/investing/brokerage-account
- IBKR: https://www.interactivebrokers.com/en/whyib/overview.php
- Robinhood: https://robinhood.com/us/en/support/articles/investments-you-can-make-on-robinhood/

These sources establish broad product descriptions, not approval of commercial referral placement.

## Referral-copy refinement — 1 November

Removed the prominent referral-label block. One readable “Paid referral link · [beneficiary]” label remains immediately below the outbound button. FTC staff guidance explicitly identifies paid link beside an affiliate link as an adequate disclosure of its nature. No tracking-only claim or exclusive-user-reward claim is introduced without verified provider terms. Confirmed user offers can lead the content once available. FTC guidance checked: https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking .
