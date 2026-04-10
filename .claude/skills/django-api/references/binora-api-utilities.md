---
parent: django-api
name: binora-api-utilities
description: Binora-specific context for custom API utilities, serializer helpers, and workarounds
---

# Binora API Utilities

## Custom serializer utilities

Located at `apps/core/utils/serializers/`:

| Utility | Purpose |
|---------|---------|
| `StrictSerializerMixin` | Rejects unknown fields on input (prevents silent ignore of typos) |
| `EnumChoiceField` | Maps Django `TextChoices` to API values in a stable way |
| `EmailListField` | Validates a list of email addresses |
| `ModelURLListField` | Accepts a list of hyperlinked URLs and resolves to instances |
| `FormSerializer` | Form-based serialization for non-model endpoints |

All new input serializers in Binora must inherit `StrictSerializerMixin` — this is non-negotiable. The default DRF behavior (silently dropping unknown fields) is considered a bug class.

## Golden reference views and serializers

| Path | What it demonstrates |
|------|----------------------|
| `apps/core/views/user.py` | Full ViewSet pattern: service DI, serializer split, query optimization, custom actions. Note: uses empty `.select_related()` — known deviation, do not copy. |
| `apps/core/serializers/accessprofile.py` | Serializer composition and nested output patterns |

## Custom routers

Binora uses `NestedDefaultRouterSanitized` for nested sub-resources instead of the default `drf-nested-routers` router. This fixes URL sanitization edge cases. When adding a nested resource, use this router — not the library default.

## How these differ from DRF defaults

| Concern | DRF default | Binora |
|---------|------------|--------|
| Unknown fields on input | Silently dropped | Rejected (`StrictSerializerMixin`) |
| Frontend UI gating | Not supported | `frontend_permissions` dict |
| Nested routing | `drf-nested-routers` | `NestedDefaultRouterSanitized` (sanitized) |
| Service layer | Not opinionated | Class-attribute DI (`*_class = Service`) |
