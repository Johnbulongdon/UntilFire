# Accounts & tools — implementation QA

1 November 2026. Author: Codex. PR #354. All operational examples below are synthetic; no customer application, account opening, transfer or production database write was performed.

## Executed checks

- Full npm run validate passed against main 78f24d2 (Next production build, TypeScript, repository ESLint and second production build). Existing repository warnings remain; no errors. Main subsequently gained PR #357 transaction changes; reconciled 3759091. The combined production build, website/mobile TypeScript, changed-file ESLint and focused provider/referral/Journeys/transaction guards passed.
- Website and phone TypeScript passed. Changed-file ESLint passed; mobile files are checked explicitly with --no-ignore.
- node scripts/verify-provider-links.mjs: 23 scenarios execute the actual API handlers against a synthetic Supabase adapter. Invalid bearer/admin identity, immutable inviter selection, link ownership, pending/rejected/wrong-domain fallback, per-provider bonus isolation, stale selection/review/setup versions, one-use/expired/revoked/disabled/paused tickets, duplicate claims, database failure preservation and existing/new setup origins are covered. CI runs it with the existing referral and partner-offer checks. Additional guards require private account names, inviter labels, own links and review notes to remain masked in phone/web replays.
- Existing referrals: 70/70; existing partner offers: all checks pass. Journeys: 22 paths and canvas validation pass.
- The complete additive migration executed locally using the already-installed PGlite PostgreSQL runtime. Verified default-disabled member submissions, RLS on all three new tables, anon/authenticated permission denial, service-role access, unique partner/provider and user/goal rows, stale-version update rejection, and consume-once deletion. This is not hosted PostgREST or independent-connection concurrency verification.
- Android/iOS/web production exports passed before the final small phone layout/key/retry refinements; final export is rerun after removing temporary fixtures. Final Android/iOS/web exports passed again after main reconciliation and replay masking, with no QA route, fixture text or localhost transport in the output. No native configuration, mobile scripts or dependency changes.

## Browser evidence

Actual production web components and API handlers ran through an ignored fixture transport at localhost:4220, with synthetic Broker A/B and Savings A metadata and two test identities. At 1280px and 390px, exercised library filters, details, comparison, handoff/return, confirmed-opened versus setup-done, own-link editing back to pending and admin re-approval. Web light/dark states checked. documentElement.scrollWidth did not exceed innerWidth. The expanded comparison originally covered the narrow page; it now flows inline when expanded. Console errors absent.

The actual Expo components ran in Expo web using a temporary local fixture transport at localhost:4222/tools-qa. Dark theme at 390px: details showed the inviter's label, provider handoff returned to the self-report prompt, setup persisted, existing-account entry stayed existing, and account switching showed the correct owner's link-management form. Page width was 390px with no horizontal overflow; console errors absent. Existing account/bill require-cycle warnings remain outside this change. Temporary route/auth helper and transport override were removed and the production transport restored before final export. Screenshots remain private under .audit-financial/ and the task visualization folder.

## Release gates and limits

- Migration is prepared and shown in full in the contract; not applied to production. Apply before deploying callers, then perform authenticated hosted acceptance.
- No provider programme or member link was activated in production. Admin reviews current programme placement/eligibility/disclosure requirements, enables each curated provider and approves actual member submissions.
- Physical Android/iOS browser handoff, keyboard, assistive technology and installed-device light/dark acceptance remain pending. Expo web is not a substitute.
- Native attribution reads the existing saved UntilFire invitation; this does not add deferred Play-install attribution. Broker completion remains self-reported and no money is moved.
- Local fixture transport is review tooling only and is not included in production routes or phone bundles.

## Creator-flow audit repairs — 1 November 2026

Baseline refreshed to origin/main 8f9b8d5 and merged normally, preserving both changelog and phone update-log entries from main. Creator dashboard now links directly to own provider setup. Existing member invite codes are shown read-only and retained on creator upgrade; their partner ID, shared invitation URL and provider-link ownership are unchanged. Failed creator/profile/statistics reads return retryable errors; the client shows Try again and retains previously loaded creator state.

Verification: 28 actual-handler routing/setup scenarios plus privacy guards pass; existing referrals 70/70, partner offers 17/17 and Journeys 23/23 pass. Website production build/TypeScript and targeted ESLint pass. Current real CreatorArea checked with synthetic fixture transport at 1280px and 390px; direct navigation, initial lookup failure, retry recovery and read-only member code verified. New provider entry has a 44px target; no horizontal overflow at either width. Narrow dark creator card checked. No production writes, migration application, provider activation or phone release. Hosted auth/database and installed-device acceptance remain pending.
