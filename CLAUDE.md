# UntilFire Agent Context

This file is the always-loaded working context for Claude Code and other AI agents editing UntilFire. Keep it short, current, and actionable.

## Instruction Priority

1. User's latest request in chat.
2. Repository rules in `AGENTS.md` and this `CLAUDE.md`.
3. Task-specific docs the user points to.
4. Existing code patterns in the repo.
5. General framework knowledge.

If instructions conflict, stop and call out the conflict instead of guessing.

## Active Goal

UntilFire's current active goal is to reach **$3k MRR**.

Prioritize work that directly improves one of these revenue levers:

- first-session activation: more visitors reach a useful freedom-date result
- free-to-paid conversion: more activated users understand why Pro is worth paying for
- retention: users have a clear reason to come back after the first result
- trust: the product feels safe, clear, and credible with personal financial data
- acquisition: founder-led beta, build-in-public, SEO, Product Hunt, and share loops

Avoid work that is not clearly connected to reaching $3k MRR unless the user explicitly asks for it.

## $3k MRR CEO Agent Loop

When asked to act as CEO, operator, or chief-of-staff for UntilFire, use this bounded loop:

1. Check the latest repo state, roadmap, and relevant Obsidian product/marketing notes.
2. Identify the single smallest action most likely to move one revenue lever: activation, conversion, retention, trust, or acquisition.
3. Prefer actions that help a new user reach the freedom-date result, understand one monthly move, trust the product, save/share the result, or see why Pro is worth it.
4. Report only: found, why it matters for $3k MRR, and the next useful action.
5. Do not start broad strategy rewrites, speculative features, or open-ended research unless the user asks.

## Core Working Rules

- Use latest pushed `origin/main` as the baseline unless the user explicitly says otherwise.
- Before changing files: fetch `origin/main`, compare local state, and preserve any local unpushed work.
- Make surgical changes only. Every changed line should trace back to the user's request.
- Do not refactor, reformat, rename, or clean up adjacent code unless asked.
- Match existing style and patterns, even if you would design it differently.
- Never commit secrets, `.env` files, API keys, tokens, or credentials.
- For visual/UI work, verify against the live product or screenshots when possible and call out any drift from `origin/main`.

## AI Agent Operating Style

These guidelines come from Andrej Karpathy-style agent discipline: be careful, explicit, and simple.

### Think Before Coding

- State assumptions before implementing when they matter.
- If multiple interpretations exist, present the options instead of silently choosing.
- If the request is unclear enough to change the implementation, ask before editing.
- If a simpler approach exists, say so and prefer it.

### Simplicity First

- Build the minimum code that solves the requested problem.
- Do not add speculative features, abstractions, configurability, or defensive code for impossible cases.
- If a solution is getting large, pause and simplify before continuing.

### Goal-Driven Execution

For non-trivial tasks, use this loop:

1. Define the success criteria.
2. Inspect the relevant existing files and patterns.
3. Make the smallest safe change.
4. Run the narrowest useful verification.
5. Summarize what changed, what was verified, and any remaining risk.

For bug fixes, prefer a repro/test first when practical. For refactors, verify before and after.

## Skill / Workflow Usage

If your agent environment supports skills, slash commands, or reusable workflows:

- Load relevant skills before acting, especially for debugging, TDD, code review, UI work, git workflow, and browser QA.
- For UntilFire product, strategy, QA, beta, launch, or revenue work, load the `untilfire-mrr-operator` skill if available.
- Use gstack slash commands when they fit the task:
  - `/office-hours` — product interrogation before building.
  - `/plan-eng-review` — engineering review of a plan.
  - `/review` — staff engineer code review.
  - `/investigate` — deep codebase investigation.
  - `/ship` — PR creation workflow.
  - `/qa` — browser-based QA, if Playwright/browser tooling is available.
- After any `/office-hours`, `/plan-ceo-review`, or `/design-shotgun` session that creates a design doc, copy it into `docs/design/` and commit it on the current branch.
- gstack project source: `~/.gstack/projects/Johnbulongdon-UntilFire/`.

## Product Context

UntilFire is a personal FIRE adviser web app: it shows when work can become optional, then gives clear monthly moves to bring that freedom date closer.

- Live site: https://untilfire.com
- GitHub: `github.com/Johnbulongdon/UntilFire` private repo
- Primary positioning: **Find your freedom date.**
- North star: turn financial independence from an abstract calculator result into a clear, emotional, actionable path.
- Free first value moment: full no-login calculator.
- Pro direction: personal FIRE adviser, monthly action plan, budget tracking, and continuity after the aha moment.

Important framing:

- Lead with work optionality, freedom date, and monthly moves — not generic “calculator” language.
- Keep the first session calm and trustworthy.
- Do not hide the aha moment behind login, payment, surveys, feedback prompts, bank prompts, or heavy setup.
- Treat dashboard/Pro as continuation after value, not the first thing users must do.

## Current Product Focus

UntilFire is in an early-revenue push. The active product objective is **$3k MRR**.

Use `docs/ROADMAP.md` for the detailed task list, but choose work through the MRR lens:

- Finish mobile and end-to-end QA for the no-login calculator so visitors reliably reach the aha moment.
- Make the result screen explain the freedom date, monthly moves, and why saving the result or upgrading is useful.
- Finalize free vs Pro packaging and keep upgrade prompts after the free value moment.
- Verify Stripe checkout, return, subscription sync, and portal before relying on paid conversion.
- Improve share/save/email capture after the reveal without exposing sensitive finances.
- Support founder-led beta and launch channels with copy/assets centered on work optionality, freedom date, and monthly moves.

Do not rebuild completed features just because old docs say they are pending. Check the code and `docs/ROADMAP.md` first.

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
```

Use the narrowest verification that matches the change. For broad or risky changes, run `npm run validate`.

## Key Files and Directories

- `app/page.tsx` — main landing page and no-login calculator flow.
- `app/dashboard/page.tsx` — logged-in dashboard shell and FIRE overview.
- `app/api/*` — server routes for waitlist, Stripe, Plaid, AI categorisation, etc.
- `lib/fire-data.ts` — city data, tax assumptions, FIRE calculation helpers.
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

Report concisely:

- What changed.
- What verification ran.
- Any issues, risks, or follow-up needed.

Do not claim a task is complete unless you inspected the diff and ran the relevant verification or explicitly explain why verification was not run.
