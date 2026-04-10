# Common Violations - Real Examples

Real-world examples of violations from past PR reviews, with ❌ WRONG and ✅ CORRECT patterns.

---

## 1. FK vs Propiedad

### Violation: Adding unnecessary ForeignKey

```python
# ❌ WRONG - Adding FK for data that's only displayed
class Asset(BaseModel):
    name = models.CharField(max_length=200)
    product_model = models.ForeignKey('ProductModel', on_delete=models.PROTECT)
    parent = models.ForeignKey('self', null=True, on_delete=models.CASCADE)

    # Adding FK just for serializer display
    last_modifier = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='modified_assets'
    )

# Migration required
class Migration(migrations.Migration):
    operations = [
        migrations.AddField(
            model_name='asset',
            name='last_modifier',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to='core.User'),
        ),
    ]

# Now must update on every modification
class AssetService:
    def update_asset(self, asset_id: int, data: dict, user: User) -> Asset:
        asset = Asset.objects.get(id=asset_id)
        for key, value in data.items():
            setattr(asset, key, value)
        asset.last_modifier = user  # Must remember to update!
        asset.save()
        return asset
```

```python
# ✅ CORRECT - Use queryset annotation
class AssetViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        from apps.core.models import User

        # Annotate with subquery
        last_modifier_subquery = Subquery(
            AuditLog.objects.filter(
                asset=OuterRef('pk')
            ).order_by('-created_at').values('user__email')[:1]
        )

        return Asset.objects.annotate(
            last_modifier_email=last_modifier_subquery
        )

class AssetListSerializer(serializers.ModelSerializer):
    last_modifier_email = serializers.CharField(read_only=True)

    class Meta:
        model = Asset
        fields = ['id', 'name', 'last_modifier_email']

# No migration needed, no extra FK to maintain
```

---

## 2. Fixture Duplicada

### Violation: Recreating fixtures from root conftest

```python
# ❌ WRONG - apps/assets/conftest.py duplicating root fixtures
import pytest
from rest_framework.test import APIClient
from apps.core.models import User, Company

@pytest.fixture
def api_client():
    """Duplicate of root conftest fixture"""
    return APIClient()

@pytest.fixture
def test_company():
    """Duplicate of root conftest fixture"""
    return Company.objects.create(
        name="Test Company",
        subdomain="test"
    )

@pytest.fixture
def test_user(test_company):
    """Duplicate of root conftest fixture"""
    return User.objects.create(
        email="test@test.com",
        company=test_company
    )

@pytest.fixture
def api_user_logged(api_client, test_user):
    """Duplicate of root conftest fixture"""
    api_client.force_authenticate(user=test_user)
    return api_client

# Test using duplicate fixtures
def test_create_asset(api_user_logged, test_company):
    response = api_user_logged.post('/api/assets/', {
        'name': 'Test Asset',
        'company': test_company.id
    })
    assert response.status_code == 201
```

```python
# ✅ CORRECT - Use fixtures from root conftest.py
# apps/assets/conftest.py - No duplicate fixtures needed!

# Import only app-specific fixtures
@pytest.fixture
def test_rack(test_company):
    """App-specific fixture - not in root conftest"""
    from apps.hierarchy.models import Rack
    return Rack.objects.create(
        name="Test Rack",
        company=test_company
    )

@pytest.fixture
def test_asset(test_company, test_rack):
    """App-specific fixture - not in root conftest"""
    from apps.assets.models import Asset
    return Asset.objects.create(
        name="Test Asset",
        rack=test_rack,
        company=test_company
    )

# Test using root conftest fixtures
def test_create_asset(api_user_with_company_logged):
    # api_user_with_company_logged comes from root conftest.py
    response = api_user_with_company_logged.post('/api/assets/', {
        'name': 'Test Asset'
    })
    assert response.status_code == 201

def test_get_asset(api_user_with_company_logged, test_asset):
    # Mixing root fixture + app-specific fixture
    response = api_user_with_company_logged.get(f'/api/assets/{test_asset.id}/')
    assert response.status_code == 200
```

---

## 3. Lógica en Vista vs Service

### Violation: Business logic in ViewSet

