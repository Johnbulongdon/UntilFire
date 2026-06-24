# Backlink and Directory Ledger

This is the authoritative coordination log for UntilFire directory submissions, backlinks, guest posts, and SEO outreach. Read it before starting related work so separate sessions do not duplicate submissions.

Current prepared batch: `docs/marketing/BACKLINK_SUBMISSION_PACK_2026-06-22.md`

Last full audit: 2026-06-22

## Session Rules

1. Search this file for the destination domain and target URL before submitting anything.
2. Use one row per destination domain and UntilFire target URL. Update an existing row instead of creating a duplicate.
3. Record work in the same session that submits, verifies, rejects, or removes a listing.
4. Do not resubmit entries marked `submitted`, `pending`, or `live-*` unless the notes explicitly say a follow-up is due.
5. A prepared post, badge, search result, or Ahrefs row is not proof of a successful submission. Add a live or receipt URL as evidence.
6. Keep unsolicited SEO spam separate from intentional or earned backlinks. Do not report spam domains as backlink wins.
7. Use ISO dates (`YYYY-MM-DD`). If the exact date is unknown, use the most precise known month and explain it in Notes.
8. Set Owner/session to a person, Codex thread, or `Unknown (pre-ledger)` so follow-up work has an accountable source.
9. If a platform assigns a launch or publication date, record the date, time, and timezone exactly as shown and change the status to `scheduled`. Use `Unknown` when the schedule is inaccessible; never infer it.

## Status Vocabulary

| Status | Meaning |
| --- | --- |
| `live-follow` | Live page with a direct link and no observed `nofollow`, `ugc`, or redirect intermediary. |
| `live-nofollow` | Live page whose link is marked `nofollow` or `ugc`, or Ahrefs reports zero dofollow links. |
| `live-redirect` | Live listing whose website button goes through the directory's redirect endpoint. |
| `live-unverified` | Live listing exists, but the external link or its follow attributes have not been technically verified. |
| `submitted` | Submission was made and has evidence, but the final backlink is not confirmed. |
| `scheduled` | The submission was accepted and the platform assigned a future launch or publication date. |
| `pending` | The platform explicitly reports that review or publication is pending. |
| `removed` | A previously observed listing now returns 404 or can no longer be located. |
| `rejected` | The platform explicitly rejected the submission. |
| `not-submitted` | Checked during the audit; no repository or public evidence of submission was found. |
| `spam-ignore` | Unsolicited or automated backlink spam. Never contact, pay, or resubmit. |

## Audit Snapshot

On 2026-06-22, the Ahrefs Referring Domains report showed 175 domains and Domain Rating 0; the dashboard summary showed 160 referring domains. These counts are volatile. The report was dominated by automated SEO-spam domains, so the raw referring-domain count must not be used as the count of useful backlinks.

Peerlist and Shipstry were confirmed among the legitimate Ahrefs entries. Most high-DR-looking results were explicitly labeled SPAM by Ahrefs and had no traffic.

## Confirmed Live Listings and Backlinks

