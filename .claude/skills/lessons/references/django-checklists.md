# Django review checklists (binora-backend)

Migrated 2026-08-06 from `django-review-lessons/{references/code-review-checklist,checklists/pre-pr-checklist}.md`.

## Code Review Checklist

Extracted from project rules. Severity-based review criteria for Binora.

## Quality Checklist

| Area | Severity | Rule |
|------|----------|------|
| Best practices | Minor | Use libraries fully, no over-engineering |
| Comments | Minor | Never delete comments/docstrings from unchanged code |
| Error prevention | Major | Check logic correctness and edge cases |
| Imports | Minor | File-level only (inline only for circular deps with comment) |
| Models | Major | CharField vs TextField, evaluate FK necessity |
| Translations | Minor | No comments inside translation strings |
| Constraints | Minor | Define once, reuse (`MAX_NAME_LENGTH = MaxLengthValidator(100)`) |
| Security | Critical | Validate input in serializers, no hardcoded secrets, use ORM |

## Query Optimization

```python
# BAD: N+1
for user in User.objects.all():
    print(user.company.name)

# GOOD: select_related for FK
for user in User.objects.select_related('company'):
    print(user.company.name)
```

## Common Anti-Patterns

| Incorrecto | Correcto | Por que |
|------------|----------|---------|
| `Asset.objects.filter(company=request.user.company)` | `Asset.objects.all()` | Tenant isolation is automatic via middleware |
| Business logic in `ViewSet.create()` | Logic in `AssetService.create()` | Views handle HTTP only |
| `ViewSet` without permission classes | Add triple permission stack | Every endpoint needs auth + perms + DC access |
| `objects.all()` in loop accessing FK | `objects.select_related('fk')` | Prevents N+1 queries |


---

## Pre-PR Checklist

Quick-scan checklist before submitting a PR. References critical items from review lessons.

---

## Architecture (Critical)

- [ ] No business logic in views (#9, #10) — all in services
- [ ] Views -> Services -> Models pattern respected (#23)
- [ ] No manual tenant filtering — trust middleware (Multi-Tenant Rule)

## Models

- [ ] No applied migrations deleted (#15)
- [ ] Migrations are production-ready: reversible, data-safe (#19)
- [ ] ForeignKey is truly needed vs annotation/property (#12)
- [ ] Correct field types: CharField vs TextField (#17)
- [ ] UUID for frontend-exposed IDs (#20)
- [ ] No unnecessary complex relationships (#18)

## Serializers

- [ ] PATCH serializers don't have required=True (#S1)
- [ ] Separate input/output serializers (#S2)
- [ ] No .all().count() in serializer methods — use annotations (#S3)

## Queries

- [ ] All queries have select_related/prefetch_related
- [ ] All list queries have order_by for deterministic pagination
- [ ] No N+1 queries in serializers

## Testing

- [ ] Using root conftest fixtures, not duplicating (#4, #11)
- [ ] Not testing Django internals (#8)
- [ ] No unused fixtures (#16)

## Style

- [ ] All imports at file level (#7)
- [ ] Using reverse() for URLs (#6)
- [ ] YOLO comments — only WHY, not WHAT (#3b)
- [ ] No unrelated line reformatting (#25)
- [ ] No explicit filter_backends on ViewSets (#26)
- [ ] No copy-paste errors (#24)

## Contract (OpenAPI)

- [ ] Response schemas match serializer output (#C1)
- [ ] Nullable fields have nullable: true (#C3)
- [ ] Enum values match Django choices exactly (#C4, #C17)
- [ ] URL patterns match router output (#C6)
- [ ] Paginated endpoints use wrapper, not bare array (#C10)
- [ ] New model choices reflected in contract (#C18)
- [ ] Read-only fields marked readOnly: true (#C5)

## Final

- [ ] `nox -s format` passes
- [ ] `nox -s lint` passes
- [ ] Relevant tests pass
- [ ] Type hints present on all functions
