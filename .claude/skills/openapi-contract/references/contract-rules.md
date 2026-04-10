# Contract Rules (C1-C19)

Contract-specific lessons learned from PR reviews. Each rule includes detection guidance.

---

## Schema Accuracy (Critical)

### C1: Response Schemas Must Match Serializer Output

Response schemas must match actual serializer output (fields, types, nesting).

| Incorrect | Correct |
|-----------|---------|
| `product: integer` (ID) | `product_model: { $ref: '#/.../ProductModel' }` (nested object) |
| Missing `url` field | Include all `Meta.fields` from serializer |

**Detection**: Compare `Meta.fields` list in output serializer with `properties` in response schema.

### C3: Nullable Fields

Nullable fields must have `nullable: true`.

| Incorrect | Correct |
|-----------|---------|
| `parent: { $ref: '#/.../Asset' }` | `parent: { nullable: true, allOf: [{ $ref: '#/.../Asset' }] }` |

**Detection**: Grep for `null=True` or `allow_null=True` in model/serializer, verify contract has `nullable: true`.

### C4: Enum Values Case Match

Enum values must match model choices exactly (case-sensitive).

| Incorrect | Correct |
|-----------|---------|
| `enum: [ACTIVE, INACTIVE]` | `enum: [active, inactive]` |

**Detection**: Compare `Model.Status.choices` values with contract enum values.

### C6: URL Patterns Match Router

URL patterns must match `router.urls` output.

| Incorrect | Correct |
|-----------|---------|
| `/api/asset/` (singular) | `/api/assets/` (plural, matching router) |

**Detection**: Run `python manage.py show_urls` and compare with contract paths.

### C7: Path Parameter Types

Path parameters must use correct types (`integer` vs `string`, `format: uuid`).

| Incorrect | Correct |
|-----------|---------|
| `type: string` for integer PK | `type: integer` |
| `type: integer` for UUID PK | `type: string, format: uuid` |

**Detection**: Check model PK field type (AutoField -> integer, UUIDField -> string+uuid).

### C8: Action URL Paths

Action URLs must include `url_path` if different from method name.

| Incorrect | Correct |
|-----------|---------|
| `/assets/{id}/mark_as_active/` | `/assets/{id}/mark-active/` (matching `url_path='mark-active'`) |

**Detection**: Check `@action(url_path=...)` decorator parameter.

### C9: Nested Routes

Nested routes must reflect parent-child relationship.

| Incorrect | Correct |
|-----------|---------|
| `/documents/?asset_id={id}` | `/assets/{asset_id}/documents/` |

**Detection**: Check `NestedDefaultRouterSanitized` registration in `routers.py`.

---

## Structure and DRY (Minor)

### C2: Use $ref for Reusable Schemas

Define schemas once in `components/schemas`, reference everywhere with `$ref`.

**Detection**: Search for duplicate schema definitions across paths.

### C5: Read-Only Fields

Read-only fields must be marked `readOnly: true`.

| Fields | Action |
|--------|--------|
| `id`, `url`, `created_at`, `updated_at`, auto-generated codes | Mark `readOnly: true` |

**Detection**: Check serializer for `read_only=True` fields and auto-generated fields.

### C16: Enums Defined Once

Enums must be defined once in `components/schemas` and referenced via `$ref`.

**Detection**: Search for duplicate enum definitions.

---

## Pagination and Lists (Critical)

### C10: Paginated Response Wrapper

Paginated endpoints must use PaginatedResponse wrapper with `count`, `next`, `previous`, `results`.

| Incorrect | Correct |
|-----------|---------|
| Bare `type: array` | Wrapper object with `results: array` |

**Detection**: Check list endpoints for pagination wrapper.

### C11: Page/Page_Size Params

List endpoints must document `page` and `page_size` query parameters.

**Detection**: Verify query params section of list endpoints.

### C12: Action List Pagination

`@action` endpoints returning lists must specify if paginated.

**Detection**: Check if action uses `self.paginate_queryset()`.

---

## Query Parameters (Major)

Query parameter conventions:

- HyperlinkedFilter must use `format: uri` + `style: form` + `explode: false`
- ALL viewsets with `DEFAULT_FILTER_BACKENDS` must have `ordering` param
- ALL viewsets with `search_fields` must have `search` param
- FilterSet fields must have 1:1 corresponding query params
- `search` param description must match `search_fields` on viewset

---

## Enum Governance (Critical)

### C17: Enum Values Match Django Choices

Enum values must match Django choices exactly (case-sensitive, including underscores).

| Django | Contract (Wrong) | Contract (Correct) |
|--------|-------------------|-------------------|
| `'in_progress'` | `IN_PROGRESS` | `in_progress` |

**Detection**: Compare model `TextChoices`/`IntegerChoices` with contract enums.

### C18: New Choices Reflected

New choices added to model must be reflected in contract.

**Detection**: Check recent migrations for `AlterField` on choice fields, verify contract updated.

### C19: Deprecated Values Documented

Deprecated enum values must be documented in description, not removed from enum list.

```yaml
# CORRECT
status:
  type: string
  enum: [active, inactive, legacy_pending]
  description: "Asset status. `legacy_pending` is deprecated -- use `inactive` instead."
```

**Detection**: Check git history for removed enum values.

---

## See Also

- `.claude/skills/django-review-lessons/references/contract-lessons.md` — Contract lessons from past PR reviews

---

## Examples (Minor)

### C13: Realistic Data

Examples must use realistic data matching the domain.

| Incorrect | Correct |
|-----------|---------|
| `"name": "string"` | `"name": "Dell PowerEdge R740"` |

### C14: Success and Error Cases

Examples must cover success AND error responses (201, 400, 409).

### C15: Enum Values in Examples

Enum fields must show all valid values across different examples.

**Detection**: Check that examples demonstrate variety in enum fields.
