# Feature contracts and implementation map

Repository inspection at `2af3cb8`, 24 September 2026. Presence in code does not
certify correctness, live migration state, or production QA. Consult the linked
contract and relevant tests before changing behavior; record meaningful rationale
in [DECISIONS.md](DECISIONS.md).

| Area | Current contract / code | Boundary or follow-up |
| --- | --- | --- |
| No-login calculator and reveal | [PRD](PRD.md), `app/HomeClient.tsx`, `app/components/RevealFlow.tsx` | Free first value; optional continuation; protect private values |
| Navigation and assumptions | [App structure](design/app-structure.md), `app/dashboard/FireAssumptionsCard.tsx` | Money manages actuals/budgets/upcoming; Plan owns projections; Profile owns account/type |
| Visual primitives | [Design system](design/design-system.md), `components/ui/` | Verify both themes and accessibility; prominent freedom-date Fraunces exception |
| Cashflow and imports | `app/dashboard/TransactionsTab.tsx`, `app/dashboard/CsvImportModal.tsx`, `app/dashboard/ExpectedPaymentsTab.tsx` | Upcoming combines expected payments and recurrence suggestions; mobile save QA follow-up |
| Household | [Family accounts](design/family-accounts.md), `app/dashboard/HouseholdSection.tsx` | Invitation, combined view, confirmed deduplication, shared Pro; verify user isolation |
| Contributions | [Next contribution](design/next-contribution.md) | Shared Home/Plan derivation, separate payday/buy-in cadences and cashflow ledger; monthly email and live persistence QA remain separate |
| Portfolio and scenarios | `app/portfolio/`, `app/dashboard/page.tsx` | Already implemented; no implied approval for new named asset recommendations |
| City pricing | [Cost of living](cost-of-living.md) | Preserve rejected-source rationale; review data before promotion |
| Analytics | [Event contract](analytics/EVENTS.md) | Check actual emit paths and data; historical counts are not current analytics |
| Email | `app/api/email/retention/route.ts`, `lib/email-send.ts` | Existing lifecycle emails are not the unfinished monthly contribution email |
| Pricing | `lib/pricing.ts` | Display constants do not prove the amount charged by Stripe |
| PWA / Android wrapper | `app/manifest.ts`, `public/sw.js`, [Android setup](../android/SETUP.md) | Scaffold exists; store publication and device QA are not certified |
| Monte Carlo | [Removal entry](../CHANGELOG.md), decision D-07 | Removed; older probability-score plans are historical |

The older `docs/modules/` documents and sprint plans are historical snapshots,
not current implementation specifications. Preserve their intent where useful;
do not implement their unverified routes or reopen completed work from checkboxes.
