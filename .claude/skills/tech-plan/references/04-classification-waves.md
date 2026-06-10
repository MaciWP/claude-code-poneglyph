---
parent: tech-plan
name: classification-waves
description: Task Classification 🔵🟡🔴 + Parallelization rules + Parallel Efficiency Score.
---

# Task Classification + Parallelization — references/04

## Contents

- [Task Classification](#task-classification)
- [Parallelization Rules](#parallelization-rules)
- [Parallel Efficiency Score](#parallel-efficiency-score)
- [Seed Wave Patterns](#seed-wave-patterns)

## Task Classification

| Symbol | Type | Definition | Execution |
|--------|------|------------|-----------|
| 🔵 | **Independent** | No mutual dependencies | PARALLEL - same message |
| 🟡 | **Dependent** | Needs prior output | SEQUENTIAL - wait |
| 🔴 | **Blocking** | Human checkpoint/validation | PAUSE - approve before continuing |

### Classification Examples

| Task | Type | Reason |
|------|------|--------|
| Create types.ts + utils.ts | 🔵 | They do not reference each other |
| Create service that uses types | 🟡 | Needs types first |
| DB migration | 🔴 | Requires human approval |
| Deploy to production | 🔴 | Critical checkpoint |
| Test + Code review | 🔵 | Can run in parallel |

---

## Parallelization Rules

### PARALLEL (same message)

- Multiple independent `Read`, `Glob`, `Grep`
- Multiple `Write` to files WITHOUT dependency between them
- Multiple independent `Task` agents
- `WebSearch` + `WebFetch` simultaneously

### SEQUENTIAL (wait for result)

- `Edit` after `Read` of the same file
- `Task` agent that needs output from the previous one
- `Bash` that uses a newly created file
- Node marked 🔴 "Blocking"

### Syntax and Examples

| Type | Syntax | Example |
|------|--------|---------|
| 🔵 Parallel | `A + B + C` | `Read(a) + Read(b) + Grep(c)` |
| 🟡 Sequential | `A → WAIT → B` | `Read(file) → Edit(file)` |
| Background | `Task(..., background:true)` | `Task(Explore, background:true)` |

---

## Parallel Efficiency Score

Evaluate after each task:

| Score | Meaning | Action |
|-------|---------|--------|
| >80% | Excellent | Continue |
| 50-80% | Acceptable | Review opportunities |
| <50% | Poor | **STOP** - refactor approach |

**Calculation**: `(parallel operations) / (total that COULD be parallel) × 100`

---

## Seed Wave Patterns

> **Post-feature-008 mapping** — the named agents below (`builder`/`scout`/`reviewer`/`planner`) were **cut**. Read them as their current equivalents: `builder` → `build` skill (Phase 3, inline) or a Workflow impl unit; `scout` → `Explore` (Haiku built-in, read-only); `reviewer` → Phase 4 `critic` / review panel; `planner` → `tech-plan` skill. **Spawn rule**: 1-3 independent units run **inline** (never spawn); these patterns illustrate **≥4-unit** fan-outs → `Workflow`. The patterns themselves remain valid; only the names changed.

Starting templates for the first wave of common task shapes. Adapt the agent/skill mix to the specific task. Each pattern targets high `Parallel Efficiency Score` from wave 1.

### types-first parallel

**When**: task is "add feature X" with an obvious type/contract surface that downstream impl will consume.

**Wave 1 (PARALLEL)** — all three in one message:
- `builder` → generate types/interfaces for the feature (no logic).
- `builder` → generate test stubs / fixtures using the type names (will fail until impl lands).
- `scout` → locate existing patterns of similar features in the codebase (returns file list + conventions).

**Wave 2 (SEQ)**: `builder` implements the feature consuming wave-1 types and matching wave-1 scout patterns; runs against wave-1 stubs.

**Why it parallelizes**: types and stubs share a name contract but not content; scout is fully independent (read-only).

### scout-fan-out

**When**: task requires meaningful exploration across multiple subsystems before any code can be written (cross-cutting refactor, bug spanning multiple layers, integration work).

**Wave 1 (PARALLEL)** — 2-3 scouts in one message, each scoped to a different area:
- `scout` → area A (e.g., `auth/`): map symbols, callers, gotchas.
- `scout` → area B (e.g., `db/`): same.
- `scout` → area C (e.g., `api/`): same.

**Wave 2 (SEQ)**: `builder` receives the three scout reports as combined context; implements with full topology.

**Why it parallelizes**: scouts are read-only and independent. Avoids one scout having to traverse the whole repo serially.

### refactor-by-module

**When**: task is "refactor N independent modules" (rename, extract, modernize) where modules do not import each other.

**Wave 1 (PARALLEL)** — one `builder` per module in one message:
- `builder` → module A: apply refactor to files in A.
- `builder` → module B: apply refactor to files in B.
- `builder` → module C: apply refactor to files in C.

**Wave 2 (CHECKPOINT)**: `reviewer` validates all modules together (single review, multiple files).

**Why it parallelizes**: independent file sets, zero cross-imports → safe concurrent edits. Verify independence with `Grep` for cross-module imports before adopting this pattern.

> If wave 1 cannot be one of these three patterns, ask: is the task really blocked on a single sequential thing, or am I missing an axis to split on?
