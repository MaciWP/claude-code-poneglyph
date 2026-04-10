---
name: django-review-lessons
description: |
  Personal code review lessons learned from past PRs — errors that must never be repeated.
  Covers architecture, style, testing, models, serializers, and contract patterns.
  Use when reviewing code, before PRs, during quality audits, or pre-commit checks.
type: knowledge-base
disable-model-invocation: false
effort: high
activation:
  keywords:
    - django review
    - review lessons
    - past pr
    - review mistakes
    - common errors
    - pre-commit review
    - quality audit
    - django checklist
    - pr checklist
for_agents: [reviewer, builder]
context: fork
version: "2.0.0"
---

# Django Review Lessons

Personal lessons from code reviews. Every item here was a real bug or issue found in PR review. Mistakes to never repeat.

## Core Principle

**THE #1 RULE**: Learn from past mistakes. Every lesson here was a real bug or issue found in PR review.

## Quick Reference (Top 5 Most Common Errors)

| # | Error | Category | Severity | Detection |
|---|-------|----------|----------|-----------|
| #9/#10 | Business logic in views instead of services | Architecture | Critical | `grep -rn "\.save()\|\.delete()" apps/*/views/` |
| #15 | Deleted applied migrations | Migrations | Critical | `git diff --name-only \| grep migrations` |
| #S1 | required=True in PATCH serializers | Serializers | Critical | `grep -rn "required=True" apps/*/serializers/` |
| #C1 | Response schema doesn't match serializer | Contract | Critical | Compare serializer fields with OpenAPI schema |
| #26 | Explicit filter_backends overrides defaults | Style | Major | `grep -rn "filter_backends" apps/` |

## Never Again List

| NEVER | ALWAYS |
|-------|--------|
| Delete applied migrations | Create new migration to revert |
| Put business logic in views | Delegate to services |
| Use bare `except:` | Catch specific exceptions |
| Hardcode URLs | Use `reverse()` |
| Test Django internals | Test custom logic only |
| Duplicate fixtures | Reuse from root conftest |
| Override global ordering without reason | Respect `Meta.ordering` |
| Override `filter_backends` on ViewSet | Use `DEFAULT_FILTER_BACKENDS` from settings |
| Add FK for computed data | Use `@property` or annotation |
| Remove enum values from contract | Deprecate with comment |

## Anti-Patterns

### Business Logic in Views (#9, #10)

```python
# WRONG
def create(self, request):
    user = User(**request.data)
    user.set_password(generate_password())
    user.save()
    send_mail("Welcome", "...", "noreply@example.com", [user.email])
    return Response(UserSerializer(user).data, status=201)

# CORRECT
def create(self, request):
    serializer = UserCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = self.auth_service.create_user(serializer.validated_data)
    return Response(UserMeSerializer(user, context={"request": request}).data, status=201)
```

### filter_backends Override (#26)

```python
# WRONG - silently removes OrderingFilter and DjangoFilterBackend
filter_backends = [filters.SearchFilter]

# CORRECT - backends inherited from DEFAULT_FILTER_BACKENDS
search_fields = ["name", "code"]
```

## Common Patterns Reference

| Pattern | Location | When to Use |
|---------|----------|-------------|
| Service Layer (DI) | `apps/core/services/authservice.py` | All business logic |
| ViewSet with DI | `apps/core/views/user.py` | View layer with service injection |
| Input/Output Serializer | `apps/core/serializers/accessprofile.py` | Separate create/update from response |
| Permissions | `apps/core/permissions.py` | Custom permission classes |
| Test Fixtures | `conftest.py` | Reusable test data |

## Conventional Comments Mapping

| Error Category | Label | Decorator |
|----------------|-------|-----------|
| Migration deleted, logic in view | `issue` | `(blocking)` |
| Contract schema mismatch, enum mismatch | `issue` | `(blocking)` |
| filter_backends override | `issue` | `(blocking)` |
| Missing select_related, fixture duplicate | `suggestion` | `(non-blocking)` |
| CharField vs TextField, unused fixture | `nitpick` | `(non-blocking)` |

## Documentation

| Type | File | Content |
|------|------|---------|
| reference | `${CLAUDE_SKILL_DIR}/references/general-lessons.md` | 27 general review lessons (#1-#26 + #3b) |
| reference | `${CLAUDE_SKILL_DIR}/references/serializer-lessons.md` | S1-S4 serializer-specific lessons |
| reference | `${CLAUDE_SKILL_DIR}/references/contract-lessons.md` | C1-C19 contract-specific lessons |
| example | `${CLAUDE_SKILL_DIR}/examples/common-violations.md` | 6 detailed violation examples with code |
| checklist | `${CLAUDE_SKILL_DIR}/checklists/pre-pr-checklist.md` | Quick pre-PR checklist |

## Item Counts

| Section | Items | IDs |
|---------|-------|-----|
| General | 27 | #1-#26 + #3b |
| Serializers | 4 | S1-S4 |
| Contract | 19 | C1-C19 |
| **Total** | **50** | |

## Critical Reminders

- Items #9, #10, #15, #19, #S1 are **Critical** severity — blocking in PR review
- C1, C3, C4, C6, C7, C8, C9, C10, C17, C18 are **Critical** contract items
- Contract lessons (C1-C19) are intentionally duplicated in `openapi-contract` skill
- Run project formatter and linter before every PR

---

**Last Updated**: 2026-03-18
**Version**: 2.0.0
**Total Lessons**: 50 (27 general + 4 serializers + 19 contract)
