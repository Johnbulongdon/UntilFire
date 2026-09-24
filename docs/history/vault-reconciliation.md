# One-time vault reconciliation — 23 September 2026

Publication rechecked app main `2af3cb8de42f96104608042e7b3eb7c5f222746f` on
September 24. Its two later Contributions commits and both overlapping documents
were reconciled before publishing; their runtime changes were preserved.

## Scope and provenance

The user chose one maintained project memory in the app repository so agents
retain how and why conclusions were reached. Decision D-01 in
[DECISIONS.md](../DECISIONS.md) supersedes the May repo/vault split.
[KNOWLEDGE.md](../KNOWLEDGE.md) routes future reads and updates.

Compared the complete file inventories and branch delta at these pinned sources:

| Source | Commit | Role |
| --- | --- | --- |
| App main | `8775078d48f389894f792d5451a0f5e80a3c2395` | Initial implementation baseline |
| [Vault main](https://github.com/Johnbulongdon/obsidian-vault/tree/448d0f94542f3445f9314fb23b68d6a5a965ab87/UntilFire) | `448d0f94542f3445f9314fb23b68d6a5a965ab87` | May 29 historical snapshot |
| [Newer vault context](https://github.com/Johnbulongdon/obsidian-vault/tree/633dc570500826e1acfb58d0ad276ac0985658cb/UntilFire) | `633dc570500826e1acfb58d0ad276ac0985658cb` | September 21 snapshot |

Vault main is an ancestor of the newer branch: **0 main-only / 10 newer-only
commits**, with three modified notes and two added notes. There is no competing
main-only decision history to discard. The branch name is not promoted to a new
canonical branch. Files listed below are relative to the vault root and can be
retrieved at the pinned snapshots.

Git refs were fetched during the initial documentation pass. On this follow-up,
local Git networking failed; GitHub's read-only branch API confirmed all three
tips still matched those local objects before editing. Recheck remote state
before publication. This record does not claim a fresh successful Git fetch.

## Reconciliation, not a wholesale copy

The current rules and important rationale were read alongside app contracts and
commits. The inventory accounts for every source note, including unchanged
legacy files; it does not claim every old checklist was re-tested or every raw
research assertion validated. Originals remain intact at their source commits.

| Newer-branch delta | Resolution |
| --- | --- |
| Engineering/Development Log | Preserve July deployment lesson in D-06; use actual app commits for implementation history; do not adopt old branch-closing or monitoring instructions |
| Strategy/Product Positioning | Preserve freedom-led guidance; July correction rejects gamification and sequences deterministic tools before AI (D-02/D-03) |
| Product/Gentle Onboarding Principles | Preserve no-pressure first value; old funnel counts and missing-instrumentation claims are historical, not current measurements |
| Planning/Launch Runway | Preserve activation/retention rationale, conditional January plan and bounded SEO experiment; refresh evidence before action |
| Marketing/Guest Post Outreach | Retain relevant-audience acquisition rationale; no contact list, messages or unverified SEO claims published |

Conflicts resolved: repo is now the maintained memory; normal Git transport is
preferred; no fixed tool paths or primary/backup agent hierarchy; Home/Money/Plan
replaces older Freedom navigation; assumptions live in Plan; v3 Warm replaces
old palettes; Monte Carlo removal overrides probability-score plans; pricing and
return assumptions follow current code contracts. Both requirements and code
can be wrong: disagreements remain investigations, not automatic rewrites.

The newer launch note repeated a concern about uninstrumented email capture;
app `7d3c88c` predates it and adds that instrumentation. We preserve the need to
verify coverage, not the unsupported claim that instrumentation is absent.
Similarly `dbec537` centralises current price copy and `f79d688` replaces mixed
return assumptions. These are repository facts, not verified live billing or QA.

## Historical sprint intent retained

Sprints 1–16 already have repo counterparts under `docs/sprints/`. They are
historical implementation slices, not today's ordered backlog. Sprints 17–23
exist in the vault snapshots; their decision-useful intent is retained here:

| Sprint | Intent and boundary |
| --- | --- |
| 17 — result product moment | Freedom date, a useful next move, why it matters, optional continuation; no whole-dashboard rebuild |
| 18 — monthly loop | Plan, check-in and calm recovery; July no-gamification direction supersedes its streak suggestion |
| 19 — dashboard hierarchy | Lead with progress and the top move; secondary data supports the plan; no permission to redesign every tab |
| 20 — useful tracking | Explain plan versus actual and what counts where; avoid spreadsheet/trading feature sprawl |
| 21 — Pro continuity | Frame value around useful ongoing guidance; old AI promises and prices are not current packaging |
| 22 — trust and learning | Feedback after value; measure intent without financial values or free-text feedback in analytics |
| 23 — save continuity | One clear optional next step, preserved context and safe secondary sharing; no new lifecycle system implied |

Current implementation is in [features.md](../features.md) and the
[roadmap](../ROADMAP.md). Retaining a sprint's intent does not certify its full
acceptance checklist or authorize unfinished work.

## Source inventory and disposition

67 notes in the newer snapshot. All but the two additions also exist
on vault main; only the five notes above differ. Uncopied originals are retained,
not deleted. "Historical" means no active instruction authority.

| Vault note | Disposition | Current owner |
| --- | --- | --- |
| `00 - Start Here.md` | Superseded entry point / ownership plan | [Owner](../../AGENTS.md) |
| `Agent Context/AI Context.md` | Superseded entry point / ownership plan | [Owner](../../AGENTS.md) |
| `Agent Context/Agent Rules.md` | Superseded entry point / ownership plan | [Owner](../../AGENTS.md) |
| `Agent Context/Claude Context.md` | Superseded entry point / ownership plan | [Owner](../../AGENTS.md) |
| `Agent Context/Instructions Bundle - Agents.md` | Superseded entry point / ownership plan | [Owner](../../AGENTS.md) |
| `Agent Context/Operating Log.md` | Superseded entry point / ownership plan | [Owner](../../AGENTS.md) |
| `Audits/UNT-126-landing-remediation-slice-package-2026-05-12.md` | Historical audit retained in app docs/audits; not current task instructions | [Owner](../KNOWLEDGE.md) |
| `Audits/UNTAAAA-41-followup-assessment-2026-05-06.md` | Historical audit retained in app docs/audits; not current task instructions | [Owner](../KNOWLEDGE.md) |
| `Audits/UNTAAAA-87-closeout-addendum-2026-05-11.md` | Historical audit retained in app docs/audits; not current task instructions | [Owner](../KNOWLEDGE.md) |
| `Audits/UNTAAAA-87-progress-2026-05-11.md` | Historical audit retained in app docs/audits; not current task instructions | [Owner](../KNOWLEDGE.md) |
| `Engineering/Auth Setup.md` | Existing app setup document owns current procedure | [Owner](../../AUTH_SETUP.md) |
| `Engineering/Changelog.md` | Relevant history reconciled against app commits; old next-actions not adopted | [Owner](../../CHANGELOG.md) |
| `Engineering/Development Log.md` | Relevant history reconciled against app commits; old next-actions not adopted | [Owner](../../CHANGELOG.md) |
| `Marketing/Build in Public/Day 05 - 90.md` | Historical research/design/content source; no stale claims promoted | [Owner](../KNOWLEDGE.md) |
| `Marketing/Build in Public/Day 06 - 90.md` | Historical research/design/content source; no stale claims promoted | [Owner](../KNOWLEDGE.md) |
| `Marketing/Guest Post Outreach.md` | Acquisition rationale retained; contact/pitch data not copied | [Owner](../planning/launch-context.md) |
| `Marketing/Launch Posts.md` | Historical research/design/content source; no stale claims promoted | [Owner](../KNOWLEDGE.md) |
| `Marketing/X Content Calendar.md` | Historical research/design/content source; no stale claims promoted | [Owner](../KNOWLEDGE.md) |
| `Planning/Beta Launch Checklist.md` | Dated plan reconciled; no fresh analytics or launch approval | [Owner](../planning/launch-context.md) |
| `Planning/Launch Runway.md` | Dated plan reconciled; no fresh analytics or launch approval | [Owner](../planning/launch-context.md) |
| `Planning/Roadmap.md` | Old plan superseded by app status and dated launch context | [Owner](../ROADMAP.md) |
| `Planning/Sprints/sprint-01-share-card.md` | Historical proposal; intent retained in sprint summary below | [Owner](../PRD.md) |
| `Planning/Sprints/sprint-02-calculators-hub.md` | Historical proposal; intent retained in sprint summary below | [Owner](../PRD.md) |
| `Planning/Sprints/sprint-03-fire-score-hero.md` | Historical proposal; intent retained in sprint summary below | [Owner](../PRD.md) |
| `Planning/Sprints/sprint-04-calculator-handoff.md` | Historical proposal; intent retained in sprint summary below | [Owner](../PRD.md) |
| `Planning/Sprints/sprint-05-reveal-screen-cleanup.md` | Historical proposal; intent retained in sprint summary below | [Owner](../PRD.md) |
| `Planning/Sprints/sprint-06-milestone-moments.md` | Historical proposal; intent retained in sprint summary below | [Owner](../PRD.md) |
| `Planning/Sprints/sprint-07-fire-date-delta.md` | Historical proposal; intent retained in sprint summary below | [Owner](../PRD.md) |
| `Planning/Sprints/sprint-08-mobile-pass.md` | Historical proposal; intent retained in sprint summary below | [Owner](../PRD.md) |
| `Planning/Sprints/sprint-09-nav-coherence.md` | Historical proposal; intent retained in sprint summary below | [Owner](../PRD.md) |
| `Planning/Sprints/sprint-10-email-capture.md` | Historical proposal; intent retained in sprint summary below | [Owner](../PRD.md) |
| `Planning/Sprints/sprint-11-social-proof.md` | Historical proposal; intent retained in sprint summary below | [Owner](../PRD.md) |
| `Planning/Sprints/sprint-12-ai-adviser-mvp.md` | Historical proposal; intent retained in sprint summary below | [Owner](../PRD.md) |
| `Planning/Sprints/sprint-13-stripe-paywall.md` | Historical proposal; intent retained in sprint summary below | [Owner](../PRD.md) |
| `Planning/Sprints/sprint-14-onboarding-email.md` | Historical proposal; intent retained in sprint summary below | [Owner](../PRD.md) |
| `Planning/Sprints/sprint-15-weekly-fire-report.md` | Historical proposal; intent retained in sprint summary below | [Owner](../PRD.md) |
| `Planning/Sprints/sprint-16-seo-audit.md` | Historical proposal; intent retained in sprint summary below | [Owner](../PRD.md) |
| `Planning/Sprints/sprint-17-result-screen-product-moment.md` | Historical proposal; intent retained in sprint summary below | [Owner](../PRD.md) |
| `Planning/Sprints/sprint-18-monthly-discipline-loop.md` | Historical proposal; intent retained in sprint summary below | [Owner](../PRD.md) |
| `Planning/Sprints/sprint-19-dashboard-progress-not-noise.md` | Historical proposal; intent retained in sprint summary below | [Owner](../PRD.md) |
| `Planning/Sprints/sprint-20-tracking-that-feels-useful.md` | Historical proposal; intent retained in sprint summary below | [Owner](../PRD.md) |
| `Planning/Sprints/sprint-21-pro-around-continuity-and-guidance.md` | Historical proposal; intent retained in sprint summary below | [Owner](../PRD.md) |
| `Planning/Sprints/sprint-22-beta-trust-and-learning-signals.md` | Historical proposal; intent retained in sprint summary below | [Owner](../PRD.md) |
| `Planning/Sprints/sprint-23-result-continuity-and-save-path.md` | Historical proposal; intent retained in sprint summary below | [Owner](../PRD.md) |
| `Planning/Todos.md` | Historical fixes, not current backlog | [Owner](../KNOWLEDGE.md) |
| `Planning/Vault Structure Audit - 2026-05-28.md` | Superseded entry point / ownership plan | [Owner](../../AGENTS.md) |
| `Product/Analytics/EVENTS.md` | Existing app event contract owns current behavior | [Owner](../analytics/EVENTS.md) |
| `Product/Beta Feedback.md` | Safe qualitative conclusion only; raw evidence not copied | [Owner](../CONTEXT.md) |
| `Product/Feedback Prompt Spec.md` | Enduring constraints reconciled; old audits historical | [Owner](../PRD.md) |
| `Product/Gentle Onboarding Principles.md` | Enduring constraints reconciled; old audits historical | [Owner](../PRD.md) |
| `Product/Modules/ai-adviser.md` | Historical module snapshot; current code map replaces authority | [Owner](../features.md) |
| `Product/Modules/calculators.md` | Historical module snapshot; current code map replaces authority | [Owner](../features.md) |
| `Product/Modules/fire-dashboard.md` | Historical module snapshot; current code map replaces authority | [Owner](../features.md) |
| `Product/Modules/landing-wizard.md` | Historical module snapshot; current code map replaces authority | [Owner](../features.md) |
| `Product/PRD.md` | Current requirements reconciled; original available in pinned history | [Owner](../PRD.md) |
| `Product/Personas.md` | Historical research/design/content source; no stale claims promoted | [Owner](../KNOWLEDGE.md) |
| `Product/Pricing and Pro Packaging.md` | Historical pricing superseded; current contract points to code | [Owner](../features.md) |
| `Product/Survey - Friends Beta - 2026-05-20.md` | Safe qualitative conclusion only; raw evidence not copied | [Owner](../CONTEXT.md) |
| `Product/User Journey.md` | Historical research/design/content source; no stale claims promoted | [Owner](../KNOWLEDGE.md) |
| `Repo Cleanup Plan.md` | Superseded entry point / ownership plan | [Owner](../../AGENTS.md) |
| `Repo and Vault Boundary.md` | Superseded entry point / ownership plan | [Owner](../../AGENTS.md) |
| `Strategy/Decision Log.md` | Rationale reconciled; old choices retained or superseded | [Owner](../DECISIONS.md) |
| `Strategy/Design/distribution-demand-discovery.md` | Historical research/design/content source; no stale claims promoted | [Owner](../KNOWLEDGE.md) |
| `Strategy/Design/probability-score-launch.md` | Historical research/design/content source; no stale claims promoted | [Owner](../KNOWLEDGE.md) |
| `Strategy/Market Research.md` | Historical research/design/content source; no stale claims promoted | [Owner](../KNOWLEDGE.md) |
| `Strategy/Product Positioning.md` | Current direction and July corrections reconciled | [Owner](../CONTEXT.md) |
| `UntilFire Knowledge Base.md` | Superseded entry point / ownership plan | [Owner](../../AGENTS.md) |

## Privacy and completion boundary

No raw survey answers, respondent financial profiles, personal contact lists,
private account/revenue metrics, credentials or unrelated personal vault content
were copied. Safe product conclusions retain source dates and uncertainty.
Historical research/persona/content notes already in the app remain historical
unless specifically revalidated; this is not a new market research exercise.

No vault branch was merged, rewritten or deleted. No vault GitHub archive setting
was changed. The app's instructions and README now treat it as an archive, but
the remote vault itself is unchanged and has no new redirect committed by this
PR. A task started directly in that old repo must be pointed to the app's
[project memory](../KNOWLEDGE.md); its old entry points are not current guidance.

This is a documentation reconciliation only. Existing guard failures, Contributions
production QA, monthly email, and legal/product review of named allocations
remain separate tasks. Nothing here certifies production behavior or authorizes
merge, deployment, outreach, or analytics changes.
