# Schema Examples: Correct vs Incorrect

Real-world patterns from Binora showing common mistakes and their corrections.

---

## 1. Response Schema Must Match Serializer

### Serializer (source of truth)

```python
class AssetSerializer(serializers.HyperlinkedModelSerializer):
    product_model = ProductModelSerializer(read_only=True)
    parent = serializers.HyperlinkedRelatedField(view_name='asset-detail', read_only=True)
    status = serializers.CharField(source='get_status_display')

    class Meta:
        model = Asset
        fields = ['url', 'id', 'name', 'code', 'product_model', 'parent', 'status', 'created_at']
```

### Incorrect Contract

```yaml
Asset:
  type: object
  properties:
    id:
      type: integer
    name:
      type: string
    product:           # Wrong field name (should be product_model)
      type: integer    # Wrong type (should be nested object)
    parent_id:         # Wrong field name (should be parent)
      type: integer    # Wrong type (should be URI)
    status:
      type: string
      enum: [ACTIVE, INACTIVE]  # Wrong case + shouldn't have enum for display values
    # Missing: url, code, created_at
```

### Correct Contract

```yaml
Asset:
  type: object
  properties:
    url:
      type: string
      format: uri
      readOnly: true
    id:
      type: integer
      readOnly: true
    name:
      type: string
      maxLength: 200
    code:
      type: string
      readOnly: true
    product_model:
      allOf:
        - $ref: '#/components/schemas/ProductModel'
      readOnly: true
    parent:
      type: string
      format: uri
      nullable: true
      readOnly: true
    status:
      type: string
    created_at:
      type: string
      format: date-time
      readOnly: true
  required: [name]
```

---

## 2. Nullable Fields

### Incorrect

```yaml
parent:
  $ref: '#/components/schemas/Asset'
```

### Correct

```yaml
parent:
  nullable: true
  allOf:
    - $ref: '#/components/schemas/Asset'
```

---

## 3. Pagination Wrapper

### Incorrect (bare array)

```yaml
responses:
  200:
    content:
      application/json:
        schema:
          type: array
          items:
            $ref: '#/components/schemas/Asset'
```

### Correct (paginated wrapper)

```yaml
responses:
  200:
    content:
      application/json:
        schema:
          type: object
          properties:
            count:
              type: integer
            next:
              type: string
              format: uri
              nullable: true
            previous:
              type: string
              format: uri
              nullable: true
            results:
              type: array
              items:
                $ref: '#/components/schemas/Asset'
```

---

## 4. Input vs Output Schemas

Use separate schemas for request body and response.

### Input Schema (create)

```yaml
AssetCreate:
  type: object
  properties:
    name:
      type: string
      maxLength: 200
    product_model:
      type: string
      format: uri
    parent:
      type: string
      format: uri
      nullable: true
    description:
      type: string
  required: [name, product_model]
```

### Output Schema (response)

```yaml
Asset:
  type: object
  properties:
    url:
      type: string
      format: uri
      readOnly: true
    id:
      type: integer
      readOnly: true
    name:
      type: string
    code:
      type: string
      readOnly: true
    product_model:
      allOf:
        - $ref: '#/components/schemas/ProductModel'
      readOnly: true
    # ... full response with nested objects
```

---

## 5. Enum Case Sensitivity

### Incorrect

```yaml
status:
  type: string
  enum: [ACTIVE, INACTIVE, IN_PROGRESS]
```

### Correct (matching Django TextChoices)

```yaml
status:
  type: string
  enum: [active, inactive, in_progress]
```

---

## 6. HyperlinkedRelatedField in Output

When serializer uses `HyperlinkedRelatedField`, output is a URL string.

### Incorrect

```yaml
datacenter:
  type: integer
```

### Correct

```yaml
datacenter:
  type: string
  format: uri
```

---

## 7. allOf Without Redundant type: object

### Incorrect

```yaml
product_model:
  type: object      # Redundant when using allOf
  allOf:
    - $ref: '#/components/schemas/ProductModel'
```

### Correct

```yaml
product_model:
  allOf:
    - $ref: '#/components/schemas/ProductModel'
  readOnly: true
```
