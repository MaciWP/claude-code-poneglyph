---
name: worktrees-bjumper
description: >
  Reference for the worktrees-bjumper CLI: isolated Binora/Bjumper sandboxes
  (worktrees, Docker, dual DB, seed, Vite). Explains what the tool can do,
  commands, parameters, pros/cons and precautions — does not prescribe a single
  workflow.
  Use when: devenv, worktree, sandbox Binora, entorno local, doctor, create env,
  puertos, seed, JRV, full-stack local — y para orientarse: en qué worktree estoy,
  dónde está el repo principal, qué repos hermanos tiene este env, dónde viven los docs.
  Keywords - devenv, worktree, bjumper, binora, sandbox, doctor, create, remove,
  topologia, topología, workspace, en que worktree, en qué worktree, donde esta el repo,
  dónde está el repo, repos hermanos, navega el workspace
---

# worktrees-bjumper

**Capability reference** for [worktrees-bjumper](../../).  
Teach the tool; **do not force a process**. The user (or the task) chooses how
to combine commands.

Portable: copy this folder to `~/.grok/skills/worktrees-bjumper` or
`~/.claude/skills/worktrees-bjumper`, or load repo-root `AGENTS.md`.

## What this project does

| Capability | Detail |
|---|---|
| Isolated worktrees | One env folder under `worktrees/<env>/<repo>/` |
| Port blocks | Non-overlapping host ports per env (`20000 + index×10`) |
| Backend stack | Docker (Postgres, Localstack, mailcatcher, pgweb) + 2 Django (main/tenant) |
| Seed | Dev data for main + tenant (auth path mirrors production) |
| Frontend | 2 Vite apps pointed at this env’s main/tenant APIs |
| Lifecycle | create, list, start, stop, logs, remove, doctor |

Product repos do **not** ship this tooling.

## When the skill is relevant

Load it when the user or task involves this tool: environments, worktrees,
local full-stack, ports, seed, cleanup.  
It does **not** mean “always run create then remove” — only that you know the surface.

## Commands

Run from `DEVENV_ROOT` (clone of worktrees-bjumper), typically:

```bash
.venv/bin/python devenv.py <command> [options]
```

### Git worktrees (must know)

Git allows **one working tree per local branch**.

| Intent | Flags | Notes |
|---|---|---|
| Create branch from main HEAD | `--branch X --new` | Safe default for new tickets |
| Reuse existing free branch | `--branch X` | Works if not checked out elsewhere |
| Branch already used (main or worktree) | `--branch X` | **Fails early** with owner path |

Do **not** use the main checkout’s current branch (often `dev`) without `--new`.

### `doctor`

| | |
|---|---|
| **For** | Verify Docker, git, uv (optional), recipe tools, **product repo dirs**, `.env` |
| **Params** | `--repos backend[,frontend]` — default: **all** recipes |
| **Exit** | `0` ok; `2` critical failure |
| **Pro** | Cheap gate; scope with `--repos backend` for API-only |
| **Con** | Does not prove a previous env is healthy |

### `create <env>`

| | |
|---|---|
| **For** | Provision worktrees + stack + seed + servers |
| **Params** | `--repos backend[,frontend]` · `--branch <name>` · `--new` · `--yes` · `--json` |
| **Exit** | `0` / `1` / `2` (preflight) |
| **Pro** | Full sandbox in one shot; JSON for automation |
| **Con** | Slow (minutes); needs free ports and Docker |
| **Caution** | Env name must be unique; branch strategy (`--new` vs existing) is a choice |

JSON top-level keys: `contract_version` (currently `1`), `env`, `index`, `branch`,
`repos`, `ports`, `worktrees`, `warnings`, `ok`.  
Details: `references/cli-contract.md`.

### Errors vs warnings

| | Error | Warning |
|---|---|---|
| Create continues? | Often no | Yes |
| Surface | exit 1–2, `error` | JSON `warnings[]` + yellow console |
| Example | Docker down | `product_models.json` fixture drift (benign if `ok`) |

**Product tests** are not defined by this tool — use the backend/frontend repo
(or its worktree).

### `list`

| | |
|---|---|
| **For** | Inventory envs and live docker/server status |
| **Params** | `--json` optional |
| **Pro** | Discover ports/paths without re-create |
| **Con** | Status is best-effort (cheap probes) |

