# Financial consistency repairs — N2

Baseline: latest pushed main 6affc4fe97ec4f6bb67fc038315b86325a9dc618, fetched 27 October 2026. Local work stays in F:\Claude-Untilfire on codex/financial-consistency. No migration or dependency change.

## Behavior

- Web and phone resolve connected balances by account presence, not a positive sum. Genuine zero replaces typed balances. Invalid, null and unconvertible asset amounts are excluded without reviving typed money. For liabilities with unavailable balances, the typed aggregate remains a conservative floor; card credits cannot cancel other card liabilities.
- Both personal engines check today's access-age bridge before calling today free. Date interpolation cannot precede a prior annual point whose bridge is still short. Bridge-dependent dates may conservatively use the next annual point; they are not daily pension simulations.
- Debt rates are weighted against the current liabilities included in total debt. Known zero rates stay zero; unknown rates use the existing 5% default. Saved ladder amounts do not override current bank balances. Matching remains by unambiguous name until the saved ladder supports stable bank account IDs.
- Shared-account personal needs, last-month needs and contribution/safety consumers apply account ownership on web and phone.
- Household reads current user_budget and its _fire_profile rather than stale scenario_assumptions, ignores budget metadata and honors same-currency local budget mirrors. Linked balances convert to USD before aggregation and deduplication. Required membership, account, link, profile and budget read errors stop aggregation; unknown required linked balances/rates do not become invented totals.
- Non-spending cash contributes once to household progress, with cash returns distinct from investments. Spending accounts remain excluded. Confirmed duplicate groups remove a balance only once.
- Household real spending needs three common complete spending months for all expected members. Missing/failed/insufficient history uses combined saved budgets. Only confirmed cross-member account links remove duplicate transactions; repeated identical purchases retain multiplicity.

## Scope and integration

This is separate from PR #320's refund/account-save migration and draft PR #269's billing, API and ordinary-deficit work. It contains neither branch's commits. PR #269 touches the same web/phone engine files but a different calculation path; integrating it later needs semantic review and all calculation regressions rerun. Other open UI/native-upgrade PRs do not authorize changes to this task's release settings.

The household date remains the existing type of combined estimate, not the personal full engine. Individual pension-access restrictions, tax settings and debt schedules are still absent from that household estimate. Typed shared funds and unlinked shared budgets cannot be safely deduplicated; P5 remains deferred. Rates use the existing public USD feed with the existing fallback table; unavailable currency coverage fails explicit conversion. No raw customer data was queried or stored.

## Verification

38 new synthetic behavioral cases pass, including both web and phone source, household service queries and the household summary handler. Original failures were observed before their repairs. Existing Plan-date, safety-cash, money-rule, FIRE projection, account-currency, household-access, net-worth comparison, contribution-plan, contribution-waterfall and life-change checks passed. A misleading existing cash test used an exactly funded target while claiming to be below it; it now uses a genuinely below-target amount and preserves its original purpose.

Final npm run validate passed (two website builds, TypeScript and lint); phone TypeScript and changed-file lint passed. Existing unrelated website lint warnings remain. No browser screenshot, authenticated live account edit, physical-device or live migration QA is claimed.

Publication: implementation verified in [PR #321](https://github.com/Johnbulongdon/UntilFire/pull/321), code commit 9aae41b17ce6f57971511fb2c6d92a8f2c319803. Review/CI and merge pending. No merge, production deployment, store build or phone update has been performed. Main merges deploy the website; phone preview/production eligibility remains the existing workflow. John authorizes merge separately.
