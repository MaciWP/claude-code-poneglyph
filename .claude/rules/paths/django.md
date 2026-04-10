---
name: django
description: Django/DRF code — loads Django-specific skills for backend file paths
globs:
  - '**/apps/**/*.py'
  - '**/*/models.py'
  - '**/*/views.py'
  - '**/*/serializers.py'
  - '**/*/admin.py'
  - '**/*/urls.py'
  - '**/models/**/*.py'
  - '**/views/**/*.py'
  - '**/serializers/**/*.py'
  - '**/migrations/*.py'
  - '**/services/**/*.py'
  - '**/manage.py'
  - '**/settings.py'
  - '**/conftest.py'
skills:
  - django-api
  - django-architecture
  - django-query-optimizer
  - code-style-enforcer
---

## Django Context

Fires when the prompt references Django/DRF backend files (models, views, serializers, admin, urls, migrations, services, settings).

Recommended skills:

- `django-api` — DRF viewset, serializer and permission patterns
- `django-architecture` — app layout, service layer, domain boundaries
- `django-query-optimizer` — select_related/prefetch_related, N+1 prevention
- `code-style-enforcer` — Python formatting and lint conventions
