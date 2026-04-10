---
name: django-testing
description: Django tests — loads pytest-django patterns
globs:
  - '**/tests/**/*.py'
  - '**/test_*.py'
  - '**/*_test.py'
skills:
  - django-testing-patterns
  - code-style-enforcer
---

## Django Testing Context

Fires for Python test files. Keeps the skill list tight so test work doesn't pull in the full Django stack.

Recommended skills:

- `django-testing-patterns` — pytest-django fixtures, factories, client usage
- `code-style-enforcer` — Python style consistency
