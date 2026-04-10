---
name: django-api
description: |
  Django REST Framework API layer -- ViewSets, serializers (input/output separation),
  permissions, routing, and request/response handling.
  Use when implementing endpoints, reviewing API code, creating serializers,
  or designing ViewSet patterns in Django/DRF projects.
allowed-tools: [Read, Grep, Glob]
context: fork
version: "2.0.0"
for_agents: [builder, reviewer, planner]
---

# Django API Layer

Complete reference for the DRF API layer in Binora: ViewSets, serializers, permissions, routing, and query optimization. Merges viewset-analyzer and serializer-patterns into a single coherent skill.

## Core Principle

**THE #1 RULE**: Input/Output serializer separation. Views handle HTTP only. Never mix read and write serializers. Business logic belongs in services, never in views or serializers.

## Quick Reference

| Pattern | When | Quick Example |
|---------|------|---------------|
| Input/Output serializers | Every endpoint | `UserCreateSerializer` / `UserMeSerializer` |
| `get_serializer_class` | ViewSet needs different serializers | `action_serializer_map` dict pattern |
| `DualSystemPermissions` | Every ViewSet | `permission_classes = [IsAuthenticated, DualSystemPermissions]` |
| `frontend_permissions` | Every ViewSet | `{"list": [FrontendPermissions.USERS_VIEW]}` |
| Nested router | Sub-resources | `NestedDefaultRouterSanitized` |
| `perform_create` | Service call on create | `self.service.create(serializer.validated_data)` |
| `StrictSerializerMixin` | Reject unknown fields on input | Inherit from `StrictSerializerMixin` |
| `select_related` / `prefetch_related` | Every queryset with FK/M2M | `.select_related('company').prefetch_related('permissions')` |
| Service injection | Every ViewSet with business logic | `auth_service_class = AuthService` (class attr for DI) |

## ViewSet Anatomy

```
Request -> Permissions -> get_queryset() -> get_serializer_class() -> action -> perform_*() -> Service -> Response
```

### Required Attributes

| Attribute | Purpose | Example |
|-----------|---------|---------|
| `queryset` | Optimized base with `select_related` + `order_by` | `User.objects.select_related('company').order_by('id')` |
| `serializer_class` | Default serializer (output) | `UserMeSerializer` |
| `frontend_permissions` | Dict with `FrontendPermissions` enums | `{"list": [FrontendPermissions.USERS_VIEW]}` |
| `{service}_class` | DI for service layer | `auth_service_class = AuthService` |

### Golden Reference

`apps/core/views/user.py` -- demonstrates all patterns (service DI, serializer split, query optimization, custom actions).

> **Note**: `user.py` uses empty `.select_related()` without specifying fields -- always specify fields explicitly in new code.

## Serializer Rules

### Naming Conventions

| Suffix | Purpose | Example |
|--------|---------|---------|
| `*CreateSerializer` | Create operations (input) | `UserCreateSerializer` |
| `*UpdateSerializer` | Update/PATCH operations (input) | `UserUpdateSerializer` |
| `*OutputSerializer` | Detail read operations | `AssetOutputSerializer` |
| `*InfoSerializer` | Minimal read-only nested data | `UserInfoSerializer` |
| `*ListSerializer` | Optimized for list views | `GroupListSerializer` |

### Project Utilities (`apps/core/utils/serializers/`)

| Utility | Purpose |
|---------|---------|
| `StrictSerializerMixin` | Rejects unknown fields (prevents silent ignore) |
| `EnumChoiceField` | Maps `TextChoices` to API values |
| `EmailListField` | Validates list of emails |
| `ModelURLListField` | Accepts list of hyperlinked URLs |
| `FormSerializer` | Form-based serialization |

### Base Patterns

- Use `HyperlinkedModelSerializer` as default
- Use `url` field instead of `id` for relationships
- Use `HyperlinkedRelatedField` for writable FK
- List fields explicitly (never `fields = '__all__'`)
- Never use `depth` -- use explicit nested serializers

### Validation

- Field-level: `validate_<field>(self, value)` for single field rules
- Object-level: `validate(self, attrs)` for cross-field rules
- Business logic validation belongs in services, not serializers

## Query Optimization

| Technique | When | Example |
|-----------|------|---------|
| `select_related` | FK, OneToOne | `.select_related('company')` |
| `prefetch_related` | M2M, reverse FK | `.prefetch_related('permissions')` |
| `order_by` | Always (pagination) | `.order_by('id')` |
| `.only()` / `.defer()` | List with large fields | `.only('id', 'name')` |
| `Prefetch(...)` | Custom queryset in prefetch | `Prefetch('docs', queryset=Doc.objects.filter(active=True))` |
| Per-action optimization | `get_queryset()` by `self.action` | list uses `.only()`, retrieve uses full |

