# ViewSet Analysis Checklist

Checklist for analyzing ViewSets during code review. 29 rules organized by category.

## Rules

| # | Category | Rule | Why | Sev |
|---|----------|------|-----|-----|
| 1 | Query | `queryset` with `select_related` for FK/OneToOne | Prevents N+1 (1 base + N per FK) | Critical |
| 2 | Query | `queryset` with `prefetch_related` for M2M/reverse FK | 2 efficient queries vs N+1 | Critical |
| 3 | Query | `queryset` with `order_by` | Deterministic pagination (without = random order, duplicates) | Major |
| 4 | Query | `get_queryset()` optimizes by action | list needs less data than retrieve | Major |
| 5 | Query | `.only()` / `.defer()` in list | Reduces payload and memory (JSONField/TextField) | Major |
| 6 | Query | `Prefetch(...)` for custom queryset | Allows filters without loading unnecessary data | Major |
| 7 | Serializers | `get_serializer_class()` with dict by action | Input validates, output represents | Major |
| 8 | Serializers | `serializer_class` is output | DRF uses default in list/retrieve | Major |
| 9 | Serializers | Input serializers validate completely | Reusable and testable validation | Critical |
| 10 | Serializers | No business logic in serializers | Serializers = presentation, services = domain (SRP) | Major |
| 11 | Architecture | Action methods thin (<=15 lines) | Fat views = untestable business logic | Major |
| 12 | Architecture | `perform_*` delegates to service | Views = HTTP, services = domain | Critical |
| 13 | Architecture | Service injected as class attr | DI enables mock in tests without modifying ViewSet | Major |
| 14 | Architecture | `perform_*` assigns `serializer.instance` | DRF uses instance for response | Critical |
| 15 | Permissions | `frontend_permissions` dict with enums | Centralized, type-safe, easy audit | Major |
| 16 | Permissions | `@action` with `permission_classes` | Default inherits ViewSet (may be incorrect) | Major |
| 17 | Permissions | Permissions coherent with functionality | VIEW on update = privilege escalation | Critical |
| 18 | Multi-Tenant | No manual `tenant_id` filtering | Middleware handles isolation | Critical |
| 19 | Multi-Tenant | Trust middleware | Single source of truth | Critical |
| 20 | Code Quality | File-level imports | PEP 8, detects circular deps | Major |
| 21 | Code Quality | HTTP error handling | Service raises domain exceptions, view translates to HTTP | Major |
| 22 | Code Quality | Type hints on custom methods | Documentation, IDE support, Binora standard | Major |
| 23 | Code Quality | No duplication between actions | DRY (duplication = bugs when updating only one copy) | Major |
| 24 | Testing | Service mocked via DI | Test ViewSet without executing service logic | Major |
| 25 | Testing | Queryset optimizations don't break tests | `.only()` causes deferred field errors | Major |
| 26 | Testing | Permissions tested per action | Critical for security (prevents regressions) | Critical |
| 27 | @action | `url_path` explicit | Clean URLs (`change-password` vs `change_password`) | Major |
| 28 | @action | `pagination_class=None` if not listing | No pagination overhead for single object | Major |
| 29 | @action | Response with explicit status | Clarity (200 default may not be semantic) | Major |

## Priority Matrix

| Severity | Count | Action |
|----------|-------|--------|
| Critical | 9 | Fix immediately, blocks PR |
| Major | 20 | Fix pre-merge or plan refactoring |

## Review Workflow

Automated tools (20, 22) -> Critical rules (9) -> Major rules (20)

## References

| Rules | Source |
|-------|--------|
| 1-6 | [Django Query Optimization](https://docs.djangoproject.com/en/5.0/topics/db/optimization/) |
| 7-10 | [DRF Serializers](https://www.django-rest-framework.org/api-guide/serializers/) |
| 11-14 | [HackSoftware Django Styleguide](https://github.com/HackSoftware/Django-Styleguide) |
| 15-17 | [DRF Permissions](https://www.django-rest-framework.org/api-guide/permissions/) |
| 18-19 | Binora multi-tenant architecture |
| 20-23 | [PEP 8](https://peps.python.org/pep-0008/), Binora CLAUDE.md |
| 24-26 | [pytest-django](https://pytest-django.readthedocs.io/) |
| 27-29 | [DRF Actions](https://www.django-rest-framework.org/api-guide/viewsets/#marking-extra-actions-for-routing) |
