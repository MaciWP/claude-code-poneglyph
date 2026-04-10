# Serializer Patterns - Examples

## Example 1: Input/Output Separation

```python
class CategoryInputSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    description = serializers.CharField(required=False, allow_blank=True)
    parent_id = serializers.IntegerField(required=False, allow_null=True)

    def validate_name(self, value: str) -> str:
        if Category.objects.filter(name__iexact=value).exists():
            raise serializers.ValidationError("Category with this name already exists.")
        return value


class CategoryOutputSerializer(serializers.ModelSerializer):
    parent = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'parent', 'created_at']

    def get_parent(self, obj: Category) -> dict | None:
        if obj.parent:
            return {'id': obj.parent.id, 'name': obj.parent.name}
        return None
```

## Example 2: Proper Field Configuration

### CORRECT

```python
class AssetInputSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    code = serializers.CharField(max_length=50)
    status = serializers.ChoiceField(choices=['active', 'inactive', 'maintenance'])
    rack_id = serializers.IntegerField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, default='')
```

### WRONG

```python
class AssetInputSerializer(serializers.Serializer):
    name = serializers.CharField()  # No max_length
    status = serializers.CharField()  # No choices validation
    notes = serializers.CharField(required=False)  # Missing allow_blank
```

## Example 3: Validation Methods

```python
class UserInputSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    password_confirm = serializers.CharField(write_only=True)

    def validate_email(self, value: str) -> str:
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Email already registered.")
        return value.lower()

    def validate(self, attrs: dict) -> dict:
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                'password_confirm': "Passwords do not match."
            })
        return attrs
```

## Example 4: Nested Serializers

### CORRECT

```python
class RackNestedSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rack
        fields = ['id', 'name', 'location']


class AssetOutputSerializer(serializers.ModelSerializer):
    rack = RackNestedSerializer(read_only=True)
    category = CategoryNestedSerializer(read_only=True)

    class Meta:
        model = Asset
        fields = ['id', 'name', 'code', 'rack', 'category']
```

### WRONG

```python
class AssetOutputSerializer(serializers.ModelSerializer):
    class Meta:
        model = Asset
        fields = '__all__'
        depth = 2  # Never use depth!
```

## Example 5: Read-Only and Write-Only Fields

```python
class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    full_name = serializers.SerializerMethodField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'password', 'full_name', 'created_at']

    def get_full_name(self, obj: User) -> str:
        return f"{obj.first_name} {obj.last_name}"
```

## Example 6: Type Hints (mandatory)

```python
from typing import Any
from rest_framework import serializers


class CategoryInputSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)

    def validate_name(self, value: str) -> str:
        return value.strip()

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        return attrs

    def create(self, validated_data: dict[str, Any]) -> Category:
        return Category.objects.create(**validated_data)

    def update(self, instance: Category, validated_data: dict[str, Any]) -> Category:
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance
```

## Example 7: ViewSet Integration

```python
class AssetViewSet(viewsets.ModelViewSet):
    queryset = Asset.objects.select_related('rack', 'category').order_by('code')

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return AssetInputSerializer
        return AssetOutputSerializer

    def perform_create(self, serializer):
        self.asset_service.create_asset(**serializer.validated_data)
```
