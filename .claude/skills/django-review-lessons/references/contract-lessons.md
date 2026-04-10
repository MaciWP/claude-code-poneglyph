# Contract Review Lessons (C1-C19)

OpenAPI contract-specific lessons learned from past PRs. These items are intentionally duplicated in the `openapi-contract` skill as they apply to both review and contract contexts.

---

### #C1: Response schemas must match serializer output

**Category**: Contract
**Severity**: Critical

**Rule**: Response schemas must match actual serializer output (fields, types, nesting).

**Incorrect**:
```yaml
# Schema says product is an integer
product:
  type: integer
```
```python
# But serializer returns nested object
class AssetSerializer(serializers.ModelSerializer):
    product_model = ProductModelSerializer(read_only=True)  # returns {id, name, manufacturer}
```

**Correct**:
```yaml
product_model:
  allOf:
    - $ref: '#/components/schemas/ProductModel'
  readOnly: true
```

**Detection**: Compare serializer fields with OpenAPI schema properties — types and nesting must match exactly.

---

### #C2: Use $ref for reusable schemas

**Category**: Contract
**Severity**: Minor

**Rule**: Use `$ref` for reusable schemas. Don't duplicate schema definitions across paths.

**Incorrect**:
```yaml
paths:
  /api/assets/:
    get:
      responses:
        200:
          content:
            application/json:
              schema:
                properties:
                  id: {type: integer}
                  name: {type: string}
  /api/assets/{id}/:
    get:
      responses:
        200:
          content:
            application/json:
              schema:
                properties:
                  id: {type: integer}  # duplicated!
                  name: {type: string}  # duplicated!
```

**Correct**:
```yaml
components:
  schemas:
    Asset:
      type: object
      properties:
        id: {type: integer, readOnly: true}
        name: {type: string}

paths:
  /api/assets/:
    get:
      responses:
        200:
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PaginatedAssetList'
  /api/assets/{id}/:
    get:
      responses:
        200:
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Asset'
```

**Detection**: `grep -rn "type: object" openapi.yaml` — look for inline schemas that should be refs.

---

### #C3: Nullable fields must have nullable: true

**Category**: Contract
**Severity**: Critical

**Rule**: Nullable fields must have `nullable: true` in the OpenAPI spec.

**Incorrect**:
```yaml
parent:
  allOf:
    - $ref: '#/components/schemas/Asset'
```

**Correct**:
```yaml
parent:
  nullable: true
  allOf:
    - $ref: '#/components/schemas/Asset'
```

**Detection**: `grep -rn "null=True" apps/*/models/ --include="*.py"` — cross-reference with OpenAPI spec for `nullable: true`.

---

### #C4: Enum values must match Django choices case exactly

**Category**: Contract
**Severity**: Critical

**Rule**: Enum values must use the exact case from Django `.value`, not display names or arbitrary casing. This lesson focuses on **case mismatch** (e.g., UPPERCASE in contract vs lowercase in Django). See also #C17 for **format mismatch** (display names vs values, underscores).

**Incorrect**:
```yaml
status:
  type: string
  enum: [ACTIVE, INACTIVE]  # uppercase
```
```python
class Asset(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active"  # lowercase in DB
        INACTIVE = "inactive"
```

**Correct**:
```yaml
status:
  type: string
  enum: [active, inactive]  # matches Django choices values
```

**Detection**: `grep -rn "TextChoices\|IntegerChoices" apps/ --include="*.py"` then compare with OpenAPI enums.

---

### #C5: Read-only fields must be marked readOnly: true

**Category**: Contract
**Severity**: Minor

**Rule**: Read-only fields must be marked `readOnly: true`. Includes `id`, `created_at`, auto-generated fields.

**Incorrect**:
```yaml
id:
  type: integer
created_at:
  type: string
  format: date-time
```

**Correct**:
```yaml
id:
  type: integer
  readOnly: true
created_at:
  type: string
  format: date-time
  readOnly: true
```

**Detection**: `grep -rn "read_only=True\|readOnly" apps/*/serializers/ --include="*.py"` — verify matching in OpenAPI.

---

### #C6: URL patterns must match router output exactly

**Category**: Contract
**Severity**: Critical

**Rule**: URL patterns must match `router.urls` output exactly.

**Incorrect**:
```yaml
paths:
  /api/asset/:  # wrong! plural is 'assets'
    get: ...
```

**Correct**:
```yaml
paths:
  /api/assets/:  # matches router.register("assets", AssetViewSet)
    get: ...
```

**Detection**: `python manage.py show_urls` — compare output with OpenAPI paths.

---

### #C7: Path parameters must use correct types

**Category**: Contract
**Severity**: Critical

