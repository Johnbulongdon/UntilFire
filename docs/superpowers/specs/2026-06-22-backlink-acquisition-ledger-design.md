# Backlink Acquisition and Ledger Workflow Design

Date: 2026-06-22
Status: Approved direction; awaiting written-spec review

## Objective

Increase legitimate, free backlinks to UntilFire while keeping all Codex sessions synchronized, preventing duplicate submissions, and recording any platform-assigned launch date.

## Scope

This workflow covers:

- Free directory and launch-platform submissions
- Free guest-post and editorial outreach
- Community links where promotion is permitted
- Immediate updates to `docs/marketing/BACKLINK_LEDGER.md`
- Verification of live URLs and link attributes

It excludes paid links, sponsored placements, private blog networks, bulk backlink packages, deceptive submissions, and automated spam.

## Ledger Changes

### Product Hunt

Move Product Hunt from `not-submitted` to the submitted section with:

- Status: `submitted`
- Submission date: `Unknown (user confirmed submission)`
- Assigned launch date: `Unknown - Product Hunt account access required`
- Owner/session: `John`
- Evidence: `User-confirmed submission on 2026-06-22`
- Next action: verify the scheduled date and submission URL when Product Hunt is available in an authenticated browser

A user-confirmed submission is sufficient to prevent duplicate work, but it is not treated as a confirmed live backlink.

### Scheduled Status

Add this status:

| Status | Meaning |
| --- | --- |
| `scheduled` | The submission was accepted and the platform assigned a future launch or publication date. |

### Required Launch-Date Tracking

For every submission, record:

- Submission date
- Assigned launch or publication date, if any
- Time and timezone exactly as shown by the platform, if supplied
- Submission receipt, dashboard, or public URL
- Owner/session
- Next verification date
- Current status

If a platform assigns a date, change the status to `scheduled`. Never infer a date from a queue position or typical review duration.

The submitted/pending table will gain an `Assigned launch date` column. Use `None` when the platform does not schedule launches and `Unknown` when the information is not currently accessible.

## Acquisition Approach

Use small mixed batches. Each batch contains:

1. Two relevant free directories or launch platforms
2. One higher-quality editorial, guest-post, or permitted community opportunity

This balances fast listing coverage with slower links that can carry more authority and qualified traffic.

### Candidate Requirements

A candidate must:

- Be free to submit or pitch
- Be relevant to personal finance, FIRE, fintech, SaaS, startup discovery, or productivity
- Have a legitimate public site and clear submission or editorial process
- Not already appear as `submitted`, `pending`, `scheduled`, or `live-*` in the ledger
- Not require a reciprocal paid link or misleading claim
- Not resemble the spam domains already identified in Ahrefs

### Prioritization

Rank candidates using:

1. Audience relevance
2. Editorial or directory quality
3. Likelihood of a durable public link
4. Estimated effort
5. Whether the link can generate qualified referral traffic

Raw backlink count is not a prioritization metric.

## Submission Workflow

1. Read the latest ledger from `main`.
2. Search by destination domain and UntilFire target URL.
3. Verify the platform is free and legitimate.
4. Prepare the exact submission data and copy.
5. Obtain action-time confirmation before transmitting contact details or submitting an external form.
6. Submit once.
7. Capture the receipt, assigned date, public URL, and platform status.
8. Update the ledger in the same session.
9. Verify the ledger change on GitHub `main`.
10. Recheck pending or scheduled entries on their recorded follow-up date.

## Guest-Post Workflow

Guest posts remain free-only. Each pitch must be specific to the publication and offer useful, non-promotional personal-finance content. Record:

- Publication
- Contact role
- Pitch topic
- Pitch date
- Owner/session
- Evidence reference
- Follow-up date
- Outcome

Do not store passwords, private email bodies, authentication data, or personal inbox history in the repository.

## Error and Handoff Rules

- Authentication required: stop at the login boundary and request the user to sign in.
- CAPTCHA encountered: request confirmation before solving it.
- Assigned date unavailable: record `Unknown`; do not guess.
- Duplicate discovered: do not submit; update the existing row if new evidence exists.
- Payment requested: do not proceed; mark the candidate rejected for the no-budget campaign.
- Public listing disappears: mark `removed` after direct verification.
- Platform provides no clickable link: keep `submitted` or `live-unverified` and explain the limitation.

## Verification

For each ledger update:

- Confirm only intended repository files changed
- Confirm every new row uses the status vocabulary
- Confirm submission and launch dates are explicit
- Confirm evidence URLs are preserved
- Confirm Product Hunt is no longer listed as `not-submitted`
- Re-read the final file from GitHub `main`

For each live backlink:

- Open the live page
- Confirm UntilFire is named
- Confirm the target URL
- Record direct, nofollow/UGC, redirect, or unverified link type

## Success Criteria

- Product Hunt is recorded as submitted without inventing a launch date.
- Any platform-assigned launch date is captured with timezone and evidence.
- No destination receives a duplicate submission.
- Every completed submission is recorded in the same session.
- Paid and spam link opportunities are excluded.
- Each acquisition batch includes both directory coverage and at least one higher-quality opportunity.