| Platform | Status | Submitted / first seen | Live or evidence URL | Link details | Owner/session | Last verified | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AlternativeTo | `live-unverified` | 2026-03-27 | https://alternativeto.net/software/untilfire/about/ | Official website link is visible; follow attributes not verified | Johnbulongdon | 2026-06-22 | Added as an alternative to several FIRE planning products. |
| Microlaunch | `live-unverified` | 2026-05-28 | https://microlaunch.net/p/untilfire | Public page exists; embedded launch data includes `https://untilfire.com`; clickable external anchor/follow attributes not verified in static HTML | Unknown (pre-ledger) | 2026-06-25 | Page title is `UntilFire is now on Microlaunch`; embedded data still says launch status `submitted`, so recheck after launch status changes. |
| Peerlist | `live-nofollow` | 2026-03-28 | https://peerlist.io/ngjohn101/project/untilfire | Ahrefs: 4 links to target, 0 dofollow | ngjohn101 | 2026-06-22 | Launched on Peerlist Launchpad in Week 14, 2026. |
| StrictSeal | `live-redirect` | 2026-05-19 | https://strictseal.com/product/untilfire | Visit Website uses a StrictSeal redirect endpoint | Unknown (pre-ledger) | 2026-06-22 | Listing is live and present in the StrictSeal sitemap. |
| Startup Fast | `live-follow` | Unknown | https://startupfa.st/projects/untilfire | Direct links to https://www.untilfire.com/; no `nofollow` observed. UntilFire footer now displays the official Startup Fast badge linking back to the project page without `nofollow`. | Codex backlink acquisition | 2026-06-24 | Top 1 Winner badge added from https://startupfa.st/projects/untilfire/badges; activation email sent by user on 2026-06-24 after live-site badge verification. |
| Startup Fame | `live-nofollow` | Unknown | https://startupfa.me/s/untilfire | Direct UntilFire links use `rel="nofollow"` | Unknown (pre-ledger) | 2026-06-22 | Listing reported verified on 2026-06-22. |
| StartupBase | `live-unverified` | 2026-06-23 | https://startupbase.io/products/untilfire-2 | Public listing is live; JSON-LD `sameAs` includes `https://www.untilfire.com`; clickable external anchor/follow attributes not verified in static HTML | Codex backlink session | 2026-06-25 | Previously pending review; now public. Treat as live listing but not a verified direct backlink until the hydrated Visit button can be inspected. |
| Startup Spotlight | `live-nofollow` | 2026-06-23 | https://startupspotlight.co/startup/untilfire | Website button points to `https://www.untilfire.com?utm_source=startupspotlight.co` with `rel="noopener nofollow"` | Codex backlink session | 2026-06-25 | Public listing is live after prior pending submission. |
| SaaSHub | `live-nofollow` | Unknown | https://www.saashub.com/untilfire | Website link uses `rel="nofollow"` | Unknown (pre-ledger) | 2026-06-22 | Public product profile is live. |
| Shipstry | `live-nofollow` | 2026-05-23 | https://shipstry.com/product/until-fire/9Uz_LZDfN8 | Ahrefs: 2 links to target, 0 dofollow | Unknown (pre-ledger) | 2026-06-22 | Public product listing is live. |
| Noonlaunch | `live-nofollow` | 2026-06-23 | https://noonlaunch.com/product/untilfire | Website button points to `https://www.untilfire.com/?ref=noonlaunch` with `rel="nofollow noopener"` | Codex backlink session | 2026-06-23 | Free launch submitted for 2026-06-24; page is public while pending launch/review. DR 25 via FrogDR. |
| MarketingDB | `live-nofollow` | 2026-06-23 | https://marketingdb.live/project/untilfire | External links to `https://www.untilfire.com` use `rel="noopener noreferrer nofollow"` | Codex backlink session | 2026-06-25 | Previously queued after badge verification; public project page is now live. |
| Uneed | `live-unverified` | Unknown - already present in waiting line | https://www.uneed.best/tool/untilfire | Public listing is live; JSON-LD `url` is `https://www.untilfire.com`; clickable external anchor/follow attributes not verified in static HTML | Unknown (pre-ledger) | 2026-06-25 | Previously found in Uneed waiting line; now public. Recheck with hydrated browser if direct link attribution matters. |
| Reddit - r/financialindependence | `live-nofollow` | 2026-05-20 | https://www.reddit.com/r/financialindependence/comments/1tigher/weekly_selfpromotion_thread_wednesday_may_20_2026/ | Community/UGC link | Little_Tomorrow_9250 | 2026-06-22 | Weekly self-promotion thread submission. |
| Reddit - r/SavingMoney | `live-nofollow` | 2026-05 | https://www.reddit.com/r/SavingMoney/comments/1tfos1s/best_budgeting_app_that_actually_helped_you_save/ | Community/UGC link | Community mention | 2026-06-22 | Recommendation mentions UntilFire calculators. |
| Reddit - r/AppsWebappsFullstack | `live-nofollow` | 2026-03 | https://www.reddit.com/r/AppsWebappsFullstack/comments/1tf2z84/drop_your_startup_ill_check_every_single_one_and/ | Community/UGC link | Unknown (pre-ledger) | 2026-06-22 | UntilFire appears in a "Drop Your Startup" discussion. |

## Submitted or Public, Backlink Not Confirmed

| Platform | Status | Submitted date | Assigned launch date | Submission or public URL | Owner/session | Last checked | Notes / next action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Product Hunt | `submitted` | Unknown (user confirmed submission) | Unknown - Product Hunt account access required | Not currently accessible | John | 2026-06-22 | User-confirmed submission. Verify the assigned launch date and submission URL in an authenticated Product Hunt session. |
| Launching Next | `submitted` | 2026-06-24 | Unknown - publication is email-confirmed if accepted | https://www.launchingnext.com/thanks/?i=138403 | Codex backlink acquisition | 2026-06-24 | Free submission accepted; confirmation page title was "Submission Received". Optional $99 upgrade was not selected and newsletter opt-in was omitted. Check email for publication decision. |
| FirstLook.tools | `pending` | 2026-06-23 | Unknown | https://firstlook.tools/submit | Codex backlink session | 2026-06-23 | Google auth completed; free plan submitted after footer badge/backlink verification. Dashboard showed `UntilFire`, status `Pending Review`, plan `Free`. |
| The Startup Project | `submitted` | 2026-06-23 | Unknown | https://startupproject.org/submit-startup/ | Codex backlink session | 2026-06-23 | Success message shown: `Your startup has been submitted! We'll review it and notify you once your listing is live.` A backlink may be required after approval. |
| Wired Business | `submitted` | 2026-06-23 | Unknown | https://wired.business | Codex backlink session | 2026-06-23 | Direct multipart submission completed; footer badge added. No public listing URL was confirmed. Site-claimed DR 73. |
| SaaSRow | `pending` | 2026-06-24 | Unknown - review stated 7-10 days; free listing expires 2026-09-22T06:07:01.302858+00:00 if approved/renewable | https://saasrow.com/submit | Codex backlink acquisition | 2026-06-24 | Free submission created through SaaSRow API; response id `1bfbafdb-e3da-466a-9bf4-179a1dcc652a`, tier `free`, status `pending`, featured flags false. Do not store the returned management token. Management-link endpoint returned 404, so email delivery was not confirmed. |
| The Startup INC | `submitted` | 2026-06-24 | Unknown - editorial review required | https://thestartupinc.com/submit-startup/ | Codex backlink acquisition | 2026-06-24 | Free Contact Form 7 submission succeeded with status `mail_sent`, message `Thank you for your message. It has been sent.`, posted data hash `2366c0b829e27281a742234ed9c3ac07`. Founding date submitted as 2026-03-01 based on first known public listing month; verify if the site requests correction. |
| FinTech Weekly | `submitted` | 2026-06-24 | Unknown - editorial directory review | https://www.fintechweekly.com/fintech-companies/ | Codex backlink acquisition | 2026-06-24 | Free fintech-company directory form submitted for UntilFire in the Financial Planning category; response returned HTTP 200 and thank-you text. Public listing/backlink was not live when rechecked the same day. |
| KittyLaunch | `pending` | 2026-06-25 | Unknown - badge verification required | https://kittylaunch.com/p/untilfire | Codex backlink acquisition | 2026-06-25 | KittyLaunch footer badge added to the site from the provided light-mode embed. After deployment, click KittyLaunch `Verify Badge` to unlock the verified badge, dofollow backlink, developer Upvote (+1), KittyPilot, Deals, and Testimonial Embed feature. |