**Rule**: Path parameters must use correct types. Integer PK: `type: integer`, UUID: `type: string, format: uuid`.

**Incorrect**:
```yaml
/api/assets/{id}/:
  parameters:
    - name: id
      in: path
      schema:
        type: string  # wrong if model uses integer PK
```

**Correct**:
```yaml
/api/assets/{id}/:
  parameters:
    - name: id
      in: path
      required: true
      schema:
        type: integer  # matches AutoField
```

**Detection**: Cross-reference model PK type with OpenAPI path parameter types.

---

### #C8: Action URLs must include url_path if different from method name

**Category**: Contract
**Severity**: Critical

**Rule**: Action URLs must include `url_path` if different from method name.

**Incorrect**:
```yaml
/api/assets/{id}/mark_as_active/:  # wrong! url_path uses hyphens
  post: ...
```
```python
@action(detail=True, methods=["post"], url_path="mark-active")
def mark_as_active(self, request, pk=None): ...
```

**Correct**:
```yaml
/api/assets/{id}/mark-active/:  # matches url_path
  post: ...
```

**Detection**: `grep -rn "url_path=" apps/ --include="*.py"` — verify each matches OpenAPI path.

---

### #C9: Nested routes must reflect parent-child relationship

**Category**: Contract
**Severity**: Critical

**Rule**: Nested routes must reflect parent-child relationship in the URL structure.

**Incorrect**:
```yaml
/api/rack-assets/:  # flat URL for nested resource
  get: ...
```

**Correct**:
```yaml
/api/racks/{rack_id}/assets/:  # nested URL reflects relationship
  get: ...
```

**Detection**: `grep -rn "NestedDefaultRouter" apps/ --include="*.py"` — verify nested routes match OpenAPI.

---

### #C10: Paginated endpoints must use PaginatedResponse wrapper

**Category**: Contract
**Severity**: Critical

**Rule**: Paginated endpoints must use `{count, next, previous, results}` wrapper, not bare array.

**Incorrect**:
```yaml
/api/assets/:
  get:
    responses:
      200:
        content:
          application/json:
            schema:
              type: array  # wrong! missing pagination wrapper
              items:
                $ref: '#/components/schemas/Asset'
```

**Correct**:
```yaml
/api/assets/:
  get:
    responses:
      200:
        content:
          application/json:
            schema:
              type: object
              properties:
                count: {type: integer}
                next: {type: string, format: uri, nullable: true}
                previous: {type: string, format: uri, nullable: true}
                results:
                  type: array
                  items:
                    $ref: '#/components/schemas/Asset'
```

**Detection**: `grep -rn "type: array" openapi.yaml` — verify list endpoints have pagination wrapper.

---

### #C11: List endpoints must document page/page_size params

**Category**: Contract
**Severity**: Minor

**Rule**: List endpoints must document `page`/`page_size` query parameters.

**Incorrect**:
```yaml
/api/assets/:
  get:
    # no parameters section for pagination
    responses:
      200: ...
```

**Correct**:
```yaml
/api/assets/:
  get:
    parameters:
      - name: page
        in: query
        schema:
          type: integer
          minimum: 1
      - name: page_size
        in: query
        schema:
          type: integer
          minimum: 1
          maximum: 100
    responses:
      200: ...
```

**Detection**: Review OpenAPI list endpoints for missing pagination parameters.

---

### #C12: @action endpoints must specify if paginated

**Category**: Contract
**Severity**: Minor

**Rule**: `@action` endpoints returning lists must specify if paginated in the contract.

**Incorrect**:
```yaml
/api/assets/{id}/history/:
  get:
    responses:
      200:
        content:
          application/json:
            schema:
              type: array  # is it paginated or not?
```

**Correct**:
```yaml
# If action uses paginate_queryset():
/api/assets/{id}/history/:
  get:
    parameters:
      - name: page
        in: query
        schema: {type: integer, minimum: 1}
    responses:
      200:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PaginatedHistoryList'

# If action returns bare list:
/api/assets/{id}/children/:
  get:
    responses:
      200:
        content:
          application/json:
            schema:
              type: array
              items:
                $ref: '#/components/schemas/AssetSummary'
```

**Detection**: `grep -rn "paginate_queryset" apps/ --include="*.py"` — verify corresponding contract has pagination.

---

### #C13: Examples must use realistic data

**Category**: Contract
**Severity**: Minor

**Rule**: Examples must use realistic data, not generic placeholders.

**Incorrect**:
```yaml
example:
  name: "string"
  code: "string"
  status: "string"
```

**Correct**:
```yaml
example:
  name: "Dell PowerEdge R740"
  code: "DC01-RM01-RCK-00001"
  status: "active"
```

