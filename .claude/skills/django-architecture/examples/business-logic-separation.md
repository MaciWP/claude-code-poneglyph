# Business Logic Separation - Complete Guide

Before/After refactoring from monolithic ViewSet to service layer architecture.

---

## BEFORE: Monolithic ViewSet

```python
class AssetViewSet(viewsets.ModelViewSet):
    queryset = Asset.objects.all()
    serializer_class = AssetSerializer

    @transaction.atomic
    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Business validation in view
        if serializer.validated_data.get('status') == 'disposed':
            if not request.user.has_perm('assets.dispose_asset'):
                return Response({"error": "No permission"}, status=403)

        # ORM in view
        asset = Asset.objects.create(**serializer.validated_data)

        # Business logic in view
        if asset.rack:
            asset.rack.occupied_units += asset.u_size
            asset.rack.save()

        # Email in view
        send_mail(subject=f"New asset: {asset.name}", ...)

        # Logging in view
        AssetLog.objects.create(asset=asset, action="created", user=request.user)

        return Response(AssetSerializer(asset).data, status=201)
```

**Problems**: Mixed concerns, hard to test, can't reuse, long methods, no transactions, tightly coupled.

---

## AFTER: Service Layer Architecture

### Service
```python
class AssetService:
    def __init__(self, assets_repository=Asset.objects, notification_service=None):
        self.assets_repository = assets_repository
        self.notification_service = notification_service or NotificationService()

    @transaction.atomic
    def create_asset(self, data: dict, created_by: User) -> Asset:
        if data.get('status') == 'disposed' and not created_by.has_perm('assets.dispose_asset'):
            raise PermissionDenied("No permission to create disposed assets")

        if 'datacenter_id' in data:
            self._validate_datacenter_capacity(data['datacenter_id'])

        asset = self.assets_repository.create(**data)

        if asset.rack:
            self._update_rack_inventory(asset.rack, asset.u_size, operation='add')

        self.notification_service.notify_asset_created(asset, created_by)
        return asset
```

### ViewSet
```python
class AssetViewSet(viewsets.ModelViewSet):
    queryset = Asset.objects.select_related('rack', 'datacenter').order_by('code')
    asset_service = AssetService()

    def get_serializer_class(self):
        return {'create': AssetInputSerializer, 'update': AssetInputSerializer}.get(
            self.action, AssetSerializer
        )

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        asset = self.asset_service.create_asset(
            data=serializer.validated_data, created_by=request.user
        )
        return Response(AssetSerializer(asset).data, status=201)
```

---

## Comparison

| Aspect | Before (Monolithic) | After (Service Layer) |
|--------|---------------------|----------------------|
| ViewSet Lines | 50+ per method | 10-15 per method |
| Business Logic | ViewSet | Service |
| Testability | Hard (HTTP + logic) | Easy (independent) |
| Reusability | Locked in ViewSet | Available anywhere |
| Transaction Management | Manual/scattered | Centralized in service |
| Dependencies | Hard-coded | Injected (DI) |

---

## Testing Benefits

```python
# Test service independently
def test_create_asset_service(mocker):
    mock_repo = mocker.Mock()
    mock_notif = mocker.Mock()
    service = AssetService(assets_repository=mock_repo, notification_service=mock_notif)
    asset = service.create_asset(data={'name': 'Test'}, created_by=mocker.Mock())
    mock_repo.create.assert_called_once()
    mock_notif.notify_asset_created.assert_called_once()

# Test view delegation
def test_create_asset_view(api_client, mocker):
    mock_service = mocker.patch.object(AssetService, 'create_asset', return_value=Asset(id=1, name='Test'))
    response = api_client.post('/api/assets/', data={'name': 'Test'})
    assert response.status_code == 201
    mock_service.assert_called_once()
```

---

**Last Updated**: 2026-03-18