## Removed or Unverifiable Listings

| Platform | Status | Previously observed URL | Owner/session | Last checked | Evidence / next action |
| --- | --- | --- | --- | --- | --- |
| ToolDynamo | `removed` | https://tooldynamo.com/tools/untilfire | Unknown (pre-ledger) | 2026-06-22 | Returns 404 and is absent from the current sitemap. UntilFire still displays a ToolDynamo badge; review that badge separately. |
| Stack Directory | `removed` | https://stackdirectory.com/product/untilfire | Unknown (pre-ledger) | 2026-06-22 | Returns 404 and is absent from the current sitemap. UntilFire still displays a Stack Directory badge; review that badge separately. |
| DevHubby | `removed` | https://devhubby.com/ | Unknown (pre-ledger) | 2026-06-22 | UntilFire appeared in an earlier search result, but no current listing path could be verified and tested candidates returned 404. |

## Checked With No Submission Evidence

| Platform | Status | Owner/session | Last checked | Evidence / next action |
| --- | --- | --- | --- | --- |
| BetaList | `not-submitted` | Codex backlink acquisition | 2026-06-22 | Submission redirects to account sign-in. Free-tier and publication timing were not visible without an account; defer until the higher-confidence free batch is complete. |
| Indie Hackers | `not-submitted` | Unassigned | 2026-06-22 | No repository or public listing evidence found. |
| Hacker News | `not-submitted` | Unassigned | 2026-06-22 | Launch copy exists, but no submitted Show HN page was found. |
| StartupLibrary | `not-submitted` | Codex backlink session | 2026-06-23 | Google auth completed and form prefilled; blocked on required logo upload. DR 31 via VerifiedDR. |
| Fazier | `not-submitted` | Codex backlink session | 2026-06-23 | Google auth completed, required comments done, product URL entered, badge verified, first form step completed; blocked on required logo/gallery uploads. DR 82 via FrogDR. |
| LaunchIgniter | `not-submitted` | Codex backlink session | 2026-06-23 | Google auth/profile completed and product staged from Peerlist import; blocked on anti-spam math verification `7 - 6`; solve only after explicit user confirmation. DR 75 via FrogDR. |
| Sidehunt | `not-submitted` | Codex backlink session | 2026-06-23 | Google auth completed and nofollow-free path selected; blocked on required logo/preview uploads and 400-word description. DR 33 via FrogDR. |
| StartupOG | `not-submitted` | Codex backlink session | 2026-06-23 | Free badge path exists, but form requires logo and 1-5 screenshot uploads. DR not verified by FrogDR; a public Reddit claim cites DR 11. |
| StartupTrusted | `not-submitted` | Codex backlink session | 2026-06-23 | Form was accessible after auth, but final step only offered paid plans (`$11 Pro` / `$19 Featured`). DR 48 via FrogDR. |
| MakerHunt | `not-submitted` | Codex backlink session | 2026-06-23 | Skipped because the submission surface is explicitly for AI projects; UntilFire should not be mispositioned as AI-first. DR 34 via FrogDR. |
| SourceForge | `not-submitted` | Codex backlink acquisition | 2026-06-24 | Public vendor form at https://sourceforge.net/software/vendors/new is reachable and relevant; backlinks.fyi lists DR 93 and dofollow. Form requires name, email, company, title, website, product details, logo upload, consent checkbox, and reCAPTCHA. Submit only after explicit approval to upload the logo and solve CAPTCHA. |
| Business-Software.com | `not-submitted` | Codex backlink acquisition | 2026-06-24 | Free add-product form at https://www.business-software.com/add-your-product/ says there is no cost and follow-up occurs within 2 business days. Form requires contact/product details and an image CAPTCHA. Submit only after explicit approval to solve CAPTCHA. |
| Startup88 | `not-submitted` | Codex backlink acquisition | 2026-06-24 | Free Typeform at https://startup88.typeform.com/to/CRjWqM was inspected from metadata; fields prepared and only required field is the $9.95 fast-track yes/no, where the free path is `No`. Browser later loaded the first question, but automation timed out/reset before completion and no value was retained. Rechecked on 2026-06-24; direct public Typeform API submission was not used because it requires Typeform runtime/anti-abuse context. Retry manually through normal browser flow; do not choose paid fast-track. |
| AwesomeFinTech | `not-submitted` | Codex backlink acquisition | 2026-06-24 | Finance-specific add-company page at https://www.awesomefintech.com/add/ routes to a public Google Form and is a strong manual candidate. Direct submission failed from this environment due docs.google.com connectivity; prepared values include company name UntilFire, website https://www.untilfire.com/, country United States, city Remote, funds raised None, and categories Wealth Tech / Financial wellness / SMB Fintech. |
| Fintech Labs | `not-submitted` | Codex backlink acquisition | 2026-06-24 | Relevant startup submission page at https://fintechlabs.com/submit-your-startup/ exposes an ACF pitch form, but the page includes CAPTCHA signals and email/video/pitch flow. No submission under the no-CAPTCHA/no-gate rule. |
| Ascend | `not-submitted` | Codex backlink acquisition | 2026-06-24 | Write-for-us page at https://tryascend.com/write-for-us redirects to a Leadpages page with CAPTCHA signals and email-led outreach to `writing@tryascend.com`. No submission under the no-CAPTCHA/email-only rule. |
| FinTech Insights | `not-submitted` | Codex backlink acquisition | 2026-06-24 | Write-for-us page at https://fintechinsights.net/write-for-us/ is email-only (`info@fintechinsights.net`) and mentions paid/sponsored language. Skipped under the free/no-email-outreach rule. |
| Dealflow Scout | `not-submitted` | Codex backlink acquisition | 2026-06-25 | Free founder form at https://www.dealflowscout.ai/for-founders is relevant and no CAPTCHA was observed, but POST to `https://www.dealflowscout.ai/api/send` returned HTTP 500 with no success body. No receipt was created. |
| Billion Dollar Pitch Decks | `not-submitted` | Codex backlink acquisition | 2026-06-25 | Submit page at https://www.billiondollarpitchdecks.com/submit has no CAPTCHA/account gate, but the React form only prevents default and flips local state to `Submission received`; no fetch/action/POST was found for the submit form. Do not treat as submitted. |
| Startup List | `not-submitted` | Codex backlink acquisition | 2026-06-25 | Startup List at https://startup-list.org/submit advertises permanent discovery pages/backlink value, but submission requires sign-in/create-account. No account flow used. |
| True Recurring | `not-submitted` | Codex backlink acquisition | 2026-06-25 | Directory at https://truerecurring.com/ targets profitable recurring-revenue businesses and says founders of SaaS products with recurring revenue should submit. UntilFire revenue/MRR was not provided, and no clean public form was confirmed; do not submit without truthful revenue context. |
| Smol Launch | `not-submitted` | Codex backlink acquisition | 2026-06-25 | https://smollaunch.com showed CAPTCHA, login, and paid signals; `/submit` and `/launch` closed unexpectedly. No submission. |
| Sharebrand | `not-submitted` | Codex backlink acquisition | 2026-06-25 | Search result claimed a free backlink path, but https://sharebrand.com redirects to a parked GoDaddy/Afternic lander with CAPTCHA/login/paid signals and no startup form. Treat as stale/invalid. |
| eBool | `not-submitted` | Codex backlink acquisition | 2026-06-25 | https://www.ebool.com/submit states it currently only offers a paid submission option. Skipped under the zero-budget rule. |
| Major software directory vendor portals | `not-submitted` | Codex backlink acquisition | 2026-06-25 | Crozdesk, GetApp, Capterra, G2, GoodFirms, and SoftwareWorld vendor/listing paths returned 403 or vendor-portal gating from this environment. No account flow or workaround attempted. |
| Webwiki | `not-submitted` | Codex backlink acquisition | 2026-06-24 | backlinks.fyi lists Webwiki as DR 78, free, dofollow, instant, no account, no CAPTCHA, but https://www.webwiki.com/submit and https://www.webwiki.com/info/add-website.html returned Cloudflare challenge pages from this environment. Do not bypass the challenge. |
| AllMyFaves | `not-submitted` | Codex backlink acquisition | 2026-06-24 | backlinks.fyi lists DR 56, free, dofollow. https://allmyfaves.com/addwebsite is reachable but uses Cloudflare Turnstile. Submit only after explicit CAPTCHA approval. |
| Website Hunt | `not-submitted` | Codex backlink acquisition | 2026-06-24 | https://www.websitehunt.co/websites/submit/create redirects to login and uses Turnstile. Requires account/login flow before submission; no listing submitted. |
| Alternative.me | `not-submitted` | Codex backlink acquisition | 2026-06-24 | Submission instructions at https://alternative.me/how-to/submit-software/ state a user account is required before creating new software entries. No account was created. |
| StackShare | `not-submitted` | Codex backlink acquisition | 2026-06-24 | backlinks.fyi lists DR 80 and dofollow, but https://stackshare.io/submit returned HTTP 429 from this environment. Retry later or through authenticated browser only if still relevant. |
| Serchen | `not-submitted` | Codex backlink acquisition | 2026-06-24 | backlinks.fyi lists DR 52 and dofollow, but https://www.serchen.com/get-listed/ returned a Cloudflare challenge/CAPTCHA. Do not bypass the challenge. |
| F6S | `not-submitted` | Codex backlink acquisition | 2026-06-24 | backlinks.fyi lists DR 83 and dofollow, but https://www.f6s.com/startup-register returned CloudFront 403 from this environment and likely requires account flow. No submission. |
| StartupBuffer | `not-submitted` | Codex backlink acquisition | 2026-06-24 | backlinks.fyi lists DR 42 and dofollow, but https://startupbuffer.com/site/submit returned a Cloudflare challenge. Do not bypass the challenge. |
| StartupRanking | `not-submitted` | Codex backlink acquisition | 2026-06-24 | backlinks.fyi lists DR 55 and dofollow, but https://www.startupranking.com/startups/add returned a Cloudflare challenge. Do not bypass the challenge. |
| StartupStash | `not-submitted` | Codex backlink acquisition | 2026-06-24 | backlinks.fyi lists DR 65 and dofollow, but https://startupstash.com/add-listing/ returned a Cloudflare challenge. Do not bypass the challenge. |
| AppVita | `not-submitted` | Codex backlink acquisition | 2026-06-24 | backlinks.fyi lists DR 41 and dofollow, but https://www.appvita.com/submit/ redirects to an unrelated onk.io page. Treat the submission path as stale unless a new official submit URL is found. |
| SaaSGenius | `not-submitted` | Codex backlink acquisition | 2026-06-24 | Get-listed path is relevant but includes CAPTCHA/account/paid signals; skipped under the current no-CAPTCHA/no-account/no-paid filter. |
| Tiny Startups | `not-submitted` | Codex backlink acquisition | 2026-06-24 | Current submit flow shows sign-in/create-account and paid skip/backlink options; the older Tally form says it is no longer in use. Manual/account-gated if still desired. |
| Startup Benchmarks | `not-submitted` | Codex backlink acquisition | 2026-06-24 | Submit flow explicitly requires login/Google auth and is positioned around AI tools. Manual account-gated target, not submitted. |
| Apprater | `not-submitted` | Codex backlink acquisition | 2026-06-24 | Submit form is reachable but includes Google reCAPTCHA. Leave for manual CAPTCHA approval. |
| TechPluto | `not-submitted` | Codex backlink acquisition | 2026-06-24 | Page states startup submission is free, but no clean submit form fields or endpoint were found in static HTML. Leave for manual browser follow-up if desired. |
| Startups Gallery | `not-submitted` | Codex backlink acquisition | 2026-06-24 | Tally form appears useful and no account was observed, but the JS form could not be safely automated under the no-CAPTCHA/no-gate rule. Manual browser submission candidate. |
| EU-Startups | `not-submitted` | Codex backlink acquisition | 2026-06-24 | Submit path was blocked by Cloudflare/challenge from this environment. Do not bypass. |
| Land-book | `not-submitted` | Codex backlink acquisition | 2026-06-24 | Submit path was blocked by Cloudflare/challenge from this environment. Do not bypass. |
| ArcticStartup | `not-submitted` | Codex backlink acquisition | 2026-06-24 | Submit path was blocked by Cloudflare/challenge from this environment. Do not bypass. |
| Workspaces | `not-submitted` | Codex backlink acquisition | 2026-06-24 | Submit path was blocked by Cloudflare/challenge from this environment. Do not bypass. |
| Awesome Tools | `not-submitted` | Codex backlink acquisition | 2026-06-24 | Submit path was blocked by Cloudflare/challenge from this environment. Do not bypass. |
| Victrays | `not-submitted` | Codex backlink acquisition | 2026-06-24 | Submit path was blocked by Cloudflare/challenge from this environment. Do not bypass. |
| Productivity Directory | `not-submitted` | Codex backlink acquisition | 2026-06-24 | Submit path requires login/Google auth and includes CAPTCHA signals. No account flow was used. |
| PayOnceApps | `not-submitted` | Codex backlink acquisition | 2026-06-24 | Submit path requires login. No account flow was used. |
| Netted | `not-submitted` | Codex backlink acquisition | 2026-06-24 | Editorial contact only and submission guidance says most B2B pitches are not a fit. Excluded rather than sending a weak pitch. |
| Helperg | `not-submitted` | Codex backlink acquisition | 2026-06-24 | Free no-account/no-CAPTCHA form was visible at https://helperg.com/submit-startup/, but direct POSTs to both the submit path and the exact form action `/submit-startup/?success=1` returned 404. Likely broken Netlify form handler; manual browser retry only if desired. |
| Hunt Startup | `not-submitted` | Codex backlink acquisition | 2026-06-24 | https://huntstartup.com/submit redirects to the auth/create-account page. No account was created. |
| FoundrList | `not-submitted` | Codex backlink acquisition | 2026-06-24 | Submit page loads Google identity/account flow and includes paid/listing language. Skipped under the no-account/no-paid rule. |
| Startup Inspire | `not-submitted` | Codex backlink acquisition | 2026-06-24 | Submit paths `https://www.startupinspire.com/submit` and `/submit-startup/` redirected to `/404`; backlinks.fyi submission URL appears stale. |
| Tapscape | `not-submitted` | Codex backlink acquisition | 2026-06-24 | `https://www.tapscape.com/submit-app/` redirected to `/submit-app-review/`; static page exposed only search/login/account/paid signals and no clean submit form. |
| Startup Tracker | `not-submitted` | Codex backlink acquisition | 2026-06-24 | `https://startuptracker.io/add` rendered a Not Found page; the `/crowdsourcing/` JS flow exposed a POST API, but public API calls returned `ST-401000: Unauthorized`. No auth bypass attempted. |
| SimilarSiteSearch | `not-submitted` | Codex backlink acquisition | 2026-06-24 | `https://www.similarsitesearch.com/submit` returned 404. Treat backlinks.fyi submission URL as stale. |
| Launched | `not-submitted` | Codex backlink acquisition | 2026-06-24 | `https://launched.io/SubmitStartup` failed TLS certificate trust from this environment. Manual browser check only if the certificate issue resolves. |
| Tekpon | `not-submitted` | Codex backlink acquisition | 2026-06-24 | `https://tekpon.com/get-listed/` requires account/sign-in and a paid/Stripe listing flow. No free no-account path found. |
| LaunchDirectories | `not-submitted` | Codex backlink acquisition | 2026-06-24 | Site is a directory-of-directories/submission-service page rather than an appropriate product listing target for UntilFire. Not submitted. |
| All Startups | `not-submitted` | Codex backlink acquisition | 2026-06-24 | `https://www.allstartups.info/Startups/Submit` failed TLS certificate trust from this environment. No submission. |
| The Startup Pitch | `not-submitted` | Codex backlink acquisition | 2026-06-24 | `https://www.thestartuppitch.com/pitch/` failed TLS certificate trust from this environment. No submission. |
| Crazy About Startups | `not-submitted` | Codex backlink acquisition | 2026-06-24 | `https://www.crazyaboutstartups.com/submit-your-startup/` returned HTTP 503. No submission. |
| 10words | `not-submitted` | Codex backlink acquisition | 2026-06-24 | `https://10words.io/submit` returned 404. Treat the listed submit URL as stale. |
| BetaUser | `not-submitted` | Codex backlink acquisition | 2026-06-24 | `https://betauser.com/submit/` exposes a simple fintech-capable form, but POSTs to `/submit` and `/submit/` returned HTTP 405. Manual browser retry only if desired; no receipt was created. |
| Startups.fyi | `not-submitted` | Codex backlink acquisition | 2026-06-24 | Submit path `https://tally.so/r/3lOGLk` is a Tally form with CAPTCHA/paid/account signals in the loaded page. Leave for manual review under the no-CAPTCHA/no-account rule. |
| Robin Good Tools | `not-submitted` | Codex backlink acquisition | 2026-06-24 | `https://tools.robingood.com/submit` loads a client app whose submit flow requires a logged-in member/auth state. No account flow used. |
| TheSaaSDir | `not-submitted` | Codex backlink acquisition | 2026-06-24 | `https://thesaasdir.com/submit/` is reachable, but the free tier requires a dofollow badge/reciprocal link; paid plan removes the badge. No badge/site change was made. |
| TinyHunt | `not-submitted` | Codex backlink acquisition | 2026-06-24 | `https://tinyhunt.dev/submit` closed the connection; homepage showed sign-in, backlink/badge, pricing, and account signals. No submission. |
| TinyLaunch | `not-submitted` | Codex backlink acquisition | 2026-06-24 | `https://www.tinylaunch.com/submit` redirects to login. No account flow used. |
| Neeed Directory | `not-submitted` | Codex backlink acquisition | 2026-06-24 | `https://neeed.directory/submit` redirects to `/login?redirect=/submit`. No account flow used. |
| First100Users | `not-submitted` | Codex backlink acquisition | 2026-06-24 | `https://www.first100users.com/submit` exposes reCAPTCHA signals. Leave for manual CAPTCHA approval. |
| PromoteProject | `not-submitted` | Codex backlink acquisition | 2026-06-24 | `https://promoteproject.com/submit-startup` redirects to login. No account flow used. |
| Startupslab | `not-submitted` | Codex backlink acquisition | 2026-06-24 | `https://startupslab.site/submit-product` loaded but had no usable static submit fields and showed backlink/badge/pricing signals. No submission. |
| StartupDope | `not-submitted` | Codex backlink acquisition | 2026-06-24 | `https://startupdope.com/submit-news/` showed reCAPTCHA/account signals and no clean no-gate submit path. No submission. |
| SaaSBison | `not-submitted` | Codex backlink acquisition | 2026-06-24 | `https://saasbison.com/submit` offers a free listing only with a required badge/backlink; paid tier removes the badge. No badge/site change was made. |
| Launchy | `not-submitted` | Codex backlink acquisition | 2026-06-24 | `https://launchy.tools/submit` redirects to `sign-in?callbackURL=/submit`. No account flow used. |
| Launch.cab | `not-submitted` | Codex backlink acquisition | 2026-06-24 | `https://launch.cab/submit` has a client-side form requiring product logo and landing-page screenshot assets; page also has badge/paid/account signals. Leave for manual asset-backed review. |
| ListMySaaS | `not-submitted` | Codex backlink acquisition | 2026-06-24 | `https://listmysaas.xyz/submit` says sign-in is required; free listing requires adding and verifying their badge, while the no-badge path is paid. No submission. |
| SaasDB | `not-submitted` | Codex backlink acquisition | 2026-06-24 | `https://saasdb.net/submit` redirects to login and pricing/free-badge signals are present. No account flow used. |
| SubmitMatic | `not-submitted` | Codex backlink acquisition | 2026-06-24 | `https://submitmatic.com/submit` redirects to login and appears to be a paid submission-service flow, not a clean product listing. No submission. |
| Shipit.buzz | `not-submitted` | Codex backlink acquisition | 2026-06-24 | `https://www.shipit.buzz/submit` loads a client submit page with login, badge/backlink, and paid signals. No clean no-account/no-badge submission completed. |
| StartupDirectory.net | `not-submitted` | Codex backlink acquisition | 2026-06-24 | `https://startupdirectory.net/submit` redirects to login. No account flow used. |
| AllTopStartups Directory | `not-submitted` | Codex backlink acquisition | 2026-06-24 | `https://alltopstartups.com/directory/submit-startup/` only exposed HivePress login/register/password forms, so directory submission is account-gated. |
| Dazeinfo | `not-submitted` | Codex backlink acquisition | 2026-06-24 | `https://dazeinfo.com/submit-your-startup/` exposed login/search forms and CAPTCHA signals, not a clean startup submission form. No submission. |
| The Motivated MD | `not-submitted` | Codex backlink acquisition | 2026-06-24 | FIRE-adjacent guest-post paths returned an Incapsula noindex/nofollow challenge page from this environment. Do not bypass. |
| ThirtyEight Investing | `not-submitted` | Codex backlink acquisition | 2026-06-24 | Contact page has CAPTCHA and email-only contact; guest-post URLs failed/closed unexpectedly. Leave for manual/email outreach if desired. |
| Smart Money Nation | `not-submitted` | Codex backlink acquisition | 2026-06-24 | Guest-post page is relevant and lists `curtis@smartmoneynation.com`, but it requires email outreach and requests at least one dofollow backlink back to SmartMoneyNation. No reciprocal link or email was sent. |
| BlogArena360 | `not-submitted` | Codex backlink acquisition | 2026-06-24 | Finance/write-for-us page had a form but included CAPTCHA signals. Leave for manual CAPTCHA approval. |
| MoneyMunch | `not-submitted` | Codex backlink acquisition | 2026-06-24 | Write-for-us page had a form but included CAPTCHA signals. Leave for manual CAPTCHA approval. |
| WriteForUsTechnology | `not-submitted` | Codex backlink acquisition | 2026-06-24 | Finance guest-post page had forms and email, but included CAPTCHA signals. Leave for manual review. |

