---
parent: orchestrator-protocol
name: agent-selection
description: Signal→agent selection matrix, multi-agent patterns, anti-patterns.
---

# Agent Selection

## Exploration Decision Matrix (Volume × Complexity)

Before any delegation, decide HOW to explore the codebase. **Default agent: `Explore`** (built-in, Haiku, fast & cheap, empirical score 83). `scout` (Sonnet, score 60, ~5× cost) is the fallback for cases Explore cannot serve well — cross-file synthesis, design-doc auditing, open-ended analysis, or reads that need full file content past Explore's read window.

| | LOW complexity (direct read, no semantics) | HIGH complexity (relationships, LSP, architecture) |
|---|---|---|
| **LOW volume** (1-2 files) | Lead `Read` directly — no delegation | `Explore` (default); `scout` only if full-file synthesis is needed |
| **HIGH volume** (≥3 files) | `Explore` — best fit | `scout` (Sonnet) — cross-file synthesis / open-ended analysis |

Plus: design-doc audits, cross-file consistency checks, and full-file reads past Explore's window always go to `scout`. WebSearch/WebFetch is **not** a discriminator (both agents have those tools).

### Derived rules

| Rule | Reason |
|-------|-------|
| The Lead never reads >2 files inline | For >2 files, delegate (Trigger B context preservation). |
| LOW Volume + LOW Complexity = direct Read | Cost of delegation > cost of direct Read. |
| Default exploration = `Explore` (Haiku) | Empirical score 83, ~5× cheaper than scout. |
| `scout` only for HIGH+HIGH or Explore-limited cases | Open-ended analysis, cross-file synthesis, full-file reads past Explore's window. |
| Parallel axis: "change difficulty" | If after exploring you must implement a difficult change, plan with `planner` (independent of the exploration axis). |

### Parallel axis — Change difficulty

The matrix above decides **exploration**. The difficulty of the **change that follows** is an independent axis:

| Change | Action after exploration |
|--------|-------------------------|
| Trivial (1 line, rename) | builder direct |
| Standard (1 file, clear pattern) | builder with loaded skills |
| Multi-file / architectural | planner → N builders |

A task can be **HIGH Volume exploration + trivial change** (lots to read, little to change) or **LOW Volume + complex change** (little to read, lots to think). Decide each axis separately.

---

## Selection Matrix

The "Suggested skills to Read (for delegation)" column lists `.claude/skills/<name>/SKILL.md` paths the Lead should include in the delegation prompt's `[RELEVANT SKILLS FOR THIS TASK]` block (Arch H). Max 3 per delegation. Pick the ones whose paths actually match the task context; skip the column if none apply. **Domain-specific skills (Django, React, OpenAPI, etc.) now live as project skills** under each repo's `./.claude/skills/` — check the project's `skill-matching.md` rule to discover them. The global skills listed below are cross-project patterns only.

| Signal | Agent | Skill/Mode | Suggested skills to Read (for delegation) | Fallback |
|--------|-------|------------|-------------------------------------------|----------|
| implement, create, fix, build | builder | (by prompt) | (match domain via skill-matching) | — |
| refactor, extract, simplify, restructure | builder | review-patterns | review-patterns | — |
| merge conflict, git conflict | builder | (prompt context) | — | — |
| docs, sync, documentation | builder | (doc task) | — | — |
| bug documentation, knowledge base | builder | diagnostic-patterns | diagnostic-patterns | — |
| review, validate, check (generic) | reviewer | standard mode | review-patterns | — |
| security, audit, vulnerability, owasp | reviewer | security-review | security-review | — |
| code quality, smells, SOLID, complexity | reviewer | review-patterns (quality mode) | review-patterns | — |
| performance, slow, bottleneck, N+1 | reviewer | review-patterns (performance mode) | review-patterns | — |
| plan, design, decompose, workflow, RFC, architecture, contract | planner | (Mode A or B) | decision-stress-test (for design risk), review-patterns | — |
| >3 subtasks, breakdown, dependencies | planner | (decomposition built-in) | — | — |
| find, explore, search codebase | scout | — | — | Explore agent |
| error, failing, debug, diagnose | error-analyzer | diagnostic-patterns | diagnostic-patterns | builder (obvious fix) |

## Multi-Agent Patterns

| Pattern | Agents | When |
|---------|--------|------|
| **Explore then Build** | scout + builder | scout provides context, builder implements |
| **Plan then Build** | planner → N builders parallel | complexity >60 |
| **Build then Review** | builder → reviewer | mandatory for multi-file changes |
| **Error then Fix** | error-analyzer → builder | diagnosis before fix |
| **Worktree Parallel** | 2+ builders in worktrees | parallel builders with file overlap potential |
| **Security Review** | reviewer (security mode, model: opus) | auth/security changes |
| **Tiered Build** | planner (Mode B contracts) + N builders + reviewer | complexity 45-60, 2-3 domains with shared interfaces |
| **Team Parallel** | teammates (general-purpose) | executionMode=team, 3+ independent domains, complexity >60 |

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
| builder for exploration | misses context, wastes tokens | scout |
| planner for complexity <30 | overkill, slows execution | builder direct |
| skipping reviewer after multi-file changes | quality risk | reviewer checkpoint |
| single builder for >60 complexity without planner | uncoordinated, error-prone | planner → N builders |
| 2+ builders in parallel without worktree on overlapping files | Write conflicts | Activate `isolation: "worktree"` |
| team mode for <3 domains | 3-7x cost with no real benefit | parallel builders in worktrees |
| team mode for dependent domains | file conflicts between teammates | sequential subagents |
| Reading files one by one | Latency + context overhead | Batch 3+ Reads in one message |
| Sequential agents with no dependency | Wasted parallelism | Spawn in one message |
| Glob → Read → Grep when Glob+Grep would suffice | Round-trips add up | Glob + Grep in same message |
| Edit without prior Read | check-staleness hook blocks; risk of stale content | Read first, then Edit sequentially |