### `start` / `stop <env>`

| | |
|---|---|
| **For** | Resume or pause without wiping data |
| **Params** | `--json` optional |
| **Pro** | Survive reboot / free RAM; **start is idempotent** (stops prior spawns first) |
| **Caution** | Backend always starts before frontend (API ports published first) |

### `logs <env>`

| | |
|---|---|
| **For** | Read or follow server/seed logs |
| **Params** | `--follow` |
| **Pro** | Includes recipe `*.log` **and** tool `devenv_errors.log` |
| **Also** | Hint: `docker compose -p binora-<env> logs` |

### `remove <env>`

| | |
|---|---|
| **For** | Destroy worktrees, compose project, volumes |
| **Params** | `--yes` · `--force-dirty` · `--dry-run` |
| **Pro** | Clean isolation teardown; **fails if docker down fails** (no silent success) |
| **Con** | Irreversible for env data/volumes |
| **Caution** | **Branches survive**. Without `--yes` asks confirm. Refuses dirty worktrees unless `--force-dirty` (human OK) |

## Parameters cheat-sheet

| Item | Role |
|---|---|
| `<env>` | Sandbox id + directory name |
| `--repos` | Which recipes (`backend`, `frontend`) |
| `--branch` | Git branch for all selected repos |
| `--new` | Create branch instead of reusing |
| `--yes` | No prompts |
| `--json` | Machine-readable result |
| `DEVENV_REPOS_DIR` / `DEVENV_WORKTREES_DIR` | Layout overrides |

## Pros of the tool (project-level)

- Parallel tickets without port/DB collisions  
- Main/tenant + seed close to production auth  
- Centralized tooling; product images stay clean  
- Scriptable (`--yes` / `--json`, exit codes)

## Cons / limits

- macOS team target (node_modules CoW via APFS)  
- Create dominated by migrate + seed (~2–5 min)  
- **Template DB: PENDING** — no pre-baked PGDATA yet  
- Does not define product test/lint commands  
- Frontend recipe assumes yarn + dual Vite  

## Faster create (operational)

| Choice | Saves |
|---|---|
| `--repos backend` when UI not needed | yarn + 2× Vite |
| `start` after reboot instead of re-create | full provision |
| Reuse existing env | full create |
| Template DB | PENDING (future ~40–70%) |

## Fast health of this tool

```bash
./scripts/smoke_offline.sh
# pytest + doctor (0|2) + list --json — no Docker create
```

Manual backend-only create smoke after recipe changes: `usage-patterns.md` Pattern G.

## Precautions

1. Choose branch/env names deliberately; collisions fail create or confuse remove.  
2. Prefer sandbox worktrees for experimental work; main checkouts are shared.  
3. Treat `warnings` in JSON as non-fatal unless health/`ok` says otherwise.  
4. Known benign noise: `product_models` / `slot_count` fixture drift.  
5. Do not blind-retry create; inspect logs first.  
6. Never use `--force-dirty` without human authorization.  
7. Removing an env does **not** delete remote or local git branches by itself.  
8. If already in a product worktree, `DEVENV_ROOT` is usually the sibling `worktrees-bjumper` clone.

## Composition (optional ideas — not prescriptions)

You may combine commands any way the task needs. Illustrative only:

- Inspect only → `list` / `logs`  
- Recreate after reboot → `start <env>`  
- New branch sandbox → `doctor` + `create …`  
- Backend API work → `--repos backend`  
- Cleanup → `remove … --yes`  

Deeper notes: `references/cli-contract.md`, `references/troubleshooting.md`,  
`references/usage-patterns.md`. Prompt snippets: `examples/prompts.md`.

## Workspace topology (map + navigation)

Where everything lives and how to navigate it organically — main repos, the
`worktrees/<env>/<repo>` layout, env siblings, doc locations per repo, and the
session-context caveat (uncommitted plan state does NOT travel between
checkouts): `references/workspace-topology.md`. Discovery primitives:
`git worktree list` · `ls "$(dirname "$(git rev-parse --show-toplevel)")"` ·
`ls <root>/worktrees/`.

## Keep in sync

If `devenv.py` flags or JSON keys change, update `references/cli-contract.md` and
root `AGENTS.md` in the same change.
