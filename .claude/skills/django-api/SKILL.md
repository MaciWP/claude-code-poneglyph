---
name: django-api
description: |
  Django REST Framework API layer -- ViewSets, serializers (input/output separation),
  permissions, routing, and request/response handling.
  Use when implementing endpoints, reviewing API code, creating serializers,
  or designing ViewSet patterns in Django/DRF projects.
type: knowledge-base
disable-model-invocation: false
effort: medium
activation:
  keywords:
    - viewset
    - drf
    - django rest framework
    - serializer
    - api endpoint
    - permission_classes
    - perform_create
    - get_serializer_class
    - drf router
    - rest endpoint
for_agents: [builder, reviewer, planner]
context: fork
version: "2.0.0"
---

# Django API Layer

Complete reference for the DRF API layer: ViewSets, serializers (input/output separation), permissions, routing, and query optimization. Based on the official DRF tutorial and HackSoftware Django Styleguide.

## Core Principle

**THE #1 RULE**: Input/Output serializer separation. Views handle HTTP only. Never mix read and write serializers. Business logic belongs in services, never in views or serializers.

## Quick Reference

| Pattern | When | Quick Example |
|---------|------|---------------|
| Input/Output serializers | Every endpoint | `SnippetCreateSerializer` / `SnippetOutputSerializer` |
| `get_serializer_class` | ViewSet needs different serializers | `action_serializer_map` dict pattern |
| `permission_classes` | Every ViewSet | `permission_classes = [IsAuthenticated, DjangoModelPermissions]`  # https://www.django-rest-framework.org/api-guide/permissions/ |
| Nested router | Sub-resources | drf-nested-routers package |
| `perform_create` | Service call on create | `self.service.create(serializer.validated_data)` |
| Strict serializer mixin | Reject unknown fields on input | Custom mixin over `Serializer` |
| `select_related` / `prefetch_related` | Every queryset with FK/M2M | `.select_related('author').prefetch_related('tags')` |
| Service injection | Every ViewSet with business logic | Class attribute for DI, e.g. `service_class = SnippetService` |

## ViewSet Anatomy

```
Request -> Permissions -> get_queryset() -> get_serializer_class() -> action -> perform_*() -> Service -> Response
```

### Required Attributes

| Attribute | Purpose | Example |
|-----------|---------|---------|
| `queryset` | Optimized base with `select_related` + `order_by` | `Snippet.objects.select_related('owner').order_by('id')` |
| `serializer_class` | Default serializer (output) | `SnippetOutputSerializer` |
| `permission_classes` | DRF permission classes | `[IsAuthenticated, DjangoModelPermissions]` |
| `{service}_class` | DI for service layer | `service_class = SnippetService` |

### Canonical Reference

See the DRF tutorial ViewSet example: https://www.django-rest-framework.org/tutorial/6-viewsets-and-routers/

## Serializer Rules

### Naming Conventions

| Suffix | Purpose | Example |
|--------|---------|---------|
| `*CreateSerializer` | Create operations (input) | `SnippetCreateSerializer` |
| `*UpdateSerializer` | Update/PATCH operations (input) | `SnippetUpdateSerializer` |
| `*OutputSerializer` | Detail read operations | `SnippetOutputSerializer` |
| `*InfoSerializer` | Minimal read-only nested data | `UserInfoSerializer` |
| `*ListSerializer` | Optimized for list views | `SnippetListSerializer` |

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
| Silently accepting unknown fields on input | Add a strict serializer mixin | Prevents silent ignore of typos |
| `required=False` without `allow_null`/`allow_blank` | Specify both | Ambiguous DRF behavior |

## drf-spectacular Integration (v0.28.0)

Auto-schema handles standard CRUD correctly — most ViewSets don't need explicit decorators.

### When to add decorators

| Scenario | Decorator |
|----------|-----------|
| Custom `@action` with non-standard request/response | `@extend_schema(request=..., responses=...)` |
| Multipart file upload | `@extend_schema(request={"multipart/form-data": Serializer})` |
| Query params not from FilterSet | `@extend_schema(parameters=[OpenApiParameter(...)])` |
| Custom tags | `@extend_schema(tags=["name"])` |
| Exclude endpoint from schema | `@extend_schema(exclude=True)` |
| Different response schema per action | `@extend_schema_view(action=extend_schema(responses=...))` |

### Imports

All from `drf_spectacular.utils`: `extend_schema`, `extend_schema_view`, `OpenApiParameter`. Types from `drf_spectacular.types`: `OpenApiTypes`.

