# Contributions visual and behavior QA

Target: approved desktop option 2, amended by John to combine emergency minimum/top-up into one Emergency savings destination. Keep the current app shell, Inter tokens and semantic warnings. Synthetic examples only; no customer data was changed.

Baseline: origin/main 37a6d4a. Scope: D-132, N2 follow-up.

## Accepted behavior

- The actual website component shows a single combined destination, total preserved. The amount/date sit beside destinations on desktop and above them at 390px.
- A shortfall and stale-balance qualification remain above the planned amount even while calculation is closed. The primary callback opens Money's Calendar (expected payments); stale-only action opens Net Worth. Account setup is contextual to save/invest rather than every priority.
- Edit opens Contribution settings and focuses the amount. Editing the synthetic amount updates the summary and combined row; existing save feedback remains live. Calculation and investment disclosures open independently.
- Zero and all-investing states render without invented emergency allocations. Effective debt-rate field and ladder labels agree for the default nominal rate and an explicit edited rate.
- 1280px and 390px browser layouts have no document overflow. Dark narrow rendering inspected. Browser console has no component errors. Existing holding input labels now include the ticker.

## Visual comparison

The approved reference and actual component captures were opened together. The two-column amount/destination hierarchy, single primary warning action, pastel destination indicator and three disclosure sections match the selected structure. Intentional differences: one emergency row rather than two; normal shared app type scale; warning uses the existing amber semantic token; synthetic-preview controls belong to the QA harness only. They are absent from production code.

Initial QA captures had cropped/low-resolution browser output and were rejected for fine-detail comparison. A readable Chrome viewport capture and narrow dark capture were saved and inspected privately; no screenshots of account data are checked into Git. The fixture now includes the production border-box reset so control spacing is comparable. This is component/interaction acceptance, not a pixel-perfect clone or full accessibility certification.

## Verification

- Full npm run validate passed (production builds, TypeScript and lint; existing unrelated warnings retained).
- Mobile TypeScript and changed-file lint passed; Android, iOS and web exports passed.
- Contribution plan, waterfall, ladder, forecast and presentation checks pass. Four historical ladder fixture failures came from assuming last-month needs while selecting the average default; the fixture now chooses last-month explicitly and separately checks the average default. No calculation engine was changed.
- New presentation regressions verify summed destinations without mutation, debt between emergency stages, disabled stages, zero/investing states and shortfall/stale/missing/FX/custom-override warnings. These checks join financial CI.

## Limits

The browser used actual components with synthetic storage/transport, not a live backend write test. Installed Android/iOS visuals, hardware back, TalkBack/VoiceOver and production OTA receipt remain unverified. Phone implementation retains existing mark-as-made/undo; no transfer is initiated by this page. No migration, dependency or native-configuration change. Merge deploys the website; phone production promotion is separate.

final result: passed
