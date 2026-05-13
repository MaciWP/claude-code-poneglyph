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

### Cascading Cancel — riesgo del batching

Cuando un mensaje contiene N tool-calls paralelas y **una falla**, las demás del mismo mensaje se cancelan. Para evitar pérdida de trabajo:

| Regla | Razón |
|-------|-------|
| Operaciones frágiles aisladas | Network (`WebFetch`, `git fetch`), FS write o `npm install` → mensaje propio. Su fallo no debe arrastrar Reads/Greps locales. |
| Edits paralelos solo sobre paths disjuntos | Nunca 2 `Edit` al mismo archivo en el mismo mensaje. |
| Sin `Bash(cd <subdir>)` paralelo | `cwd` no persiste entre Bash calls. Usar siempre paths absolutos. |
| Si dudas, secuencial | Coste de un mensaje extra < coste de revertir un batch cancelado. |

**Ejemplo seguro**: `Read(a.ts) + Read(b.ts) + Grep("foo") + Glob("**/*.test.ts")` en un mensaje — todas read-only, independientes, sobre paths distintos.

**Ejemplo arriesgado**: `Edit(file.ts) + WebFetch(url) + Bash("git push")` en un mensaje — si `WebFetch` falla, el `Edit` se cancela y `git push` no se ejecuta. Mejor: 3 mensajes secuenciales.

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