## Anti-Patterns

| Incorrect | Correct | Why |
|-----------|---------|-----|
| Same serializer for read/write | Separate Input/Output | Different validation needs per operation |
| Business logic in ViewSet | Call service via `perform_*` | Views = HTTP only, services = domain |
| `fields = '__all__'` | List fields explicitly | Prevents accidental exposure |
| `depth = N` | Explicit nested serializers | Avoids N+1 and unpredictable output |
| Missing `select_related`/`prefetch_related` | Optimize queryset | Prevents N+1 queries |
| Missing `order_by` | Add `.order_by('id')` | Deterministic pagination |
| Manual tenant filtering | Trust middleware | Instance-level isolation is automatic |
| Fat views (>15 lines) | Extract to service | Testing and reuse |
| `@action` without `permission_classes` | Define explicit permissions | Inherits ViewSet default (may be wrong) |
| Missing `StrictSerializerMixin` on input | Add mixin | Rejects unknown fields |
| `required=False` without `allow_null`/`allow_blank` | Specify both | Ambiguous DRF behavior |

## drf-spectacular Integration (v0.28.0)

Auto-schema handles standard CRUD correctly — most ViewSets don't need explicit decorators.

### When to add decorators

| Scenario | Decorator | Reference |
|----------|-----------|-----------|
| Custom `@action` with non-standard request/response | `@extend_schema(request=..., responses=...)` | `core/views/auth.py` |
| Multipart file upload | `@extend_schema(request={"multipart/form-data": Serializer})` | `assets/views/documents.py` |
| Query params not from FilterSet | `@extend_schema(parameters=[OpenApiParameter(...)])` | `assets/views/assets.py` |
| Custom tags | `@extend_schema(tags=["name"])` | `catalog/views.py` |
| Exclude endpoint from schema | `@extend_schema(exclude=True)` | `core/views/static.py` |
| Different response schema per action | `@extend_schema_view(action=extend_schema(responses=...))` | `processes/views.py` |

### Imports

All from `drf_spectacular.utils`: `extend_schema`, `extend_schema_view`, `OpenApiParameter`. Types from `drf_spectacular.types`: `OpenApiTypes`.

### Custom field extensions (already exist)

`DatacenterFieldFix`, `_ProcessTypeFieldFix`, `_WorkflowFieldFix`, `_ProcessAssetInputFieldFix` — check `hierarchy/utils/serializers.py` and `processes/utils/serializers/` before creating new ones.

### Recommendations

- Prefer auto-schema for standard CRUD — only add decorators when schema inference fails
- Never use `@swagger_auto_schema` (drf-yasg, not this project)
- Prefer referencing existing serializer classes over `inline_serializer()`
- `COMPONENT_SPLIT_REQUEST = True` — request/response schemas are separate
- Verify with `nox -s test_contract`

## Documentation

| Type | File | Content |
|------|------|---------|
| reference | `references/viewset-checklist.md` | 29-rule ViewSet analysis checklist |
| reference | `references/serializer-rules.md` | Naming conventions, field configuration, validation patterns |
| example | `examples/viewset-patterns.md` | Anti-patterns, @action, queryset optimization, mixin composition |
| example | `examples/serializer-patterns.md` | Serializer implementation examples |
| example | `examples/input-output-separation.md` | I/O serializer split examples |
| checklist | `checklists/api-validation.md` | Violation severity guide for code review |
| template | `templates/viewset-template.md` | ViewSet copy-paste template |
| template | `templates/serializer-template.md` | Serializer pair copy-paste template |

## Critical Reminders

1. **ALWAYS** separate Input and Output serializers -- use `get_serializer_class()` with dict by action
2. **ALWAYS** optimize querysets with `select_related`/`prefetch_related` + `order_by`
3. **NEVER** put business logic in views or serializers -- delegate to services via `perform_*`
4. **ALWAYS** use `StrictSerializerMixin` on input serializers to reject unknown fields
5. **ALWAYS** set `frontend_permissions` dict and explicit `permission_classes` on `@action`

## Sources

- [DRF ViewSets](https://www.django-rest-framework.org/api-guide/viewsets/)
- [DRF Serializers](https://www.django-rest-framework.org/api-guide/serializers/)
- [HackSoftware Django Styleguide](https://github.com/HackSoftware/Django-Styleguide)
- [Django Query Optimization](https://docs.djangoproject.com/en/5.0/topics/db/optimization/)
- Reference: `apps/core/views/user.py`, `apps/core/serializers/accessprofile.py`

**Last Updated**: 2026-03-18
