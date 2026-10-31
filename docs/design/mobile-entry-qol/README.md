# Phone entry and Activity quality of life

31 October 2026. Baseline origin/main e00652c. Scope approved by John: first three proposed phone QOL items. Work is in F:/Claude-Untilfire, codex/mobile-entry-qol. No new dependencies, native configuration, runtime change, schema change or financial calculation changes.

## Behaviour

- Transaction/bill forms compare editable values with their initial snapshot. Cancel and navigator removal show Keep editing / Discard changes only after a change. Returning values to their originals removes the warning. Opening optional UI does not count as editing.
- While saving/deleting, entry controls and departure are blocked. Failed writes preserve the form and error. A successful write disables the guard before navigating back once, including an explicit confirmed delete. Existing mutation functions and payloads stay unchanged.
- A shared footer keeps the save action pinned and adds Next field / Done while entering values. Transaction amount advances to description; bill name advances to amount. Numeric entry remains decimal-aware. Android uses height avoidance, iOS padding. No new native keyboard package.
- Activity remembers period, category, query and scroll offset in memory for one account/entry context. Explicit category/month links start their requested view. Another account receives defaults; old cleanup cannot overwrite a newer account/context. Search text is not stored on disk.
- Scroll restoration waits for layout/content, ignores initial layout scroll events and cancels pending frames on blur/unmount or a user drag. Hidden-list zero-position events are ignored so opening a detail cannot erase the remembered position. Shorter lists use native clamping after edits.

## Verification

- node --experimental-strip-types --no-warnings scripts/verify-mobile-entry-qol.ts: changed-field coverage for transactions/bills, restoration of original values, account/context isolation, copied snapshots, late cleanup, nonfinite offsets and signed-out reset.
- Actual transaction and bill routes opened from a temporary local navigation fixture, signed out. Clean Cancel exits directly; dirty Cancel shows the shared dialog; Keep editing retains 12.50; Discard returns once. Transaction Next focuses description; bill Next focuses amount; Done removes toolbar focus state.
- Actual shared guard exercised with simulated busy/failure/success buttons and no network writes. Busy Back stays; failed-save Back warns; Keep editing then successful completion exits once without a warning.
- Actual shared Activity hook exercised in a SectionList with synthetic rows. Search lunch and category food retained. Scrolling, opening a row and returning retained offset 461; leaving/reopening the screen retained the same offset 461. Earlier zero-position regression was found and fixed by ignoring unfocused scroll events.
- Browser console error check passed. Discard dialog screenshot: C:/Users/Chunky SEAL/.codex/visualizations/2026/10/19/01a15267-d11c-7b30-9624-f0d85edfe90a/mobile-entry-qol/discard-protection.png.
- Final mobile TypeScript, focused lint and Android/iOS/web bundle checks are recorded in the PR. Temporary entry-qa, entry-guard-qa and activity-qa routes and console instrumentation are excluded from committed source and final export.

Limits: browser checks do not simulate a real software keyboard or Android hardware Back/iOS swipe dismissal. These, large text, screen reader focus, real-account save failure and data-changing edits need device/test-account acceptance. No customer data was changed for QA. Drafts are protected from navigation, not persisted across an OS force quit. No merge or phone publication is claimed by this implementation task.

Final review: reconciled latest pushed main 8766518 before PR publication, preserving the newer web import/duplicate work. Mobile TypeScript, changed-file lint, regression script and Android/iOS/web exports passed; final Android export is repeated after reconciliation. Temporary test routes and diagnostic strings are absent from the final web bundle. No merge or phone release performed.
