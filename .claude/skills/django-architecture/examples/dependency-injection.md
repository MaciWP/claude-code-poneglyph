# Dependency Injection Pattern in Services

Real-world DI implementation from Binora Backend.

---

## Anti-Pattern: Hard-Coded Dependencies

```python
class AuthService:
    def create_user(self, email: str, password: str) -> User:
        user = User.objects.create(email=email)       # Hard-coded
        EmailHelper().send_welcome_email(user)         # Hard-coded
        validate_password(password)                     # Hard-coded
        return user
```

**Problems**: Can't mock `User.objects` (tests hit real DB), can't mock `EmailHelper` (tests send real emails), tightly coupled, violates Dependency Inversion.

---

## Correct: Constructor DI with Defaults

From `apps/core/services.py:36-46`:

```python
class AuthService:
    def __init__(
        self,
        users_repository=User.objects,
        email_helper=EmailHelper,
        validation_function=validate_password,
        token_generator=default_token_generator,
        request=None,
    ):
        self.users_repository = users_repository
        self.email_helper = email_helper
        self.password_validation_function = validation_function
        self.token_generator = token_generator
        self.request = request

    @transaction.atomic
    def create_user(self, user: User) -> User:
        temp_password = generate_random_password()
        user.set_password(temp_password)
        user.force_password_change = True
        user.save()
        self.email_helper.send_user_created_email(user, temp_password, timezone.now())
        return user
```

---

## Usage Patterns

### Production (Default Dependencies)
```python
class UserViewSet(viewsets.ModelViewSet):
    auth_service = AuthService()  # Uses defaults

    def perform_create(self, serializer):
        self.auth_service.create_user(User(**serializer.validated_data))
```

### Testing (Inject Mocks)
```python
def test_create_user_sends_email(mocker):
    mock_repository = mocker.Mock()
    mock_email_helper = mocker.Mock()
    service = AuthService(users_repository=mock_repository, email_helper=mock_email_helper)

    user = User(email="test@example.com")
    service.create_user(user)

    mock_email_helper.send_user_created_email.assert_called_once()
```

### Custom Context
```python
service = AuthService(users_repository=CachedUserRepository())
```

---

## Common DI Patterns in Binora

### Repository Injection
```python
class AssetService:
    def __init__(self, assets_repository=Asset.objects, datacenters_repository=Datacenter.objects):
        self.assets_repository = assets_repository
        self.datacenters_repository = datacenters_repository
```

### Helper Injection
```python
class NotificationService:
    def __init__(self, email_helper=EmailHelper, sms_helper=SMSHelper):
        self.email_helper = email_helper
        self.sms_helper = sms_helper
```

### Validator/Function Injection
```python
class ValidationService:
    def __init__(self, password_validator=validate_password, custom_validator=custom_rule):
        self.password_validator = password_validator
        self.custom_validator = custom_validator
```

---

## DI Checklist

- [ ] Constructor accepts dependencies as parameters
- [ ] Dependencies have sensible defaults for production
- [ ] Dependencies stored as instance attributes (`self.dependency`)
- [ ] Methods use `self.dependency` (not hard-coded)
- [ ] Tests inject mocks via constructor (not monkey-patching)

---

**Last Updated**: 2026-03-18
**Based on**: Real AuthService DI pattern (apps/core/services.py:36-46)
