# Test Policy

Defines whether TDD-first decomposition applies when planning changes to this repo. Read by `tech-plan` (§0.1) and honored by the `build` skill per node.

## Levels

| Level | Meaning | Planner behavior |
|---|---|---|
| `business-critical` | Tests cover business logic; regressions cost real value | TDD-first MANDATORY: test node before impl node in DAG. Skip requires explicit `tdd-skip: <reason ≥10 chars>` on the node |
| `mixed` | Repo has both business and auxiliary tests | Per-file: changes under business paths → TDD-first; auxiliary paths → optional. Planner declares the rationale per node |
| `auxiliary` | Tests are infrastructure/hooks/helpers; no business logic | TDD-first OPTIONAL. Tests run post-impl as verification (status quo). Individual nodes can opt in with `tdd: forced` |

## Project declaration

This project's policy: **`auxiliary`**.

Reason: poneglyph is a meta-system (orchestration config); tests in `.claude/hooks/__tests__/` cover security gates and validators, not business logic. Mandatory TDD would generate ceremony without proportional value.

## Override in plan

A plan node may override the project policy when local context demands it:

- `tdd: forced` — force test-first on this node despite `auxiliary` policy. Use when adding a new hook with non-trivial logic that warrants a red→green discipline.
- `tdd-skip: <reason>` — skip TDD-first on this node despite `business-critical` policy. Reason must be concrete (≥10 chars) and explain why test-first is not appropriate:
  - `tdd-skip: doc-only change, no testable behavior`
  - `tdd-skip: exploratory spike before contract is stable`
  - `tdd-skip: config tweak, validated by existing integration tests`

## Why this exists

Goal: atomize tasks and clarify scope by forcing the planner to articulate expected behavior (the test) before implementation. The escape hatch keeps the rule honest — when test-first is ceremony, document why and move on. Without the escape, a uniform rule across all projects breaks pragmatism (proven by 0% business-test ratio in poneglyph itself).

## Related

- `.claude/skills/tech-plan/SKILL.md` §0.1 — applicability check
- `.claude/skills/tech-plan/references/06-quality-gates.md` — TDD-mode quality gates
- `.claude/skills/build/SKILL.md` — TDD-mode handling (red→green); absorbed from the cut `builder` agent (feature 008)
- `CLAUDE.md` Mental model phases 2/3 + "Test policy (this repo)" section
