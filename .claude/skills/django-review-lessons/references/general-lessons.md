# General Review Lessons (27 items)

Items learned from past PRs. Each represents a real error found during code review.

---

### #1: Use existing libraries instead of reimplementing

**Category**: Style
**Severity**: Minor

**Rule**: Delegate maintenance and tests to libraries. Don't reimplement what's already available.

**Incorrect**:
```python
import re

def validate_email(email: str) -> bool:
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))
```

**Correct**:
```python
from django.core.validators import validate_email

validate_email(email)  # raises ValidationError if invalid
```

**Detection**: `grep -r "re\.match\|re\.compile" apps/ --include="*.py"` — check if regex reimplements existing validators.

---

### #2: Organize helpers as classes, not loose functions

**Category**: Style
**Severity**: Minor

**Rule**: Create helper classes with `@staticmethod` methods, not standalone functions scattered across modules.

**Incorrect**:
```python
def calculate_asset_weight(asset):
    return asset.weight * asset.quantity

def format_asset_code(asset):
    return f"{asset.prefix}-{asset.code}"
```

**Correct**:
```python
class AssetHelper:
    @staticmethod
    def calculate_weight(asset: Asset) -> float:
        return asset.weight * asset.quantity

    @staticmethod
    def format_code(asset: Asset) -> str:
        return f"{asset.prefix}-{asset.code}"
```

**Detection**: `grep -rn "^def " apps/*/utils.py apps/*/helpers.py` — loose functions outside classes.

---

### #3: Define constraints once, reuse everywhere

**Category**: Style
**Severity**: Minor

**Rule**: Define validation constraints as constants and reuse in models and serializers.

**Incorrect**:
```python
# models.py
name = models.CharField(max_length=100)

# serializers.py
name = serializers.CharField(max_length=100)  # duplicated magic number

# forms.py
name = forms.CharField(max_length=100)  # tripled
```

**Correct**:
```python
# constants.py
MAX_NAME_LENGTH = 100

# models.py
name = models.CharField(max_length=MAX_NAME_LENGTH)

# serializers.py
name = serializers.CharField(max_length=MAX_NAME_LENGTH)
```

**Detection**: `grep -rn "max_length=" apps/ --include="*.py" | sort` — look for duplicated magic numbers.

---

### #3b: YOLO comments - code should be self-explanatory

**Category**: Style
**Severity**: Minor

**Rule**: Code should be self-explanatory. Minimal comments. NEVER delete existing comments in unchanged code. Only comment WHY, not WHAT.

**Incorrect**:
```python
# Get all assets
assets = Asset.objects.all()

# Filter active ones
active = assets.filter(status='active')

# Return count
return active.count()
```

**Correct**:
```python
# Using raw SQL because Django ORM doesn't support window functions efficiently
return Asset.objects.raw("""
    SELECT *, ROW_NUMBER() OVER (PARTITION BY rack_id ORDER BY position) as slot
    FROM assets_asset WHERE status = 'active'
""")
```

**Detection**: `grep -rn "^    #" apps/ --include="*.py"` — review inline comments for WHAT vs WHY.

---

### #4: Don't duplicate fixtures from root conftest

**Category**: Testing
**Severity**: Minor

**Rule**: Don't create fixtures in app conftest that already exist in root `conftest.py`. Key root fixtures: `api_user_with_company_logged`, `api_client`, `test_company`, `test_user`, `auth_service_mock`.

**Incorrect**:
```python
# apps/assets/conftest.py
@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def test_company():
    return Company.objects.create(name="Test", subdomain="test")
```

**Correct**:
```python
# apps/assets/conftest.py - only app-specific fixtures
@pytest.fixture
def test_asset(test_company):
    return Asset.objects.create(name="Test Asset", company=test_company)
```

**Detection**: `grep -rn "@pytest.fixture" apps/*/conftest.py | grep -E "api_client|test_company|test_user"` — duplicates from root.

---

