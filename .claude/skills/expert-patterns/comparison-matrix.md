# Pattern Comparison Matrix

Matriz para comparar implementacion actual vs best practices.

## Usage

Usar esta matriz para evaluar codigo contra multiples fuentes.

## Evaluation Template

| Aspecto | Codigo Actual | Official Docs | Expert Blogs | Top Repos | Gap Score |
|---------|---------------|---------------|--------------|-----------|-----------|
| [aspecto] | [actual] | [recomendado] | [opinion] | [ejemplo] | 0-10 |

## Category: API Design

| Aspecto | Best Practice | Source |
|---------|---------------|--------|
| Validation | TypeBox/Zod schemas | Elysia docs |
| Error format | `{ error, code, details }` | trpc |
| Pagination | Cursor-based | REST API Design |
| Versioning | URL prefix `/api/v1` | Industry standard |
| Rate limiting | Per-user, per-endpoint | OWASP |

## Category: TypeScript

| Aspecto | Best Practice | Source |
|---------|---------------|--------|
| Strict mode | `strict: true` | TS handbook |
| Any usage | Use `unknown` | Matt Pocock |
| Type exports | `interface` over `type` | TS perf guide |
| Generics | Constrain with `extends` | Total TypeScript |
| Enums | Use union types | ts-reset |

## Category: React

| Aspecto | Best Practice | Source |
|---------|---------------|--------|
| Components | Function components | React docs |
| Data fetching | React Query/SWR | Kent C. Dodds |
| Forms | Controlled + schema validation | React Hook Form |
| State | Lift up, then context | Dan Abramov |
| Effects | Prefer events over effects | React docs |

## Category: Security

| Aspecto | Best Practice | Source |
|---------|---------------|--------|
| Auth | JWT + refresh tokens | OWASP |
| Passwords | Argon2id | OWASP |
| Input | Validate + sanitize | OWASP |
| Headers | Security headers | MDN |
| Secrets | Environment variables | 12-factor |

## Category: Testing

| Aspecto | Best Practice | Source |
|---------|---------------|--------|
| Strategy | Testing Trophy | Kent C. Dodds |
| Queries | Accessible queries | testing-library |
| Mocking | Mock boundaries | MSW |
| Coverage | 80% branches | Industry |
| Naming | `should [expected] when [condition]` | Convention |

## Scoring Guide

| Score | Meaning |
|-------|---------|
| 0-2 | Critical gap - immediate action |
| 3-4 | Significant gap - plan fix |
| 5-6 | Minor gap - low priority |
| 7-8 | Good - minor improvements |
| 9-10 | Excellent - matches best practice |

## Confidence Calculation

```
confidence = (
  knowledge_base_match * 0.4 +
  official_docs_match * 0.3 +
  expert_blogs_match * 0.15 +
  top_repos_match * 0.15
) * 100
```
