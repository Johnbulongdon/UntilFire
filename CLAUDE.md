# UntilFire Agent Context

This is the always-loaded project context for Claude Code and other AI agents working in UntilFire. Keep it short, current, and actionable.

## Start Here: Agent Startup Checklist

Before acting on any task:

1. Read the user's latest request first.
2. Fetch and compare against latest pushed `origin/main`.
3. Inspect the relevant existing files and patterns before editing.
4. Load or follow the relevant workflow/skill guidance below.
5. Make the smallest safe change that satisfies the request.
6. Run the narrowest useful verification before claiming completion.
7. If the user asks to push, commit only after verification and push to `main`.

If any instruction conflicts, stop and call out the conflict instead of guessing.

## Instruction Priority

1. User's latest request in chat.
2. Repository rules in `AGENTS.md` and this `CLAUDE.md`.
3. Task-specific docs the user points to.
4. Existing code patterns in the repo.
5. General framework knowledge.

## Active Goal

UntilFire's current active goal is to reach **$3k MRR**.

Prioritize work that directly improves one of these revenue levers:

- activation: visitors reach a useful freedom-date result
- conversion: activated users understand why Pro is worth paying for
- retention: users have a clear reason to return
- trust: the product feels safe, clear, and credible with financial data
- acquisition: founder-led beta, build-in-public, SEO, Product Hunt, and share loops

Avoid work that is not clearly connected to reaching $3k MRR unless the user explicitly asks for it.

## Product Context

UntilFire is a personal FIRE adviser web app. It turns personal finance into a guided plan toward work optionality, then shows how to bring that freedom date closer.

- Live site: https://untilfire.com
- GitHub: `github.com/Johnbulongdon/UntilFire` private repo
- Primary positioning: **Personal finance that sets you free.**
- North star: turn financial independence from an abstract calculator result into a clear, emotional, actionable path.
- Free first value moment: full no-login calculator.
- Pro direction: personal FIRE adviser, plan, budget tracking, and continuity after the aha moment.

Important framing:

- Lead with freedom, work optionality, freedom date, and the plan — not generic “calculator” language.
- Keep the first session calm and trustworthy.
- Do not hide the aha moment behind login, payment, surveys, feedback prompts, bank prompts, or heavy setup.
- Treat dashboard/Pro as continuation after value, not the first thing users must do.

## Andrej Karpathy-Style Agent Discipline

Use this as the default operating style for all coding, product, and documentation tasks.

### Be explicit before coding

- State assumptions when they materially affect implementation.
- If multiple interpretations exist, present the options instead of silently choosing.
- If the request is unclear enough to change what files or behavior you would touch, ask before editing.
- Prefer a simple approach and explain when it is enough.

### Keep changes small

- Build the minimum code or doc change that solves the requested problem.
- Do not add speculative features, abstractions, configurability, or broad refactors.
- Do not reformat, rename, or clean up adjacent code unless asked.
- If the solution is getting large, pause and simplify before continuing.

### Work in a tight loop

For non-trivial tasks:

1. Define success criteria.
2. Inspect relevant files and one existing pattern.
3. Make the smallest safe change.
4. Verify with the narrowest useful command.
5. Inspect the diff.
6. Report what changed, verification, and remaining risk.

For bug fixes, prefer a repro or regression check first when practical. For refactors, verify before and after.

## Skill / Workflow Loading Guide

If the agent environment supports skills, slash commands, or reusable workflows, load the relevant workflow before acting. Use the most specific available skill; do not rely only on general knowledge.

Common mappings:

- Product, strategy, beta, launch, revenue, or MRR work: `untilfire-mrr-operator` if available.
- UI or frontend changes: frontend/UI skill, then browser or screenshot QA when practical.
- Bugs, failing tests, or unexpected behavior: systematic debugging skill.
- New features or behavior changes: planning/TDD skill when practical.
- Code review or pre-merge checks: code review / requesting-review skill.
- Git, commits, PRs, or pushes: git workflow skill.
- Docs or agent-context changes: context-engineering / documentation skill.
- Browser QA: browser-testing or QA skill if Playwright/browser tooling is available.

Use gstack slash commands when they fit the task:

- `/office-hours` — product interrogation before building.
- `/plan-eng-review` — engineering review of a plan.
- `/review` — staff engineer code review.
- `/investigate` — deep codebase investigation.
- `/ship` — PR creation workflow.
- `/qa` — browser-based QA, if Playwright/browser tooling is available.

After any `/office-hours`, `/plan-ceo-review`, or `/design-shotgun` session that creates a design doc, copy it into `docs/design/` and commit it on the current branch.

gstack project source: `~/.gstack/projects/Johnbulongdon-UntilFire/`.

## $3k MRR CEO Agent Loop

