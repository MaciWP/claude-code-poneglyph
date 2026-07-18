# Troubleshooting

## Where to look

| Source | Content |
|---|---|
| `$DEVENV_ROOT/devenv_errors.log` | Failed step tails |
| `devenv.py logs <env>` | Per-service logs in worktrees |
| `runserver_*.log` / `seed_*.log` / `vite_*.log` | Under each worktree |

## Common symptoms

| Symptom | Likely cause | Levers |
|---|---|---|
| doctor exit 2 | Docker / tool / `.env` | Fix listed check |
| port already allocated | Another env or process | `list`, `docker ps`, stop other env |
| branch already used by worktree | Git: one worktree per branch | Error names owner path; use `--new`, free branch, or free that worktree |
| remove incomplete / exit 1 | docker down or residuals | Registry **kept** — follow Recovery line; re-run `remove --yes` |
| remove: directory not empty | Residual artifacts | re-run remove; manual cleanup only with human OK |
| product_models / slot_count | Product fixture drift | Often benign if health ok |
| login_tenant fails | main down / seed incomplete | `logs`, `start`, seed logs |

No mandatory recovery script — choose based on the failure.
