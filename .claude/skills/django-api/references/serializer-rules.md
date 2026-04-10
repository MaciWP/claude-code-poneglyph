# Serializer Rules Reference

Naming conventions, field configuration, validation patterns, and detection commands for DRF serializers in Binora.

## Naming Conventions

| Suffix | Purpose | Example |
|--------|---------|---------|
| `*CreateSerializer` | Create operations (input) | `UserCreateSerializer` |
| `*UpdateSerializer` | Update/PATCH (input) | `UserUpdateSerializer` |
| `*OutputSerializer` | Detail read (output) | `AssetOutputSerializer` |
| `*InfoSerializer` | Minimal read-only nested | `UserInfoSerializer` |
| `*ListSerializer` | Optimized for list views | `GroupListSerializer` |

## Base Patterns

| Pattern | Rule |
|---------|------|
| Default base | `HyperlinkedModelSerializer` |
| Relationships | `url` field instead of `id` |
| Writable FK | `HyperlinkedRelatedField` with `queryset` and `view_name` |
| Field listing | Always explicit (never `fields = '__all__'`) |
| Nested data | Explicit nested serializers (never `depth`) |
| Unknown fields | `StrictSerializerMixin` on all input serializers |

## Field Configuration

### Required Options

| Option | When | Example |
|--------|------|---------|
| `max_length` | CharField | `CharField(max_length=255)` |
| `choices` | Limited values | `ChoiceField(choices=['active', 'inactive'])` |
| `required` + `allow_null` | Optional nullable | `IntegerField(required=False, allow_null=True)` |
| `required` + `allow_blank` | Optional text | `CharField(required=False, allow_blank=True)` |
| `write_only` | Sensitive input | `CharField(write_only=True)` |
| `read_only` | Computed output | `SerializerMethodField(read_only=True)` |

### Project Custom Fields

| Field | Purpose | Import |
|-------|---------|--------|
| `StrictSerializerMixin` | Rejects unknown fields | `apps.core.utils.serializers` |
| `EnumChoiceField` | Maps `TextChoices` to API values | `apps.core.utils.serializers` |
| `EmailListField` | Validates list of emails | `apps.core.utils.serializers` |
| `ModelURLListField` | Accepts list of hyperlinked URLs | `apps.core.utils.serializers` |

## Validation Patterns

### Field-Level

```python
def validate_email(self, value: str) -> str:
    if User.objects.filter(email__iexact=value).exists():
        raise serializers.ValidationError("Email already registered.")
    return value.lower()
```

### Object-Level

```python
def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
    if attrs['password'] != attrs['password_confirm']:
        raise serializers.ValidationError({
            'password_confirm': "Passwords do not match."
        })
    return attrs
```

### Type Hints (mandatory)

```python
def validate_name(self, value: str) -> str: ...
def validate(self, attrs: dict[str, Any]) -> dict[str, Any]: ...
def create(self, validated_data: dict[str, Any]) -> Model: ...
def update(self, instance: Model, validated_data: dict[str, Any]) -> Model: ...
```

## PUT vs PATCH Handling

```python
def __init__(self, *args: Any, **kwargs: Any) -> None:
    super().__init__(*args, **kwargs)
    request = self.context.get("request")
    is_put = request and hasattr(request, "method") and request.method == "PUT"
    if not self.partial and is_put:
        for field_name in ["first_name", "last_name"]:
            self.fields[field_name].required = True
```

## extra_kwargs Reference

| Option | Purpose |
|--------|---------|
| `lookup_field` | URL lookup (e.g., `"email"`, `"id"`) |
| `required` | Field requirement override |
| `max_length` | Max string length |
| `allow_null` / `allow_blank` | Accept null/empty values |
| `validators: []` | Disable default validators |

## Anti-Patterns

| Incorrect | Correct | Why |
|-----------|---------|-----|
| `fields = '__all__'` | List fields explicitly | Prevents accidental exposure |
| `depth = N` | Explicit nested serializers | N+1 queries, unpredictable output |
| Single serializer for read/write | Separate Input/Output | Different responsibilities |
| `required=False` without `allow_null`/`allow_blank` | Specify both | Ambiguous DRF behavior |
| No validation methods | Add `validate_*` methods | Bad data accepted |
| Business logic in `validate()` | Move to service layer | Serializers validate shape only |
| Missing `StrictSerializerMixin` on input | Add mixin | Prevents silent field ignoring |
| Reimplementing custom fields | Use `apps.core.utils.serializers` | Avoid duplication |

## Detection Commands

```python
# Find __all__ usage
Grep("fields = '__all__'", "apps/", type="py")

# Find depth usage
Grep("depth = ", "apps/", type="py")

# Find serializers without naming convention
Grep("class.*Serializer.*:$", "apps/")
```

## Reference Files

- `apps/core/serializers/accessprofile.py` -- canonical Input/Output example
- `apps/core/utils/serializers/` -- project custom fields
