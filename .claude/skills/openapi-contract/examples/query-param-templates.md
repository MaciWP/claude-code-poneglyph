# Query Parameter YAML Templates

Copy-paste templates with correct indentation for each parameter type.

---

## search (string)

All list endpoints with `SearchFilter` and `search_fields` defined.

```yaml
- name: search
  in: query
  required: false
  schema:
    type: string
  description: "Search by {fields}"
```

## ordering (string)

All viewsets with `OrderingFilter` (including via `DEFAULT_FILTER_BACKENDS`).

```yaml
- name: ordering
  in: query
  required: false
  schema:
    type: string
  description: "Ordering"
```

## HyperlinkedFilter (array of URIs)

For FK relations using `HyperlinkedFilter()` in FilterSet (e.g. `assigned_to`, `datacenter`).

```yaml
- name: {field_name}
  in: query
  required: false
  style: form
  explode: false
  schema:
    type: array
    items:
      type: string
      format: uri
  description: "Filter by {field_name}"
```

## Array Filter Simple

For multi-value filters (e.g. tags, categories).

```yaml
- name: {field_name}
  in: query
  required: false
  style: form
  explode: true
  schema:
    type: array
    items:
      type: string
  description: "Filter by {field_name}"
```

## Boolean Filter

For boolean fields (e.g. `is_blocked`, `includes_racks`).

```yaml
- name: {field_name}
  in: query
  required: false
  schema:
    type: boolean
  description: "Filter by {field_name}"
```

## String Filter

For string fields without enum (e.g. `status`, `code`). See V4 for dynamic values.

```yaml
- name: {field_name}
  in: query
  required: false
  schema:
    type: string
  description: "Filter by {field_name}"
```

## UUID Filter

For UUID fields (e.g. workflow IDs).

```yaml
- name: {field_name}
  in: query
  required: false
  schema:
    type: string
    format: uuid
  description: "Filter by {field_name}"
```

## page / page_size

Standard pagination parameters for all list endpoints.

```yaml
- name: page
  in: query
  required: false
  schema:
    type: integer
    minimum: 1
  description: "Page number"
- name: page_size
  in: query
  required: false
  schema:
    type: integer
    minimum: 1
    maximum: 100
  description: "Number of results per page"
```
