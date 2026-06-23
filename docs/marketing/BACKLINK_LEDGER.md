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
| Peerlist | `live-nofollow` | 2026-03-28 | https://peerlist.io/ngjohn101/project/untilfire | Ahrefs: 4 links to target, 0 dofollow | ngjohn101 | 2026-06-22 | Launched on Peerlist Launchpad in Week 14, 2026. |
| StrictSeal | `live-redirect` | 2026-05-19 | https://strictseal.com/product/untilfire | Visit Website uses a StrictSeal redirect endpoint | Unknown (pre-ledger) | 2026-06-22 | Listing is live and present in the StrictSeal sitemap. |
| Startup Fast | `live-follow` | Unknown | https://www.startupfa.st/startup/untilfire | Direct links to https://www.untilfire.com/; no `nofollow` observed | Unknown (pre-ledger) | 2026-06-22 | UntilFire currently displays a Startup Fast badge. |
| Startup Fame | `live-nofollow` | Unknown | https://startupfa.me/s/untilfire | Direct UntilFire links use `rel="nofollow"` | Unknown (pre-ledger) | 2026-06-22 | Listing reported verified on 2026-06-22. |
| SaaSHub | `live-nofollow` | Unknown | https://www.saashub.com/untilfire | Website link uses `rel="nofollow"` | Unknown (pre-ledger) | 2026-06-22 | Public product profile is live. |
| Shipstry | `live-nofollow` | 2026-05-23 | https://shipstry.com/product/until-fire/9Uz_LZDfN8 | Ahrefs: 2 links to target, 0 dofollow | Unknown (pre-ledger) | 2026-06-22 | Public product listing is live. |
| Noonlaunch | `live-nofollow` | 2026-06-23 | https://noonlaunch.com/product/untilfire | Website button points to `https://www.untilfire.com/?ref=noonlaunch` with `rel="nofollow noopener"` | Codex backlink session | 2026-06-23 | Free launch submitted for 2026-06-24; page is public while pending launch/review. DR 25 via FrogDR. |
| Reddit - r/financialindependence | `live-nofollow` | 2026-05-20 | https://www.reddit.com/r/financialindependence/comments/1tigher/weekly_selfpromotion_thread_wednesday_may_20_2026/ | Community/UGC link | Little_Tomorrow_9250 | 2026-06-22 | Weekly self-promotion thread submission. |
| Reddit - r/SavingMoney | `live-nofollow` | 2026-05 | https://www.reddit.com/r/SavingMoney/comments/1tfos1s/best_budgeting_app_that_actually_helped_you_save/ | Community/UGC link | Community mention | 2026-06-22 | Recommendation mentions UntilFire calculators. |
| Reddit - r/AppsWebappsFullstack | `live-nofollow` | 2026-03 | https://www.reddit.com/r/AppsWebappsFullstack/comments/1tf2z84/drop_your_startup_ill_check_every_single_one_and/ | Community/UGC link | Unknown (pre-ledger) | 2026-06-22 | UntilFire appears in a "Drop Your Startup" discussion. |

## Submitted or Public, Backlink Not Confirmed

| Platform | Status | Submitted date | Assigned launch date | Submission or public URL | Owner/session | Last checked | Notes / next action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Microlaunch | `submitted` | 2026-05-28 | Unknown | https://microlaunch.net/p/untilfire | Unknown (pre-ledger) | 2026-06-22 | Public page exists and embedded data says `submitted`; a clickable external backlink was not confirmed. Check again after launch status changes. |
| Product Hunt | `submitted` | Unknown (user confirmed submission) | Unknown - Product Hunt account access required | Not currently accessible | John | 2026-06-22 | User-confirmed submission. Verify the assigned launch date and submission URL in an authenticated Product Hunt session. |
| Launching Next | `submitted` | 2026-06-24 | Unknown - publication is email-confirmed if accepted | https://www.launchingnext.com/thanks/?i=138403 | Codex backlink acquisition | 2026-06-24 | Free submission accepted; confirmation page title was "Submission Received". Optional $99 upgrade was not selected and newsletter opt-in was omitted. Check email for publication decision. |
| Uneed | `pending` | Unknown - already present in waiting line | Unknown - Uneed account access required | https://www.uneed.best/api/tools/check-and-scrape?url=https%3A%2F%2Fwww.untilfire.com%2F&slug=untilfire | Unknown (pre-ledger) | 2026-06-24 | Uneed preview API returned `exists: true`, `existsField: slug`, and `existsLocation: waiting_line`; no account was created and no duplicate submission was attempted. Verify schedule/public listing from the account that owns the queued product. |
| Startup Spotlight | `pending` | 2026-06-23 | Unknown | https://startupspotlight.co/startup/untilfire | Codex backlink session | 2026-06-23 | Google auth completed; free submission route landed at `/submitted/untilfire`; footer badge added and issued with startup ID `cmqpzklis000e15nktsharpa4`. |
| FirstLook.tools | `pending` | 2026-06-23 | Unknown | https://firstlook.tools/submit | Codex backlink session | 2026-06-23 | Google auth completed; free plan submitted after footer badge/backlink verification. Dashboard showed `UntilFire`, status `Pending Review`, plan `Free`. |
| StartupBase | `pending` | 2026-06-23 | Unknown | https://startupbase.io/products/untilfire-2 | Codex backlink session | 2026-06-23 | Free queue submission completed; page showed `Pending Review` and `Verified product`; footer badge added and verified. DR 53 via FrogDR. |
| The Startup Project | `submitted` | 2026-06-23 | Unknown | https://startupproject.org/submit-startup/ | Codex backlink session | 2026-06-23 | Success message shown: `Your startup has been submitted! We'll review it and notify you once your listing is live.` A backlink may be required after approval. |
| Wired Business | `submitted` | 2026-06-23 | Unknown | https://wired.business | Codex backlink session | 2026-06-23 | Direct multipart submission completed; footer badge added. No public listing URL was confirmed. Site-claimed DR 73. |
| MarketingDB | `pending` | 2026-06-23 | Unknown | https://marketingdb.live/submit/success?name=UntilFire&slug=untilfire | Codex backlink session | 2026-06-23 | Free badge submission completed and badge verification passed; success page said `Nice work - you're in the queue`. Public slug `https://marketingdb.live/project/untilfire` returns 404 until approval. DR 58 via FrogDR. |

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
| Startup88 | `not-submitted` | Codex backlink acquisition | 2026-06-24 | Free Typeform at https://startup88.typeform.com/to/CRjWqM was inspected from metadata; fields prepared and only required field is the $9.95 fast-track yes/no, where the free path is `No`. Browser load timed out in this environment and direct Typeform automated response submission is unsupported. Retry through normal browser flow after explicit approval; do not choose paid fast-track. |
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