### #5: Choose HyperlinkedModelSerializer vs ModelSerializer correctly

**Category**: Style
**Severity**: Minor

**Rule**: Use `HyperlinkedModelSerializer` for navigable APIs (HATEOAS), `ModelSerializer` for simple CRUD.

**Incorrect**:
```python
# Using HyperlinkedModelSerializer when URLs are not needed
class InternalLogSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = InternalLog
        fields = ['id', 'message', 'level']
```

**Correct**:
```python
# HyperlinkedModelSerializer when API is navigable
class AssetSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Asset
        fields = ['url', 'id', 'name', 'parent']

# ModelSerializer for simple internal use
class InternalLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = InternalLog
        fields = ['id', 'message', 'level']
```

**Detection**: `grep -rn "HyperlinkedModelSerializer" apps/ --include="*.py"` — verify each has `url` field usage.

---

### #6: Always use reverse() for URLs

**Category**: Style
**Severity**: Minor

**Rule**: ALWAYS use `reverse()` for URLs, NEVER hardcode paths.

**Incorrect**:
```python
url = f"/api/users/{user_id}/"
response = self.client.get(f"/api/assets/{asset.id}/")
```

**Correct**:
```python
url = reverse("user-detail", kwargs={"pk": user_id})
response = self.client.get(reverse("asset-detail", kwargs={"pk": asset.id}))
```

**Detection**: `grep -rn '"/api/' apps/ tests/ --include="*.py"` — hardcoded API paths.

---

### #7: All imports at file level

**Category**: Style
**Severity**: Minor

**Rule**: All imports at file level, never inline. Exception: circular dependency (must justify with comment).

**Incorrect**:
```python
class AssetService:
    def get_hierarchy(self, asset_id: int):
        from apps.hierarchy.models import Room  # inline without justification
        return Room.objects.filter(assets__id=asset_id)
```

**Correct**:
```python
from apps.hierarchy.models import Room  # file-level import

class AssetService:
    def get_hierarchy(self, asset_id: int):
        return Room.objects.filter(assets__id=asset_id)
```

**Detection**: `grep -rn "^\s\+from \|^\s\+import " apps/ --include="*.py"` — inline imports (indented).

---

### #8: Don't test Django internals

**Category**: Testing
**Severity**: Minor

**Rule**: Don't test Django/DRF internals (field validation, built-in serializer behavior). Only test custom logic.

**Incorrect**:
```python
def test_name_field_is_required(api_client_logged):
    response = api_client_logged.post("/api/assets/", {"code": "A1"})
    assert response.status_code == 400
    assert "name" in response.data  # testing CharField required - Django handles this
```

**Correct**:
```python
def test_unique_code_per_datacenter(api_client_logged, test_asset):
    response = api_client_logged.post("/api/assets/", {
        "name": "New Asset",
        "code": test_asset.code,  # duplicate code
        "datacenter": test_asset.datacenter.id,
    })
    assert response.status_code == 400  # testing CUSTOM uniqueness logic
```

**Detection**: Review test files for assertions on basic field validation (required, max_length, type).

---

### #9: Business logic MUST be in services (SLA)

**Category**: Architecture
**Severity**: Critical

**Rule**: Business logic MUST be in services, NOT in views. Views only handle HTTP concerns.

**Incorrect**:
```python
def create(self, request):
    user = User(**request.data)
    user.set_password(generate_password())
    user.save()
    send_mail("Welcome", "...", "noreply@example.com", [user.email])
    return Response(UserSerializer(user).data, status=201)
```

**Correct**:
```python
def create(self, request):
    serializer = UserCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = self.auth_service.create_user(serializer.validated_data)
    return Response(UserMeSerializer(user, context={"request": request}).data, status=201)
```

**Detection**: `grep -rn "\.save()\|\.delete()\|send_mail\|transaction" apps/*/views/ --include="*.py"` — business logic in views.

---

### #10: No logic in views

**Category**: Architecture
**Severity**: Critical

