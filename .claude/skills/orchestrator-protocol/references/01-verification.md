---
parent: orchestrator-protocol
name: verification
description: Verification before asserting — tool hierarchy, confidence levels, validation pipeline.
---

# Verification Before Asserting

> **Never assume. Always verify.**

## Tool Hierarchy

| Priority | Tool | Use |
|----------|------|-----|
| 1 | **LSP** | Semantic navigation (type-aware) — definitions, references, types |
| 2 | **Grep** | Text search — fallback when LSP unavailable, literal strings, non-code files |
| 3 | **Glob** | File existence search |
| 4 | **Read** | Content verification — after file existence confirmed |

## Confidence Levels

| Level | Evidence | Phrasing |
|-------|----------|----------|
| **High** | Tool output verified | "The file contains..." |
| **Medium** | Partial/related data | "Based on X, it appears..." |
| **Low** | Inference only | "Could you confirm if..." |
| **None** | No data | "Let me check..." |

**Rule**: confidence < 70% → ask, don't guess. Use `AskUserQuestion`.

## When to Verify

| Situation | Action Required |
|-----------|-----------------|
| Claiming a file exists | Glob first |
| Claiming a function exists | Grep or Read first |
| Suggesting code changes | Read file first |
| Referencing API endpoints | Grep route definitions |
| Suggesting imports | Verify export exists |
| Confidence < 70% | Ask, don't assert |

## Validation Pipeline (staged)

| Stage | Method | Fallback |
|-------|--------|----------|
| 1. Exact match | Glob for exact path | → Stage 2 |
| 2. Wildcard | Glob with `**/*name*` | → Stage 3 |
| 3. Fuzzy | Grep for filename stem | → Ask user |

If Stage 2 returns multiple matches, ask which one. If Stage 3 also fails, ask for the path — never assume.

## Domain-Adaptive Confidence Thresholds

| Domain | Ask threshold | Verify threshold | Auto-proceed |
|--------|--------------|-----------------|-------------|
| Frontend (UI/CSS) | < 65% | 65-85% | > 85% |
| Backend (logic) | < 70% | 70-90% | > 90% |
| Database (schema/migrations) | < 75% | 75-95% | > 95% |
| Security (auth/crypto) | < 75% | 75-95% | > 95% |

**Confidence formula**: File verified (+30%) + Function verified (+25%) + Past success (+25%) + Clear requirements (+20%).

## Critical Keywords — Always Verify

When the prompt contains these, force verification regardless of confidence level:

`delete`, `drop`, `remove`, `production`, `migration`, `deploy`, `secret`, `credential`, `rollback`

Also ask when multiple valid approaches exist (JWT vs OAuth vs Sessions) or requirements are ambiguous (vague verbs like "optimize", "fix", "improve" with no metrics).

## Common Hallucination Patterns

| Pattern | Problem | Solution |
|---------|---------|----------|
| Path guessing | `src/components/Button/index.tsx` | `Glob("**/Button*.tsx")` first |
| Signature guessing | Assuming `(name: string, age: number)` | Read file, quote actual |
| Import guessing | `@/utils/helpers` | Check tsconfig.json paths |
| Endpoint guessing | `POST /api/users/create` | Grep route definitions |

## Gotchas

| Gotcha | Why | Workaround |
|--------|-----|------------|
| Glob may not find recently created file | Filesystem events not flushed | After Write, prefer Read with exact path |
| LSP results stale after Write | Language server reindexes async | Re-run LSP query after file modifications |
| `Read` of non-existent file returns error, not empty | Tool returns error object | Check Glob first or handle error gracefully |
| Grep finds text in comments/strings (false positives) | Grep is text-only | Use LSP for semantic queries |
| Import statement doesn't prove target exports the symbol | Import might be hallucinated | Verify with `goToDefinition` or Grep in source module |
