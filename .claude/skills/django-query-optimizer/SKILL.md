---
name: django-query-optimizer
description: |
  Django ORM query optimization -- N+1 detection, select_related/prefetch_related enforcement,
  QuerySet performance patterns, and database access optimization.
  Use when working with Django QuerySets, reviewing database queries, or fixing N+1 problems.
type: knowledge-base
disable-model-invocation: false
effort: medium
activation:
  keywords:
    - n+1
    - n+1 query
    - select_related
    - prefetch_related
    - queryset
    - orm optimization
    - django orm
    - slow query
    - prefetch
    - optimize queries
for_agents: [builder, reviewer, scout]
context: fork
version: "2.0.0"
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
| Nested FK chain | `select_related` with `__` | `select_related('entry__blog')`  # example from Django docs: https://docs.djangoproject.com/en/stable/topics/db/optimization/ |
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

## Annotation over Python aggregation

```python
# BAD: Python-level counting
# example from Django docs: https://docs.djangoproject.com/en/stable/topics/db/optimization/
blogs = Blog.objects.all()
for blog in blogs:
    count = blog.entry_set.count()  # N+1!

# GOOD: DB-level annotation
from django.db.models import Count
blogs = Blog.objects.annotate(entry_count=Count('entry'))
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
| `list` | `.only()` for minimal payload + `select_related` for displayed FKs | `.only('id', 'name').select_related('blog')`  # example from Django docs: https://docs.djangoproject.com/en/stable/topics/db/optimization/ |
| `retrieve` | Full `select_related` chain for detail view | `.select_related('blog', 'author__profile')` |
| `create`/`update` | Minimal queryset, optimization in `get_object()` | Default queryset fine |
| Custom `@action` | Tailor to what the action returns | Depends on response serializer |

## Cross-Reference to Review Lessons

Items #3, #7, #12 in `django-review-lessons` cover query optimization errors found in real PRs.

## Critical Reminders

1. ALWAYS check serializer field sources -- if it traverses a FK, you need `select_related`
2. `prefetch_related` for reverse FKs and M2M, `select_related` for forward FKs
3. Use `django.test.utils.CaptureQueriesContext` or `connection.queries` to verify query count
4. `annotate()` > Python-level aggregation (always)
5. `.only()`/`.defer()` for large text/blob fields you do not need
6. Every list queryset MUST have `order_by` -- pagination requires deterministic ordering
7. **CRITICAL -- GenericForeignKey silent ignore**: `select_related('parent')` on a `GenericForeignKey` does NOTHING (Django silently ignores it because the target table is not known at query time). Use `prefetch_related('parent')` with a `GenericPrefetch`, or fetch `parent_type`/`parent_id` and resolve in Python. Inlined here because reviewers may not open references for tasks that do not explicitly mention GenericFK.

## Content Map

Supporting files loaded on demand based on task context. Consult the Contents column to decide which to Read for your current task.

| Topic | File | Contents |
|---|---|---|
| N+1 detection | `${CLAUDE_SKILL_DIR}/examples/n_plus_one_detection.md` | Detection methods: logging, pytest, `CaptureQueriesContext`. Read when auditing a QuerySet for hidden N+1 queries or writing a test that asserts query count. |
| select_related patterns | `${CLAUDE_SKILL_DIR}/examples/select_related_patterns.md` | ForeignKey and OneToOne optimization recipes. Read when the code has FK traversals in serializers or templates and you need to pre-fetch them. |
| prefetch_related patterns | `${CLAUDE_SKILL_DIR}/examples/prefetch_related_patterns.md` | ManyToMany and reverse FK optimization. Read when the code iterates over reverse relations or M2M sets. |
| Query optimization checklist | `${CLAUDE_SKILL_DIR}/checklists/query_optimization.md` | Formal checklist covering N+1, ViewSet querysets, missing `order_by`. Read when doing a pre-merge review of a ViewSet or QuerySet. |
| Performance checklist | `${CLAUDE_SKILL_DIR}/checklists/performance_checklist.md` | Query count testing and profiling levels. Read when investigating a slow endpoint or setting up performance regression tests. |
| Optimized queryset template | `${CLAUDE_SKILL_DIR}/templates/optimized_queryset.md` | Copy-paste ViewSet queryset template. Read when scaffolding a new ViewSet and you want an optimized starting point. |
| Binora hierarchy with GenericFK | `${CLAUDE_SKILL_DIR}/references/binora-hierarchy-patterns.md` | How Binora handles hierarchy traversal using `GenericForeignKey`, `parent_type`, `parent_id`, ContentType. Read when the code uses GenericFK, references `parent_type`/`parent_id` fields, or does ContentType-based hierarchy traversal. Critical for avoiding the silent `select_related('parent')` no-op. |
| Binora Rack MTI patterns | `${CLAUDE_SKILL_DIR}/references/binora-model-patterns.md` | Multi-table inheritance patterns for the Binora `Rack` hierarchy, `InheritanceManager`, `asset_ptr`. Read when the code touches `Rack`, uses `InheritanceManager`, or queries across an MTI chain. |
| Binora known deviations | `${CLAUDE_SKILL_DIR}/references/binora-deviations.md` | Legacy patterns that are known deviations from the canonical approach (e.g., empty `select_related()` in `user.py`). Read when you encounter an empty `select_related()`, unaudited legacy code, or something that looks like a tech-debt workaround. |

**Last Updated**: 2026-04-10