**Rule**: Views only handle HTTP concerns (request parsing, response building, status codes). No complex if/else, no `.save()`, no notifications.

**Incorrect**:
```python
@action(detail=True, methods=["post"])
def deactivate(self, request, pk=None):
    user = self.get_object()
    user.is_active = False
    user.save()
    user.sessions.all().delete()
    AuditLog.objects.create(user=request.user, action="deactivate")
    return Response({"status": "deactivated"})
```

**Correct**:
```python
@action(detail=True, methods=["post"])
def deactivate(self, request, pk=None):
    user = self.get_object()
    user = self.auth_service.deactivate_user(user, request.user)
    return Response({"status": "deactivated"})
```

**Detection**: `grep -rn "\.save()\|\.delete()" apps/*/views/ --include="*.py"` — direct model operations in views.

---

### #11: Use existing fixtures before creating new ones

**Category**: Testing
**Severity**: Minor

**Rule**: Check root `conftest.py` before creating new fixtures. Reuse prevents duplication.

**Incorrect**:
```python
# apps/assets/tests/test_views.py
@pytest.fixture
def authenticated_client():
    client = APIClient()
    user = User.objects.create(email="test@test.com")
    client.force_authenticate(user=user)
    return client
```

**Correct**:
```python
# Use existing api_user_with_company_logged from root conftest
def test_list_assets(api_user_with_company_logged):
    response = api_user_with_company_logged.get(reverse("asset-list"))
    assert response.status_code == 200
```

**Detection**: `grep -rn "force_authenticate\|APIClient()" apps/*/tests/ apps/*/conftest.py --include="*.py"`

---

### #12: Evaluate FK vs computed property

**Category**: Models
**Severity**: Minor

**Rule**: Evaluate if ForeignKey is truly needed vs computed property. Don't add FK for data only used in one serializer.

**Incorrect**:
```python
class Asset(BaseModel):
    last_modifier = models.ForeignKey(User, null=True, on_delete=models.SET_NULL)
```

**Correct**:
```python
# Use annotation in queryset
queryset = Asset.objects.annotate(
    last_modifier_email=Subquery(
        AuditLog.objects.filter(asset=OuterRef("pk"))
        .order_by("-created_at")
        .values("user__email")[:1]
    )
)
```

**Detection**: Review new ForeignKey fields — ask "is this only for display in one serializer?"

---

### #13: Verify proxy model impact on querysets

**Category**: Models
**Severity**: Minor

**Rule**: Before using proxy models, verify they don't impact querysets/results (polymorphic queries, managers).

**Incorrect**:
```python
class SpecialAsset(Asset):
    class Meta:
        proxy = True
    # No consideration of how this affects Asset.objects.all()
```

**Correct**:
```python
class SpecialAsset(Asset):
    class Meta:
        proxy = True

    objects = SpecialAssetManager()  # custom manager that doesn't pollute base queries
```

**Detection**: `grep -rn "proxy = True" apps/ --include="*.py"` — verify manager behavior.

---

### #14: No comments inside translation strings

**Category**: Style
**Severity**: Minor

**Rule**: No comments inside `gettext_lazy()` strings. Use `help_text` instead.

**Incorrect**:
```python
name = models.CharField(
    max_length=100,
    verbose_name=_("Name"),  # This is the asset name
)
```

**Correct**:
```python
name = models.CharField(
    max_length=100,
    verbose_name=_("Name"),
    help_text=_("The display name of the asset"),
)
```

**Detection**: `grep -rn "gettext_lazy\|_(\"" apps/ --include="*.py" | grep "#"` — comments on translation lines.

---

### #15: NEVER delete applied migrations

**Category**: Migrations
**Severity**: Critical

**Rule**: NEVER delete migrations applied to any environment. Only add new ones.

**Incorrect**:
```bash
rm apps/assets/migrations/0005_add_status.py
```

**Correct**:
```bash
python manage.py makemigrations assets --name revert_status_field
```

