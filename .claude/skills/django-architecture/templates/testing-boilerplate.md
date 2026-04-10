# Testing Boilerplate Templates

Copy-paste ready test templates following AAA pattern and service layer architecture.

---

## Template 1: Service Tests

Test business logic with mocked dependencies.

```python
import pytest
from django.core.exceptions import ValidationError
from apps.<app>.models import MyModel
from apps.<app>.services import MyModelService


@pytest.mark.django_db
class TestMyModelService:
    def test_create_with_valid_data_succeeds(self, mocker, user_factory):
        mock_repo = mocker.Mock()
        created = MyModel(id=1, name='Test')
        mock_repo.create.return_value = created

        service = MyModelService(repository=mock_repo)
        result = service.create(name='Test')

        assert result.id == 1
        mock_repo.create.assert_called_once_with(name='Test')

    def test_create_with_invalid_data_raises_error(self, mocker, user_factory):
        mock_repo = mocker.Mock()
        service = MyModelService(repository=mock_repo)

        with pytest.raises(ValidationError, match="Name cannot be empty"):
            service.create(name='')

        mock_repo.create.assert_not_called()

    def test_update_only_saves_changed_fields(self, mocker):
        mock_repo = mocker.Mock()
        service = MyModelService(repository=mock_repo)
        instance = MyModel(id=1, name='Old', description='Same')

        result = service.update(instance=instance, name='New', description='Same')

        assert result.name == 'New'

    def test_create_sends_notification(self, mocker, user_factory):
        mock_repo = mocker.Mock()
        mock_email = mocker.Mock()
        created = MyModel(id=1, name='Test')
        mock_repo.create.return_value = created

        service = MyModelService(repository=mock_repo, email_helper=mock_email)
        service.create(name='Test')

        mock_email.send_creation_email.assert_called_once()

    def test_status_transition_validates(self, mocker):
        mock_repo = mocker.Mock()
        service = MyModelService(repository=mock_repo)
        instance = MyModel(id=1, status='draft')

        with pytest.raises(ValidationError, match="Cannot transition"):
            service.update_status(instance=instance, new_status='active')

        service.update_status(instance=instance, new_status='pending')
        assert instance.status == 'pending'
```

---

## Template 2: ViewSet Tests

Test HTTP layer with mocked service.

```python
import pytest
from rest_framework import status
from apps.<app>.models import MyModel
from apps.<app>.services import MyModelService


@pytest.mark.django_db
class TestMyModelViewSet:
    def test_list_returns_200(self, api_client, user_factory, model_factory):
        user = user_factory()
        api_client.force_authenticate(user=user)
        model_factory(name='Item 1')
        model_factory(name='Item 2')

        response = api_client.get('/api/my-models/')

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2

    def test_create_delegates_to_service(self, api_client, user_factory, mocker):
        user = user_factory()
        api_client.force_authenticate(user=user)
        mock_instance = MyModel(id=1, name='Test')
        mock_service = mocker.patch.object(MyModelService, 'create', return_value=mock_instance)

        response = api_client.post('/api/my-models/', {'name': 'Test'})

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == 'Test'
        mock_service.assert_called_once()

    def test_create_without_auth_returns_401(self, api_client):
        response = api_client.post('/api/my-models/', {'name': 'Test'})
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_with_invalid_data_returns_400(self, api_client, user_factory):
        user = user_factory()
        api_client.force_authenticate(user=user)

        response = api_client.post('/api/my-models/', {'name': ''})

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_service_error_returns_400(self, api_client, user_factory, mocker):
        user = user_factory()
        api_client.force_authenticate(user=user)
        mocker.patch.object(MyModelService, 'create', side_effect=ValueError('Business rule violated'))

        response = api_client.post('/api/my-models/', {'name': 'Test'})

        assert response.status_code == status.HTTP_400_BAD_REQUEST
```

---

## Template 3: Integration Tests

Test complete workflow with real DB (mock only external services like email).

```python
@pytest.mark.django_db
class TestMyModelIntegration:
    def test_create_complete_workflow(self, api_client, user_factory, mocker):
        user = user_factory()
        api_client.force_authenticate(user=user)
        mock_email = mocker.patch('apps.<app>.services.send_mail')

        response = api_client.post('/api/my-models/', {'name': 'Test', 'description': 'Integration'})

        assert response.status_code == status.HTTP_201_CREATED
        instance = MyModel.objects.get(id=response.data['id'])
        assert instance.name == 'Test'
        mock_email.assert_called_once()
```

---

## Testing Patterns

### Business Validation
```python
def test_create_with_invalid_status_raises_error(self, mocker):
    service = MyModelService(repository=mocker.Mock())
    with pytest.raises(ValidationError, match="Invalid status"):
        service.create(data={'status': 'invalid'})
    mocker.Mock().create.assert_not_called()
```

### Atomic Operations
```python
@pytest.mark.django_db
def test_create_with_relations_is_atomic(self, mocker):
    mocker.patch('apps.<app>.models.Related.save', side_effect=Exception('DB error'))
    service = MyModelService()
    with pytest.raises(Exception):
        service.create_with_relations(data={...})
    assert MyModel.objects.count() == 0  # Nothing committed
```

---

## Testing Checklist

- [ ] Service tests with mocked dependencies (DI)
- [ ] ViewSet tests mock service layer
- [ ] Integration test for critical workflows
- [ ] AAA pattern (Arrange, Act, Assert)
- [ ] `mocker.Mock()` not `Mock()` from unittest
- [ ] `@pytest.mark.django_db` when needed
- [ ] Test happy path + edge cases + error paths

---

**Last Updated**: 2026-03-18
**Based on**: Real Binora patterns (apps/core/tests/, conftest.py)
