# Backlink Submission Log

Last updated: 2026-06-23

This file tracks directory submissions for `https://www.untilfire.com`.

Product facts used for submissions:
- Product: UntilFire
- Positioning: personal finance app focused on financial independence and freedom-date planning
- Founder: John NG
- Team: solo founder
- Location: New York City, USA
- Founded: 2026
- Contact: ash@untilfire.com

Notes:
- DR values below are site-surfaced or previously checked during submission work unless otherwise noted.
- `origin/main` is the baseline for this repo; this log is only a campaign record.

## Submitted This Round

### Startups.fm
- URL: `https://www.startups.fm/submit`
- Status: submitted
- DR: 40/100 (site-surfaced; page also markets this as `DR 40+`)
- Auth: not required for free submission
- Payment: not used
- Submission mode: free submission with 7-day badge grace period
- Submission ID: `36e56eaf-61a9-473b-b635-602727cef50d`
- Badge status: added to site footer
- Notes:
  - uploaded logo and featured image successfully
  - free listing still requires the Startups.fm badge to be added within the grace window

### FeedMyStartup
- URL: `https://feedmystartup.com/`
- Status: submitted
- DR: low, previously checked as roughly 9
- Auth: not required
- Payment: not used
- Submission mode: direct Google Form POST
- Notes:
  - submission returned HTTP 200
  - confirmation page was received

### Startup Spotlight
- URL: `https://startupspotlight.co/submit`
- Status: submitted and under review
- DR: 35/100 (site-surfaced via the live domain-rating badge on `startupspotlight.co/badge`)
- Auth: completed via Google in Chrome
- Payment: not used
- Submission mode: free submission
- Listing URL: `https://startupspotlight.co/startup/untilfire`
- Badge status: added to site footer
- Notes:
  - submission route landed at `https://startupspotlight.co/submitted/untilfire`
  - badge issued with startup ID `cmqpzklis000e15nktsharpa4`
  - free listing remains under manual review until approval email arrives

### The Startup Project
- URL: `https://startupproject.org/submit-startup/`
- Status: submitted
- DR: not independently verified in this round; one third-party submission guide cites `DR 16`
- Auth: not required
- Payment: not used
- Submission mode: free submission
- Notes:
  - success message shown: `Your startup has been submitted! We'll review it and notify you once your listing is live.`
  - the site says a backlink to the live listing is required to maintain the listing after approval
  - the site also advertises a future `Featured on The Startup Project` badge once the listing is live

## Already Done / Previously Confirmed

### Public or confirmed pages
- Startup Fast: public page exists at `https://www.startupfa.st/projects/untilfire`
- AlternativeTo: public page exists at `https://alternativeto.net/software/untilfire/about/`
- DevHub: public page exists at `https://devhub.best/projects/untilfire`
- Startup Fame: public page exists at `https://startupfa.me/s/untilfire`
- Uneed: queued/listed at `https://www.uneed.best/tool/untilfire`

### Submitted earlier in the campaign
- Tool Dynamo: user completed manually
- Launching Next: submitted
- Awesome FinTech: submitted
- DevPages: submitted
- HowLaunch: submitted
- StartupCollections: submitted
- Hunt Startup: submitted
- Stack Directory: submitted
- Shipit.buzz: product page exists

## Needs Auth / Manual Follow-Up

### StartupDirectory.net
- URL: `https://startupdirectory.net/submit`
- Status: blocked by OAuth callback in Chrome
- DR: conflicting public badge sources: `47/100` on `verifieddr.com`, `31/100` on `domainrank.app`
- Auth: Google and GitHub both reached the provider callback, but the callback page was blocked
- Payment: unknown for free path, pricing exists
- Notes:
  - `/submit` redirects to login page when no session is present
  - both Google and GitHub auth flows ended on `https://atcfatngmgphxhzigmow.supabase.co/auth/v1/callback`
  - Chrome blocked that callback with `ERR_BLOCKED_BY_CLIENT`, so the session never completed
  - most likely manual fix is to retry in a browser/profile without the blocking extension on the Supabase callback domain

### FirstLook.tools
- URL: `https://firstlook.tools/submit`
- Status: submitted, pending review
- DR: 57/100 (surfaced in the live `frogdr.com` badge used on the submit page)
- Auth: completed via Google in Chrome
- Payment: submitted on the free plan
- Notes:
  - page states free submissions are reviewed within 72 hours
  - free submission succeeded after the live footer badge/backlink was deployed on `https://www.untilfire.com`
  - FirstLook dashboard now shows `UntilFire` with status `Pending Review` and plan `Free`
  - badge/link lives in the site footer using FirstLook's published transparent badge embed

### StartupLibrary
- URL: `https://startuplibrary.net/dashboard?tab=submit`
- Status: authenticated and prefilled, blocked only on logo upload
- DR: 31/100 on VerifiedDR (`https://verifieddr.com/website/startuplibrary-net`)
- Auth: completed via Google in Chrome
- Payment: not used yet
- Notes:
  - public marketing copy says every listing gets a permanent dofollow backlink from day one
  - submission form is prefilled with name, URL, tagline, description, and `Fintech` category
  - current blocking step is the required logo upload (`Square logo, max 5MB`)
  - the next action is to upload a local logo file and continue the 2-step free submission flow

### Startup Ranking
- URL: `https://www.startupranking.com/`
- Status: blocked on creation flow
- DR: not re-checked this round
- Auth: required
- Notes:
  - login worked earlier, but project creation flow was unclear/broken

### PitchWall
- URL: `https://pitchwall.co/`
- Status: blocked on profile persistence
- DR: 70 (page-surfaced from earlier work)
- Auth: required
- Notes:
  - Google auth worked earlier
  - listing/profile flow did not persist correctly

## Dead, Paid, or Not Worth More Time Right Now

### AllTopStartups
- URL: `https://alltopstartups.com/submit-startup/`
- Status: not worth pursuing right now
- DR: 73 (page-claimed)
- Auth: not required for page access
- Payment: effectively required
- Notes:
  - page says free listings are currently suspended
  - paid directory and review options are active

### saas.fyi
- URL: `https://www.saas.fyi/submit.html`
- Status: dead submit flow
- DR: not surfaced
- Auth: no
- Payment: premium tier shown, but main issue is invalid form endpoint
- Notes:
  - live form action is a placeholder Formspree endpoint (`xxxxxxxx`)
  - no real submission backend is wired

### Launch List
- URL: `https://launch-list.org/submit`
- Status: dead URL
- DR: not checked
- Auth: n/a
- Notes:
  - submit URL resolves to a 404 page

### ShowMySites
- URL: `https://www.showmysites.com/submit/`
- Status: not a submission page
- DR: not checked
- Auth: likely required for real submission
- Notes:
  - `/submit/` resolves to a creator profile page, not a product submission form

### StartupBlink
- URL: `https://www.startupblink.com/startups/add`
- Status: blocked
- DR: not re-checked this round
- Auth: unknown
- Notes:
  - direct HTTP access returned 403
  - earlier browser attempt hit an internal-server-style error

### StartupBase
- URL: `https://startupbase.io/`
- Status: low priority / manual
- DR: not re-checked this round
- Auth: likely required
- Notes:
  - more useful once there is capacity to push votes/comments

### StartupTrusted
- URL: `https://startuptrusted.com/`
- Status: paid only
- DR: not re-checked this round

## Follow-Up Items

- Prioritize manual sign-in follow-up for:
  - StartupDirectory.net
  - FirstLook.tools
- Check whether Startup Spotlight approves the pending review now that the badge is live.