**Detection**: `grep -rn '"string"\|"example"' openapi.yaml` — generic placeholder values.

---

### #C14: Examples must cover success AND error cases

**Category**: Contract
**Severity**: Minor

**Rule**: Examples must cover success AND error cases. Document 201, 400, 409 responses.

**Incorrect**:
```yaml
/api/assets/:
  post:
    responses:
      201:
        description: Created
        # only success documented
```

**Correct**:
```yaml
/api/assets/:
  post:
    responses:
      201:
        description: Asset created successfully
      400:
        description: Validation error
      409:
        description: Asset with this code already exists
```

**Detection**: Review POST/PUT/PATCH endpoints for missing error response documentation.

---

### #C15: Enum fields must show all valid values in examples

**Category**: Contract
**Severity**: Minor

**Rule**: Demonstrate different enum values across examples.

**Incorrect**:
```yaml
examples:
  example1:
    value:
      status: "active"
  example2:
    value:
      status: "active"  # same value in both examples
```

**Correct**:
```yaml
examples:
  active_asset:
    value:
      status: "active"
  inactive_asset:
    value:
      status: "inactive"
```

**Detection**: Review OpenAPI examples for enum field variety.

---

### #C16: Enums must be defined once and referenced

**Category**: Contract
**Severity**: Minor

**Rule**: Define enums in `components/schemas`, use `$ref` everywhere.

**Incorrect**:
```yaml
# Duplicated in multiple places
/api/assets/:
  post:
    requestBody:
      content:
        application/json:
          schema:
            properties:
              status:
                type: string
                enum: [active, inactive, maintenance]  # inline enum

/api/assets/{id}/:
  patch:
    requestBody:
      content:
        application/json:
          schema:
            properties:
              status:
                type: string
                enum: [active, inactive, maintenance]  # duplicated!
```

**Correct**:
```yaml
components:
  schemas:
    AssetStatus:
      type: string
      enum: [active, inactive, maintenance]

# Referenced everywhere
status:
  $ref: '#/components/schemas/AssetStatus'
```

**Detection**: `grep -rn "enum:" openapi.yaml` — look for duplicate enum definitions.

---

### #C17: Enum values must use Django `.value`, not display names

**Category**: Contract
**Severity**: Critical

**Rule**: Exact string match including underscores between Django choices `.value` and OpenAPI enums. This lesson focuses on **format mismatch** (display names vs values, underscores). See also #C4 for **case mismatch** (UPPERCASE vs lowercase).

**Incorrect**:
```yaml
asset_type:
  type: string
  enum: [Server, Network Device, Storage]  # display names, not values
```
```python
class Type(models.TextChoices):
    SERVER = "server"
    NETWORK_DEVICE = "network_device"
    STORAGE = "storage"
```

**Correct**:
```yaml
asset_type:
  type: string
  enum: [server, network_device, storage]  # matches .value
```

**Detection**: Compare `TextChoices` values (`.value`) with OpenAPI enum arrays.

---

### #C18: New model choices must be reflected in contract

**Category**: Contract
**Severity**: Critical

**Rule**: When new choices are added to a model, they must be reflected in the OpenAPI contract. Flow: update model -> update OpenAPI enum -> migration -> tests.

**Incorrect**:
```python
class Status(models.TextChoices):
    ACTIVE = "active"
    INACTIVE = "inactive"
    MAINTENANCE = "maintenance"  # new choice added
```
```yaml
# Contract NOT updated
status:
  enum: [active, inactive]  # missing 'maintenance'
```

**Correct**:
```python
class Status(models.TextChoices):
    ACTIVE = "active"
    INACTIVE = "inactive"
    MAINTENANCE = "maintenance"
```
```yaml
status:
  enum: [active, inactive, maintenance]  # updated
```

**Detection**: `git diff apps/*/models/ --include="*.py" | grep "TextChoices\|IntegerChoices"` — check if contract was updated too.

---

### #C19: Deprecated enum values must be documented, not removed

**Category**: Contract
**Severity**: Minor

**Rule**: Mark deprecated enum values as deprecated in description, keep in enum array.

**Incorrect**:
```yaml
status:
  type: string
  enum: [active, inactive]  # removed 'draft' that some clients may still use
```

**Correct**:
```yaml
status:
  type: string
  enum: [active, inactive, draft]
  description: |
    Asset status. 'draft' is deprecated and will be removed in v3.
```

**Detection**: `git log --diff-filter=M -p openapi.yaml | grep "enum:"` — check for removed enum values.

---

## See Also
- `.claude/skills/openapi-contract/references/contract-rules.md` — Contract rules and voting decisions