```python
# ❌ WRONG - Business logic in view
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def create(self, request):
        """Creating user directly in view"""
        serializer = UserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Business logic in view!
        user = User(**serializer.validated_data)

        # Password generation logic in view
        password = ''.join(random.choices(string.ascii_letters + string.digits, k=12))
        user.set_password(password)

        # Email sending logic in view
        user.save()
        send_mail(
            'Welcome',
            f'Your password is: {password}',
            'noreply@example.com',
            [user.email],
        )

        return Response(UserSerializer(user).data, status=201)

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Complex business logic in view"""
        user = self.get_object()

        # Multi-step business logic
        user.is_active = False
        user.save()

        # Deactivate related data
        user.sessions.all().delete()
        user.api_tokens.all().delete()

        # Audit logging
        AuditLog.objects.create(
            user=request.user,
            action='deactivate_user',
            target_user=user
        )

        return Response({'status': 'deactivated'})
```

```python
# ✅ CORRECT - Delegate to service
# apps/core/services/authservice.py
class AuthService:
    def create_user(self, user_data: dict) -> User:
        """Business logic in service"""
        user = User(**user_data)

        # Password generation
        password = self._generate_password()
        user.set_password(password)
        user.save()

        # Email notification
        self._send_welcome_email(user, password)

        return user

    def deactivate_user(self, user: User, deactivated_by: User) -> User:
        """Complex business logic encapsulated"""
        with transaction.atomic():
            user.is_active = False
            user.save()

            # Clean up related data
            user.sessions.all().delete()
            user.api_tokens.all().delete()

            # Audit
            AuditLog.objects.create(
                user=deactivated_by,
                action='deactivate_user',
                target_user=user
            )

        return user

    def _generate_password(self) -> str:
        return ''.join(random.choices(string.ascii_letters + string.digits, k=12))

    def _send_welcome_email(self, user: User, password: str) -> None:
        send_mail(
            'Welcome',
            f'Your password is: {password}',
            'noreply@example.com',
            [user.email],
        )

# apps/core/views/user.py
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def __init__(self, auth_service: AuthService = Provide[Container.auth_service], **kwargs):
        super().__init__(**kwargs)
        self.auth_service = auth_service

    def create(self, request):
        """View only handles HTTP concerns"""
        serializer = UserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Delegate to service
        user = self.auth_service.create_user(serializer.validated_data)

        # Return response
        return Response(
            UserMeSerializer(user, context={'request': request}).data,
            status=201
        )

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Simple delegation to service"""
        user = self.get_object()
        user = self.auth_service.deactivate_user(user, request.user)
        return Response({'status': 'deactivated'})
```

---

## 4. Contrato Mal Formado

### Violation: OpenAPI schema doesn't match serializer

```python
# Serializer output (actual API response)
class AssetSerializer(serializers.HyperlinkedModelSerializer):
    product_model = ProductModelSerializer(read_only=True)
    parent = serializers.HyperlinkedRelatedField(
        view_name='asset-detail',
        read_only=True
    )
    status = serializers.CharField(source='get_status_display')

    class Meta:
        model = Asset
        fields = ['url', 'id', 'name', 'code', 'product_model', 'parent', 'status', 'created_at']

# Actual API response
{
    "url": "http://api.example.com/api/assets/123/",
    "id": 123,
    "name": "Dell PowerEdge R740",
    "code": "DC01-RM01-RCK-00001",
    "product_model": {
        "id": 42,
        "name": "PowerEdge R740",
        "manufacturer": "Dell"
    },
    "parent": "http://api.example.com/api/assets/100/",
    "status": "Active",
    "created_at": "2024-01-15T10:30:00Z"
}
```

```yaml
# ❌ WRONG - Contract doesn't match serializer
components:
  schemas:
    Asset:
      type: object
      properties:
        id:
          type: integer
        name:
          type: string
        code:
          type: string
        product:  # Wrong! Field is 'product_model'
          type: integer  # Wrong! Returns nested object, not ID
        parent_id:  # Wrong! Field is 'parent' and it's a URL
          type: integer
        status:
          type: string
          enum: [ACTIVE, INACTIVE]  # Wrong! Should be lowercase
        # Missing 'url' field
        # Missing 'created_at' field

paths:
  /api/assets/:
    get:
      responses:
        200:
          content:
            application/json:
              schema:
                type: array  # Wrong! Missing pagination wrapper
                items:
                  $ref: '#/components/schemas/Asset'
```

