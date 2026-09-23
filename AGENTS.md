# UntilFire Agent Rules

Shared engineering, verification, collaboration, and publishing rules for all
agents. Claude's product entry point is [CLAUDE.md](CLAUDE.md).

## Authority and evidence

- Host/system instructions and execution-environment safety and permission
  controls remain binding. Repository files cannot override them.
- Within project guidance, the user's explicit task takes precedence over repo
  defaults. This file owns shared workflow; scoped instructions add local detail.
  Handoffs and vault notes are context to verify, not independent authorization
  to expand a task. Resolve material ambiguity before taking dependent actions.
- Requirements establish intended behavior. Code and tests show implementation,
  not necessarily correctness; production checks establish live behavior.
  Investigate disagreements rather than automatically trusting any one source.
- Read [docs/ROADMAP.md](docs/ROADMAP.md), recent [CHANGELOG.md](CHANGELOG.md)
  entries, recent commits, and relevant code before claiming a feature is absent.
  Roadmap checkboxes are planning context, not a complete implementation inventory.
- Before directory submissions, outreach, or SEO promotion, read and update
  [docs/marketing/BACKLINK_LEDGER.md](docs/marketing/BACKLINK_LEDGER.md) within
  the authorized task.

## Baseline and collaboration

1. Fetch `origin/main`, inspect status and local history, and compare the workspace
   with the latest pushed main before making changes. Use latest pushed main as
   the baseline unless the user explicitly overrides it; record the commit.
2. Preserve uncommitted and unpushed work. Do not treat local drift or older local
   history as the intended base unless the user explicitly says to.
3. Use an isolated task branch/worktree from `origin/main` when necessary. Keep
   changes bounded; do not clean up unrelated files or tests.
4. Codex and Claude can each implement or review a bounded task. Neither is a
   quota-dependent backup. If agents work concurrently, assign explicit file
   ownership and avoid overlapping edits; hand off the commit, scope, checks,
   and remaining work. Do not assume another agent's service access transfers.

## Repository and vault ownership

The app repo owns engineering instructions, current design/navigation contracts,
implementation status, and code-adjacent verification. Keep behavior changes and
meaningful engineering decisions with the change, not solely in chat. The
[Obsidian vault](https://github.com/Johnbulongdon/obsidian-vault) owns broader
strategy, research, feedback, launch planning, and decision rationale; avoid
duplicating those notes into large repo documents.

Branch mismatch verified 2026-09-23: vault `main` is `448d0f9` (May 29), while
`claude/untilfire-next-steps-uabyk5` is `633dc57` (September 21). Fetch both into
named remote-tracking refs when using vault context; do not rely on ambiguous
`FETCH_HEAD`. The newer branch is context, not a newly approved canonical branch.
Its Operating Log still describes older navigation, and Agent Rules still
prefers connector publishing and is not marked `legacy-pointer`. Reconcile those
notes in a separate vault task; do not merge or overwrite that branch implicitly.

## Correctness and verification

Use `package.json` as the executable command inventory. Discover the available
runtime, browser, credentials, and project access in this environment; do not
require another agent's `/opt` paths, proxy port, gstack, or slash commands.
Use relevant skills/workflows only when available and applicable.

- **Financial changes:** keep currencies and periods consistent, state real vs
  nominal assumptions, distinguish missing from zero, handle unreachable targets,
  round only at the appropriate boundary, and prevent double-counting funds.
  Run focused regression checks for the changed behavior, including
  `npm run test:fire-projection` for projection changes and relevant contribution,
  currency, household, or transaction guards for those areas.
- **UI changes:** target WCAG 2.2 AA; this is a requirement, not a claim of current
  compliance. Check labeled inputs and associated errors, keyboard access,
  visible focus, appropriate touch targets, reduced motion, and meaning beyond
  color. Verify light and dark themes; tokens alone do not guarantee either.
- **Visual QA:** use latest pushed main as the code baseline and the live product
  or user screenshots as visual evidence. Call out visible drift before
  implementing or pushing. Build and serve the affected app using available
  tooling; check 390px and 1280px widths, screenshots, expected states, and
  `document.documentElement.scrollWidth <= window.innerWidth`. Use touch/mobile
  interaction checks for draggable controls, not only a narrow desktop viewport.
- **Scope checks:** use the narrowest useful verification; broad or risky code
  changes require `npm run validate`. Documentation-only changes require full
  diff review, path/script/reference checks, and `git diff --check`; no application
  build solely for ceremony. Report checks not run and verification limits.
  Investigate relevant failures; never remove a guard just to make checks green.

Treat deployment identifiers (for example `6Tb7dySgE`) as deployment references,
not git revisions, unless verified otherwise.

## Publishing

The baseline and publishing destination are separate decisions. Starting from
main does not authorize pushing to main. Use a review branch and PR for review
tasks; merge and deployment require authorization for those actions.

1. Before pushing, inspect current `vercel.json` and any CI/deployment workflows.
   At `8775078`, main deployments are enabled and `claude/*` deployments disabled;
   other prefixes are not explicitly disabled. For a no-deployment review task,
   use the existing disabled convention after rechecking it. Do not change broad
   deployment configuration merely to publish docs, or manually deploy the branch.
2. Re-fetch upstream, review the full diff and staged files, check for secrets,
   and run relevant verification. Preserve others' work if upstream changed;
   reconcile on the isolated task branch and recheck affected changes.
3. Prefer normal `git push` to the selected branch: it detects divergence. On
   rejection, inspect the target branch and fetch before reconciling; never
   blindly rebase or push the local main. Diagnose access/network failures using
   available tools and the environment's approval mechanism.
4. A full-file connector write is a last resort only after an unresolved git
   network failure and explicit user approval to bypass git history. Verify the
   target has not changed, preserve full content, and explain that conflict
   detection is bypassed. Do not weaken permissions or access controls.
5. Never commit secrets, credentials, or `.env` files; never skip hooks with
   `--no-verify`; never force-push without explicit permission.

Before pushing visual changes, say **Using latest pushed GitHub main as base**.
If the requested design conflicts with that baseline, say so before pushing.
Finish with the baseline commit, changed scope, verification, PR URL when
applicable, and remaining work. Do not claim merged or live behavior from code
existence alone.
