# Django / DRF lessons (binora-backend)

Migrated 2026-08-06 from `binora-backend/.claude/skills/django-review-lessons` (v2.0.0).
Every item was a real finding in PR review. IDs are the original ones (#N general, S-N serializers).

## General Review Lessons (34 items)

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
    send_mail("Welcome", "...", "noreply@binora.com", [user.email])
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

---

### #27: Usa `concrete_fields` en vez de `get_fields()` para introspección de campos copiables

**Category**: Models
**Severity**: Major

**Rule**: Cuando necesites los campos "copiables" de un modelo (para copiar valores entre instancias), usa `model._meta.concrete_fields` en vez de `model._meta.get_fields() + hasattr(f, "attname")`. `get_fields()` devuelve también `GenericRelation` fields (que tienen `attname` pero `concrete=False`), que no son copiables y rompen `Model.objects.create(**values)`.

**Incorrect**:
```python
# GenericRelation se cuela porque tiene attname y no es many_to_one/one_to_one/many_to_many
return {
    f.name
    for f in model._meta.get_fields()
    if hasattr(f, "attname") and not (f.many_to_one or f.one_to_one or f.many_to_many)
}
```

**Correct**:
```python
# concrete_fields excluye GenericRelation automáticamente (concrete=False)
return {f.name for f in model._meta.concrete_fields if not (f.many_to_one or f.one_to_one)}
```

**Context**: Al añadir `AttachableModel` a `WorkflowTask`/`Task`, el campo `attachments = GenericRelation(...)` se colaba en `get_common_fields` y causaba `Task.objects.create(..., attachments=<manager>)` → crash.

**Detection**: `grep -rn "get_fields()" apps/ --include="*.py"` — verificar que no se usa para obtener campos copiables.

---

### #28: En `clean()`, usa `_id` para comprobar FK antes de acceder al objeto relacionado

**Category**: Models
**Severity**: Major

**Rule**: En el método `clean()` de un modelo, al comprobar si una FK tiene valor, usa `if self.field_id:` (el campo `_id` raw) en vez de `if self.field:`. Acceder a `self.field` en un objeto no guardado (ej. formulario admin inline nuevo) puede lanzar `RelatedObjectDoesNotExist` si el campo es NOT NULL y `field_id` es `None`.

**Incorrect**:
```python
def clean(self) -> None:
    super().clean()
    if self.content_type:  # RelatedObjectDoesNotExist si content_type_id es None
        model_class = self.content_type.model_class()
```

**Correct**:
```python
def clean(self) -> None:
    super().clean()
    if self.content_type_id:  # solo comprueba el valor raw, sin query
        model_class = self.content_type.model_class()
```

**Context**: En el admin de Django, los inlines nuevos tienen `content_type_id = None` antes de guardarse. Con `if self.content_type:`, Django intenta resolver la relación FK NOT NULL con valor None → `RelatedObjectDoesNotExist` → 500. Con `_id` no hay query ni excepción. Además, un `content_type_id` inválido no puede existir gracias a la FK constraint de PostgreSQL.

**Detection**: `grep -rn "if self\.[a-z_]*content_type[^_]" apps/ --include="*.py"` — verificar acceso directo a FK relation en `clean()`.

---

### #29: No uses `@lru_cache` en métodos de instancia de ViewSets

**Category**: Architecture
**Severity**: Major

**Rule**: No uses `@lru_cache(maxsize=1)` en métodos de instancia de ViewSets/mixins de DRF. La caché se guarda en la función (nivel clase, compartida entre todas las instancias). Con `maxsize=1`, cada request con una instancia distinta evicta la caché de la anterior — no cachea nada bajo carga. Además genera memory leaks porque la caché mantiene referencia a `self`. Ruff rule B019.

Para caché por request, guarda en la instancia con el patrón `hasattr`:

**Incorrect**:
```python
@lru_cache(maxsize=1)
def get_process(self) -> Process:  # caché global, compartida, memory leak
    return get_object_or_404(Process, pk=self.kwargs["process_id"])
```

**Correct**:
```python
def get_process(self) -> Process:  # caché por instancia (= por request)
    if not hasattr(self, "_process"):
        self._process = get_object_or_404(Process, pk=self.kwargs["process_id"])
    return self._process
```

**Detection**: `grep -rn "lru_cache" apps/*/views/ apps/*/mixins.py --include="*.py"` — verificar que no se usa en métodos de instancia de ViewSets.

---

### #30: Para modelos con `GenericForeignKey` en admin, usa `GenericTabularInline`

**Category**: Architecture
**Severity**: Major

**Rule**: En Django admin, los inlines de modelos con `GenericForeignKey` (`content_type` + `object_id`) DEBEN heredar de `GenericTabularInline` (de `django.contrib.contenttypes.admin`), no de `TabularInline` (de `django.contrib.admin`). `TabularInline` requiere FK directo y lanza `ImproperlyConfigured` al arrancar.

**Incorrect**:
```python
from django.contrib import admin

class AttachmentInline(admin.TabularInline):  # falla: Attachment tiene GenericFK, no FK directo
    model = Attachment
```

**Correct**:
```python
from django.contrib.contenttypes.admin import GenericTabularInline

class AttachmentInline(GenericTabularInline):  # correcto: sabe manejar content_type + object_id
    model = Attachment
    extra = 0
    fields = ("document",)
```

**Detection**: `grep -rn "GenericForeignKey" apps/ --include="*.py"` — verificar que los inlines de esos modelos usan `GenericTabularInline`.

---

### #31: No añadas `pytestmark = pytest.mark.django_db` con autouse fixture global

**Category**: Testing
**Severity**: Minor

**Rule**: No añadas `pytestmark = pytest.mark.django_db` en archivos de test cuando el proyecto ya tiene un autouse fixture en `conftest.py` raíz (`enable_db_access_for_all_tests`) que da acceso a BD a todos los tests automáticamente. Es redundante.

**Incorrect**:
```python
pytestmark = pytest.mark.django_db  # redundante con el autouse fixture del conftest raíz

def test_something():
    ...
```

**Correct**:
```python
# Sin pytestmark — el autouse fixture del conftest raíz ya da acceso a BD

def test_something():
    ...
```

**Exception**: Usa `@pytest.mark.django_db(transaction=True)` o `(reset_sequences=True)` solo cuando explícitamente se necesita ese comportamiento.

**Detection**: `grep -rn "pytestmark = pytest.mark.django_db" apps/ --include="*.py"` — eliminar si el conftest raíz tiene `enable_db_access_for_all_tests`.

---

### #32: Mantén consistencia en la gestión de inlines estáticos del admin

**Category**: Style
**Severity**: Minor

**Rule**: En Django admin, los inlines que siempre aparecen (estáticos) deben estar declarados en `self.inlines`. Los inlines dinámicos (que cambian según el objeto) se añaden en `get_inlines()`. No mezcles: no añadas inlines estáticos dinámicamente en `get_inlines()` si ya tienes `self.inlines`.

**Incorrect**:
```python
inlines = [StageInline]  # inlines estáticos aquí

def get_inlines(self, request, obj):
    if not obj:
        return self.inlines
    dynamic = [ProcessAssetInline]
    return dynamic + self.inlines + [AttachmentInline]  # AttachmentInline debería estar en self.inlines
```

**Correct**:
```python
inlines = [StageInline, AttachmentInline]  # todos los estáticos aquí

def get_inlines(self, request, obj):
    if not obj:
        return self.inlines
    dynamic = [ProcessAssetInline]
    return dynamic + self.inlines
```

**Detection**: Revisar `get_inlines()` — si añade inlines que siempre aparecen (no condicionalmente), moverlos a `self.inlines`.


---

### #33: Un mixin debe encapsular TODAS las operaciones de su responsabilidad

**Category**: Architecture
**Severity**: Major

**Rule**: Si creas un mixin para abstraer una funcionalidad compartida entre ViewSets (ej. gestión de documentos), debe encapsular TODAS las operaciones relacionadas (`list`, `create`, `destroy`, `patch`), no solo algunas. Dejar parte de la lógica en el mixin y parte en el ViewSet crea inconsistencia: el lector no sabe dónde buscar la implementación y es fácil que cada ViewSet implemente su parte de forma diferente.

**Incorrect**:
```python
class LinkDocumentMixin:
    # Solo maneja PATCH — create y destroy están en cada ViewSet por separado
    @action(detail=False, methods=["patch"], url_path="/")
    def patch(self, request, *args, **kwargs):
        ...

class ProcessDocumentsViewSet(LinkDocumentMixin, ...):
    def perform_create(self, serializer):  # aquí
        document = LibraryService.create_and_link(...)

    def destroy(self, request, *args, **kwargs):  # y aquí
        result = LibraryService.unlink(...)
```

**Correct**:
```python
class LinkDocumentMixin:
    # Encapsula las 3 operaciones — el ViewSet solo declara qué target usar
    def perform_create(self, serializer):
        document = LibraryService.create_and_link(self.get_document_target(), ...)

    def destroy(self, request, *args, **kwargs):
        result = LibraryService.unlink(self.get_document_target(), ...)

    @action(detail=False, methods=["patch"], url_path="/")
    def patch(self, request, *args, **kwargs):
        LibraryService.link(self.get_document_target(), ...)

class ProcessDocumentsViewSet(LinkDocumentMixin, ...):
    def get_document_target(self):  # solo esto — el "qué", no el "cómo"
        return self.get_process()
```

**Detection**: Revisar mixins — si el ViewSet sobreescribe métodos que deberían estar en el mixin (misma lógica en varios ViewSets), moverlos al mixin.


---

## Serializer Review Lessons (S1-S4)

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


---

## Rescued from agent-memory (binora-backend, 2026-08-06)

Entries rescued before that layer is archived. Ephemeral state (test baselines, settings paths) was dropped; reusable rules kept.

### django_604_email_bug

Django 6.0.4 shipped a regression in `django/core/mail/message.py` (function `_add_attachments`): line ~450 calls `msg.unlink(attachment)` instead of `msg.attach(attachment)`. This breaks EVERY test that attaches files to `EmailMessage` (19 tests under `apps/core/tests/email_tests.py` and `apps/core/tests/email_views_tests.py`, plus schemathesis contract tests that exercise email-sending endpoints).

**Why:** The project's `requirements/base.txt` had `Django~=6.0` (permissive range) so pip would auto-upgrade to 6.0.4. Downgrade to 6.0.3 restores email attachments behavior.

**How to apply:** If email/attachment tests fail with AttributeError or similar in `_add_attachments`, verify installed Django version with `python -c "import django; print(django.get_version())"`. If 6.0.4, pin to 6.0.3 in `requirements/base.txt` (`Django==6.0.3`) and reinstall. When Django 6.0.5 (or newer patch) is released, remove the pin and restore the range after verifying email tests still pass.

**Running nox from venv:** `nox` only lives inside `.venv/bin/`. Must activate venv first: `. .venv/bin/activate && nox -s <session>`. Calling `.venv/bin/nox -s <session>` directly fails because nox looks for `python` on PATH (not the venv's).

### django_rename_field_gotcha

Django's `makemigrations` only detects field renames when run interactively. If stdin is piped (even with "y\n"), it defaults to RemoveField + AddField, which drops the column.

**Why:** Piped stdin doesn't trigger the interactive `ask_rename` prompt — Django has no signal to ask and assumes no rename.

**How to apply:** For field renames, either (a) run `makemigrations` interactively and answer "y" when prompted, or (b) hand-edit the generated migration to use `RenameField` + `AlterField`. NEVER accept the auto-generated Remove+Add output for renames — it silently loses data.

### django_model_delete_pk_reset

After calling `instance.delete()`, Django sets `instance.pk = None`. Any subsequent serialization via `HyperlinkedRelatedField` (or anything else that derives from `.pk`) will produce `None` values rather than the expected URL.

**Why:** Django's `Model.delete()` method explicitly clears the primary key after the DB row is removed. The in-memory Python object still exists and has its other attributes, but its pk is gone.

**How to apply:** When a service method deletes an entity but the caller (view) needs to return a URL/representation of that entity in the HTTP response:
- Serialize the instance in the view BEFORE calling the service
- Capture `serializer.data` into a local variable
- Then call the service (which may delete), and finally return the pre-captured data

Example pattern:

```python
def destroy(self, request, *args, **kwargs):
    instance = self.get_object()
    serializer = DocumentURLSerializer({"document": instance}, context={"request": request})
    serialized_url = serializer.data  # snapshot BEFORE delete
    result = LibraryService.unlink_and_maybe_delete(self.get_process(), instance)
    if result.was_deleted:
        return Response(status=status.HTTP_200_OK, data=serialized_url)
    return Response(status=status.HTTP_204_NO_CONTENT)
```

Test that exposes the footgun: a delete endpoint where `can_be_deleted_on_unlink()` is True, the service deletes the row, and the response body is expected to contain the document URL (e.g., `str(test_document.id) in response.data["document"]`).

### nested_hyperlinked_serializer_context

Rule: In ViewSets where the serializer uses `NestedHyperlinkedIdentityField` (rest_framework_nested), instantiating the serializer manually with only `context={"request": request}` raises `KeyError: 'view'`. The nested relation reads `self.root.context["view"]` to resolve parent lookup kwargs from `view.kwargs`. Use `self.get_serializer(instance=obj)` inside action methods — `GenericViewSet.get_serializer_context()` injects request, view, and format.

**Why:** Discovered in JRV-112 when adding PATCH link-existing to ProcessDocumentsViewSet/TaskDocumentsViewSet. The tests failed with `KeyError: 'view'` until switching from `TaskDocumentSerializer(document, context={"request": request})` to `self.get_serializer(instance=document)`.

**How to apply:** Any time a ViewSet action serializes an output with a nested URL (parent_lookup_kwargs in the serializer), use `self.get_serializer(instance=...)`. Not just for the Binora assets pattern — it applies generally when the serializer declares a `NestedHyperlinkedIdentityField` and the parent ID is derived from URL kwargs.

### nested_router_lookup_field_required

When a parent ViewSet is the anchor for a nested router chain, its `lookup_field` attribute is NOT cosmetic — `rest_framework_nested.NestedDefaultRouter` uses it to name the URL kwarg in child routes. Default is `"pk"`, producing `{task_pk}`; setting `lookup_field = "id"` produces `{task_id}`.

**Why:** Even when a ViewSet has no actions of its own (a pure anchor for child nesting), `lookup_field` controls the URL schema of children. Tests that use `reverse("task-documents-list", kwargs={"task_id": ...})` rely on the `{task_id}` form.

**How to apply:** When simplifying a ViewSet to "anchor-only" (removing queryset, permissions, serializer_class, etc.), KEEP the `lookup_field = "id"` attribute if it's the parent of a nested router chain. Otherwise every `reverse()` call in tests/views for child routes will fail with `NoReverseMatch` using `{parent_pk}` instead of `{parent_id}`.

Document this requirement in the anchor ViewSet's docstring so future refactors don't accidentally strip it.

Example:
```python
class TaskViewSet(viewsets.GenericViewSet):
    """Anchor ViewSet required by rest_framework_nested. lookup_field="id" is
    required so the nested router produces /tasks/{task_id}/... instead of
    /tasks/{task_pk}/..."""

    lookup_field = "id"
```

### link_document_mixin_pattern

`apps/library/mixins.py` contains `LinkDocumentMixin` — shared by `AssetDocumentsViewSet`, `ProcessDocumentsViewSet`, and `TaskDocumentsViewSet`.

**Why:** All three viewsets needed identical PATCH behavior at `{prefix}/` to link an existing document. The mixin provides `partial_update` as a regular (non-@action) method.

**Architecture key:** `@action(methods=["patch"], url_path="/")` on a `partial_update` method would cause `ImproperlyConfigured` (DRF forbids @action on reserved action names). Instead, `SanitizeUrlsRouterMixin.get_routes()` (at `apps/core/utils/routers.py`) conditionally adds `'patch': 'partial_update'` to the list route when the ViewSet defines `partial_update`. This makes DRF dispatch PATCH to `partial_update` as a standard route, with correct `self.action` for permissions.

**How to apply:** When adding a new nested-document ViewSet:
1. Inherit `LinkDocumentMixin` first (before DRF mixins)
2. Implement `get_document_target(self)` returning the parent model instance
3. Register the ViewSet in a `NestedDefaultRouterSanitized` router (which inherits `SanitizeUrlsRouterMixin`)
4. Add `"partial_update": [...]` in `frontend_permissions`

The `extend_schema_view(partial_update=extend_schema(...))` decorator on the ViewSet documents the PATCH endpoint for drf-spectacular.

**Removed:** `initialize_request` hack (was sobreescribiendo `self.action = "partial_update"` to fix permissions for `@action def patch`).

### jrv904_document_can_delete_guard

JRV-904 added `destroy` override on `ProcessDocumentsViewSet` and `TaskDocumentsViewSet`:

```python
if document.created_from_id is not None and document.created_from != target:
    raise ConflictError(_("Cannot delete a document inherited from workflow."))
return super().destroy(request, *args, **kwargs)
```

- Returns 409 ONLY when doc was created from a different target (typically workflow/workflow_task)
- Returns 200 + DocumentURLSerializer if doc is orphan after unlink (via `LinkDocumentMixin.destroy`)
- Returns 204 if doc still has attachments after unlink

**Why tolerant (`created_from_id is not None and ...`):** Docs that came from library via PATCH have `created_from=None`. A strict guard (`document.created_from != target`) would 409 these, breaking the Asset pattern where library-linked docs can be unlinked. The tolerant guard only blocks docs originated elsewhere (workflow inheritance).

**No can_delete property:** the contract `ProcessDocument`/`TaskDocument` schemas and the corresponding serializers stay minimal (no `can_delete` field). The 409 response on DELETE is the API contract for "you cannot remove this".

**How to apply:** When testing list/detail views that use `DocumentSerializer`, do NOT assume an `id` field in response — the serializer Meta.fields list doesn't include `id`. Index test response items by `url` and substring-match the doc id. For fixtures that test 200/204 unlink paths, set `created_from=<target>` on the document; the tolerant guard skips them only because the targets match.

**Related:** [[link_document_mixin_pattern]], [[destroy_returns_document_url]].

### diff_replication_pattern

When replicating models from a source DB to a tenant DB on a recurring schedule (e.g., `replicatefrommain` cron), full wipe + `bulk_create` rewrites `created_at` on every tick because `bulk_create` runs `pre_save` and `auto_now_add` resolves to `now()` for every inserted row. This destroys the audit trail.

**Why:** `Attachment` inherits `AuditModel`, which sets `created_at = DateTimeField(auto_now_add=True)`. The verified bug: replace semantics rewrites `created_at` 288 times/day. Caught only by a test that pins `timezone.now` and asserts `created_at` is preserved across two runs.

**How to apply:** For replication of any `AuditModel` subclass that has a natural key (Attachment has `UniqueConstraint(document, content_type, object_id)`):
1. Build `target_keys` (set of tuples) from source DB filtered by replicable scope.
2. Build `existing_keys` from local DB filtered by the same scope.
3. Compute `to_delete = existing - target` and `to_add = target - existing`.
4. Inside `transaction.atomic()`: delete only the diff (build `Q()` chained with `|=`), `bulk_create(to_add, ignore_conflicts=True)`.
5. Matching rows are never touched → timestamps preserved by construction.

The test that proves the bug existed AND that the refactor fixes it: capture `attachment.created_at` after run 1, mock `django.utils.timezone.now` to return a future time, run again, refresh from DB, assert `created_at` is unchanged.

### reduce_or_filter_pattern

In Django, when building a dynamic OR filter from a known-non-empty iterable of tuples/keys, prefer `reduce(or_, (Q(...) for ... in iterable))` over the imperative pattern `q = Q(); for ... in iterable: q |= Q(...)`.

**Why:** more concise, generates the same SQL, and reads as a single declarative expression. Black 120 reformats it cleanly. The tradeoff is that `reduce(or_, ())` on an empty iterable raises `TypeError` instead of returning a no-op `Q()` — so this pattern is only safe when the iterable is statically guaranteed non-empty (e.g., a hardcoded module-level constant). For runtime-variable iterables, keep the imperative form or pass an `initial=Q()` to `reduce`.

**How to apply:** when refactoring a `_method` that builds Q chains from a constant list (e.g., `REPLICATED_ATTACHMENT_CTS` in `replicatefrommain.py`), use `reduce(or_, (Q(...) for ... in CONST))` and add `from functools import reduce` + `from operator import or_` to the stdlib import block. Keep the imperative form when the list could be empty.

Confirmed by user: this exact replacement was the right call in `apps/core/management/commands/replicatefrommain.py::_replicate_attachments` (Fase 2 of JRV-754) — reduced ~64 LoC to ~47 LoC with 15/15 tests still green and zero behavioral change.

### project_datacenter_filter_rule (reviewer)

`.filter(datacenter=...)` is NOT a multi-tenant violation in binora-backend.

**Why:** Tenant isolation is physical (separate DB+container per company). The rule's
*operational* grep (`.claude/rules/paths/multi-tenant.md` §Detection + binora-multi-tenant-guardian
auto-detection table) targets only `company=`, `tenant_id=`, `company_id=` — never `datacenter=`.
`datacenter` is an intra-tenant entity. `DatacenterFilterMixin.get_queryset` already scopes the base
queryset (`Datacenter` → `id__in=user.datacenters`; scoped models → `datacenter__in OR datacenter__isnull=True`,
`apps/core/utils/mixins.py:22`).

**How to apply:** When reviewing a queryset that filters/correlates by `datacenter` (e.g. counter
Subquery with `OuterRef`), it is legitimate aggregation over already-authorized rows, not an access
filter. Do NOT flag as a tenant-isolation BLOCKER. Note the mixin INCLUDES NULL-datacenter rows but
FK-correlated counters EXCLUDE them — a real divergence worth flagging. See [[asset-model-type-semantics]].

### project_asset_model_type (reviewer)

When verifying that an ORM rewrite preserves `count_children`/`navigate` counter semantics:

- `navigate` counts by `node.model_type`. `Asset.model_type` (`apps/assets/models/base.py:62-64`)
  returns `"rack"` when `is_rack` (asset_type==RACK), else `_meta.model_name` == `"asset"`.
- `hierarchy_models()` (`apps/core/utils/models.py:82`) EXCLUDES concrete MTI subclasses via
  `skip_from_hierarchy = hasattr(cls, "asset_ptr")` — so navigate traverses BASE `Asset` rows only.
- Therefore `racks = Asset.filter(asset_type=RACK)` + `assets = Asset.exclude(asset_type=RACK)`
  replicates navigate EXACTLY. Assets inside racks carry their own denormalized `datacenter` FK,
  so they count in `assets` regardless of rack nesting.

**Why:** This is the discriminator that decides whether an ORM-annotation rewrite of hierarchy
counters is correct. Easy to get wrong if you assume Rack is queried via Rack.objects.

**How to apply:** For any DC/hierarchy counter optimization, confirm the type split maps to
model_type, and that soft-delete is identical because both paths read the same `model.objects` manager.
