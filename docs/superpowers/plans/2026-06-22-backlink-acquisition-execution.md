# Backlink Acquisition Execution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct Product Hunt tracking and acquire a first mixed batch of legitimate, free backlink opportunities without duplicate submissions.

**Architecture:** Use `docs/marketing/BACKLINK_LEDGER.md` as the transaction log. Research and browser actions happen sequentially: verify eligibility, prepare data, obtain action-time confirmation, submit once, capture evidence and assigned dates, then update GitHub in the same session.

**Tech Stack:** Markdown ledger, GitHub, Chrome browser automation, public web research, Ahrefs verification.

---

### Task 1: Correct Product Hunt and Launch-Date Tracking

**Files:**
- Modify: `docs/marketing/BACKLINK_LEDGER.md`

- [ ] **Step 1: Fetch and verify the latest baseline**

Run:

```powershell
git fetch origin main
git rev-parse origin/main
```

Expected: fetch succeeds and the SHA matches GitHub `main`.

- [ ] **Step 2: Extend status vocabulary**

Add:

```markdown
| `scheduled` | The submission was accepted and the platform assigned a future launch or publication date. |
```

Expected: `scheduled` appears exactly once in the status table.

- [ ] **Step 3: Add the launch-date rule**

Add a session rule requiring the assigned launch/publication date, time, and timezone to be copied exactly as shown. If inaccessible, record `Unknown`; never infer it.

Expected: future sessions can determine whether a platform date must be captured without reading this plan.

- [ ] **Step 4: Correct Product Hunt**

Remove Product Hunt from `Checked With No Submission Evidence`. Add it under `Submitted or Public, Backlink Not Confirmed` with:

```markdown
| Product Hunt | `submitted` | Unknown (user confirmed submission) | Unknown - Product Hunt account access required | Not currently accessible | John | 2026-06-22 | User-confirmed submission. Verify the assigned launch date and submission URL in an authenticated Product Hunt session. |
```

Expected: Product Hunt has one ledger row and is not marked `not-submitted`.

- [ ] **Step 5: Record the audit change**

Add an audit-log entry dated `2026-06-22` describing the Product Hunt correction and scheduled-date rule.

- [ ] **Step 6: Verify the Markdown diff**

Run:

```powershell
git diff --check
git diff -- docs/marketing/BACKLINK_LEDGER.md
```

Expected: exit 0, no whitespace errors, and only the intended ledger sections change.

### Task 2: Research the First Mixed Opportunity Batch

**Files:**
- Modify after evidence exists: `docs/marketing/BACKLINK_LEDGER.md`

- [ ] **Step 1: Build a candidate set**

Find at least six currently available candidates across:

- Free startup/SaaS directories
- Personal-finance, FIRE, or fintech resource pages
- Free guest-post/editorial opportunities
- Communities that explicitly permit relevant promotion

Exclude every platform already listed in the ledger.

- [ ] **Step 2: Verify each candidate**

For each candidate, confirm:

- Submission or pitch is free
- Public site is live
- Relevant category exists
- Submission process is visible
- No mandatory paid placement or reciprocal paid link
- No spam or PBN characteristics

Expected: at least three candidates survive verification.

- [ ] **Step 3: Rank the candidates**

Score each surviving candidate from 1-5 for:

- Audience relevance
- Site quality
- Durable-link likelihood
- Referral-traffic potential
- Submission effort, where 5 means low effort

Select two directory/launch opportunities and one editorial/community opportunity.

- [ ] **Step 4: Prevent duplicates**

Search the ledger by destination domain and UntilFire target URL before preparing any submission.

Expected: selected candidates have no `submitted`, `pending`, `scheduled`, or `live-*` row.

### Task 3: Prepare and Submit the Mixed Batch

**Files:**
- Modify: `docs/marketing/BACKLINK_LEDGER.md`

- [ ] **Step 1: Prepare exact submission data**

Use:

- Product: UntilFire
- Website: https://www.untilfire.com/
- Category: personal finance / financial independence / FIRE planning
- Sender: John
- Contact email: ngjohn101@gmail.com
- Budget: free-only; reject paid upgrades
- Description: factual copy based on the live UntilFire site

Do not transmit contact details until the exact destination and action are presented for confirmation.

- [ ] **Step 2: Obtain action-time confirmation**

State the destination sites, account context, fields to be transmitted, and whether each action creates a public listing, email, or community post.

Expected: explicit confirmation is received before final form submission or message sending.

- [ ] **Step 3: Submit each approved opportunity once**

Stop and hand off if login, CAPTCHA, payment, or unverifiable required claims block submission.

- [ ] **Step 4: Capture evidence immediately**

For each action record:

- Submission date
- Assigned launch/publication date, time, and timezone
- Receipt, dashboard, or public URL
- Platform status
- Owner/session
- Follow-up date
- Link type if already live

- [ ] **Step 5: Update the ledger in the same session**

Use `submitted`, `pending`, or `scheduled` based on platform evidence. Never leave a successful external action unrecorded.

### Task 4: Verify and Publish the Ledger Update

**Files:**
- Modify: `docs/marketing/BACKLINK_LEDGER.md`
- Update when necessary: `docs/superpowers/plans/2026-06-22-backlink-acquisition-execution.md`

- [ ] **Step 1: Validate statuses and dates**

Confirm every new row uses the status vocabulary and includes explicit submission and assigned-date values.

- [ ] **Step 2: Confirm repository scope**

Run:

```powershell
git status --short
git diff --check
git diff --stat origin/main...HEAD
```

Expected: only approved documentation files changed and no whitespace errors exist.

- [ ] **Step 3: Commit**

Run:

```powershell
git add docs/marketing/BACKLINK_LEDGER.md docs/superpowers/plans/2026-06-22-backlink-acquisition-execution.md
git commit -m "Track Product Hunt and backlink acquisition batch"
```

Expected: commit succeeds without bypassing hooks.

- [ ] **Step 4: Push and merge safely**

Push the branch, create a PR against current `main`, verify it is mergeable and behind by zero commits, then merge without force-pushing.

- [ ] **Step 5: Re-read GitHub main**

Verify:

- Product Hunt is `submitted`
- Scheduled-date tracking is present
- Every completed submission has an evidence row
- No duplicate destination was added
