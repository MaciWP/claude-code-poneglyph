---
parent: django-query-optimizer
name: binora-model-patterns
description: Binora-specific context for Rack multi-table inheritance and related model patterns
---

# Binora Model Patterns

## Rack Multi-Table Inheritance

Rack inherits from Asset via Django multi-table inheritance (`asset_ptr`). Every Rack query has an implicit JOIN between the `asset` and `rack` tables:

```python
# This generates 2 queries minimum (Asset + Rack tables)
Rack.objects.select_related('parent_object').all()
```

Factor this into query count targets for Rack-touching endpoints:

| Query | Target queries |
|-------|---------------|
| Simple Asset list | 1-3 |
| Rack list | 2-4 (includes asset_ptr JOIN) |

## GenericFK parent pattern

The `parent` field on Asset is a `GenericForeignKey` (`parent_type` + `parent_id`). See `binora-hierarchy-patterns.md` for the query implications.

## Golden reference queryset

`apps/core/views/user.py` is the reference ViewSet for how to compose `select_related` + `prefetch_related` + `order_by` on a Binora queryset:

```python
queryset = User.objects.select_related(
    'company',
).prefetch_related(
    'groups',
    'companies',
).order_by('email')
```
