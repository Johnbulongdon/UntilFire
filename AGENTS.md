# UntilFire Agent Rules

This repository uses `origin/main` as the canonical baseline for all work by default.

## Baseline Rule

Before making any change:

1. Fetch `origin/main`.
2. Compare the local workspace against `origin/main`.
3. Treat the latest pushed `origin/main` version as the baseline.

Do not use older local commit history or unpushed local workspace changes as the baseline unless the user explicitly says to.

## Local Workspace Drift

If local files differ from `origin/main`:

- preserve those local changes
- do not assume they are the intended base
- continue reasoning from `origin/main` unless the user explicitly overrides that rule

## UI Work

For design-sensitive work:

- use `origin/main` as the code baseline
- use the live deployment or user-provided screenshots as verification
- if the live deployment and `origin/main` visibly differ, call that out before implementing or pushing

## Deployment References

If the user references a build or deployment identifier such as `6Tb7dySgE`, do not assume it is a git revision. Treat it as a deployment reference unless verified otherwise.

## Push Discipline

Before pushing visual changes, restate the baseline in plain language:

- `Using latest pushed GitHub main as base`

If the requested design direction conflicts with `origin/main`, say so before pushing.

## Standard Publish Path — SOP

### Architecture

This environment runs two separate transport paths:

| Path | Tool | Auth channel | Conflict detection |
|------|------|-------------|-------------------|
| Local git proxy | `git push` | `127.0.0.1:45783` (CCR_TEST_GITPROXY) | Yes — rejects diverged branches |
| MCP shttp | `mcp__github__push_files` | USE_SHTTP_MCP shttp channel | No — silently overwrites |

**Always prefer `git push`.** It detects divergence, preserves history, and is the authoritative path for this repo.

`mcp__github__push_files` is a last resort only. It requires sending full file content, has no conflict detection, and will silently overwrite upstream changes.

### Decision tree

```
1. git fetch origin main
2. git status — are we ahead of origin?
   YES → git push -u origin <branch>
     SUCCESS → done
     FAIL (non-network) → diagnose divergence: see "Divergence fix" below
     FAIL (network/403) → see "Proxy health" below
   NO (already up to date or behind) → rebase first, then push
```

### Divergence fix

When `git push` is rejected because branches have diverged:

```bash
git fetch origin main
git rebase origin/main      # drops commits already upstream, rebases unique commits on top
git push -u origin main
```

If rebase has conflicts: resolve them, `git rebase --continue`, then push.

Do **not** force-push without explicit user permission.

### Proxy health check

If `git push` returns HTTP 403 or a connection error:

```bash
git log --oneline origin/main..HEAD   # see what's unpushed
git fetch origin main                 # test proxy connectivity
git status                            # check tracking ref state
```

If `git fetch` also fails (proxy is down): wait for the session's proxy to recover, or note the failure explicitly to the user. Do not silently fall back to MCP push.

### When MCP push_files is acceptable

Only as a documented last resort, when:
- `git push` fails with a network error that cannot be resolved
- The user explicitly approves bypassing git history

Constraints when using MCP push:
- Must send the **full file content** for every file changed (partial content will corrupt the file)
- Must manually verify no upstream changes exist on the target branch first
- Must acknowledge to the user that conflict detection is bypassed

### Never do

- Force-push without user permission
- Use `--no-verify` to skip hooks
- Leave unpushed commits as the source of truth
- Silently fall back to MCP push without diagnosing the git proxy failure
