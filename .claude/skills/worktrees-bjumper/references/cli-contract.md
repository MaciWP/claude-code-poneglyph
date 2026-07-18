# CLI contract (source of truth: `devenv.py`)

Descriptive reference — not a workflow.

## Commands

| Command | Mutating | Useful flags |
|---|---|---|
| `create <env> --repos … --branch …` | yes | `--new`, `--yes`, `--json` |
| `remove <env>` | yes | `--yes`, `--force-dirty` |
| `start <env>` / `stop <env>` | yes | `--json` |
| `list` | no | `--json` |
| `logs <env>` | no | `--follow` |
| `doctor` | no | exit 2 on critical fail |

## Create JSON (stdout when `--json`)

```json
{
  "contract_version": 1,
  "env": "my-feature",
  "index": 1,
  "branch": "feature/JRV-123",
  "repos": ["backend", "frontend"],
  "ports": {
    "django_main": 20010,
    "django_tenant": 20011,
    "db": 20012,
    "mailcatcher_smtp": 20013,
    "mailcatcher_web": 20014,
    "pgweb": 20015,
    "localstack": 20016,
    "vite_main": 20017,
    "vite_tenant": 20018
  },
  "worktrees": {
    "backend": "/…/worktrees/my-feature/binora-backend",
    "frontend": "/…/worktrees/my-feature/binora-frontend"
  },
  "warnings": [{"step": "…", "detail": "…", "log": "devenv_errors.log"}],
  "ok": true
}
```

`warnings` entries are non-fatal (`step`, `detail`, `log`). Create resets the
warning list at start so prior runs in the same process do not leak.

Typed shapes (for agents/tools): `engine.contracts.CreateResult`, `WarningItem`.

- Port formula: `20000 + index * 10 + offset` (block size 10).  
- Backend offsets 0–6; frontend 7–8.  
- Offset name collision across recipes aborts create.

## Failure JSON

Often includes `env`, `ok: false`, `error`. Preflight may add `failed: […]` and exit **2**.

## Environment variables

| Var | Default |
|---|---|
| `DEVENV_REPOS_DIR` | parent of tool root |
| `DEVENV_WORKTREES_DIR` | `$DEVENV_REPOS_DIR/worktrees` |
