# API Violation Severity Guide

Quick reference for mapping API violations to severity levels during code review.

## Severity Levels

| Issue | Severity | Action |
|-------|----------|--------|
| Missing `select_related`/`prefetch_related` | Critical | Fix immediately |
| Business logic in view/serializer | Critical | Move to service |
| No Input/Output separation | Critical | Split serializers |
| Manual tenant filtering | Critical | Remove |
| Missing `order_by` | Major | Fix pre-merge |
| Missing `StrictSerializerMixin` | Major | Add mixin |
| Missing `permission_classes` on `@action` | Major | Add permissions |
| No type hints on validation methods | Major | Add hints |
| Missing field constraints (`max_length`, etc.) | Major | Add constraints |
| `fields = '__all__'` | Major | List fields explicitly |
| `depth = N` | Major | Use explicit nested serializers |
| `required=False` without `allow_null`/`allow_blank` | Minor | Specify both |
| Fat view method (>15 lines) | Minor | Extract to service |

## Usage

Use this table during PR review to prioritize which issues must be fixed before merge (Critical/Major) versus can be addressed later (Minor).

- **Critical**: Block merge. Fix before approval.
- **Major**: Fix pre-merge. Exception only with reviewer agreement.
- **Minor**: Flag for improvement. Can merge with follow-up ticket.
