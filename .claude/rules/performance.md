# Performance & Navigation

## Tool Hierarchy (Single Source of Truth)

| Priority | Tool | Use |
|----------|------|-----|
| 1 | **LSP** | Semantic navigation (type-aware) |
| 2 | Grep | Text search (fallback) |
| 3 | Glob | File search |

## LSP Operations

| Task | LSP Operation |
|------|---------------|
| Where is X defined? | `goToDefinition` |
| Where is X used? | `findReferences` |
| What parameters does it accept? | `hover` |
| What functions does this file have? | `documentSymbol` |
| Who calls this function? | `incomingCalls` |
| What does this function call? | `outgoingCalls` |

Use Grep as fallback when: LSP unavailable, literal text search, non-code files.

## Batch Operations (MANDATORY)

| Parallel (same message) | Sequential (wait for result) |
|-------------------------|------------------------------|
| 3+ independent Reads | Edit after Read on the same file |
| 2+ different Glob patterns | Write that depends on Read |
| 2+ independent Task agents | Task that needs prior output |
| Multiple LSP on different symbols | LSP after creating a file |
| LSP + Grep for comprehensive search | Bash with a newly created file |
| goToDefinition + findReferences | Node marked "Blocking" |
| WebSearch + WebFetch | |

**Anti-pattern**: If you read files one by one or run agents sequentially -> BATCH in one message.

## Anti-Patterns

| Don't do | Do instead |
|----------|------------|
| Read files one by one | Batch 3+ Reads in one message |
| Sequential Task agents with no dependency | Launch agents in parallel |
| Glob -> Read -> Grep | Glob + Grep in parallel |
| Edit without prior Read | Read -> Edit sequentially |

## Quality Triggers

| Agent | When |
|-------|------|
| reviewer | After implementing, refactoring, before committing, significant changes |

## Effort Distribution Tips

- Spend enough time exploring BEFORE implementing — understanding context avoids rework
- Verification (tests, review) is not optional — reserve time for it
- If you have been implementing for a long time without verifying, it is time for a checkpoint

## Tip: Maximize Parallelism

- If you are doing sequential operations that could be parallel, regroup them
- Ask yourself: "Does any of these operations depend on the result of another?" If not, batch.
- The goal is to minimize unnecessary round-trips, not to optimize a numeric score

## Team Mode Efficiency

> **GUIDELINE**: These metrics are guidelines for the Lead when the planner recommends team mode.

| Metric | Guideline |
|--------|-----------|
| Min teammates | 3 (below that, subagents are cheaper) |
| Max teammates | 5 (above that, coordination overhead dominates) |
| Token multiplier | 3-7x vs subagents (each teammate is a full Claude Code instance) |
| When it's worth it | Truly independent domains, complexity >60, interface negotiation needed |
| When it's NOT worth it | <3 domains, shared files, complexity <60 |

### Team vs Subagents Cost

| Mode | Cost | Parallelism | Inter-agent communication |
|------|------|-------------|---------------------------|
| Subagents | 1x (baseline) | Via Lead (hub-spoke) | No (Lead <-> agent only) |
| Team Agents | 3-7x | Independent (mesh) | Yes (peer-to-peer direct) |

## Tip: Avoid Redundant Reads

- Do not re-read a file you just read that has not changed
- Do not re-search with Grep for something you already found
- If an LSP result is recent and the file has not changed, reuse it

## Tool Selection

| Task | Primary Tool | Fallback |
|------|--------------|----------|
| Symbol definition | LSP goToDefinition | Grep |
| Symbol usages | LSP findReferences | Grep |
| Find file | Glob | Bash find |
| Find text | Grep | Bash grep |
| Read file | Read | Bash cat |
| Edit file | Edit | Bash sed |

## Tools by Complexity

| Trigger | Tool/Agent |
|---------|------------|
| >3 subtasks or complexity >60 | planner |
| Vague prompt | AskUserQuestion to clarify |
| Feature design | architect |
| Pre-implementation | scout |
