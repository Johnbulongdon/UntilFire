# Financial consistency repair plan

Goal: repair the eight confirmed round-4/5 defects on web and phone from main 6affc4f, within N2.
Architecture: shared pure balance resolution; canonical user_budget household reads; confirmed account identity and per-member coverage for spending; pension eligibility before date formatting; rates weighted against current included debts; personal ownership on needs.
Tech stack: TypeScript, Next.js, React Native, Supabase; no new dependencies or migrations.

- [x] Add behavioral regressions for zero balances, household FX/current inputs, independent duplicates, missing partner coverage, pension timing, debt rates and shared needs. Run and record expected failures.
- [x] Share connected-balance replacement with finite-value filtering; preserve valid zero. Align web and phone.
- [x] Read household user_budget, convert account currencies, exclude metadata from budgets, include safety cash separately at cash returns. Fail uncertain required reads.
- [x] Deduplicate only confirmed cross-owner account links, preserve repeated purchases, require three common complete months for all expected members.
- [x] Evaluate pension bridge today before reporting today; keep future bridge crossings conservative. Cover web/phone parity.
- [x] Match current loan/card balances to saved rates, include zero and default unknown rates. Ignore unrelated saved rows.
- [x] Apply personal account shares to needs, last-month needs and contribution consumers on both platforms.
- [x] Run focused checks, web validation, phone types/lint. Review diff and open a separate PR with baseline, rollout and limitations. No merge/deploy without John.

Review: PR #321; full validation and phone checks passed. Merge remains pending John.