**Detection**: `git diff --name-only | grep "migrations.*\.py" | grep -v "__init__"` — check for deleted migration files.

---

### #16: Remove unused fixtures

**Category**: Testing
**Severity**: Minor

**Rule**: Remove fixtures that are created but never used in tests. Dead code clutters codebase.

**Incorrect**:
```python
@pytest.fixture
def unused_rack():
    return Rack.objects.create(name="Unused")

# No test uses unused_rack
```

**Correct**:
```python
# Remove the fixture entirely if no test references it
```

**Detection**: `grep -rn "@pytest.fixture" apps/ --include="*.py"` then search for fixture name usage.

---

### #17: Use correct field type - CharField vs TextField

**Category**: Models
**Severity**: Minor

**Rule**: Use `CharField` for short strings with `max_length`, `TextField` for long text. CharField is indexed by default.

**Incorrect**:
```python
description = models.CharField(max_length=5000)  # too long for CharField
code = models.TextField()  # too short for TextField, loses index
```

**Correct**:
```python
description = models.TextField(blank=True, default="")
code = models.CharField(max_length=50, unique=True)
```

**Detection**: `grep -rn "CharField(max_length=[0-9]\{4,\}" apps/ --include="*.py"` — CharField with very high max_length.

---

### #18: Only add complex relationships when necessary

**Category**: Models
**Severity**: Minor

**Rule**: Only add complex relationships (M2M through, GenericFK) when truly necessary. Prefer simple FK.

**Incorrect**:
```python
# GenericForeignKey when target model is known
content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
object_id = models.PositiveIntegerField()
target = GenericForeignKey("content_type", "object_id")
```

**Correct**:
```python
# Simple FK when target model is known
asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name="attachments")
```

**Detection**: `grep -rn "GenericForeignKey\|GenericRelation" apps/ --include="*.py"` — verify GenericFK is truly needed.

---

### #19: Migrations must be production-ready

**Category**: Migrations
**Severity**: Critical

**Rule**: Migrations must be production-ready: reversible, data-safe, no data loss. Checklist: has reverse operation, tested on copy of production data, no raw DELETE/DROP without backup, default values for non-null fields, large data migrations split into batches.

**Incorrect**:
```python
operations = [
    migrations.RunPython(forward_func, migrations.RunPython.noop),  # no reverse!
    migrations.RunSQL("DELETE FROM assets_asset WHERE status = 'draft'"),  # data loss!
]
```

**Correct**:
```python
operations = [
    migrations.RunPython(forward_func, reverse_func),
    migrations.AddField("asset", "status", models.CharField(default="active")),
]
```

**Detection**: `grep -rn "RunPython.noop\|RunSQL.*DELETE\|RunSQL.*DROP" apps/*/migrations/ --include="*.py"`

---

### #20: Use UUID for frontend-exposed IDs

**Category**: Models
**Severity**: Minor

**Rule**: Use UUID fields when IDs are exposed to frontend (prevents enumeration attacks).

**Incorrect**:
```python
# Sequential AutoField exposed to API
class Asset(models.Model):
    id = models.AutoField(primary_key=True)  # /api/assets/1/, /api/assets/2/ ...
```

**Correct**:
```python
class Asset(UUIDModel):  # inherits UUIDField primary key
    pass
# /api/assets/550e8400-e29b-41d4-a716-446655440000/
```

**Detection**: `grep -rn "AutoField\|BigAutoField" apps/ --include="*.py"` — check if exposed to API.

---

### #21: Don't redundantly re-apply the same ordering as Meta.ordering

**Category**: Style
**Severity**: Minor

**Rule**: Don't add `order_by()` with the same fields already defined in `Meta.ordering`. This is about **redundant** ordering. See also #22 for **unjustified override** of global ordering with different fields.

**Incorrect**:
```python
class Asset(models.Model):
    class Meta:
        ordering = ["name"]

# Redundant ordering
assets = Asset.objects.all().order_by("name")
```