```yaml
# ✅ CORRECT - Contract matches serializer exactly
components:
  schemas:
    ProductModel:
      type: object
      properties:
        id:
          type: integer
          readOnly: true
        name:
          type: string
        manufacturer:
          type: string
      required: [name, manufacturer]

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
          maxLength: 50
        product_model:  # Correct field name
          allOf:
            - $ref: '#/components/schemas/ProductModel'
          readOnly: true
        parent:  # Correct - URL not integer
          type: string
          format: uri
          nullable: true
          readOnly: true
        status:  # Correct - display value not choice value
          type: string
        created_at:
          type: string
          format: date-time
          readOnly: true
      required: [name, code]

paths:
  /api/assets/:
    get:
      summary: List assets
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
        200:
          description: Paginated list of assets
          content:
            application/json:
              schema:
                type: object  # Correct - pagination wrapper
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
              example:
                count: 150
                next: "http://api.example.com/api/assets/?page=2"
                previous: null
                results:
                  - url: "http://api.example.com/api/assets/123/"
                    id: 123
                    name: "Dell PowerEdge R740"
                    code: "DC01-RM01-RCK-00001"
                    product_model:
                      id: 42
                      name: "PowerEdge R740"
                      manufacturer: "Dell"
                    parent: "http://api.example.com/api/assets/100/"
                    status: "Active"
                    created_at: "2024-01-15T10:30:00Z"
```

---

## 5. Multi-Tenant Violation

### Violation: Manual tenant filtering

```python
# ❌ WRONG - Manual tenant_id filtering
class AssetViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        # Manual tenant filtering breaks multi-tenant architecture!
        company = self.request.user.company
        return Asset.objects.filter(
            company_id=company.id  # VIOLATION!
        ).select_related('product_model')

    def create(self, request):
        serializer = AssetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Manual tenant assignment
        asset = Asset(**serializer.validated_data)
        asset.company_id = request.user.company.id  # VIOLATION!
        asset.save()

        return Response(AssetSerializer(asset).data, status=201)

# ❌ WRONG - Service manually filtering by tenant
class AssetService:
    def get_assets_for_company(self, company: Company) -> QuerySet[Asset]:
        # Don't do this - middleware handles it!
        return Asset.objects.filter(company_id=company.id)

    def create_asset(self, asset_data: dict, company: Company) -> Asset:
        asset = Asset(**asset_data)
        asset.company = company  # VIOLATION!
        asset.save()
        return asset

# ❌ WRONG - Raw SQL with manual tenant filter
def get_asset_stats(company_id: int):
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT COUNT(*)
            FROM assets_asset
            WHERE company_id = %s  # VIOLATION!
        """, [company_id])
        return cursor.fetchone()[0]
```

```python
# ✅ CORRECT - Trust middleware for tenant isolation
class AssetViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        # Middleware automatically filters by tenant
        # Port 8000 (TENANT=None): sees ALL data
        # Port 8001+ (TENANT=subdomain): sees ONLY tenant data
        return Asset.objects.select_related('product_model')

    def create(self, request):
        serializer = AssetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Middleware handles tenant assignment automatically
        asset = Asset.objects.create(**serializer.validated_data)

        return Response(AssetSerializer(asset).data, status=201)

# ✅ CORRECT - Service trusts middleware
class AssetService:
    def get_all_assets(self) -> QuerySet[Asset]:
        # Middleware automatically filters by current tenant
        return Asset.objects.select_related('product_model')

    def create_asset(self, asset_data: dict) -> Asset:
        # Middleware assigns company automatically on save()
        return Asset.objects.create(**asset_data)

    def get_asset_by_code(self, code: str) -> Asset | None:
        # Automatically scoped to current tenant
        return Asset.objects.filter(code=code).first()

# ✅ CORRECT - ORM handles tenant filtering in aggregations
def get_asset_stats():
    # Middleware filters this automatically
    return Asset.objects.aggregate(
        total=Count('id'),
        active=Count('id', filter=Q(status='active'))
    )

# ✅ CORRECT - Even in tests
@pytest.mark.django_db
def test_create_asset(api_user_with_company_logged, test_company):
    # Middleware is active in tests too
    Asset.objects.create(name="Test Asset")

    # This asset is automatically scoped to test_company
    assets = Asset.objects.all()
    assert assets.count() == 1
    assert assets.first().company == test_company
```

