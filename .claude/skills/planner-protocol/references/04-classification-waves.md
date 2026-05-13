---
parent: planner-protocol
name: classification-waves
description: Task Classification 🔵🟡🔴 + Parallelization rules + Parallel Efficiency Score.
---

# Task Classification + Parallelization — references/04

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
| Background | `Task(..., background:true)` | `Task(reviewer, background:true)` |

---

## Parallel Efficiency Score

Evaluate after each task:

| Score | Meaning | Action |
|-------|---------|--------|
| >80% | Excellent | Continue |
| 50-80% | Acceptable | Review opportunities |
| <50% | Poor | **STOP** - refactor approach |

**Calculation**: `(parallel operations) / (total that COULD be parallel) × 100`
