# Workspace topology — Bjumper repos, worktrees and docs (map + navigation)

Verified 2026-08-05. Env contents change — ALWAYS re-run the discovery commands
below instead of trusting this snapshot's env list.

## The map

Workspace root: `/Users/oriol/Desktop/Bjumper/REPOSITORIOS/PYTHON`

| What | Where | Notes |
|---|---|---|
| Main repos | `<root>/binora-backend` (Django) · `<root>/binora-frontend` (React/Vite) · `<root>/binora-contract` (OpenAPI contract) · `<root>/binora-mcp` · `<root>/bjumper-worktrees` (this CLI) | Plus legacy/side projects at the same level |
| Worktree envs | `<root>/worktrees/<env>/<repo>/` — e.g. `worktrees/jrv-1077/binora-frontend` | One env per ticket; an env holds SIBLING checkouts of the repos it needs (jrv-1077 and jrv-1081 carry backend+contract+frontend; jrv-1031 exists but is empty — stale env) |
| Infra dirs | `<root>/worktrees/_shared` · `<root>/worktrees/_proxy` | Managed by the CLI — inspect before assuming contents |
| Poneglyph (global AI layer) | `/Users/oriol/Desktop/Bjumper/PERSONAL/REPO/claude-code-poneglyph` | NOT under this root; `<root>/Poneglyph/` is an old copy, not the source of truth |

## Discovery protocol (runnable from anywhere)

**Where am I?**

```bash
git rev-parse --show-toplevel        # checkout root; path contains /worktrees/<env>/ → you are in a sandbox
git worktree list                    # from ANY checkout: main checkout + every worktree of this repo, with branches
```

**From a worktree → its env siblings** (same ticket, other repos):

```bash
ls "$(dirname "$(git rev-parse --show-toplevel)")"   # e.g. → binora-backend binora-contract binora-frontend
```

**From anywhere → all envs / env inventory with ports and status:**

```bash
ls /Users/oriol/Desktop/Bjumper/REPOSITORIOS/PYTHON/worktrees/
# richer (from the bjumper-worktrees clone): .venv/bin/python devenv.py list --json
```

**From a main repo → its worktrees:** `git worktree list` (same command, run there).

## Where the docs live

| Repo | Read for |
|---|---|
| `bjumper-worktrees` | `README.md` (tool overview) · `AGENTS.md` (agent instructions) · `recipes/` (per-repo provisioning) · `docs/` (delivery checklist) |
| `binora-backend` / `binora-frontend` | `CLAUDE.md` (project conventions) + full `.claude/` layer (skills, rules, commands like `/review-pr`) |
| `binora-contract` | `CLAUDE.md` + `.claude/core/` (different-generation layer: workflows, code-style, testing) |
| `binora-mcp` | `CLAUDE.md` only (minimal layer, 2026-05) |

## Session-context caveat (verified 2026-08-05)

- `.claude/` in the binora repos is git-TRACKED → it **travels into worktree
  checkouts** (a worktree session sees skills/rules/commands normally).
- What does NOT travel: **uncommitted plan state** — a `/flow` plan or `state.json`
  edit made in one checkout exists only there until committed. Before trusting
  plan state inside a worktree: `git status .claude/plans`.
- AI transcripts/history are keyed by cwd — a worktree session has its OWN
  history, separate from the main checkout's. The SessionStart open-plans
  reminder reads the CWD's `.claude/plans` (possibly stale in a worktree).
- Practical rule: run a ticket's `/flow` lifecycle inside ITS worktree and keep
  it there; don't split one lifecycle across main checkout and worktree.