## Spam and Links to Ignore

| Source | Status | First observed | Last checked | Notes |
| --- | --- | --- | --- | --- |
| Ahrefs automated SEO-spam cluster | `spam-ignore` | 2026-03 onward | 2026-06-22 | Includes many `.shop`, `.store`, and SEO-agency domains explicitly labeled SPAM by Ahrefs. Examples include `itxoft-affordable-seo-solutions.site`, `rankio.agency`, `seonix.agency`, and `buybacklinks.agency`. Do not contact, pay, disavow, or count these without a separate SEO-risk review. |
| trafficspike.shop | `spam-ignore` | 2026-06-16 | 2026-06-22 | Ahrefs did not label it SPAM, but it had DR 0, traffic 0, and no verified intentional submission. Treat as suspicious unless evidence proves otherwise. |

## Guest Posts and Editorial Outreach

As of 2026-06-24, four guest-post topic requests have been submitted and no guest-post acceptance or publication has been verified. Add each pitch immediately when sent, including the publication, contact role, pitch date, topic, status, and evidence URL or message reference. Do not store passwords, access tokens, or private email contents in this file.

| Publication | Status | Contact role | Pitch date | Topic | Owner/session | Evidence | Follow-up date | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Think Save Retire | `submitted` | Editorial team | 2026-06-24 | The FIRE lever leaderboard: what moves a 25-year-old's freedom date by 1, 5, or 10 years | Codex backlink acquisition | https://saraht059109.typeform.com/to/Q2X6eb | 2026-07-08 | Typeform topic request submitted; confirmation screen displayed the Typeform completion CTA. Pitch proposed an original, data-backed FIRE lever comparison and accepted editorial link discretion, including possible `nofollow`. Wait for topic approval before drafting the full article. |
| Commerce Grants | `submitted` | Editorial team | 2026-06-24 | How Young Professionals Can Move Their Work-Optional Date From 65 to 45 | Codex backlink acquisition | https://commercegrants.com/write-for-us-finance/ | 2026-07-08 | Kadence form submitted successfully through `https://commercegrants.com/wp-admin/admin-ajax.php`; JSON response returned `success: true` and message `Submission Success, Thanks for getting in touch!`. Pitch positioned UntilFire as a relevant FIRE calculator/resource link if editorially acceptable. |
| SlashTraders | `submitted` | Editorial team | 2026-06-24 | How a 25-Year-Old Can Move Their Work-Optional Date From 65 to 45 | Codex backlink acquisition | https://slashtraders.com/en/write-for-us/ | 2026-07-08 | Elementor form submission succeeded through `https://slashtraders.com/wp-admin/admin-ajax.php`; JSON response returned `success: true`, message `Your submission was successful.`, and redirect URL `https://slashtraders.com/en/newsletter-thank-you/`. Page says accepted guest posts can receive a dofollow backlink. |
| StockIntent | `submitted` | Editorial team | 2026-06-24 | How Young Professionals Can Move Their Work-Optional Date From 65 to 45 | Codex backlink acquisition | https://www.stockintent.com/write-for-us | 2026-07-08 | Webflow contact form submission succeeded through `https://webflow.com/api/v1/form/64ff347da2cb937db3a6331c`; response returned `{"msg":"ok","code":200}`. Pitch positioned UntilFire as an optional calculator/resource link if editorially acceptable. |

