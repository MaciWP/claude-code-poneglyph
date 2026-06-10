# Project Onboard — analysis checklist + component-menu criteria

## Contents

- [Analysis](#analysis)
- [Menu criteria](#menu-criteria)
- [Evidence threshold table](#evidence-threshold-table)

## Analysis

Read-only pass over the repo. Sources of truth per dimension:

| Dimension | Primary sources | Notes |
|---|---|---|
| Stack | `package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `*.csproj`, `composer.json` | Lockfile presence pins the package manager (bun.lockb / pnpm-lock / poetry.lock…) |
| Test command | `scripts.test`, pytest/jest/vitest config files, `.github/workflows/*.yml` | CI is what actually gates — prefer it on divergence; cite file + line |
| Lint / typecheck / build | `scripts.*`, `tsconfig.json`, ruff/eslint/biome configs, Makefile, CI | Only commands Claude could NOT guess earn a CLAUDE.md line |
| Conventions | 2-3 representative source files per main dir; naming patterns; import style | Look for deviations from stack defaults — defaults don't need documenting |
| Domain boundaries | Top-level dirs with distinct vocabularies (`billing/`, `ingest/`, `apps/*`) | Each candidate boundary needs its OWN conventions to justify a path rule |
| Test reality | What the test files actually assert (business logic vs infra/helpers) | Drives the test-policy level proposal — evidence, not aspiration |
| Existing `.claude/` | Everything under it, plus root CLAUDE.md | Merge mode: build the delta list before proposing anything |
| External services | env.example, docker-compose, config files naming DBs/queues/trackers | MCP suggestions only — connector setup lives outside the repo |
| Commit conventions | `git log --oneline -20` | Conventional-commits style → note it in CLAUDE.md if enforced |

## Menu criteria

A component enters the proposal menu ONLY with concrete evidence behind it (cite the evidence in the menu's justification line):

| Component | Evidence threshold |
|---|---|
| CLAUDE.md | Always proposed — the floor. Content still passes the per-line test |
| test-policy.md | Always proposed — level argued from test reality (see below) |
| Verification wiring | Always proposed — verbatim command, or the honest no-tests note |
| Path rule | ≥1 boundary whose conventions DIFFER from the repo default (not just a big dir) |
| Project skill | Recurring domain knowledge a generic model gets wrong: bespoke query patterns, internal API contracts, domain gotchas seen in code comments/PRs. One skill per knowledge cluster, not per dir |
| Project command | A multi-step workflow repeated in scripts/CI/docs that the user runs often (deploy, fixture reset, codegen) |
| MCP suggestion | A concrete external service in configs (Postgres, Jira, GitHub Enterprise…) that Claude would benefit from querying |
| Project settings.json | A genuinely project-specific permission/hook need (e.g. allow a bespoke CLI) — rare; default is NO |

### test-policy level proposal

| Observed | Propose |
|---|---|
| Tests assert business outcomes (pricing, permissions, money, state machines) | `business-critical` |
| Mix of business assertions and infra/helper tests | `mixed` (declare which paths are which) |
| Tests only cover tooling/infra, or no tests | `auxiliary` (+ "no tests found — provisional" note when empty) |

## Evidence threshold table

Quick self-check before presenting the menu — every YES needs a citation:

- [ ] Every command in the proposal is verbatim from a file (path cited)?
- [ ] Every path rule maps to a boundary with DIFFERENT conventions?
- [ ] Every project skill names the knowledge cluster and where it was observed?
- [ ] Every MCP suggestion names the service and the config file that revealed it?
- [ ] CLAUDE.md draft ≤100 lines and every line passes "would removing this cause mistakes?"
