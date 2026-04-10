# Contract Checklist

Use for both writing new contracts and reviewing contract changes.

---

## Before Writing (New Endpoints Only)

- [ ] Endpoint design agreed upon (HTTP method, URL pattern, request/response shapes)
- [ ] Serializers designed (input vs output, field list known)
- [ ] FilterSet designed (which fields are filterable)
- [ ] Router registration known (nested or flat, url_path for actions)
- [ ] Permissions defined (which roles can access)

## Voting Decisions (Blocking)

- [ ] V1: `search` is `type: string` (not array)
- [ ] V2: Boolean filters use `type: boolean`
- [ ] V3: Descriptions follow "Filter by X" pattern
- [ ] V4: No `enum` for dynamic values (status, type)
- [ ] V5: `ordering` is `type: string` (not array)
- [ ] V6: All query params have `required: false`

## Path Definition

- [ ] URL matches router registration (use `router.urls` output to verify)
- [ ] HTTP method matches view action (GET for list/retrieve, POST for create, etc.)
- [ ] Nested routes include parent path parameter (e.g. `/assets/{asset_id}/documents/`)
- [ ] Action endpoints use `url_path` value, not method name
- [ ] `operationId` is unique and descriptive

## Request Body (POST/PUT/PATCH)

- [ ] Input schema is separate from output schema
- [ ] Required fields listed in `required` array
- [ ] PATCH endpoints: fields are NOT required (partial update)
- [ ] FK references accept URL (`format: uri`) if using HyperlinkedModelSerializer
- [ ] Nullable fields marked `nullable: true`

## Response Schema

- [ ] All serializer fields present in schema properties
- [ ] Field types match serializer field types (see SKILL.md type mapping)
- [ ] Nested serializers use `$ref` to separate schema
- [ ] `readOnly: true` on auto-generated fields (id, url, code, created_at)
- [ ] HyperlinkedRelatedField outputs `type: string, format: uri`
- [ ] `get_X_display` fields are `type: string` (no enum for display values)

## Query Parameters (List Endpoints)

- [ ] `page` and `page_size` params present
- [ ] `search` param if viewset has `search_fields` (type: string, V1)
- [ ] `ordering` param if viewset inherits `OrderingFilter` (type: string, V5)
- [ ] All FilterSet fields have corresponding query params
- [ ] HyperlinkedFilter uses correct template (`format: uri`, `style: form`, `explode: false`)
- [ ] Boolean filters use `type: boolean` (V2)
- [ ] All query params have `required: false` (V6)
- [ ] No `enum` on dynamic values (V4)
- [ ] Descriptions follow "Filter by X" format (V3)
- [ ] search_fields match search param description
- [ ] No filter params on `@action` endpoints with `filter_backends = []`
- [ ] DEFAULT_FILTER_BACKENDS awareness (ordering/search presence)

## Schema Accuracy (Critical)

- [ ] C1: Response schemas match serializer output (all fields, correct types)
- [ ] C3: Nullable fields marked `nullable: true`
- [ ] C4: Enum values match Django choices (case-sensitive)
- [ ] C6: URL patterns match `router.urls` / `show_urls`
- [ ] C7: Path parameters use correct types (integer vs uuid)
- [ ] C8: Action URLs use `url_path` value
- [ ] C9: Nested routes reflect parent-child relationship

## Pagination (Critical)

- [ ] C10: PaginatedResponse wrapper used for list endpoints
- [ ] C11: `page`/`page_size` params documented
- [ ] C12: `@action` list endpoints specify pagination
- [ ] Wrapper has: count (integer), next (uri, nullable), previous (uri, nullable), results (array)

## Enums (Critical)

- [ ] C17: Enum values match Django choices exactly (case + underscores)
- [ ] C18: New model choices reflected in contract
- [ ] C19: Deprecated values documented, not removed

## Structure (Minor)

- [ ] C2: `$ref` used for reusable schemas (DRY)
- [ ] C5: Read-only fields marked `readOnly: true`
- [ ] C16: Enums defined once, referenced via `$ref`
- [ ] No redundant `type: object` in allOf wrappers
- [ ] URLs used over IDs in output schemas
- [ ] Consistent with existing contract patterns
- [ ] Tags assigned for grouping

## Examples (Minor)

- [ ] C13: Realistic data (domain-specific values)
- [ ] C14: Success AND error cases covered (200/201, 400, 403, 404)
- [ ] C15: Enum fields show valid values in examples
- [ ] Examples match test fixtures where applicable

## Response Codes

- [ ] 200 for GET/PUT/PATCH success
- [ ] 201 for POST success
- [ ] 204 for DELETE success
- [ ] 400 for validation errors
- [ ] 401 for unauthenticated
- [ ] 403 for forbidden (if permissions apply)
- [ ] 404 for not found (detail endpoints)
- [ ] 409 for conflicts (if applicable)

## Final Verification

- [ ] Run `nox -s test_contract` to validate
- [ ] Compare with existing similar endpoints for consistency
- [ ] Contract examples will be used as test data -- verify they are valid
