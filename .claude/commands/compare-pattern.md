---
description: Compara un patron especifico con fuentes de expertos
allowed-tools: Read, Grep, WebSearch, WebFetch
---

# /compare-pattern

Compara un patron especifico del codigo actual con documentacion y repos exitosos.

## Uso

```
/compare-pattern <pattern-name> [file-path]

Ejemplos:
/compare-pattern "error handling" src/services/
/compare-pattern "state management" src/stores/
/compare-pattern "validation" src/routes/
```

## Proceso

### 1. Identificar Patron Actual

```
Grep "[pattern-name]" en [file-path o codebase]
Read archivos relevantes
```

### 2. Cargar Referencia

```
Read knowledge-base/[categoria]-patterns.md
```

### 3. Buscar Fuentes Adicionales (si necesario)

```
WebSearch "github [pattern] typescript stars:>1000"
WebFetch [url de repo relevante]
```

### 4. Generar Comparacion

| Fuente | Patron Recomendado | Match con Actual |
|--------|-------------------|------------------|
| Knowledge Base | [patron] | [%] |
| [Repo Name] | [patron] | [%] |
| Official Docs | [patron] | [%] |

### 5. Output

```markdown
## Pattern Comparison: [pattern-name]

### Current Implementation
[codigo actual encontrado]

### Reference Implementations

#### From Knowledge Base
[patron documentado]

#### From [Repo Name] (Xk stars)
[patron del repo]

### Recommendations
1. [recomendacion especifica con ejemplo]

### Confidence: [X]%
```

## Patrones Comunes para Comparar

| Patron | Keywords | Repos de Referencia |
|--------|----------|---------------------|
| Error handling | try/catch, Result | neverthrow, fp-ts |
| State management | useState, store | zustand, jotai |
| API routes | router, endpoint | tRPC, hono |
| Validation | schema, validate | zod, TypeBox |
| Authentication | auth, jwt, session | lucia, next-auth |
| Data fetching | fetch, query | tanstack-query |