## New Entry Template

Copy the appropriate table row above, then fill every known field. At minimum record:

- Platform or publication
- Status from the vocabulary in this document
- Submission date
- Assigned launch or publication date, time, and timezone when supplied
- Submission receipt or live URL
- UntilFire target URL
- Owner/session
- Last checked date
- Link type or follow attribute when technically verified
- Clear follow-up action

## Audit Log

| Date | Owner/session | Change |
| --- | --- | --- |
| 2026-06-25 | Codex backlink acquisition | Added the KittyLaunch light badge embed to the UntilFire footer and recorded the post-deploy `Verify Badge` action needed to unlock the dofollow backlink and developer Upvote (+1). |
| 2026-06-25 | Codex backlink acquisition | Rechecked recently submitted/pending listings and promoted MarketingDB, Startup Spotlight, StartupBase, Uneed, and Microlaunch to live statuses where public pages could be verified. Attempted/screened additional free targets; Dealflow Scout returned HTTP 500, Billion Dollar Pitch Decks had a client-only non-submitting form, and Startup List, True Recurring, Smol Launch, Sharebrand, eBool, and major software vendor portals were blocked by account, revenue-fit, CAPTCHA, paid, parked-domain, or vendor-gate issues. |
| 2026-06-24 | Codex backlink acquisition | Submitted FinTech Weekly directory form plus SlashTraders and StockIntent guest-post pitches; marked Startup Fast activation email as sent by user after live badge verification. Logged Startup88, AwesomeFinTech, Fintech Labs, Ascend, and FinTech Insights as manual/skipped blockers where automation would require Typeform runtime, Google Forms connectivity, CAPTCHA, email-only outreach, or paid/sponsored language. |
| 2026-06-24 | Codex backlink acquisition | Continued free/no-account/no-CAPTCHA backlink acquisition. Confirmed one new editorial pitch to Commerce Grants; Startup88 and BetaUser remained unsubmitted due automation timeout and HTTP 405, respectively; recorded additional launch-directory blockers for badge, account, paid, CAPTCHA, asset-upload, and stale-submit flows. |
| 2026-06-24 | Codex backlink acquisition | Screened another general startup-directory batch after SaaSRow/The Startup INC. No extra clean submissions succeeded; Helperg had a broken form endpoint, Startup Inspire/SimilarSiteSearch were stale, Startup Tracker required API auth, and Hunt Startup/FoundrList/Tekpon were account/paid-gated. |
| 2026-06-24 | Codex backlink acquisition | Submitted free/no-CAPTCHA/no-account opportunities to SaaSRow and The Startup INC; checked additional live targets and recorded manual blockers for Tiny Startups, Startup Benchmarks, Apprater, TechPluto, Startups Gallery, and Cloudflare/account-gated directories. |
| 2026-06-24 | Codex backlink acquisition | Checked an additional free/high-DR directory batch after the Launching Next and Think Save Retire submissions. No new backlink was claimed: SourceForge and Business-Software.com are actionable but require CAPTCHA approval; Startup88 is prepared but Typeform timed out; Webwiki, AllMyFaves, Website Hunt, Serchen, F6S, StartupBuffer, StartupRanking, and StartupStash were blocked by CAPTCHA/challenge/account gates. |
| 2026-06-24 | Codex backlink acquisition | Submitted the Think Save Retire guest-post topic request through Typeform and scheduled a 2026-07-08 follow-up if no reply is received. |
| 2026-06-24 | Codex backlink acquisition | Checked Uneed's submit preview API; UntilFire already exists in the waiting line, so the ledger was updated to `pending` without creating an account or duplicate submission. |
| 2026-06-24 | Codex backlink acquisition | Submitted UntilFire to Launching Next free queue; recorded confirmation URL `https://www.launchingnext.com/thanks/?i=138403` and left assigned publication date as unknown pending email decision. |
| 2026-06-23 | Codex backlink session | Recorded new submissions, badge-verification status, and manual blockers for Startup Spotlight, FirstLook, StartupBase, The Startup Project, Wired Business, Noonlaunch, MarketingDB, Launching Next, StartupLibrary, Fazier, LaunchIgniter, Sidehunt, StartupOG, StartupTrusted, and MakerHunt. |
| 2026-06-22 | Codex backlink acquisition | Qualified Uneed, Launching Next, and Think Save Retire for the first free batch; deferred BetaList and StartupBase pending account-gated details; rejected Fazier's reciprocal-link free tier. |
| 2026-06-22 | Codex backlink acquisition | Corrected Product Hunt to user-confirmed `submitted`; added `scheduled` status and exact assigned launch-date tracking. |
| 2026-06-22 | Codex backlink audit | Initial repository, public web, live-page, and authenticated Ahrefs reconciliation. |
