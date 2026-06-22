# Backlink and Directory Ledger

This is the authoritative coordination log for UntilFire directory submissions, backlinks, guest posts, and SEO outreach. Read it before starting related work so separate sessions do not duplicate submissions.

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

## Status Vocabulary

| Status | Meaning |
| --- | --- |
| `live-follow` | Live page with a direct link and no observed `nofollow`, `ugc`, or redirect intermediary. |
| `live-nofollow` | Live page whose link is marked `nofollow` or `ugc`, or Ahrefs reports zero dofollow links. |
| `live-redirect` | Live listing whose website button goes through the directory's redirect endpoint. |
| `live-unverified` | Live listing exists, but the external link or its follow attributes have not been technically verified. |
| `submitted` | Submission was made and has evidence, but the final backlink is not confirmed. |
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
| Reddit - r/financialindependence | `live-nofollow` | 2026-05-20 | https://www.reddit.com/r/financialindependence/comments/1tigher/weekly_selfpromotion_thread_wednesday_may_20_2026/ | Community/UGC link | Little_Tomorrow_9250 | 2026-06-22 | Weekly self-promotion thread submission. |
| Reddit - r/SavingMoney | `live-nofollow` | 2026-05 | https://www.reddit.com/r/SavingMoney/comments/1tfos1s/best_budgeting_app_that_actually_helped_you_save/ | Community/UGC link | Community mention | 2026-06-22 | Recommendation mentions UntilFire calculators. |
| Reddit - r/AppsWebappsFullstack | `live-nofollow` | 2026-03 | https://www.reddit.com/r/AppsWebappsFullstack/comments/1tf2z84/drop_your_startup_ill_check_every_single_one_and/ | Community/UGC link | Unknown (pre-ledger) | 2026-06-22 | UntilFire appears in a "Drop Your Startup" discussion. |

## Submitted or Public, Backlink Not Confirmed

| Platform | Status | Submitted date | Submission or public URL | Owner/session | Last checked | Notes / next action |
| --- | --- | --- | --- | --- | --- | --- |
| Microlaunch | `submitted` | 2026-05-28 | https://microlaunch.net/p/untilfire | Unknown (pre-ledger) | 2026-06-22 | Public page exists and embedded data says `submitted`; a clickable external backlink was not confirmed. Check again after launch status changes. |

## Removed or Unverifiable Listings

| Platform | Status | Previously observed URL | Owner/session | Last checked | Evidence / next action |
| --- | --- | --- | --- | --- | --- |
| ToolDynamo | `removed` | https://tooldynamo.com/tools/untilfire | Unknown (pre-ledger) | 2026-06-22 | Returns 404 and is absent from the current sitemap. UntilFire still displays a ToolDynamo badge; review that badge separately. |
| Stack Directory | `removed` | https://stackdirectory.com/product/untilfire | Unknown (pre-ledger) | 2026-06-22 | Returns 404 and is absent from the current sitemap. UntilFire still displays a Stack Directory badge; review that badge separately. |
| DevHubby | `removed` | https://devhubby.com/ | Unknown (pre-ledger) | 2026-06-22 | UntilFire appeared in an earlier search result, but no current listing path could be verified and tested candidates returned 404. |

## Checked With No Submission Evidence

| Platform | Status | Owner/session | Last checked | Evidence / next action |
| --- | --- | --- | --- | --- |
| Product Hunt | `not-submitted` | Unassigned | 2026-06-22 | Repository roadmap still treats launch as planned; prepared launch copy is not submission evidence. |
| BetaList | `not-submitted` | Unassigned | 2026-06-22 | No repository or public listing evidence found. |
| Indie Hackers | `not-submitted` | Unassigned | 2026-06-22 | No repository or public listing evidence found. |
| Hacker News | `not-submitted` | Unassigned | 2026-06-22 | Launch copy exists, but no submitted Show HN page was found. |
| Launching Next | `not-submitted` | Unassigned | 2026-06-22 | No repository or public listing evidence found. |
| Uneed | `not-submitted` | Unassigned | 2026-06-22 | No repository or public listing evidence found. |

## Spam and Links to Ignore

| Source | Status | First observed | Last checked | Notes |
| --- | --- | --- | --- | --- |
| Ahrefs automated SEO-spam cluster | `spam-ignore` | 2026-03 onward | 2026-06-22 | Includes many `.shop`, `.store`, and SEO-agency domains explicitly labeled SPAM by Ahrefs. Examples include `itxoft-affordable-seo-solutions.site`, `rankio.agency`, `seonix.agency`, and `buybacklinks.agency`. Do not contact, pay, disavow, or count these without a separate SEO-risk review. |
| trafficspike.shop | `spam-ignore` | 2026-06-16 | 2026-06-22 | Ahrefs did not label it SPAM, but it had DR 0, traffic 0, and no verified intentional submission. Treat as suspicious unless evidence proves otherwise. |

## Guest Posts and Editorial Outreach

No verified guest-post pitch, editorial outreach email, acceptance, or publication was found in the repository or public scan as of 2026-06-22. Add each pitch immediately when sent, including the publication, contact role, pitch date, topic, status, and evidence URL or message reference. Do not store passwords, access tokens, or private email contents in this file.

| Publication | Status | Contact role | Pitch date | Topic | Owner/session | Evidence | Follow-up date | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| _None recorded_ | - | - | - | - | - | - | - | - |

## New Entry Template

Copy the appropriate table row above, then fill every known field. At minimum record:

- Platform or publication
- Status from the vocabulary in this document
- Submission date
- Submission receipt or live URL
- UntilFire target URL
- Owner/session
- Last checked date
- Link type or follow attribute when technically verified
- Clear follow-up action

## Audit Log

| Date | Owner/session | Change |
| --- | --- | --- |
| 2026-06-22 | Codex backlink audit | Initial repository, public web, live-page, and authenticated Ahrefs reconciliation. |