**Correct**:
```python
# Meta.ordering already handles it
assets = Asset.objects.all()

# Only override when explicitly needed
assets = Asset.objects.all().order_by("-created_at")  # different order needed
```

**Detection**: `grep -rn "order_by(" apps/ --include="*.py"` — cross-reference with model's `Meta.ordering`.

---

### #22: Don't override global ordering with different fields without justification

**Category**: Style
**Severity**: Minor

**Rule**: Don't override `Meta.ordering` with different fields (e.g., `order_by("id")` when Meta uses `name`) unless explicitly needed for a specific use case. This is about **unjustified overrides**. See also #21 for **redundant** re-application of the same ordering.

**Incorrect**:
```python
class AssetViewSet(viewsets.ModelViewSet):
    queryset = Asset.objects.all().order_by("id")  # overriding Meta.ordering without reason
```

**Correct**:
```python
class AssetViewSet(viewsets.ModelViewSet):
    queryset = Asset.objects.all()  # respects Meta.ordering
```

**Detection**: `grep -rn "order_by(" apps/*/views/ --include="*.py"` — verify each override is justified.

---

### #23: Follow Views -> Services -> Models architecture

**Category**: Architecture
**Severity**: Minor

**Rule**: Follow Views -> Services -> Models pattern. Views = HTTP layer, Services = business logic, Models = data structure.

**Incorrect**:
```python
# View calling model methods with business logic
class AssetViewSet(viewsets.ModelViewSet):
    def create(self, request):
        asset = Asset.create_with_validation(request.data, request.user)
        return Response(AssetSerializer(asset).data)
```

**Correct**:
```python
class AssetViewSet(viewsets.ModelViewSet):
    def create(self, request):
        serializer = AssetCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        asset = self.asset_service.create(serializer.validated_data)
        return Response(AssetListSerializer(asset).data, status=201)
```

**Detection**: Review views for direct model manipulation beyond `get_object()` and `get_queryset()`.

---

### #24: Watch for obvious copy-paste errors

**Category**: Style
**Severity**: Minor

**Rule**: Watch for obvious errors: typos, wrong variable names, copy-paste mistakes.

**Incorrect**:
```python
asset = Asset(**user_data)  # wrong variable name from copy-paste
rack.name = asset_name  # wrong source
```

**Correct**:
```python
asset = Asset(**asset_data)
rack.name = rack_name
```

**Detection**: Manual code review — look for variable name mismatches, especially after copy-paste.

---

### #25: Don't reformat unrelated lines

**Category**: Style
**Severity**: Minor

**Rule**: Don't reformat/modify lines unrelated to your change. Makes diffs noisy and hard to review.

**Incorrect**:
```diff
- assets = Asset.objects.filter(status='active')
+ assets = Asset.objects.filter(
+     status='active'
+ )  # reformatted but not related to the PR change
```

**Correct**:
```diff
+ # Only lines related to the actual change
+ assets = Asset.objects.filter(status='active').select_related('rack')
```

**Detection**: `git diff --stat` — review files with unexpectedly high line changes.

---

### #26: Don't override filter_backends on ViewSets

**Category**: Style
**Severity**: Major

**Rule**: Don't set `filter_backends` explicitly on ViewSets when `DEFAULT_FILTER_BACKENDS` in settings already includes the needed backends. Explicit `filter_backends` overrides (not extends) the global defaults, silently removing other backends.

**Incorrect**:
```python
class AssetViewSet(viewsets.ModelViewSet):
    filter_backends = [filters.SearchFilter]  # loses OrderingFilter and DjangoFilterBackend!
    search_fields = ["name", "code"]
```

**Correct**:
```python
class AssetViewSet(viewsets.ModelViewSet):
    search_fields = ["name", "code"]  # backends inherited from DEFAULT_FILTER_BACKENDS
    filterset_class = AssetFilter
    ordering_fields = ["name", "created_at"]
```

**Detection**: `grep -rn "filter_backends" apps/ --include="*.py"` — check if overriding defaults unnecessarily.