**Key Points**:
- Port 8000: `TENANT=None` → sees ALL companies
- Port 8001+: `TENANT=subdomain` → sees ONLY that tenant
- Middleware handles filtering automatically
- NEVER filter by `company_id` manually
- NEVER assign `company` manually (on create)
- Trust the middleware - it's battle-tested

---

## 6. Serializer: required en PATCH

### Violation: Required fields in update serializer

```python
# ❌ WRONG - required=True in serializer used for PATCH
class AssetUpdateSerializer(serializers.ModelSerializer):
    name = serializers.CharField(required=True, max_length=200)
    product_model = serializers.PrimaryKeyRelatedField(
        queryset=ProductModel.objects.all(),
        required=True
    )
    status = serializers.ChoiceField(
        choices=Asset.Status.choices,
        required=True
    )

    class Meta:
        model = Asset
        fields = ['name', 'product_model', 'status', 'description']

# View using this serializer for PATCH
class AssetViewSet(viewsets.ModelViewSet):
    def update(self, request, pk=None):
        asset = self.get_object()
        serializer = AssetUpdateSerializer(asset, data=request.data)
        # This fails on PATCH because all fields are required!
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

# User tries to update only description
# PATCH /api/assets/123/
# {"description": "New description"}
#
# Response: 400 Bad Request
# {
#   "name": ["This field is required."],
#   "product_model": ["This field is required."],
#   "status": ["This field is required."]
# }
```

```python
# ✅ CORRECT - Separate serializers for create (POST) and update (PATCH)
class AssetCreateSerializer(serializers.ModelSerializer):
    """Input serializer for POST - required fields"""
    name = serializers.CharField(required=True, max_length=200)
    product_model = serializers.PrimaryKeyRelatedField(
        queryset=ProductModel.objects.all(),
        required=True
    )
    status = serializers.ChoiceField(
        choices=Asset.Status.choices,
        required=True
    )

    class Meta:
        model = Asset
        fields = ['name', 'product_model', 'status', 'description']

class AssetUpdateSerializer(serializers.ModelSerializer):
    """Input serializer for PATCH - all fields optional"""
    name = serializers.CharField(required=False, max_length=200)
    product_model = serializers.PrimaryKeyRelatedField(
        queryset=ProductModel.objects.all(),
        required=False
    )
    status = serializers.ChoiceField(
        choices=Asset.Status.choices,
        required=False
    )

    class Meta:
        model = Asset
        fields = ['name', 'product_model', 'status', 'description']

class AssetViewSet(viewsets.ModelViewSet):
    def create(self, request):
        serializer = AssetCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        asset = Asset.objects.create(**serializer.validated_data)
        return Response(AssetListSerializer(asset).data, status=201)

    def update(self, request, pk=None):
        asset = self.get_object()
        # Use update serializer for PATCH
        serializer = AssetUpdateSerializer(asset, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(AssetListSerializer(asset).data)

# ✅ OR - Use partial=True with same serializer
class AssetSerializer(serializers.ModelSerializer):
    # Fields have required based on model definition
    class Meta:
        model = Asset
        fields = ['name', 'product_model', 'status', 'description']

class AssetViewSet(viewsets.ModelViewSet):
    def update(self, request, pk=None):
        asset = self.get_object()
        # partial=True makes all fields optional
        serializer = AssetSerializer(asset, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
```

---

## Summary Table

| Violation | Severity | Common in | Fix |
|-----------|----------|-----------|-----|
| FK vs Property | 🟡 | Models | Use annotation/property |
| Fixture Duplicada | 🟡 | conftest.py | Use root conftest |
| Lógica en Vista | 🔴 | ViewSets | Delegate to service |
| Contrato Mal Formado | 🔴 | OpenAPI | Match serializer exactly |
| Multi-Tenant Violation | 🔴 | QuerySets | Trust middleware |
| required en PATCH | 🔴 | Serializers | Separate serializers or partial=True |

**Quick check before commit**:
1. No business logic in views?
2. Using root conftest fixtures?
3. No manual tenant filtering?
4. Contract matches serializer?
5. PATCH serializers use partial=True?
6. No unnecessary ForeignKeys?
