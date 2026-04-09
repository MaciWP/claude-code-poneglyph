---
description: Compares a specific pattern against expert sources
allowed-tools: Read, Grep, WebSearch, WebFetch
---

# /compare-pattern

Compares a specific pattern from the current code against documentation and successful repos.

## Usage

```
/compare-pattern <pattern-name> [file-path]

Examples:
/compare-pattern "error handling" src/services/
/compare-pattern "state management" src/stores/
/compare-pattern "validation" src/routes/
```

## Process

### 1. Identify Current Pattern

```
Grep "[pattern-name]" in [file-path or codebase]
Read relevant files
```

### 2. Load Reference

```
Read knowledge-base/[category]-patterns.md
```

### 3. Search Additional Sources (if needed)

```
WebSearch "github [pattern] typescript stars:>1000"
WebFetch [url of relevant repo]
```

### 4. Generate Comparison

| Source | Recommended Pattern | Match with Current |
|--------|--------------------|--------------------|
| Knowledge Base | [pattern] | [%] |
| [Repo Name] | [pattern] | [%] |
| Official Docs | [pattern] | [%] |

### 5. Output

```markdown
## Pattern Comparison: [pattern-name]

### Current Implementation
[current code found]

### Reference Implementations

#### From Knowledge Base
[documented pattern]

#### From [Repo Name] (Xk stars)
[pattern from repo]

### Recommendations
1. [specific recommendation with example]

### Confidence: [X]%
```

## Common Patterns to Compare

| Pattern | Keywords | Reference Repos |
|---------|----------|-----------------|
| Error handling | try/catch, Result | neverthrow, fp-ts |
| State management | useState, store | zustand, jotai |
| API routes | router, endpoint | tRPC, hono |
| Validation | schema, validate | zod, TypeBox |
| Authentication | auth, jwt, session | lucia, next-auth |
| Data fetching | fetch, query | tanstack-query |
