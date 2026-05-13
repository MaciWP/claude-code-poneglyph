<!-- Last verified: 2026-04-25 -->

# Performance & Navigation

## Tool Hierarchy

| Priority | Tool | Use |
|----------|------|-----|
| 1 | **LSP** | Semantic navigation (type-aware) |
| 2 | Grep | Text search (fallback) |
| 3 | Glob | File search |

Use Grep as fallback when: LSP unavailable, literal text search, non-code files.

## LSP Operations

| Task | LSP Operation |
|------|---------------|
| Where is X defined? | `goToDefinition` |
| Where is X used? | `findReferences` |
| What parameters does it accept? | `hover` |
| What functions does this file have? | `documentSymbol` |
| Who calls this function? | `incomingCalls` |
| What does this function call? | `outgoingCalls` |

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

**Anti-pattern**: Reading files one by one or running agents sequentially → BATCH in one message.

### Cascading Cancel — risk of batching

When a message contains N parallel tool-calls and **one fails**, the others in the same message are cancelled. To avoid losing work:

| Rule | Reason |
|-------|-------|
| Isolate fragile operations | Network (`WebFetch`, `git fetch`), FS write or `npm install` → own message. Their failure must not drag local Reads/Greps with them. |
| Parallel Edits only on disjoint paths | Never 2 `Edit` on the same file in the same message. |
| No parallel `Bash(cd <subdir>)` | `cwd` does not persist between Bash calls. Always use absolute paths. |
| If in doubt, sequential | Cost of an extra message < cost of reverting a cancelled batch. |

**Safe example**: `Read(a.ts) + Read(b.ts) + Grep("foo") + Glob("**/*.test.ts")` in one message — all read-only, independent, on different paths.

**Risky example**: `Edit(file.ts) + WebFetch(url) + Bash("git push")` in one message — if `WebFetch` fails, the `Edit` is cancelled and `git push` does not run. Better: 3 sequential messages.

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
