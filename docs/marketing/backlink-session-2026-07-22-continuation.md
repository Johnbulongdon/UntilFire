# Backlink Session Notes - 2026-07-22 Continuation

Temporary sync note for backlink work. Merge these items into `docs/marketing/BACKLINK_LEDGER.md` when making the next safe full-ledger edit.

## Completed / Submitted

| Site | Status | URL | Evidence | Next action |
| --- | --- | --- | --- | --- |
| Startup Alternatives | submitted | https://www.startupalternatives.com/submit | Public no-account endpoint accepted UntilFire with HTTP 200 `{"ok":true}` on 2026-07-22. Existing listing pages observed with outbound `rel="noopener noreferrer"` and no `nofollow`, but UntilFire listing was not public immediately after submission. | Recheck https://www.startupalternatives.com/startups/untilfire later; count as dofollow only after live page confirms a followable UntilFire link. |

## Live But Not Dofollow

| Site | Status | URL | Evidence | Next action |
| --- | --- | --- | --- | --- |
| Startups.fm | live-nofollow | https://startups.fm/startups/untilfire | Public listing is live, but the outbound UntilFire link uses `rel="nofollow noopener noreferrer"`. | Do not count as dofollow. If there is a badge verification or owner contact path, request conversion to followable link. |

## Manual / Retry Candidates

| Site | Blocker | Why it may still be worth manual work |
| --- | --- | --- |
| Secret Search Engine Labs | Public Add URL queue returned `Queue is full, please try again later`. | BacklinkBot lists it as DR 48 dofollow; page says accepted URLs get a live link after indexing. Retry later. |
| 9Sites.net | Free regular listing form reached final verification-code step. | Good candidate: free regular link, no account, finance category available. Needs human verification code; do not bypass. |
| CodeTrendy | Free submission requires account plus website badge. | Search result advertises free product listing with dofollow backlink. Candidate if user/account flow is allowed. |
| Launchpadly | Login required before `/submit`; free plan appears badge/review based. | Good DR candidate but account-gated. |
| StartupDirectory.net | Login required before `/submit`; badge + verification required for free dofollow listing. | Good candidate if user/account flow is allowed. |
| Dofollow.Tools | Account-gated and requires logo/screenshot uploads; badge already present in footer from earlier work. | Good candidate for manual authenticated verification. |
| ShowMySites | Account-gated at create flow; badge already present in footer from earlier work. | Good candidate for manual authenticated verification. |
| Verified Tools | Security/Turnstile check and uploads required. | Only pursue manually; do not bypass. |
| DaysLaunch | Free plan says dofollow links, but submit redirects to login and requires backlink/badge. | Candidate if account flow is allowed; do not count before approval/live listing. |
| Open Launch / TinyLaunch / LaunchBoard | Login required and free dofollow is conditional or fully booked/top-3/badge based. | Candidate if user wants account-gated launch-platform work. |
| InfoWebWorld | Existing listing pages use direct outbound links without `nofollow`, but no public listing form was found; Get Listed/sign-in routes do not expose a form in static HTML. | Possible owner-contact candidate, especially for personal finance / fintech category. |

## Skipped / Not Viable This Pass

| Site | Reason |
| --- | --- |
| LynxPrice | Submit routes missing/stale; homepage submit links are `href="#"`. |
| MEDIAPRONET | Account plus reCAPTCHA gated. |
| FastD | Parked GoDaddy-style lander, no active directory flow. |
| WeekHack | Auth-gated and free dofollow is only if top 3. |
| Scrappy Startups | Requires truthful profitable/revenue claim; not enough evidence provided. |
| Startups & Founders | Free tier is listing only; dofollow appears paid/featured. |
| SaaS.fyi | Submit page appears to use placeholder/broken Formspree endpoint. |
| Tiny Startups | Account-gated. |
| Curate The Internet | No public submit route found; newsletter only. |
| Open Source Startups | Wrong fit unless UntilFire is positioned as an open-source project. |
| Top Startup Ideas | Wrong fit; startup ideas database, not product directory. |
| Domain Rating | UntilFire page is noindex and outbound link is nofollow. |
| Startup Buffer | Cloudflare/JS gate. |
| SubmissionWebDirectory | Cloudflare/JS gate. |
| SitePromotionDirectory | 406/login/paid signals; no clean public submission. |
| EZWebDirectory | Account/register required for publishing. |
| GlobalBusinessListing | Register/local-business style flow; not a clean SaaS/FIRE product submission. |
| Jasmine Directory | Paid listing signals; no free public form found. |
| LaunchClash | Login required. |
| ProductLaunchpad | Login required. |
| TinyLaunchpad | Sign-in/pricing gated. |
| Startuptabs | Low-quality/unrelated casino-spam content; skipped. |
| LaunchYourApp | No real public form found. |
| WhatLaunched.Today | Account/CAPTCHA/pricing gated. |
| StartupInspire | Static/stale; no usable submit route. |
| My Launch Stash | Login required. |
| Appa List | Login required. |
| SaaSHunt | Login/pricing/CAPTCHA signals. |
| Startup Vessel | Login required. |
| Launch List | No public submit route found; service appears account/service oriented. |
| SaaS Wheel | Login required. |
| Tolodora | Login required and client bundle states free listings get a nofollow link. |
| Neeed Directory | Login required. |
| FoundrList | Interactive/account-gated launch app; no static public submit form. |

## Notes

- Do not count `submitted` entries as dofollow until a public page is live and the outbound link to `https://www.untilfire.com/` does not include `nofollow`, `ugc`, or `sponsored`.
- Account-gated candidates are intentionally not submitted in this pass because the working rule is free, no CAPTCHA, and no account gate unless explicitly approved for authenticated-account workflows.
- Local `git fetch origin main` timed out in this environment, so this note was written through the GitHub connector to avoid stale local edits.
