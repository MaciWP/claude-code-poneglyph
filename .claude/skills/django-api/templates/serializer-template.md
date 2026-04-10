# Serializer Template

Copy-paste templates for creating Input + Output serializer pairs in Binora.

## Create Serializer (Input)

```python
from typing import Any

from rest_framework import serializers

from apps.core.utils.serializers import EnumChoiceField, StrictSerializerMixin

from ..models import MyModel


class MyModelCreateSerializer(StrictSerializerMixin, serializers.Serializer):
    name = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True, default='')
    status = EnumChoiceField(enum_class=MyModel.Status)
    parent = serializers.HyperlinkedRelatedField(
        queryset=ParentModel.objects.all(),
        view_name="parentmodel-detail",
        required=False,
        allow_null=True,
    )

    def validate_name(self, value: str) -> str:
        if MyModel.objects.filter(name__iexact=value).exists():
            raise serializers.ValidationError("Name already exists.")
        return value.strip()

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        # Cross-field validation here (shape only, no business logic)
        return attrs
```

## Update Serializer (Input)

```python
class MyModelUpdateSerializer(StrictSerializerMixin, serializers.Serializer):
    name = serializers.CharField(max_length=255, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    status = EnumChoiceField(enum_class=MyModel.Status, required=False)

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        is_put = request and hasattr(request, "method") and request.method == "PUT"
        if not self.partial and is_put:
            for field_name in ["name"]:
                self.fields[field_name].required = True

    def validate_name(self, value: str) -> str:
        instance = self.context.get("instance") or getattr(self, "instance", None)
        qs = MyModel.objects.filter(name__iexact=value)
        if instance:
            qs = qs.exclude(pk=instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Name already exists.")
        return value.strip()
```

## Output Serializer (Detail)

```python
class MyModelOutputSerializer(serializers.HyperlinkedModelSerializer):
    status = EnumChoiceField(enum_class=MyModel.Status, read_only=True)
    parent = ParentInfoSerializer(read_only=True)
    created_by = UserInfoSerializer(read_only=True)

    class Meta:
        model = MyModel
        fields = [
            'url', 'name', 'code', 'description', 'status',
            'parent', 'created_by', 'created_at', 'updated_at',
        ]
```

## Info Serializer (Minimal Nested)

```python
class MyModelInfoSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = MyModel
        fields = ['url', 'name', 'code']
```

## List Serializer (Optimized)

```python
class MyModelListSerializer(serializers.HyperlinkedModelSerializer):
    status = EnumChoiceField(enum_class=MyModel.Status, read_only=True)

    class Meta:
        model = MyModel
        fields = ['url', 'name', 'code', 'status', 'created_at']
```

## Field Quick Reference

| Need | Field | Config |
|------|-------|--------|
| Required text | `CharField(max_length=N)` | Always set `max_length` |
| Optional text | `CharField(required=False, allow_blank=True)` | Both flags needed |
| Optional FK | `HyperlinkedRelatedField(required=False, allow_null=True)` | Both flags needed |
| Enum | `EnumChoiceField(enum_class=Model.Choices)` | From project utils |
| Email list | `EmailListField()` | From project utils |
| URL list | `ModelURLListField(queryset=..., view_name=...)` | From project utils |
| Sensitive input | `CharField(write_only=True)` | Never in output |
| Computed output | `SerializerMethodField()` | Always read-only |
