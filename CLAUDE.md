# UntilFire — Claude Code Context

# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## What is this project?

UntilFire is a personal FIRE adviser web app. Free calculator (no login).
Live at untilfire.com. See `docs/CONTEXT.md` for full product context.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Auth + DB**: Supabase (Google OAuth)
- **Styling**: Tailwind CSS v4
- **Charts**: Recharts
- **Hosting**: Vercel

## Key Files

| File | Purpose |
|---|---|
| `app/page.tsx` | Landing page + full 5-screen calculator wizard |
| `lib/fire-data.ts` | 263 cities, tax logic, `calcFIRE()` |
| `app/dashboard/page.tsx` | Logged-in dashboard (expense tracking, charts) |
| `app/api/waitlist/route.ts` | Waitlist email signup endpoint |

## Current Phase

Phase 2 — Distribution & Monetisation (April–June 2026).
See `docs/ROADMAP.md` for full task list.

## gstack

gstack is installed globally at `~/.claude/skills/gstack` and available as slash commands.
Use these for structured development workflows:

- `/office-hours` — product interrogation before building
- `/plan-eng-review` — engineering review of a plan
- `/review` — staff engineer code review
- `/investigate` — deep codebase investigation
- `/ship` — PR creation workflow
- `/qa` — browser-based QA (requires Playwright, may not work in restricted envs)

## Dev Commands

```bash
npm run dev      # start dev server on localhost:3000
npm run build    # production build
npm run lint     # run ESLint
```

## gstack Design Doc Sync

After any `/office-hours`, `/plan-ceo-review`, or `/design-shotgun` session that produces
a design doc, always copy it into `docs/design/` and commit it to the current branch.

The source is `~/.gstack/projects/Johnbulongdon-UntilFire/`.
Use a short kebab-case filename that reflects the doc's topic (e.g. `distribution-demand-discovery.md`).
If a doc for the same topic already exists in `docs/design/`, overwrite it (it's a living document).

```bash
# Example sync command
cp ~/.gstack/projects/Johnbulongdon-UntilFire/<filename>.md docs/design/<topic>.md
git add docs/design/ && git commit -m "docs: sync gstack design doc — <topic>"
```

## Design Tokens

- Background: `#08080e`
- Accent orange: `#f97316`
- Accent teal: `#22d3a5`
- Fonts: Syne, DM Sans, DM Mono
