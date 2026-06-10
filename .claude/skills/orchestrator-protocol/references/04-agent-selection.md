---
parent: orchestrator-protocol
name: agent-selection
description: Signal→agent selection matrix, multi-agent patterns, anti-patterns.
---

# Agent Selection

> **Delegation doctrine** (inline-first; agents = parallel READ-ONLY fan-out; write fan-out = explicit opt-in; the 3 costs): canonical in `SKILL.md` §Delegation doctrine + P8. This file selects WHICH primitive once fan-out is already justified by the tree.

## Exploration Decision Matrix (Volume × Complexity)

Before any exploration, decide HOW to read the codebase. **The exploration primitive is `Explore`** (built-in, Haiku, fast & cheap, empirical score 83). The custom `scout` agent was **cut in feature 008** — deeper single-unit synthesis runs inline (Lead `Read`/LSP); ≥4 independent exploration sweeps fan out via `Workflow`.

| | LOW complexity (direct read, no semantics) | HIGH complexity (relationships, LSP, architecture) |
|---|---|---|
| **LOW volume** (1-2 files) | Lead `Read` directly — no delegation | Lead `Read`/LSP inline, or `Explore` |
| **HIGH volume** (≥3 files) | `Explore` — best fit | `Explore`; ≥4 independent sweeps → `Workflow` |

Plus: design-doc audits, cross-file consistency checks, and full-file reads → `Explore` (≥4 independent units → `Workflow`). WebSearch/WebFetch is **not** a discriminator (both have those tools).

### Derived rules

| Rule | Reason |
|-------|-------|
| The Lead reads 1-2 files inline | For bulk read-only exploration, use `Explore` (not a work-spawn). |
| LOW Volume + LOW Complexity = direct Read | Cost of delegation > cost of direct Read. |
| Exploration primitive = `Explore` (Haiku) | Empirical score 83; the custom `scout` was cut in feature 008. |
| Deeper synthesis past Explore's window | Runs inline (Lead `Read`/LSP); ≥4 independent sweeps → `Workflow`. |
| Parallel axis: "change difficulty" | If after exploring you must implement a difficult change, invoke `tech-plan` skill (independent of the exploration axis). |

### Parallel axis — Change difficulty

The matrix above decides **exploration**. The difficulty of the **change that follows** is an independent axis:

| Change | Action after exploration |
|--------|-------------------------|
| Trivial (1 line, rename) | Lead inline |
| Standard (1 file, clear pattern) | Lead inline (`Skill('build')` in a /flow) |
| Multi-file / architectural (one unit) | Lead inline (`Skill('tech-plan')` first if complexity >60); ≥4 independent HUs → `Workflow` |

A task can be **HIGH Volume exploration + trivial change** (lots to read, little to change) or **LOW Volume + complex change** (little to read, lots to think). Decide each axis separately.

---

## Selection Matrix

The "Suggested skills to Read (for delegation)" column lists `.claude/skills/<name>/SKILL.md` paths the Lead should include in the delegation prompt's `[RELEVANT SKILLS FOR THIS TASK]` block (Arch H). Max 3 per delegation. Pick the ones whose paths actually match the task context; skip the column if none apply. **Domain-specific skills (Django, React, OpenAPI, etc.) now live as project skills** under each repo's `./.claude/skills/` — check the project's path rules or skill conventions to discover them. The global skills listed below are cross-project patterns only.

| Signal | Execution | Skill/Mode | Suggested skills to Read (Arch H) | Fallback |
|--------|-----------|------------|-------------------------------------------|----------|
| implement, create, fix, build | inline ALWAYS (`Skill('build')` in /flow) — write fan-out solo con opt-in explícito del usuario | (by prompt) | (match domain via skill-matching) | — |
| refactor, extract, simplify, restructure | inline | review-patterns | review-patterns | — |
| merge conflict, git conflict | inline | (prompt context) | — | — |
| docs, sync, documentation | inline | (doc task) | — | — |
| bug documentation, knowledge base | inline | diagnostic-patterns | diagnostic-patterns | — |
| review, validate, check (generic) | `Skill('critic')` inline; robust → panel ≥4 via `Workflow` | standard mode | review-patterns | — |
| security, audit, vulnerability, owasp | `Skill('critic')` + `Skill('security-review')` | security-review | security-review | — |
| code quality, smells, SOLID, complexity | `Skill('critic')` / review-patterns (quality) | review-patterns (quality mode) | review-patterns | — |
| performance, slow, bottleneck, N+1 | `Skill('critic')` / review-patterns (performance) | review-patterns (performance mode) | review-patterns | — |
| plan, design, decompose, RFC, architecture, contract | Lead via `Skill('tech-plan')` | (no dedicated agent) | decision-stress-test (for design risk), review-patterns | — |
| >3 subtasks, breakdown, dependencies | Lead via `Skill('tech-plan')` | (decomposition in skill) | — | — |
| find, explore, search codebase | `Explore` (built-in); ≥4 sweeps → `Workflow` | — | — | Lead `Read` inline |
| error, failing, debug, diagnose | Lead via `Skill('diagnostic-patterns')` | (no dedicated agent) | diagnostic-patterns | fix inline (obvious fix) |

## Multi-Agent Patterns

