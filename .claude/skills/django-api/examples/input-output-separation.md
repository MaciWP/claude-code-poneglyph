# Input/Output Serializer Separation - Examples

Demonstrates the I/O split pattern across different scenarios in Binora.

## Pattern Overview

```
POST/PUT/PATCH request -> InputSerializer (validates) -> Service (processes) -> OutputSerializer (formats) -> Response
GET request -> get_queryset() -> OutputSerializer (formats) -> Response
```

## Example 1: User CRUD

```python
# Input: Create
class UserCreateSerializer(StrictSerializerMixin, serializers.Serializer):
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    access_profile = serializers.HyperlinkedRelatedField(
        queryset=AccessProfile.objects.all(),
        view_name="accessprofile-detail",
    )

    def validate_email(self, value: str) -> str:
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Email already exists.")
        return value.lower()


# Input: Update (different fields, partial support)
class UserUpdateSerializer(StrictSerializerMixin, serializers.Serializer):
    first_name = serializers.CharField(max_length=150, required=False)
    last_name = serializers.CharField(max_length=150, required=False)
    is_active = serializers.BooleanField(required=False)

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        is_put = request and hasattr(request, "method") and request.method == "PUT"
        if not self.partial and is_put:
            for field_name in ["first_name", "last_name"]:
                self.fields[field_name].required = True


# Output: Detail view
class UserOutputSerializer(serializers.HyperlinkedModelSerializer):
    access_profile = AccessProfileInfoSerializer(read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['url', 'email', 'first_name', 'last_name', 'full_name',
                  'access_profile', 'is_active', 'created_at']

    def get_full_name(self, obj: User) -> str:
        return f"{obj.first_name} {obj.last_name}"


# Output: Minimal nested (for use inside other serializers)
class UserInfoSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = User
        fields = ['url', 'email', 'first_name', 'last_name']
```

## Example 2: Asset with EnumChoiceField

```python
from apps.core.utils.serializers import EnumChoiceField, StrictSerializerMixin


class AssetCreateSerializer(StrictSerializerMixin, serializers.Serializer):
    name = serializers.CharField(max_length=255)
    asset_type = EnumChoiceField(enum_class=Asset.Type)
    product_model = serializers.HyperlinkedRelatedField(
        queryset=ProductModel.objects.all(),
        view_name="productmodel-detail",
    )
    parent = serializers.HyperlinkedRelatedField(
        queryset=Rack.objects.all(),
        view_name="rack-detail",
        required=False,
        allow_null=True,
    )
    serial_number = serializers.CharField(max_length=100, required=False, allow_blank=True)


class AssetOutputSerializer(serializers.HyperlinkedModelSerializer):
    asset_type = EnumChoiceField(enum_class=Asset.Type, read_only=True)
    product_model = ProductModelInfoSerializer(read_only=True)
    parent = serializers.SerializerMethodField()

    class Meta:
        model = Asset
        fields = ['url', 'name', 'code', 'asset_type', 'product_model',
                  'parent', 'serial_number', 'status', 'created_at']

    def get_parent(self, obj: Asset) -> dict | None:
        if obj.parent:
            return {'url': obj.parent.url, 'name': str(obj.parent)}
        return None
```

## Example 3: ViewSet Wiring

```python
class UserViewSet(ModelViewSet):
    auth_service_class = AuthService
    queryset = User.objects.select_related('company', 'access_profile').order_by('id')
    serializer_class = UserOutputSerializer  # Default = output
    frontend_permissions = {
        "list": [FrontendPermissions.USERS_VIEW],
        "create": [FrontendPermissions.USERS_CREATE],
        "update": [FrontendPermissions.USERS_EDIT],
    }

    def get_serializer_class(self):
        return {
            "create": UserCreateSerializer,
            "update": UserUpdateSerializer,
            "partial_update": UserUpdateSerializer,
        }.get(self.action, self.serializer_class)

    def perform_create(self, serializer):
        user = self.auth_service_class().create_user(serializer.validated_data)
        serializer.instance = user

    def perform_update(self, serializer):
        user = self.auth_service_class().update_user(
            self.get_object(), serializer.validated_data
        )
        serializer.instance = user
```

## Key Rules

| Rule | Detail |
|------|--------|
| `serializer_class` is always Output | DRF uses it for list/retrieve by default |
| `get_serializer_class()` maps actions to Input | Only create/update/partial_update use Input |
| Input uses `StrictSerializerMixin` | Rejects unknown fields |
| Output uses `HyperlinkedModelSerializer` | URLs instead of raw IDs |
| Nested output uses `*InfoSerializer` | Minimal fields, read-only |
| `perform_*` assigns `serializer.instance` | DRF needs it for response serialization |
