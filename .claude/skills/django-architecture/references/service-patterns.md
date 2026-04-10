# Service Patterns - Compact Examples

Production-ready implementations of all service patterns used in Binora.

---

## 1. Factory Pattern

**Use case**: Environment-based selection (local vs remote).

```python
# apps/core/services/authservice.py
class AuthService:
    def __new__(cls, *args, **kwargs):
        if settings.MAIN_INSTANCE_URL:
            from apps.core.services.remoteauthservice import RemoteAuthService
            return RemoteAuthService(*args, **kwargs)
        from apps.core.services.localauthservice import LocalAuthService
        return LocalAuthService(*args, **kwargs)

    def create_user(self, data: dict) -> "User":
        raise NotImplementedError  # pragma: no cover
```

### Local Implementation (DB Operations)
```python
class LocalAuthService(AuthService):
    def __init__(self, users_repository=None, email_helper=None, password_helper=None):
        self.users_repository = users_repository or User.objects
        self.email_helper = email_helper or EmailHelper()
        self.password_helper = password_helper or PasswordHelper()

    @transaction.atomic
    def create_user(self, data: dict) -> User:
        hashed_password = self.password_helper.hash(data.pop('password'))
        user = self.users_repository.create(password=hashed_password, **data)
        self.email_helper.send_welcome(user)
        return user
```

### Remote Implementation (HTTP Proxy)
```python
class RemoteAuthService(AuthService):
    def __init__(self, http_client=None):
        self.http_client = http_client or httpx.Client(base_url=settings.MAIN_INSTANCE_URL)

    def create_user(self, data: dict) -> dict:
        response = self.http_client.post('/api/users/', json=data)
        response.raise_for_status()
        return response.json()
```

---

## 2. Dependency Injection Pattern

**Use case**: Testable services with external dependencies.

```python
class AssetService:
    def __init__(self, asset_repository=None, naming_service=None, validator=None):
        self.asset_repository = asset_repository or Asset.objects
        self.naming_service = naming_service or NamingConventionService()
        self.validator = validator or AssetValidator()

    @transaction.atomic
    def create_asset(self, data: dict) -> Asset:
        self.validator.validate_create(data)
        code = self.naming_service.generate_code(Asset, data['asset_type'], data.get('parent'))
        return self.asset_repository.create(code=code, **data)

    @transaction.atomic
    def update_asset(self, instance: Asset, validated_data: dict) -> Asset:
        self.validator.validate_update(instance, validated_data)
        cleaned_data = {f: v for f, v in validated_data.items() if getattr(instance, f) != v}
        if cleaned_data:
            for field, value in cleaned_data.items():
                setattr(instance, field, value)
            instance.save(update_fields=list(cleaned_data.keys()))
        return instance
```

### Test with Mock Injection
```python
def test_create_asset_generates_code(mocker):
    mock_repo = mocker.Mock(); mock_repo.create.return_value = Asset(id=1, code='DC01-AST-001')
    mock_naming = mocker.Mock(); mock_naming.generate_code.return_value = 'DC01-AST-001'
    mock_validator = mocker.Mock()

    service = AssetService(asset_repository=mock_repo, naming_service=mock_naming, validator=mock_validator)
    asset = service.create_asset({'asset_type': 'SERVER', 'product_model_id': 10})

    mock_validator.validate_create.assert_called_once()
    mock_naming.generate_code.assert_called_once()
    assert asset.code == 'DC01-AST-001'
```

---

## 3. Static Methods Pattern

**Use case**: Stateless operations.

```python
class HierarchyService:
    @staticmethod
    @transaction.atomic
    def create_level(validated_data: dict, level_class: type) -> HierarchyLevel:
        validator = HierarchyValidatorFactory.get_validator(level_class)
        validator.validate(validated_data)
        return level_class.objects.create(**validated_data)

    @staticmethod
    @transaction.atomic
    def update_level(instance: HierarchyLevel, validated_data: dict) -> HierarchyLevel:
        validator = HierarchyValidatorFactory.get_validator(type(instance))
        validator.validate_update(instance, validated_data)
        cleaned_data = {f: v for f, v in validated_data.items() if getattr(instance, f) != v}
        if cleaned_data:
            for field, value in cleaned_data.items():
                setattr(instance, field, value)
            instance.save(update_fields=list(cleaned_data.keys()))
        return instance
```

---

## 4. Rules Decorator Pattern

**Use case**: Pre/post hooks for workflows.

```python
# apps/processes/decorators.py
def rules(pre=None, post=None):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            if pre:
                for rule in pre:
                    rule(*args, **kwargs)
            result = func(*args, **kwargs)
            if post:
                for rule in post:
                    rule(result, *args, **kwargs)
            return result
        return wrapper
    return decorator

# apps/processes/services.py
class ProcessService:
    @staticmethod
    @rules(pre=[validate_status_transition], post=[notify_assignee, log_status_change])
    @transaction.atomic
    def update_status(process: Process, new_status: str) -> Process:
        process.status = new_status
        process.save(update_fields=['status'])
        return process
```

---

## 5. Anti-Pattern -> Refactored

### Before: Business Logic in View
```python
class UserViewSet(viewsets.ModelViewSet):
    def perform_create(self, serializer):
        password = generate_random_password()
        user = User.objects.create(**serializer.validated_data)
        user.set_password(password)
        user.save()
        EmailHelper().send_welcome(user, password)
```

### After: Service Layer
```python
class UserService:
    def __init__(self, users_repository=None, email_helper=None, password_helper=None):
        self.users_repository = users_repository or User.objects
        self.email_helper = email_helper or EmailHelper()
        self.password_helper = password_helper or PasswordHelper()

    @transaction.atomic
    def create_user(self, data: dict) -> User:
        password = self.password_helper.generate_random_password()
        user = self.users_repository.create(**data)
        user.set_password(password)
        user.save(update_fields=['password'])
        self.email_helper.send_welcome(user, password)
        return user

class UserViewSet(viewsets.ModelViewSet):
    user_service = UserService()

    def perform_create(self, serializer):
        self.user_service.create_user(serializer.validated_data)
```

---

## Summary Table

| Pattern | Key Files |
|---------|-----------|
| **Factory** | `apps/core/services/authservice.py` |
| **Constructor DI** | `apps/core/services/localauthservice.py`, `apps/assets/services.py` |
| **Static Methods** | `apps/hierarchy/services.py` |
| **Rules Decorator** | `apps/processes/services.py`, `apps/processes/decorators.py` |
| **Cleaned Data** | `apps/assets/services.py` (update_asset method) |

All patterns share: `@transaction.atomic`, type hints, domain exceptions, testability (DI or static).

---

**Last Updated**: 2026-03-18
