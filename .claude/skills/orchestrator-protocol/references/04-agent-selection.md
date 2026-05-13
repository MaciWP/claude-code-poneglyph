---
parent: orchestrator-protocol
name: agent-selection
description: Signal→agent selection matrix, multi-agent patterns, anti-patterns.
---

# Agent Selection

## Exploration Decision Matrix (Volume × Complexity)

Before any delegation, decide HOW to explore the codebase. The choice depends on **volume** (how many files) and **complexity** (how difficult it is to understand what you see):

| | LOW complexity (direct read, no semantics) | HIGH complexity (relationships, LSP, architecture) |
|---|---|---|
| **LOW volume** (1-2 files) | Lead `Read` directly — no delegation | `scout` (Sonnet) — light semantic analysis |
| **HIGH volume** (≥3 files) | `Explore` (Haiku) — cheap bulk read | `scout` (Sonnet) — exploration + LSP + synthesis |

### Derived rules

| Rule | Reason |
|-------|-------|
| The Lead never reads >2 files inline | For >2 files, delegate (Trigger B context preservation). |
| LOW Volume + LOW Complexity = direct Read | Cost of delegation > cost of direct Read. |
| HIGH Complexity always goes to scout | Even for 1 file, if it requires LSP/analysis, scout (Sonnet) is the right choice. |
| HIGH Volume + LOW Complexity = Haiku | If it is bulk read without deep reasoning, cheap model. |
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
| refactor, extract, simplify, restructure | builder | code-quality | code-quality | — |
| merge conflict, git conflict | builder | (prompt context) | — | — |
| docs, sync, documentation | builder | (doc task) | — | — |
| bug documentation, knowledge base | builder | diagnostic-patterns | diagnostic-patterns | — |
| review, validate, check (generic) | reviewer | standard mode | code-quality | — |
| security, audit, vulnerability, owasp | reviewer | security-review | security-review | — |
| code quality, smells, SOLID, complexity | reviewer | code-quality | code-quality | — |
| performance, slow, bottleneck, N+1 | reviewer | performance-review | performance-review | — |
| plan, design, decompose, workflow | planner | — | — | architect |
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
| **Tiered Build** | architect + N builders + reviewer | complexity 45-60, 2-3 domains with shared interfaces |
| **Team Parallel** | teammates (general-purpose) | executionMode=team, 3+ independent domains, complexity >60 |

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