When asked to act as CEO, operator, or chief-of-staff for UntilFire:

1. Check the latest repo state, roadmap, and relevant Obsidian product/marketing notes.
2. Identify the single smallest action most likely to move activation, conversion, retention, trust, or acquisition.
3. Prefer actions that help a new user reach the freedom-date result, understand one monthly move, trust the product, save/share the result, or see why Pro is worth it.
4. Report only: found, why it matters for $3k MRR, and the next useful action.
5. Do not start broad strategy rewrites, speculative features, or open-ended research unless the user asks.

## Repository Working Rules

- Use latest pushed `origin/main` as the baseline unless the user explicitly says otherwise.
- Before changing files: fetch `origin/main`, compare local state, and preserve any local unpushed work.
- Make surgical changes only. Every changed line should trace back to the user's request.
- Match existing style and patterns, even if you would design it differently.
- Never commit secrets, `.env` files, API keys, tokens, or credentials.
- For visual/UI work, verify against the live product or screenshots when possible and call out any drift from `origin/main`.
- Do not rebuild completed features just because old docs say they are pending. Check code and `docs/ROADMAP.md` first.

## Tech Stack

- Framework: Next.js 15 App Router
- React: 19
- Language: TypeScript
- Auth/database: Supabase
- Styling: Tailwind CSS v4
- Charts: Recharts
- Payments: Stripe
- Bank connection: Plaid
- Email: Resend
- Analytics: Vercel Analytics, PostHog
- Hosting: Vercel

## Common Commands

```bash
npm run dev                         # start local dev server
npm run build                       # production build
npm run lint                        # ESLint
npm run typecheck                   # next build + tsc --noEmit
npm run validate                    # typecheck + lint + build
npm run test:calm-startup
npm run test:currency-selection
npm run test:cashflow-mobile-save
npm run test:expense-guidance
npm run test:city-coverage
npm run test:income-default
npm run test:savings-period-input
npm run test:achieved-fire-reveal
npm run test:fire-type-cta
npm run test:revenue-funnel
npm run test:holdings-mobile-layout
npm run test:profile-single-location
```

Use the narrowest verification that matches the change. For broad or risky changes, run `npm run validate`.

## Key Files and Directories

- `app/page.tsx` — main landing page and no-login calculator flow.
- `app/dashboard/page.tsx` — logged-in dashboard shell and FIRE overview.
- `app/dashboard/ProfileTab.tsx` — logged-in profile, FIRE profile, billing/account controls.
- `app/dashboard/UpgradeModal.tsx` — Pro upgrade modal and checkout start.
- `app/api/*` — server routes for waitlist, Stripe, Plaid, AI categorisation, etc.
- `lib/fire-data.ts` — city data, tax assumptions, FIRE calculation helpers.
- `lib/analytics*.ts` and `docs/analytics/EVENTS.md` — analytics event names and payload contracts.
- `components/` — reusable UI and product components.
- `docs/CONTEXT.md` — broader product and strategy context.
- `docs/ROADMAP.md` — current product phase and task list.
- `docs/design/` — design docs synced from gstack sessions.
- `AGENTS.md` — repository-wide agent workflow and publishing rules.

## Onboarding and First-Session UX Rules

- No surprise surveys, ratings, feedback boxes, paywalls, or bank prompts before value.
- Required calculator inputs should be limited to income, expenses or savings, and current savings/net worth.
- Retirement location must be skippable; if skipped, infer target from spending/expenses rather than blocking progress.
- Income entry must support gross annual income and monthly take-home alternatives.
- Savings entry must support either monthly savings or monthly spending.
- Age may be encouraged for a better freedom date, but must not be required.
- Feedback should be user-initiated after value, not pushed early.
- FIRE/personality test belongs in Profile or as a secondary flow, not as first-run friction.

## Design System Notes

- Background: `#08080e`
- Accent orange: `#f97316`
- Accent teal: `#22d3a5`
- Fonts: Syne, DM Sans, DM Mono
- Default tone: calm, confident, trustworthy, emotionally outcome-led.
- Mobile-first matters for beta and launch traffic.

## Documentation Rules

- Keep repo docs code-adjacent and current.
- Keep broader strategy/knowledge in the Obsidian vault, not duplicated in the repo.
- If code behavior and docs disagree, inspect the code and update stale docs as part of the task only when in scope.
- Design docs from gstack sessions go in `docs/design/` with short kebab-case filenames.

## Before Finishing Any Task

Before saying work is done:

1. Inspect the diff.
2. Run relevant verification.
3. Check for secrets in the staged diff before committing.
4. If pushing, confirm the branch is `main` and push only after verification passes.

Report concisely:

- What changed.
- What verification ran.
- Any issues, risks, or follow-up needed.
