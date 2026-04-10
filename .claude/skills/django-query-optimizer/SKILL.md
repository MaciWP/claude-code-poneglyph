---
name: django-query-optimizer
description: |
  Django ORM query optimization -- N+1 detection, select_related/prefetch_related enforcement,
  QuerySet performance patterns, and database access optimization.
  Use when working with Django QuerySets, reviewing database queries, or fixing N+1 problems.
allowed-tools: [Read, Grep, Glob]
context: fork
version: "2.0.0"
for_agents: [builder, reviewer, scout]
---

# Django Query Optimizer

Detects and fixes N+1 queries, enforces select_related/prefetch_related, and optimizes database access patterns.

## Core Principle

**THE #1 RULE**: Every QuerySet that touches ForeignKey or M2M must use select_related or prefetch_related.

## Quick Reference

| Relationship | Method | Example |
|-------------|--------|---------|
| ForeignKey (forward) | `select_related` | `Asset.objects.select_related('parent', 'product_model')` |
| OneToOne | `select_related` | `Rack.objects.select_related('asset_ptr')` |
| ManyToMany / Reverse FK | `prefetch_related` | `Asset.objects.prefetch_related('attachments')` |
| Nested FK chain | `select_related` with `__` | `select_related('parent__datacenter')` |
| Conditional prefetch | `Prefetch` object | `Prefetch('tasks', queryset=Task.objects.filter(active=True))` |

## Decision Table

| Scenario | Method | Why |
|----------|--------|-----|
| Single FK access in serializer | `select_related` | 1 JOIN vs N queries |
| List of related objects | `prefetch_related` | 1 extra query vs N |
| Filtered related objects | `Prefetch()` object | Avoid loading all then filtering in Python |
| Count of related objects | `annotate(Count())` | DB-level aggregation |
| Exists check | `.exists()` not `.count() > 0` | Short-circuits |
| Only need specific fields | `.only()` / `.defer()` | Reduce data transfer |
| Always on list endpoints | `.order_by()` | Consistent ordering, required for pagination |

## Common N+1 Patterns (Top 3)

### 1. Serializer accessing FK without optimization

```python
# BAD: N+1 -- each asset triggers a query for product_model
class AssetSerializer(serializers.ModelSerializer):
    product_model_name = serializers.CharField(source='product_model.name')

# GOOD: ViewSet optimizes the queryset
def get_queryset(self):
    return Asset.objects.select_related('product_model')
```

### 2. Loop accessing related objects

```python
# BAD
for asset in Asset.objects.all():
    print(asset.parent.name)  # N+1!

# GOOD
for asset in Asset.objects.select_related('parent'):
    print(asset.parent.name)  # 0 extra queries
```

### 3. Nested serializer without prefetch

```python
# BAD
class RackSerializer(serializers.ModelSerializer):
    assets = AssetSerializer(many=True, source='asset_set')  # N+1!

# GOOD: prefetch in ViewSet
def get_queryset(self):
    return Rack.objects.prefetch_related('asset_set')
```

## Binora-Specific Patterns

### Golden Reference: `apps/core/views/user.py`

```python
queryset = User.objects.select_related(
    'company',
).prefetch_related(
    'groups',
    'companies',
).order_by('email')
```

### Hierarchy Traversal

ContentType-based parent uses GenericFK. Always use the `parent` property (not raw `parent_type`/`parent_id`).

```python
# Hierarchy chain: use select_related for known depth
Asset.objects.select_related(
    'datacenter',
    'product_model',
    'product_model__brand',
)
```

### Annotation over Python aggregation

```python
# BAD: Python-level counting
racks = Rack.objects.all()
for rack in racks:
    count = rack.asset_set.count()  # N+1!

# GOOD: DB-level annotation
from django.db.models import Count
racks = Rack.objects.annotate(asset_count=Count('asset'))
```

## Anti-Patterns

