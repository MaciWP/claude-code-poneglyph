# Architecture Principles - Binora Backend

Deep dive into service layer architecture and separation of concerns.

---

## Core Architecture: Three Layers

```
ViewSets (HTTP Layer)
  - HTTP request/response handling
  - Input validation (via serializers)
  - Permission checks (declarative)
  - Delegation to service layer
  - NOT: Business logic, direct ORM, email, complex validation

Services (Business Layer)
  - ALL business logic
  - Data manipulation (CRUD via injected repos)
  - Complex validation
  - Email/notification sending
  - External API calls
  - Transaction management, logging, auditing
  - NOT: HTTP concerns (request, response, status)

Models (Data Layer)
  - Data structure definition
  - Database constraints
  - Simple property methods
  - Model-level validation (clean)
  - NOT: Business logic, external calls, email
```

---

## Principle 1: Single Responsibility

Each layer has ONE job. ViewSets convert HTTP to business operations and back. Services execute business rules. Models define data structure.

```python
# ViewSet: HTTP concerns only
class AssetViewSet(viewsets.ModelViewSet):
    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        asset = self.asset_service.create(**serializer.validated_data)
        return Response(AssetSerializer(asset).data, status=201)

# Service: Business logic only
class AssetService:
    @transaction.atomic
    def create(self, **data) -> Asset:
        self._validate_business_rules(data)
        asset = self.assets_repository.create(**data)
        if asset.rack:
            asset.rack.occupied_units += asset.u_size
            asset.rack.save()
        self._send_creation_email(asset)
        return asset
```

**Why**: Testability (layers tested separately), reusability (service callable from CLI/Celery), maintainability (HTTP format changes don't affect logic).

---

## Principle 2: Dependency Inversion

High-level modules should not depend on low-level modules. Both depend on abstractions.

```python
# From apps/core/services.py:36-46
class AuthService:
    def __init__(
        self,
        users_repository=User.objects,
        email_helper=EmailHelper,
        validation_function=validate_password,
        token_generator=default_token_generator,
    ):
        self.users_repository = users_repository
        self.email_helper = email_helper
        self.password_validation_function = validation_function
        self.token_generator = token_generator
```

**Benefits**: Testability (inject mocks), flexibility (swap implementations), explicit dependencies.

---

## Principle 3: Separation of Concerns

| Concern | Where | Example |
|---------|-------|---------|
| Input Validation | Serializers | `validate_code()`, field validators |
| Business Validation | Services | Status rules, capacity checks |
| Data Integrity | Models | Unique constraints, CheckConstraints |

---

## Principle 4: DRY (Don't Repeat Yourself)

Business logic in ONE place only. Multiple views calling same service method instead of duplicating logic.

```python
# Centralized in service
class AssetService:
    def _validate_production_asset(self, data):
        if data['status'] == 'production' and not data.get('rack'):
            raise ValueError("Production assets must have rack")

    def create(self, **data): ...      # calls _validate_production_asset
    def bulk_create(self, items): ...   # calls _validate_production_asset
```

---

## Principle 5: Transaction Management

All business operations should be atomic. `@transaction.atomic` on service methods. NO I/O inside transactions.

---

## Principle 6: Fail Fast

Validate early, fail with clear actionable errors before expensive operations.

```python
@transaction.atomic
def create(self, **data) -> Asset:
    self._validate_business_rules(data)  # Fail before DB ops
    asset = self.assets_repository.create(**data)
    self._update_inventory(asset)
    return asset
```

---

## Principle 7: Explicit is Better Than Implicit

Type hints on all parameters and returns. Explicit dependency lists in constructors.

---

## Principle 8: Composition Over Inheritance

Compose services instead of inheriting from base classes. Inject helpers via constructor.

```python
# Compose, don't inherit
class AssetService:
    def __init__(self, assets_repository=Asset.objects, email_service=EmailService()):
        self.assets_repository = assets_repository
        self.email_service = email_service
```

---

## Principle 9: Query Optimization

Always `select_related` for FK, `prefetch_related` for M2M, and `order_by` in ViewSet querysets.

```python
class AssetViewSet(viewsets.ModelViewSet):
    queryset = Asset.objects.select_related(
        'rack', 'rack__row', 'datacenter',
    ).prefetch_related('tags', 'documents').order_by('code')
```

---

## Principle 10: Error Messages Matter

Provide actionable error messages with context and suggestions.

```python
if available < needed:
    raise ValueError(
        f"Rack {rack.code} has insufficient space. "
        f"Available: {available}U, Required: {needed}U."
    )
```

---

## Architecture Decision Tree

```
Is this HTTP-related? (parsing request, formatting response, status codes)
  YES -> ViewSet
  NO  -> Is this business logic? (validation, calculations, workflows)
    YES -> Service
    NO  -> Is this data structure? (fields, constraints, relationships)
      YES -> Model
      NO  -> Is this reusable utility?
        YES -> utils/
```

---

## Summary

| Rule | Principle | Why |
|------|-----------|-----|
| ViewSets HTTP only | Single Responsibility | Testability, reusability |
| Services have DI | Dependency Inversion | Testability, flexibility |
| No business in views | Separation of Concerns | Maintainability |
| Logic in ONE place | DRY | Consistency |
| @transaction.atomic | Transaction Management | Data integrity |
| Validate early | Fail Fast | Performance, clarity |
| Type hints required | Explicit > Implicit | IDE support, documentation |
| Composition > Inheritance | Composition | Flexibility, testability |
| Optimize queries | Performance | User experience |
| Clear error messages | Error Messages | Developer experience |

---

**Last Updated**: 2026-03-18
**Based on**: Real Binora Backend architecture patterns
