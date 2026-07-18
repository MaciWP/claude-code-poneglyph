# Usage patterns (optional, non-binding)

These are **examples of how people use the tool**, not required sequences.
Pick or invent what the task needs.

## Pattern A — Inventory

```bash
.venv/bin/python devenv.py list --json
.venv/bin/python devenv.py logs <env>
```

When: “what’s running?”, “which port?”, “show me logs”.

## Pattern B — Pause / resume

```bash
.venv/bin/python devenv.py stop <env>
.venv/bin/python devenv.py start <env> --json
```

When: reboot, free RAM, return to an existing sandbox.

## Pattern C — New sandbox

```bash
.venv/bin/python devenv.py doctor --repos backend
.venv/bin/python devenv.py create <env> \
  --repos backend \
  --branch devenv/<env> --new --yes --json
```

When: need isolation for a feature/branch.  
`--repos backend` alone is valid (and faster) if frontend is unused.  
Full stack: `--repos backend,frontend` + `doctor --repos backend,frontend`.

## Pattern C2 — Existing free branch (no --new)

```bash
# Branch must already exist and NOT be checked out on main or another worktree
.venv/bin/python devenv.py create <env> \
  --repos backend --branch feature/JRV-123 --yes --json
```

When: branch already created on remote/local and free. If git says “already used”,
switch to `--new` or free the owning worktree.

## Pattern D — Work inside a sandbox

Use paths from `create`/`list` JSON (`worktrees.*`, `ports.*`).  
Product test/lint commands come from the **product** repo, not from devenv.

## Pattern E — Tear down

```bash
.venv/bin/python devenv.py remove <env> --yes
```

Branches remain. Delete branches only if someone asks.

## Pattern F — Offline tool health (no Docker create)

From the worktrees-bjumper clone:

```bash
./scripts/smoke_offline.sh
# equivalent:
#   pytest tests/ -q
#   devenv.py doctor    # exit 0 or 2 both OK for the script
#   devenv.py list --json
```

When: “is the tool still green after a refactor?”  
Does **not** prove a full sandbox create works.

## Pattern G — Manual runtime smoke (backend-only)

Use after changing recipes / seed / compose wiring. **Manual**, not CI.

```bash
cd "$DEVENV_ROOT"
.venv/bin/python devenv.py doctor
.venv/bin/python devenv.py create smoke-b \
  --repos backend \
  --branch feature/smoke-b --new --yes --json
# Expect: ok true (or health django_main + login_main in summary)
# Warnings may include product_models fixture — often benign
.venv/bin/python devenv.py list --json
.venv/bin/python devenv.py remove smoke-b --yes
# Optional: delete local branch feature/smoke-b in binora-backend
```

Check: `runserver_main.log` / `seed_*.log` under the worktree if something fails.

## Anti-patterns

| Avoid | Why |
|---|---|
| Blind re-create on any error | Masks root cause; wastes minutes |
| `--force-dirty` by default | Can destroy uncommitted work |
| Editing main checkout “because sandbox exists” | Defeats isolation if unintentional |
| Assuming template DB | Not built yet (PENDING) |
