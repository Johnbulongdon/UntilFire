# Design QA

final result: passed

Scope: an interactive review mock, not production integration or native-device acceptance.

## Reference and evidence

John selected the current yellow/pastel app style on 1 November. Source: docs/design/design-system.md and the approved light app-component capture. Source and new desktop capture were opened together in one browser comparison, saved privately as style-comparison.png. Both source captures are 1280 × 720. This is a shared-style comparison; the new page hierarchy/content is intentional, not a claim of 1:1 same-screen recreation.

Full-size screenshots reviewed: Home, Plan step, Accounts & tools, provider details and phone-size Accounts & tools. Evidence is local in .audit-financial/accounts-tools-journey/. The phone stage measured 390px and 320px wide, adapting its height to the available desktop window; these are browser containers, not physical phones.

## Fixes and subsequent checks

- P2: phone comparison initially cut off the second provider. Changed to fit both columns, shortened the row label, hid the redundant visual corner heading and retained readable action labels. Rechecked at 320px.
- P2: three Compare checkboxes originally had identical accessible names. Added provider names; verified a third selection is disabled after two are chosen.
- P2: filters needed complete tab keyboard semantics. Added roving focus, arrow/Home/End controls, panel relationships and keyboard checks.
- P2: cross-purpose account choice could carry a savings provider into an investing task. Added explicit goal switching before continuing.
- P2: completed setup could reopen an unfinished-looking Plan task. Completion now changes its heading/action and the Home next step; user-report wording stays explicit.
- P2: long custom account names needed containment. Account rows and Home task copy wrap without widening the page.
- P3: removed a duplicated existing-account action in the unsupported-location state and shortened the Tools introduction.

## Required visual surfaces

- Typography: local Inter 400–800; loaded font verified in the browser. Clear headings and tabular money values; referral disclosure remains 12px. No serif/old wordmark.
- Spacing/layout: one main task per page, rounded 24–28px surfaces, contained comparison and mobile list rows. Desktop content and phone containers had no horizontal page overflow.
- Colours: #151719 actions/ink, #FFE58A Home freedom card, #E3F7EF/#EEE9FA/#E8F3FF supporting surfaces match the selected system. Status does not depend solely on colour.
- Imagery: supplied UntilFire lockup and existing full-colour provider images, preserved proportions; no broken images. Neutral Lucide globe for IBKR is a documented prototype choice.
- Copy/content: example data is labelled outside app chrome; no invented APYs, reward amounts or live availability. Opened/applying/setup states are distinct. No payment/transfer success is inferred.

## Functional verification

Home → Plan → Tools → provider → simulated external handoff → return → still applying → resumable Home card; reopened return → user-reported opening → setup completion. Existing-account/manual-name branch bypasses referral and mandatory bank connection. Tested comparison limit, terms disclosure/href, inviter credit and UntilFire fallback, keyboard purpose change, savings goal branch, unsupported location and Home dismissal with Plan still reachable. Route changes focus the heading. Console error check returned none; images loaded; measured content width equals scroll width at 320px/390px.

The prototype build and all four template packaging tests pass. Reduced-motion CSS disables section entry motion; physical assistive technology and OS preferences were not exercised.

## Limits and follow-up

Production API/attribution/persistence, native bank handoff, provider programme eligibility and real financial tracking are not implemented by this mock. Comparison is intentionally sparse until approved fee/eligibility metadata exists. Source the official IBKR asset before production polish if its programme is approved. Preserve the actual Home dashboard around the proposed next-move card when integrating; the mock's surrounding Home data is illustrative.

Final status correction: retained whether an account was existing or newly opened after setup completion, so an existing account is never relabelled as newly opened. Rechecked the completed Plan state after the fix.

Referral-copy follow-up: replaced the large label/card with one 12px compensation disclosure immediately under the CTA. No unsupported unique-reward or tracking-only copy. Rechecked the UntilFire and inviter examples at phone width; required disclosure remains visible beside the action.