| Pattern | Execution | When |
|---------|-----------|------|
| **Explore then Build** | `Explore` (read) → inline build | exploration provides context, Lead implements inline |
| **Plan then Build** | Lead `Skill('tech-plan')` → inline build (sequential; write fan-out = opt-in) | complexity >60 |
| **Build then Review** | inline build → `Skill('critic')` | mandatory for multi-file changes |
| **Diagnose then Fix** | Lead `Skill('diagnostic-patterns')` → fix inline | diagnosis before fix |
| **Worktree Parallel** | ≥4 `Workflow` WRITE units with `isolation: 'worktree'` — explicit user opt-in only | user opted in (ultracode) AND files may overlap |
| **Security Review** | `Skill('critic')` + `Skill('security-review')` | auth/security changes |
| **Tiered Build** | Lead `Skill('tech-plan')` Mode B contracts → inline sequential | complexity 45-60, 2-3 domains with shared interfaces |
| **Team Parallel** | Team mode (experimental) | 3+ independent domains negotiating interfaces, complexity >60 |

### Workflow wiring

How the capabilities of the custom agents (cut in feature 008) map onto the current model, and where `Workflow` fan-out is the right primitive:

| Capability (historical agent) | Now | Fan-out trigger |
|---|---|---|
| implement (was `builder`) | `build` skill inline — ALL write work, any HU count | write fan-out ONLY with explicit user opt-in (ultracode) → `Workflow` + per-unit `isolation: 'worktree'` on file overlap |
| validate (was `reviewer`) | `critic` skill inline | robust / critical area → **independent review panel ≥4** via `Workflow` (read-only lenses; ≥majority must confirm) |
| explore (was `scout`) | `Explore` (built-in, Haiku) | ≥4 independent exploration sweeps → `Workflow` (read-only) |
| generator→validator | `pipeline(items, find, verify)` inside one `Workflow` | intra-workflow Four-Eyes — NOT a new spawn decision (spawn-tree P7) |

The **panel ≥4** pattern is what replaces the cut `reviewer` for high-stakes review (lesson from feature 002: author ≠ evaluator). `critic` references this section as its dispatch target. Worked example: `.claude/workflows/ultracode-audit.js` (find→verify pipeline + cross-debate panel over a shared digest).

## Parallelization & Batch Operations

When delegating or reading, decide PARALLEL vs SEQUENTIAL per call, not per session. Parallelize everything independent; sequence only on real dependency.

### Parallel vs Sequential

| Parallel (same message) | Sequential (wait for result) |
|-------------------------|------------------------------|
| 3+ independent Reads | Edit after Read on the same file |
| 2+ different Glob patterns | Write that depends on Read |
| 2+ independent Agent spawns | Agent that needs prior agent's output |
| Multiple LSP queries on different symbols | LSP query after creating a file |
| LSP + Grep for comprehensive search | Bash on a newly-created file |
| WebSearch + WebFetch (read-only fetches) | Any tool consuming previous output |

**Anti-pattern**: reading files one by one or spawning agents sequentially when independent → batch in one message.

### Cascading Cancel — the parallelization risk

When a message contains N parallel tool-calls and **one fails**, the others in the same message are cancelled. To avoid losing batch work:

| Rule | Reason |
|------|--------|
| Isolate fragile operations | Network calls (`WebFetch`, `git fetch`), filesystem writes, or `npm install` go in their OWN message. Their failure must not drag local Reads/Greps with them. |
| Parallel Edits only on disjoint paths | Never 2 `Edit` on the same file in the same message. |
| No parallel `Bash(cd <subdir>)` | `cwd` does not persist between Bash calls. Always use absolute paths. |
| When in doubt, sequential | Cost of an extra message < cost of reverting a cancelled batch. |

**Safe example**: `Read(a.ts) + Read(b.ts) + Grep("foo") + Glob("**/*.test.ts")` in one message — read-only, independent, disjoint paths.

**Risky example**: `Edit(file.ts) + WebFetch(url) + Bash("git push")` — if `WebFetch` fails, the `Edit` is cancelled and `git push` does not run. Split into 3 sequential messages.

### LSP — semantic over text

| Task | LSP operation | Fallback |
|------|--------------|----------|
| Where is X defined? | `goToDefinition` | Grep declaration |
| Where is X used? | `findReferences` | Grep usages |
| What parameters does X accept? | `hover` | Read signature |
| What functions does file F have? | `documentSymbol` | Read + skim |
| Who calls function F? | `incomingCalls` | Grep + verify |
| What does function F call? | `outgoingCalls` | Read body |

Full LSP reference: skill `lsp-operations`.

---

## Anti-Patterns

| Anti-Pattern | Problem | Use Instead |
|--------------|---------|-------------|
| Spawning an agent for exploration | misses context, wastes tokens | `Explore` (read) or Lead `Read` inline |
| tech-plan skill for complexity <30 | overkill, slows execution | act inline |
| skipping `critic` after multi-file changes | quality risk | `Skill('critic')` checkpoint |
| no tech-plan for >60 complexity | uncoordinated, error-prone | Lead `Skill('tech-plan')` → inline (≥4 HUs → `Workflow`) |
| ≥4 `Workflow` units without worktree on overlapping files | Write conflicts | `isolation: "worktree"` per unit |
| team mode for <3 domains | 3-7x cost with no real benefit | inline, or `Workflow` at ≥4 independent units |
| team mode for dependent domains | file conflicts between teammates | sequential inline / a `Workflow` |
| Reading files one by one | Latency + context overhead | Batch 3+ Reads in one message |
| Sequential agents with no dependency | Wasted parallelism | Spawn in one message |
| Glob → Read → Grep when Glob+Grep would suffice | Round-trips add up | Glob + Grep in same message |
| Edit without prior Read | risk of stale content | Read first, then Edit sequentially |
| Spawning 1-3 subagents when the Lead could act inline | wasted cost+latency, no parallelism return | Main session for ≤3 units; spawn only at ≥4 (Commandment VII) |
| ≥4 parallel agents run ad-hoc instead of a workflow | no orchestration, hard to track | At ≥4 independent units → workflow |
