---
name: openapi-contract
description: |
  OpenAPI contract management -- writing, reviewing, testing, and aligning
  backend implementation with contract specifications.
  Use when writing new endpoints, reviewing contract changes, verifying
  query parameters, or checking backend-contract alignment.
allowed-tools: [Read, Grep, Glob]
context: fork
version: "2.0.0"
for_agents: [reviewer, planner]
---

# OpenAPI Contract

Full-lifecycle skill for OpenAPI contracts: write, review, test, and align backend with spec.

## Core Principle

**THE #1 RULE**: Contract-first development. The OpenAPI spec is the single source of truth. Write the contract BEFORE the backend code.

## Contract-First Workflow

The development lifecycle for any new or modified endpoint:

| Step | Action | Output |
|------|--------|--------|
| 1 | Design endpoint (method, URL, schemas) | Agreement on shape |
| 2 | Write OpenAPI contract | YAML in the project's `openapi.yaml` |
| 3 | Add examples to contract | Realistic data matching domain |
| 4 | Implement backend (views, serializers, services) | Django code |
| 5 | Run contract tests | `nox -s test_contract` |
| 6 | Fix any misalignment | Backend matches contract exactly |

Key points:
- Step 2 happens BEFORE step 4 (contract-first)
- Examples in step 3 become test data in step 5
- Step 6 fixes the backend to match the contract, NOT the other way around

## Quick Reference

| Task | What to Check | Reference |
|------|---------------|-----------|
| Writing new endpoint | Use endpoint template | `templates/endpoint-template.md` |
| Adding query params | Use correct YAML template per type | `examples/query-param-templates.md` |
| Writing or reviewing contract | Full checklist (writing + review) | `checklists/contract-checklist.md` |
| Verifying backend alignment | Cross-reference serializers, filters, routes | `references/backend-alignment.md` |
| Checking schema correctness | Compare with serializer output | `examples/schema-examples.md` |
| Contract rules (C1-C19) | Schema, pagination, enum, examples | `references/contract-rules.md` |

## Anti-Patterns

| Anti-Pattern | Correction |
|--------------|------------|
| `enum` on dynamic DB-driven fields | `type: string` without enum (values change at runtime) |
| `search` as `type: array` | `type: string` |
| `ordering` as `type: array` | `type: string` |
| Boolean field typed as string | `type: boolean` |
| HyperlinkedFilter without `format: uri` | Add `format: uri` in items |
| HyperlinkedFilter with `explode: true` | `explode: false` (comma-separated) |
| Omitting `required: false` on query params | ALWAYS include on optional query params |
| Generic filter description "Status" | "Filter by process status" |
| `type: object` in allOf wrapper | Only allOf + $ref, no redundant type |
| IDs instead of URLs in output | `format: uri` for references |
| Duplicating pagination schema | PaginatedXList with $ref |
| Bare array for paginated endpoint | PaginatedResponse wrapper (count, next, previous, results) |
| Missing `ordering` on default backends viewset | Verify DEFAULT_FILTER_BACKENDS inheritance |
| Missing `search` when search_fields defined | Contract must have `search` param |
| Enum case mismatch with Django choices | Exact match including case and underscores |
| Removing deprecated enum values | Keep and mark as deprecated |
| Writing backend before contract | Contract-first: write spec, then implement |
| Response schema missing fields from serializer | Cross-reference `Meta.fields` |

## Documentation

| File | Content |
|------|---------|
| `references/backend-alignment.md` | How to verify backend matches contract |
| `references/contract-rules.md` | C1-C19 rules (schema, pagination, enum, examples) |
| `examples/query-param-templates.md` | YAML copy-paste templates per param type |
| `examples/schema-examples.md` | Correct vs incorrect schema patterns |
| `checklists/contract-checklist.md` | Unified checklist for writing and reviewing contracts |
| `templates/endpoint-template.md` | YAML template for new endpoints |

## Serializer-to-Schema Type Mapping

| Django/DRF Field | OpenAPI Type |
|------------------|--------------|
| `CharField` | `type: string` |
| `IntegerField` | `type: integer` |
| `FloatField` | `type: number` |
| `BooleanField` | `type: boolean` |
| `DateTimeField` | `type: string, format: date-time` |
| `DateField` | `type: string, format: date` |
| `UUIDField` | `type: string, format: uuid` |
| `EmailField` | `type: string, format: email` |
| `URLField` / `HyperlinkedRelatedField` | `type: string, format: uri` |
| `FileField` | `type: string, format: binary` |
| `DecimalField` | `type: string` (preserve precision) |
| Nested serializer | `$ref` to component schema |
| `ManyRelatedField` | `type: array, items: { ... }` |
| `ChoiceField` (static) | `type: string, enum: [...]` |
| `ChoiceField` (dynamic/DB) | `type: string` (no enum, V4) |
| `get_X_display` source | `type: string` (display value) |

## Critical Reminders

1. Contract lives in the project's `openapi.yaml` (often a git submodule for cross-repo sharing)
2. Contract tests typically use schemathesis to validate backend vs contract
3. Examples in contract are used as test data in contract tests
4. `DEFAULT_FILTER_BACKENDS` includes SearchFilter + OrderingFilter + DjangoFilterBackend
5. HyperlinkedModelSerializer uses URLs, not IDs -- contract must reflect this
6. Pagination wrapper is mandatory for all list endpoints
7. Input schemas and output schemas are separate (different fields, different required lists)
8. PATCH endpoints: no fields should be required in the request schema

---

**Version**: 2.0.0
**Predecessor**: `openapi-contract-reviewer` v1.0.0 (review-only, replaced by this skill)
