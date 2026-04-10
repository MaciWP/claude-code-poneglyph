# Service Layer Boilerplate Templates

Canonical service templates for Binora Backend. All based on `apps/core/services.py`.

---

## Template 1: Basic Service (CRUD)

```python
# apps/<app>/services.py
from typing import Optional
from django.db import transaction
from django.db.models import QuerySet

from apps.<app>.models import MyModel


class MyModelService:
    def __init__(self, repository=None):
        self.repository = repository or MyModel.objects

    def get_all(self) -> QuerySet[MyModel]:
        return self.repository.all()

    def get_by_id(self, pk: int) -> MyModel:
        return self.repository.get(id=pk)

    @transaction.atomic
    def create(self, **data) -> MyModel:
        return self.repository.create(**data)

    @transaction.atomic
    def update(self, instance: MyModel, **update_data) -> MyModel:
        cleaned = {f: v for f, v in update_data.items() if getattr(instance, f) != v}
        if cleaned:
            for field, value in cleaned.items():
                setattr(instance, field, value)
            instance.save(update_fields=list(cleaned.keys()))
        return instance

    @transaction.atomic
    def delete(self, instance: MyModel) -> None:
        instance.delete()
```

---

## Template 2: Service with Complex Business Logic

```python
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import transaction

User = get_user_model()


class MyModelService:
    def __init__(self, repository=None, related_repository=None):
        self.repository = repository or MyModel.objects
        self.related_repository = related_repository or RelatedModel.objects

    @transaction.atomic
    def create(self, data: dict, created_by: User) -> MyModel:
        self._validate_business_rules(data)
        instance = self.repository.create(**data)
        self._update_related_models(instance)
        self._log_creation(instance, created_by)
        return instance

    @transaction.atomic
    def update_status(self, instance: MyModel, new_status: str) -> MyModel:
        self._validate_status_transition(instance.status, new_status)
        old_status = instance.status
        instance.status = new_status
        instance.save(update_fields=['status'])
        self._handle_status_change(instance, old_status)
        return instance

    def _validate_business_rules(self, data: dict) -> None:
        if data.get('status') == 'approved' and not data.get('reviewer'):
            raise ValidationError("Approved items require a reviewer")

    def _validate_status_transition(self, current: str, new: str) -> None:
        valid = {
            'draft': ['pending', 'cancelled'],
            'pending': ['approved', 'rejected'],
            'approved': ['active'],
        }
        if new not in valid.get(current, []):
            raise ValidationError(f"Cannot transition from {current} to {new}")
```

---

## Template 3: Service with External Dependencies

```python
from django.core.mail import send_mail

class MyModelService:
    def __init__(self, repository=None, email_helper=None):
        self.repository = repository or MyModel.objects
        self.email_helper = email_helper or EmailHelper()

    @transaction.atomic
    def create(self, data: dict, created_by: User, notify: bool = True) -> MyModel:
        instance = self.repository.create(**data)
        if notify:
            self._send_creation_email(instance, created_by)
        return instance

    def _send_creation_email(self, instance: MyModel, created_by: User) -> None:
        self.email_helper.send_template_email(
            template='model_created',
            recipient_list=[created_by.email],
            context={'instance': instance},
        )
```

---

## Template 4: Read-Only Service (Selector)

```python
from django.db.models import QuerySet, Q

class MyModelQueryService:
    def __init__(self, repository=None):
        self.repository = repository or MyModel.objects

    def get_all(self, is_active: bool | None = None, order_by: str = 'name') -> QuerySet[MyModel]:
        queryset = self.repository.select_related().prefetch_related()
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active)
        return queryset.order_by(order_by)

    def search(self, query: str, filters: dict | None = None) -> QuerySet[MyModel]:
        queryset = self.repository.all()
        if query:
            queryset = queryset.filter(Q(name__icontains=query) | Q(description__icontains=query))
        if filters:
            queryset = queryset.filter(**filters)
        return queryset.order_by('name')
```

---

## Template 5: Service with Multi-Model Transactions

```python
class MyModelTransactionService:
    def __init__(self, repository=None, related_a=None, related_b=None):
        self.repository = repository or MyModel.objects
        self.related_a = related_a or RelatedModelA.objects
        self.related_b = related_b or RelatedModelB.objects

    @transaction.atomic
    def create_with_relations(self, data: dict, related_a_data: dict, related_b_data: dict) -> MyModel:
        rel_a = self.related_a.create(**related_a_data)
        rel_b = self.related_b.create(**related_b_data)
        return self.repository.create(**data, related_a=rel_a, related_b=rel_b)

    @transaction.atomic
    def transfer(self, instance: MyModel, from_loc, to_loc, user: User) -> MyModel:
        from_loc.inventory_count -= 1
        from_loc.save(update_fields=['inventory_count'])
        to_loc.inventory_count += 1
        to_loc.save(update_fields=['inventory_count'])
        instance.location = to_loc
        instance.save(update_fields=['location'])
        return instance
```

---

## Service Creation Checklist

- [ ] Dependency injection pattern (`__init__` with defaults)
- [ ] Type hints on all parameters and return values
- [ ] `@transaction.atomic` on data-modifying methods
- [ ] Public methods for business operations
- [ ] Private methods (`_method_name`) for helpers
- [ ] NO HTTP concerns (request, response, status codes)
- [ ] Raises specific exceptions (ValueError, ValidationError, PermissionError)
- [ ] Cleaned data pattern for updates (`update_fields=`)
- [ ] Tests with mocked dependencies

---

**Last Updated**: 2026-03-18
**Based on**: Real Binora patterns (apps/core/services.py)
