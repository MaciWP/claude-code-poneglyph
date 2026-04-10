# Serializer Review Lessons (S1-S4)

Serializer-specific lessons learned from past PRs.

---

### #S1: Don't use required=True in PATCH serializers

**Category**: Serializers
**Severity**: Critical

**Rule**: Fields in PATCH serializers should not be `required=True` unless truly mandatory. PATCH = partial update. Either use separate serializers or `partial=True`.

**Incorrect**:
```python
class AssetUpdateSerializer(serializers.ModelSerializer):
    name = serializers.CharField(required=True, max_length=200)
    product_model = serializers.PrimaryKeyRelatedField(
        queryset=ProductModel.objects.all(),
        required=True
    )
    status = serializers.ChoiceField(choices=Asset.Status.choices, required=True)

    class Meta:
        model = Asset
        fields = ["name", "product_model", "status", "description"]

# PATCH /api/assets/123/ {"description": "New desc"}
# -> 400: name, product_model, status are required
```

**Correct**:
```python
class AssetUpdateSerializer(serializers.ModelSerializer):
    name = serializers.CharField(required=False, max_length=200)
    product_model = serializers.PrimaryKeyRelatedField(
        queryset=ProductModel.objects.all(),
        required=False
    )

    class Meta:
        model = Asset
        fields = ["name", "product_model", "status", "description"]

# OR use partial=True in the view
serializer = AssetSerializer(asset, data=request.data, partial=True)
```

**Detection**: `grep -rn "required=True" apps/*/serializers/ --include="*.py"` — check if used in update/PATCH context.

---

### #S2: Separate Input/Output serializers

**Category**: Serializers
**Severity**: Minor

**Rule**: Use separate serializers for input (create/update) and output (list/retrieve). Input validates, output formats. See `apps/core/serializers/accessprofile.py` for reference.

**Incorrect**:
```python
class AssetSerializer(serializers.ModelSerializer):
    product_model = ProductModelSerializer()  # nested on output is fine

    class Meta:
        model = Asset
        fields = ["id", "name", "product_model", "status"]

# Same serializer for create? product_model expects nested object but should accept ID
```

**Correct**:
```python
class AssetCreateSerializer(serializers.ModelSerializer):
    product_model = serializers.PrimaryKeyRelatedField(queryset=ProductModel.objects.all())

    class Meta:
        model = Asset
        fields = ["name", "product_model", "status"]

class AssetListSerializer(serializers.ModelSerializer):
    product_model = ProductModelSerializer(read_only=True)

    class Meta:
        model = Asset
        fields = ["id", "name", "product_model", "status", "created_at"]
```

**Detection**: `grep -rn "class.*Serializer" apps/ --include="*.py"` — check if same serializer used for both input and output.

---

### #S3: Use annotations instead of .all() in serializer methods

**Category**: Serializers
**Severity**: Minor

**Rule**: Use direct property access or annotations for computed fields, not `.all()` queries in serializer methods (causes N+1).

**Incorrect**:
```python
class RoomSerializer(serializers.ModelSerializer):
    child_count = serializers.SerializerMethodField()

    def get_child_count(self, obj):
        return obj.children.all().count()  # N+1 query per room!
```

**Correct**:
```python
# In ViewSet
class RoomViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        return Room.objects.annotate(child_count=Count("children"))

# In Serializer
class RoomSerializer(serializers.ModelSerializer):
    child_count = serializers.IntegerField(read_only=True)  # from annotation
```

**Detection**: `grep -rn "\.all()\.count()\|\.filter(.*).count()" apps/*/serializers/ --include="*.py"` — queries inside serializers.

---

### #S4: Reserved

**Category**: Serializers
**Severity**: Minor

**Rule**: Reserved slot for future serializer lessons.

**Incorrect**:
```python
# N/A - placeholder for future lesson
```

**Correct**:
```python
# N/A - placeholder for future lesson
```

**Detection**: N/A
