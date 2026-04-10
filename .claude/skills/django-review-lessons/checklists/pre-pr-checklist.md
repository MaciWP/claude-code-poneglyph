# Pre-PR Checklist

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
