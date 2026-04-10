---
name: code-style-enforcer
description: |
  Python/Django code style enforcement -- YOLO philosophy (minimal comments), type hints,
  imports organization, naming conventions, and Black/isort formatting.
  Use when writing or reviewing Python code in this project.
type: encoded-preference
disable-model-invocation: false
effort: low
activation:
  keywords:
    - python style
    - black
    - isort
    - type hints
    - imports organization
    - naming conventions
    - yolo
    - django style
    - pep8
    - code style
for_agents: [builder]
context: fork
version: "2.0.0"
---

# Code Style Enforcer

> I enforce YOLO philosophy -- code should be self-explanatory, no excessive comments.

## Core Principle: YOLO Philosophy

**THE #1 RULE: Code should be self-explanatory. Minimal or NO comments.**

```python
# FORBIDDEN - Obvious comments
def create_user(email: str) -> User:
    # Create user with email  <-- OBVIOUS!
    user = User.objects.create(email=email)
    # Return user  <-- OBVIOUS!
    return user

# CORRECT - Self-explanatory
def create_user(email: str) -> User:
    return User.objects.create(email=email)
```

### When Comments ARE Acceptable

| Comment Type | Verdict | Example |
|--------------|---------|---------|
| Obvious comments | FORBIDDEN | `# Return user` |
| Complex algorithm | OK | `# Floyd's cycle detection` |
| Non-obvious workaround | OK | `# Raw SQL needed: Django ORM can't express this window function` |
| TODO with ticket | OK | `# TODO(JRV-123): Implement retry` |
| Inline type clarification | OK | `# type: ignore[override]` for mypy |

## Quick Reference

| Rule | Pattern | Example |
|------|---------|---------|
| **Type hints** | All parameters and return types | `def get_users(status: str) -> QuerySet[User]:` |
| **`__all__`** | Declare in every module | `__all__ = ["UserService", "AssetService"]` |
| **Import order** | stdlib, third-party, local | `import os` / `from django.db import models` / `from apps.core...` |
| **Formatting** | Black (120 chars, py313) + isort (Google) | Enforced via `nox -s format` |
| **Naming** | snake_case functions/vars, PascalCase classes | `def get_users()`, `class UserService` |
| **Constants** | SCREAMING_SNAKE_CASE | `MAX_RETRIES = 3` |
| **No default exports** | Named exports preferred | `class UserService:` not wrapped in `__init__` re-exports |

### Import Organization Order

```python
# 1. Standard library
import os
from typing import Optional

# 2. Third-party
from django.db import models
from rest_framework import serializers

# 3. Local
from apps.core.models import User
from apps.core.services import UserService
```

### Type Hints Required

```python
# WRONG - No type hints
def get_users(status):
    return User.objects.filter(status=status)

# CORRECT - Full type hints
def get_users(status: str) -> QuerySet[User]:
    return User.objects.filter(status=status)
```

### Module `__all__` Declaration

```python
# Every module must declare its public API
__all__ = ["UserService", "AssetService"]

class UserService:
    pass

class AssetService:
    pass
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Functions/methods | snake_case | `def get_active_users():` |
| Variables | snake_case | `user_count = 0` |
| Classes | PascalCase | `class UserService:` |
| Constants | SCREAMING_SNAKE | `MAX_RETRIES = 3` |
| Private | Leading underscore | `def _validate_email():` |
| Test functions | `test_action_context_expected` | `def test_create_user_with_valid_email_returns_user():` |

## Anti-Patterns

| Anti-Pattern | Problem | Correct Pattern |
|--------------|---------|-----------------|
| `def get_users(status):` | Missing type hints | `def get_users(status: str) -> QuerySet[User]:` |
| `# Get users from database` | Obvious comment (YOLO violation) | Remove comment entirely |
| `# Return filtered users` | Obvious comment (YOLO violation) | Remove comment entirely |
| Mixed import order | stdlib/third-party/local not separated | Group imports: stdlib, third-party, local |
| Module without `__all__` | Unclear public API | Add `__all__ = [...]` at top of module |
| `from typing import List` | Deprecated since Python 3.9 | Use `list[str]`, `dict[str, int]` built-in generics |
| Inline imports without justification | Hard to track dependencies | File-level imports; inline only for circular imports with comment |
| Docstrings that restate function name | YOLO violation | Remove docstring or add non-obvious context |

## Documentation

| Document | Path | Content |
|----------|------|---------|
| Detecting YOLO Violations | `examples/yolo_comment_violations.md` | Grep commands and before/after refactoring patterns |
| Import Organization | `examples/import_organization.md` | Import ordering patterns |
| Type Hint Patterns | `examples/type_hint_patterns.md` | Type hint examples for Django |
| Naming Conventions | `examples/naming_conventions.md` | Naming rules and examples |
| Style Validation | `checklists/style_validation.md` | Full style validation checklist |
| Quick Fixes | `checklists/quick_fixes.md` | Common quick fix patterns |
| YOLO Philosophy | `references/yolo_philosophy.md` | Why YOLO and how to write self-documenting code |
| Module Template | `templates/module_template.md` | Standard module structure template |

## Critical Reminders

1. **NEVER** write obvious comments -- if the code needs a comment to explain what it does, refactor the code
2. **ALWAYS** add type hints to all function parameters and return types
3. **ALWAYS** declare `__all__` in modules to define the public API
4. **ALWAYS** organize imports: stdlib, third-party, local (enforced by isort)
5. **ALWAYS** run `nox -s format` before committing -- Black 120 chars, isort Google profile
