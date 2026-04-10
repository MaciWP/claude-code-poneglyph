---
parent: django-query-optimizer
name: binora-hierarchy-patterns
description: Binora-specific context for hierarchy traversal with ContentType GenericForeignKey
---

# Binora Hierarchy Patterns

Binora's asset hierarchy uses ContentType-based `GenericForeignKey` for the parent relationship. This file captures the patterns that apply only to that codebase.

## ContentType GenericFK parent

The hierarchy `parent` field is a `GenericForeignKey` backed by `parent_type` + `parent_id`. Always use the `parent` property in application code — never touch `parent_type` / `parent_id` directly.

Critical rule: in Binora, hierarchy queries use ContentType GenericFK — always use the `parent` property.

## GenericFK CANNOT use `select_related`

`select_related` silently does nothing on a `GenericForeignKey`. You MUST use `prefetch_related`:

| Field Type | select_related | prefetch_related |
|------------|---------------|------------------|
| Regular FK | YES | YES |
| GenericFK (parent) | NO (silently ignored) | YES (only option) |

```python
# WRONG -- GenericFK ignores select_related silently
Asset.objects.select_related('parent')

# CORRECT -- use prefetch_related for GenericFK
Asset.objects.prefetch_related('parent_object')
```

## Known-depth hierarchy chain

For traversals where the chain follows regular FKs (not the GenericFK parent), `select_related` with `__` is correct:

```python
Asset.objects.select_related(
    'datacenter',
    'product_model',
    'product_model__brand',
)
```

Use this when the chain is fixed and known — it collapses into a single JOIN.
