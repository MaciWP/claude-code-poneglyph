---
parent: django-api
name: binora-frontend-permissions
description: Binora-specific context for the frontend_permissions dict pattern on ViewSets
---

# Binora `frontend_permissions` Pattern

## What it is

Every Binora ViewSet declares a `frontend_permissions` dict alongside the standard DRF `permission_classes`:

```python
class UserViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated, DualSystemPermissions]
    frontend_permissions = {
        "list": [FrontendPermissions.USERS_VIEW],
        "create": [FrontendPermissions.USERS_CREATE],
        "update": [FrontendPermissions.USERS_EDIT],
        "destroy": [FrontendPermissions.USERS_DELETE],
    }
```

## Why it exists

Binora bridges DRF backend permissions with frontend UI gating. The frontend needs to know which actions the current user can perform in order to show/hide buttons, menu items, and routes. Rather than round-tripping for each check, the backend exposes the per-action permission set through this dict.

The `FrontendPermissions` enum is the single source of truth — both backend (for authorization) and frontend (for UI gating) read from it.

## How to use it

| Rule | Detail |
|------|--------|
| Every ViewSet | MUST declare `frontend_permissions` |
| Every action | Should be keyed in the dict (including custom `@action`) |
| Custom actions | Must appear in both `permission_classes` on the `@action` and in `frontend_permissions` |
| Enum location | `FrontendPermissions` is defined centrally — never hardcode strings |

## Related

- `DualSystemPermissions` is the custom permission class that enforces both DRF model perms AND the frontend dict.
- See `apps/core/views/user.py` as the golden reference.