## Spam and Links to Ignore

| Source | Status | First observed | Last checked | Notes |
| --- | --- | --- | --- | --- |
| Ahrefs automated SEO-spam cluster | `spam-ignore` | 2026-03 onward | 2026-06-22 | Includes many `.shop`, `.store`, and SEO-agency domains explicitly labeled SPAM by Ahrefs. Examples include `itxoft-affordable-seo-solutions.site`, `rankio.agency`, `seonix.agency`, and `buybacklinks.agency`. Do not contact, pay, disavow, or count these without a separate SEO-risk review. |
| trafficspike.shop | `spam-ignore` | 2026-06-16 | 2026-06-22 | Ahrefs did not label it SPAM, but it had DR 0, traffic 0, and no verified intentional submission. Treat as suspicious unless evidence proves otherwise. |

## Guest Posts and Editorial Outreach

As of 2026-06-24, one guest-post topic request has been submitted and no guest-post acceptance or publication has been verified. Add each pitch immediately when sent, including the publication, contact role, pitch date, topic, status, and evidence URL or message reference. Do not store passwords, access tokens, or private email contents in this file.

| Publication | Status | Contact role | Pitch date | Topic | Owner/session | Evidence | Follow-up date | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Think Save Retire | `submitted` | Editorial team | 2026-06-24 | The FIRE lever leaderboard: what moves a 25-year-old's freedom date by 1, 5, or 10 years | Codex backlink acquisition | https://saraht059109.typeform.com/to/Q2X6eb | 2026-07-08 | Typeform topic request submitted; confirmation screen displayed the Typeform completion CTA. Pitch proposed an original, data-backed FIRE lever comparison and accepted editorial link discretion, including possible `nofollow`. Wait for topic approval before drafting the full article. |

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
| 2026-06-24 | Codex backlink acquisition | Checked an additional free/high-DR directory batch after the Launching Next and Think Save Retire submissions. No new backlink was claimed: SourceForge and Business-Software.com are actionable but require CAPTCHA approval; Startup88 is prepared but Typeform timed out; Webwiki, AllMyFaves, Website Hunt, Serchen, F6S, StartupBuffer, StartupRanking, and StartupStash were blocked by CAPTCHA/challenge/account gates. |
| 2026-06-24 | Codex backlink acquisition | Submitted the Think Save Retire guest-post topic request through Typeform and scheduled a 2026-07-08 follow-up if no reply is received. |
| 2026-06-24 | Codex backlink acquisition | Checked Uneed's submit preview API; UntilFire already exists in the waiting line, so the ledger was updated to `pending` without creating an account or duplicate submission. |
| 2026-06-24 | Codex backlink acquisition | Submitted UntilFire to Launching Next free queue; recorded confirmation URL `https://www.launchingnext.com/thanks/?i=138403` and left assigned publication date as unknown pending email decision. |
| 2026-06-23 | Codex backlink session | Recorded new submissions, badge-verification status, and manual blockers for Startup Spotlight, FirstLook, StartupBase, The Startup Project, Wired Business, Noonlaunch, MarketingDB, Launching Next, StartupLibrary, Fazier, LaunchIgniter, Sidehunt, StartupOG, StartupTrusted, and MakerHunt. |
| 2026-06-22 | Codex backlink acquisition | Qualified Uneed, Launching Next, and Think Save Retire for the first free batch; deferred BetaList and StartupBase pending account-gated details; rejected Fazier's reciprocal-link free tier. |
| 2026-06-22 | Codex backlink acquisition | Corrected Product Hunt to user-confirmed `submitted`; added `scheduled` status and exact assigned launch-date tracking. |
| 2026-06-22 | Codex backlink audit | Initial repository, public web, live-page, and authenticated Ahrefs reconciliation. |
