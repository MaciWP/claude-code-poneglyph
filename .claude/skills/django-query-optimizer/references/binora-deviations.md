---
parent: django-query-optimizer
name: binora-deviations
description: Binora-specific known deviations from canonical Django query optimization rules
---

# Binora Known Deviations

## `apps/core/views/user.py` — empty `.select_related()`

`apps/core/views/user.py` calls `.select_related()` without specifying fields. This is a known deviation from the rule "always specify fields explicitly".

### Why it exists

Calling `.select_related()` with no arguments follows every non-null FK on the model. It was kept during a migration when the explicit field list was not audited.

### When NOT to copy this pattern

Do not copy this pattern in new code. Always specify fields explicitly:

```python
# BAD -- do not copy from user.py
User.objects.select_related()

# GOOD -- always explicit in new code
User.objects.select_related('company', 'profile')
```

Explicit fields make query cost predictable and prevent accidental JOINs when a new FK is added to the model.
