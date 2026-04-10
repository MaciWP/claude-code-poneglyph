# Backend-Contract Alignment

Rules for verifying that the OpenAPI contract accurately reflects the backend implementation.

---

## Alignment Checklist

| Rule | What to Check | How to Verify |
|------|---------------|---------------|
| DEFAULT_FILTER_BACKENDS | If viewset does NOT override `filter_backends`, it inherits `SearchFilter`, `OrderingFilter` from settings | Contract must include `search` + `ordering` params |
| search_fields | `ViewSet.search_fields` determines which fields are searched | `search` param description must list same fields |
| filterset_class | Each field in `FilterSet.Meta.fields` must have a corresponding query param | 1:1 mapping between FilterSet and contract |
| HyperlinkedFilter | `HyperlinkedFilter()` in FilterSet means `format: uri` + `style: form` + `explode: false` | Use the HyperlinkedFilter template |
| filter_backends override | ViewSets that override `filter_backends = [...]` lose default backends | If `OrderingFilter` not in override, contract must NOT have `ordering` param |
| ordering_fields | `ViewSet.ordering_fields` determines valid ordering values | Document in description if there are few fields |
| search_fields absence | If viewset has no `search_fields`, it does NOT support search even with SearchFilter | Contract must NOT have `search` param |
| Serializer fields | Every field in the output serializer must appear in the response schema | Cross-reference `Meta.fields` or explicit field declarations |
| Custom actions | `@action` decorator params (`methods`, `url_path`, `detail`) determine endpoint shape | Verify HTTP method, URL, and detail/list context |
| Permissions | Permission classes may restrict endpoints | Contract should include 403 response where applicable |
| Nested routers | `NestedDefaultRouterSanitized` defines parent-child URL patterns | Contract paths must reflect nesting |
| HyperlinkedModelSerializer | Output uses URLs not IDs for related objects | Response schema must use `format: uri` |

---

## Verification Steps

### Step 1: Route Verification

```bash
python manage.py show_urls | grep <endpoint>
```

Compare output with contract paths. Check:
- Base path matches `settings.API_BASE_PATH`
- Nested routes include parent path params
- Action URLs use `url_path` value (not method name)

### Step 2: Serializer-to-Schema

For each endpoint, compare:

| Serializer | Contract Schema |
|------------|----------------|
| `Meta.fields` list | `properties` keys |
| Field type (CharField, IntegerField) | `type` (string, integer) |
| `read_only=True` | `readOnly: true` |
| `required=False` | Not in `required` list |
| `allow_null=True` | `nullable: true` |
| `HyperlinkedRelatedField` | `type: string, format: uri` |
| Nested serializer | `$ref` or inline object |
| `source='get_X_display'` | `type: string` (display value) |

### Step 3: Filter Verification

For each list endpoint:

1. Check `filterset_class` on the viewset
2. For each field in `FilterSet.Meta.fields`:
   - Verify a matching query param exists in contract
   - Verify type matches (HyperlinkedFilter -> uri array, BooleanFilter -> boolean)
3. Check `search_fields` -> `search` param with correct description
4. Check `ordering_fields` -> `ordering` param
5. Verify `DEFAULT_FILTER_BACKENDS` inheritance (no explicit override)

### Step 4: Pagination Verification

All list endpoints must:
- Use `PaginatedResponse` wrapper (count, next, previous, results)
- Include `page` and `page_size` query params
- `@action` endpoints: check if `paginate_queryset()` is used

### Step 5: Examples Verification

- Examples must match actual serializer output format
- Examples should use realistic data (matching test fixtures where possible)
- Success and error responses documented

---

## Common Misalignment Patterns

| Backend | Contract (Wrong) | Contract (Correct) |
|---------|-------------------|-------------------|
| `HyperlinkedRelatedField` returns URL | `type: integer` (ID) | `type: string, format: uri` |
| `get_status_display` returns display value | `enum: [active, inactive]` | `type: string` (no enum for display) |
| Nested serializer returns object | `type: integer` (FK ID) | `$ref` to nested schema |
| `ordering_fields = ['name', 'created_at']` | No `ordering` param | `ordering` param with `type: string` |
| `filter_backends = []` on action | `search` + `ordering` params on action | No filter params on action |
| `BooleanFilter` in FilterSet | `type: string` | `type: boolean` |