### Recommendations

- Prefer auto-schema for standard CRUD — only add decorators when schema inference fails
- Never use `@swagger_auto_schema` (drf-yasg, not this project)
- Prefer referencing existing serializer classes over `inline_serializer()`
- `COMPONENT_SPLIT_REQUEST = True` — request/response schemas are separate
- Verify with the project's contract test suite

## Critical Reminders

1. **ALWAYS** separate Input and Output serializers -- use `get_serializer_class()` with dict by action
2. **ALWAYS** optimize querysets with `select_related`/`prefetch_related` + `order_by`
3. **NEVER** put business logic in views or serializers -- delegate to services via `perform_*`
4. **ALWAYS** use a strict serializer mixin on input serializers to reject unknown fields
5. **ALWAYS** set explicit `permission_classes` on `@action` (never rely on ViewSet default)

## Sources

- [DRF ViewSets](https://www.django-rest-framework.org/api-guide/viewsets/)
- [DRF Serializers](https://www.django-rest-framework.org/api-guide/serializers/)
- [DRF Tutorial — ViewSets and Routers](https://www.django-rest-framework.org/tutorial/6-viewsets-and-routers/)
- [HackSoftware Django Styleguide](https://github.com/HackSoftware/Django-Styleguide)
- [Django Query Optimization](https://docs.djangoproject.com/en/stable/topics/db/optimization/)

## Content Map

Supporting files loaded on demand based on task context. Consult the Contents column to decide which to Read for your current task.

| Topic | File | Contents |
|---|---|---|
| ViewSet checklist | `${CLAUDE_SKILL_DIR}/references/viewset-checklist.md` | 29-rule ViewSet analysis checklist. Read when doing a formal ViewSet review or pre-merge audit of DRF endpoint code. |
| Serializer rules | `${CLAUDE_SKILL_DIR}/references/serializer-rules.md` | Naming conventions (`*CreateSerializer` / `*OutputSerializer` / etc.), field configuration, validation patterns. Read when writing or reviewing a serializer and unsure about the naming convention or validation placement. |
| ViewSet patterns | `${CLAUDE_SKILL_DIR}/examples/viewset-patterns.md` | Anti-patterns, `@action` decorators, queryset optimization, mixin composition. Read when you need concrete examples of how a good ViewSet is structured or you're about to add a custom action. |
| Serializer patterns | `${CLAUDE_SKILL_DIR}/examples/serializer-patterns.md` | Implementation examples for common serializer scenarios. Read when you need a concrete example beyond the naming conventions. |
| Input/Output separation | `${CLAUDE_SKILL_DIR}/examples/input-output-separation.md` | Worked examples of splitting a single serializer into input and output pairs. Read when refactoring a ViewSet that currently uses one serializer for both read and write. |
| API validation severity | `${CLAUDE_SKILL_DIR}/checklists/api-validation.md` | Violation severity guide for code review (blocking vs non-blocking). Read when writing PR review comments or deciding whether a finding should block merge. |
| ViewSet template | `${CLAUDE_SKILL_DIR}/templates/viewset-template.md` | Copy-paste ViewSet template. Read when scaffolding a new ViewSet and want a canonical starting point. |
| Serializer pair template | `${CLAUDE_SKILL_DIR}/templates/serializer-template.md` | Copy-paste Input/Output serializer pair template. Read when creating serializers for a new resource. |
| Binora `frontend_permissions` | `${CLAUDE_SKILL_DIR}/references/binora-frontend-permissions.md` | Binora's `frontend_permissions` dict + `FrontendPermissions` enum pattern that bridges DRF backend permissions with frontend UI gating. Read when the code uses `frontend_permissions`, references `FrontendPermissions` enum, or sets up UI-aware permission declarations. |
| Binora drf-spectacular extensions | `${CLAUDE_SKILL_DIR}/references/binora-drf-spectacular-extensions.md` | Custom drf-spectacular field extensions used in Binora (e.g. `DatacenterFieldFix`) to work around schema generation issues. Read when the code imports custom field extensions or when drf-spectacular produces incorrect schemas for a custom field. |
| Binora API utilities | `${CLAUDE_SKILL_DIR}/references/binora-api-utilities.md` | Project-specific API utilities and workarounds (`StrictSerializerMixin`, custom routers, etc.). Read when the code uses a Binora-specific utility that isn't part of stock DRF. |

**Last Updated**: 2026-04-10
