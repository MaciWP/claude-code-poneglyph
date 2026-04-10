# Refactoring Guide - From Monolithic to Service Layer

Step-by-step guide to refactor existing code to service layer architecture.

---

## When to Use

- ViewSet has business logic (>20 lines per method)
- ViewSet contains ORM operations directly
- ViewSet sends emails, logs, or calls external APIs
- Testing is difficult due to tight coupling

---

## 5-Step Process

```
Step 1: Analyze (15 min) - Identify business logic, list dependencies
Step 2: Create Service (30 min) - Service class with __init__ (DI), extract logic
Step 3: Refactor ViewSet (20 min) - Add service instance, replace with delegation
Step 4: Update Tests (30 min) - Service tests (mock deps) + ViewSet tests (mock service)
Step 5: Validate (15 min) - Run tests, check coverage, verify no regressions
```

---

## Step 1: Analyze Current Code

Look for these RED FLAGS in ViewSet methods:

```python
# Direct ORM operations
User.objects.create(...)
asset.save()
Model.objects.filter(...).delete()

# Email/Notification
send_mail(...)
send_notification(...)

# Logging
logger.info(...)
AuditLog.objects.create(...)

# External API calls
requests.post(...)

# Complex validation
if complex_business_rule():
    ...
```

Document all business operations and dependencies.

---

## Step 2: Create Service Layer

```python
# apps/<app>/services.py
class AssetService:
    def __init__(
        self,
        assets_repository=Asset.objects,
        asset_logs_repository=AssetLog.objects,
    ):
        self.assets_repository = assets_repository
        self.asset_logs_repository = asset_logs_repository

    @transaction.atomic
    def create_asset(self, asset_data: dict, created_by: User) -> Asset:
        asset = self.assets_repository.create(**asset_data)
        if asset.rack:
            asset.rack.occupied_units += asset.u_size
            asset.rack.save()
        self._send_creation_notification(asset)
        self._log_asset_creation(asset, created_by)
        return asset
```

---

## Step 3: Refactor ViewSet

**Before** (50 lines with business logic):
```python
def create(self, request):
    serializer = AssetSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    asset = Asset.objects.create(**serializer.validated_data)
    asset.rack.occupied_units += asset.u_size
    asset.rack.save()
    send_mail(...)
    AssetLog.objects.create(...)
    return Response(AssetSerializer(asset).data, status=201)
```

**After** (10 lines, HTTP only):
```python
def create(self, request):
    serializer = self.get_serializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    asset = self.asset_service.create_asset(
        asset_data=serializer.validated_data, created_by=request.user
    )
    return Response(AssetSerializer(asset).data, status=201)
```

---

## Step 4: Update Tests

### Service Tests (NEW)
```python
@pytest.mark.django_db
class TestAssetService:
    def test_create_asset_updates_rack_inventory(self, mocker, user_factory):
        mock_repo = mocker.Mock()
        mock_logs = mocker.Mock()
        rack = rack_factory(occupied_units=0)
        created_asset = Asset(id=1, name='Test', rack=rack, u_size=2)
        mock_repo.create.return_value = created_asset

        service = AssetService(assets_repository=mock_repo, asset_logs_repository=mock_logs)
        asset = service.create_asset(asset_data={'name': 'Test'}, created_by=user_factory())

        assert rack.occupied_units == 2
        mock_logs.create.assert_called_once()
```

### ViewSet Tests (UPDATED - mock service)
```python
def test_create_asset_delegates_to_service(api_client, user_factory, mocker):
    user = user_factory()
    api_client.force_authenticate(user=user)
    mock_service = mocker.patch.object(AssetService, 'create_asset', return_value=Asset(id=1, name='Test'))

    response = api_client.post('/api/assets/', {'name': 'Test'})

    assert response.status_code == 201
    mock_service.assert_called_once()
```

---

## Step 5: Validate

```bash
# Run all tests
nox -s test

# Check for remaining violations
grep -rn "\.create()\|\.save()\|send_" apps/<app>/views/*.py
# Expected: ZERO results

# Verify service has DI
grep -A 5 "def __init__" apps/<app>/services.py
```

---

## Refactoring Checklist

### Pre-Refactoring
- [ ] Understand current ViewSet behavior
- [ ] Document all business operations
- [ ] List all dependencies
- [ ] Ensure tests exist and pass (baseline)

### During Refactoring
- [ ] Create `services.py` with DI pattern
- [ ] Extract business logic to service methods
- [ ] Add type hints and `@transaction.atomic`
- [ ] Update ViewSet to delegate
- [ ] Keep ViewSet methods 5-15 lines
- [ ] Create service tests with mocked deps
- [ ] Update ViewSet tests to mock service

### Post-Refactoring
- [ ] All tests pass
- [ ] Coverage maintained or improved
- [ ] NO business logic in ViewSet (grep check)
- [ ] Service has DI pattern
- [ ] Type hints on all service methods

---

## Time Estimates

| ViewSet Size | Total Time |
|-------------|------------|
| Small (1-2 custom methods) | ~1.5 hours |
| Medium (3-5 custom methods) | ~2.5 hours |
| Large (6+ custom methods) | ~4 hours |

---

**Last Updated**: 2026-03-18