| # | Anti-Pattern | Correction | Severity |
|---|-------------|------------|----------|
| 1 | `.objects.all()` in ViewSet without optimization | Add `select_related`/`prefetch_related` | Critical |
| 2 | Missing `order_by` on list queryset | Add `.order_by('id')` or meaningful field | High |
| 3 | Python-level filtering on prefetched data | Use `Prefetch()` with filtered queryset | High |
| 4 | `.count()` inside loop | Use `annotate(Count())` | Critical |
| 5 | Accessing FK in serializer without select_related | Optimize ViewSet queryset | Critical |
| 6 | `len(queryset)` instead of `.count()` | Use `.count()` (avoids loading all objects) | Medium |
| 7 | `.filter().exists()` as `len(.filter()) > 0` | Use `.exists()` directly | Medium |
| 8 | Over-fetching with `select_related` on unused FKs | Only select_related fields accessed in serializer | Low |
| 9 | Missing `.only()`/`.defer()` for large text fields | Defer blob/text fields not needed in list views | Medium |
| 10 | Chaining `.values()` after `select_related` | Remove select_related when using values() | Low |

## Query Count Targets

| Endpoint Type | Target Queries | If More |
|---------------|---------------|---------|
| Simple list | 1-3 | N+1 problem |
| List with relations | 2-5 | Check prefetch |
| Detail with nested | 3-7 | Check select_related chain |
| Create/Update | 2-5 | Check save + signals |

## Optimization by ViewSet Action

| Action | Strategy | Example |
|--------|----------|---------|
| `list` | `.only()` for minimal payload + `select_related` for displayed FKs | `.only('id', 'name', 'code').select_related('datacenter')` |
| `retrieve` | Full `select_related` chain for detail view | `.select_related('parent', 'product_model__brand')` |
| `create`/`update` | Minimal queryset, optimization in `get_object()` | Default queryset fine |
| Custom `@action` | Tailor to what the action returns | Depends on response serializer |

## Cross-Reference to Review Lessons

Items #3, #7, #12 in `django-review-lessons` cover query optimization errors found in real PRs.

## Binora-Specific Gotchas

### Rack Multi-Table Inheritance

Rack inherits from Asset via multi-table inheritance (`asset_ptr`). Every Rack query has an implicit JOIN:

```python
# This generates 2 queries minimum (Asset + Rack tables)
Rack.objects.select_related('parent_object').all()
```

Factor this into query count targets:
- Simple Asset list: 1-3 queries
- Rack list: 2-4 queries (includes asset_ptr JOIN)

### GenericFK Parent (ContentType)

The hierarchy `parent` field uses GenericForeignKey (`parent_type` + `parent_id`).
GenericFK CANNOT use `select_related` -- you MUST use `prefetch_related`:

| Field Type | select_related | prefetch_related |
|------------|---------------|-----------------|
| Regular FK | YES | YES |
| GenericFK (parent) | NO | YES (only option) |

```python
# WRONG -- GenericFK ignores select_related silently
Asset.objects.select_related('parent')

# CORRECT -- use prefetch_related for GenericFK
Asset.objects.prefetch_related('parent_object')
```

### Known Deviation: user.py

`apps/core/views/user.py` uses empty `.select_related()` without specifying fields.
This is a known deviation -- always specify fields explicitly in new code.

## Documentation

| Type | File | Content |
|------|------|---------|
| Example | `examples/n_plus_one_detection.md` | N+1 detection methods: logging, pytest, CaptureQueriesContext |
| Example | `examples/select_related_patterns.md` | ForeignKey/OneToOne optimization |
| Example | `examples/prefetch_related_patterns.md` | ManyToMany/Reverse FK optimization |
| Checklist | `checklists/query_optimization.md` | N+1, ViewSet querysets, missing order_by |
| Checklist | `checklists/performance_checklist.md` | Query count testing, profiling levels |
| Template | `templates/optimized_queryset.md` | Copy-paste ViewSet queryset template |

## Critical Reminders

1. ALWAYS check serializer field sources -- if it traverses a FK, you need `select_related`
2. `prefetch_related` for reverse FKs and M2M, `select_related` for forward FKs
3. Use `django.test.utils.CaptureQueriesContext` or `connection.queries` to verify query count
4. `annotate()` > Python-level aggregation (always)
5. `.only()`/`.defer()` for large text/blob fields you do not need
6. Every list queryset MUST have `order_by` -- pagination requires deterministic ordering
7. In Binora, hierarchy queries use ContentType GenericFK -- always use the `parent` property

**Last Updated**: 2026-03-18
