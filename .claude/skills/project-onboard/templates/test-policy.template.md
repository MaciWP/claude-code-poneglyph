# Test Policy

Defines whether TDD-first decomposition applies when planning changes to this repo. Read by `tech-plan` (§0.1) and honored by the `build` skill per node.

## Levels

| Level | Meaning | Planner behavior |
|---|---|---|
| `business-critical` | Tests cover business logic; regressions cost real value | TDD-first MANDATORY: test node before impl node. Skip requires explicit `tdd-skip: <reason ≥10 chars>` |
| `mixed` | Both business and auxiliary tests | Per-file: business paths → TDD-first; auxiliary → optional. Planner declares rationale per node |
| `auxiliary` | Tests are infra/helpers; no business logic | TDD-first OPTIONAL. Tests run post-impl as verification. Nodes can opt in with `tdd: forced` |

## Project declaration

This project's policy: **`{{LEVEL}}`**.

Evidence (project-onboard analysis {{DATE}}): {{EVIDENCE — what the tests actually cover, citing test dirs/files; or "no tests found — level provisional"}}.

{{IF_MIXED: Business paths: {{BUSINESS_PATHS}}. Auxiliary paths: {{AUX_PATHS}}.}}

## Override in plan

- `tdd: forced` — force test-first on a node despite a softer policy.
- `tdd-skip: <reason ≥10 chars>` — skip TDD-first on a node despite `business-critical`; reason must be concrete.
