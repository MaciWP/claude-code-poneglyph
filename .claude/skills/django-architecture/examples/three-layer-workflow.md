# Complete Architecture Workflow - Feature Implementation

End-to-end guide: Model -> Service -> Serializer -> ViewSet -> Tests

---

## Scenario

Complete implementation of a new feature following three-layer architecture.

**Feature**: Add password reset functionality for users

---

## Step 1: Model Layer (Data Structure)

No changes needed - User model already exists with necessary fields. Models define fields, constraints, relationships. NO business logic.

---

## Step 2: Service Layer (Business Logic)

```python
# apps/core/services.py
class AuthService:
    def __init__(
        self,
        users_repository=User.objects,
        email_helper=EmailHelper,
        token_generator=default_token_generator,
    ):
        self.users_repository = users_repository
        self.email_helper = email_helper
        self.token_generator = token_generator

    @transaction.atomic
    def request_password_reset(self, email: str) -> bool:
        try:
            user = self.users_repository.get(email=email)
            token = self.token_generator.make_token(user)
            self.email_helper.send_password_reset_email(user=user, token=token)
        except User.DoesNotExist:
            pass  # Security: Don't reveal if email exists
        return True

    @transaction.atomic
    def reset_password(self, user_id: int, token: str, new_password: str) -> User:
        user = self.users_repository.get(id=user_id)
        if not self.token_generator.check_token(user, token):
            raise ValidationError("Invalid or expired reset token")
        self.password_validation_function(new_password, user=user)
        user.password = make_password(new_password)
        user.force_password_change = False
        user.save()
        self.email_helper.send_password_changed_email(user=user)
        return user
```

---

## Step 3: Serializer Layer (Input Validation)

```python
# apps/core/serializers/password_reset.py
class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)

    def validate_email(self, value: str) -> str:
        return value.lower().strip()

class PasswordResetConfirmSerializer(serializers.Serializer):
    user_id = serializers.IntegerField(required=True)
    token = serializers.CharField(required=True, max_length=100)
    new_password = serializers.CharField(required=True, write_only=True, min_length=8)
```

---

## Step 4: ViewSet Layer (HTTP Only)

```python
# apps/core/views/password_reset.py
class PasswordResetViewSet(viewsets.GenericViewSet):
    permission_classes = [AllowAny]
    auth_service = AuthService()

    @action(methods=['POST'], detail=False, url_path='request-reset')
    def request_reset(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.auth_service.request_password_reset(email=serializer.validated_data['email'])
        return Response({'message': 'If the email exists, a reset link has been sent.'})

    @action(methods=['POST'], detail=False, url_path='confirm-reset')
    def confirm_reset(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            self.auth_service.reset_password(**serializer.validated_data)
        except Exception as e:
            return Response({'error': str(e)}, status=400)
        return Response({'message': 'Password reset successfully.'})
```

---

## Step 5: Testing Layer

### Service Tests (mock dependencies)
```python
@pytest.mark.django_db
class TestPasswordResetService:
    def test_request_password_reset_sends_email(self, mocker, user_factory):
        mock_email = mocker.Mock()
        mock_token = mocker.Mock(); mock_token.make_token.return_value = "test-token"
        user = user_factory(email="test@example.com")
        service = AuthService(email_helper=mock_email, token_generator=mock_token)

        result = service.request_password_reset(email="test@example.com")

        assert result is True
        mock_email.send_password_reset_email.assert_called_once()

    def test_request_nonexistent_email_returns_true(self, mocker):
        mock_email = mocker.Mock()
        service = AuthService(email_helper=mock_email)
        result = service.request_password_reset(email="nonexistent@example.com")
        assert result is True
        mock_email.send_password_reset_email.assert_not_called()
```

### ViewSet Tests (mock service)
```python
@pytest.mark.django_db
class TestPasswordResetViewSet:
    def test_request_reset_returns_200(self, api_client, mocker):
        mocker.patch(
            'apps.core.views.password_reset.AuthService.request_password_reset',
            return_value=True
        )
        response = api_client.post('/api/password-reset/request-reset/', {'email': 'test@example.com'})
        assert response.status_code == 200
```

---

## Architecture Layers Summary

| Layer | Responsibility | Lines | Pattern |
|-------|---------------|-------|---------|
| Model | Data structure only | Existing | AuditModel inheritance |
| Service | Business logic | ~90 | DI, @transaction.atomic |
| Serializer | Input validation | ~60 | Input/Output separation |
| ViewSet | HTTP only | ~70 | Thin, delegates to service |
| Tests (Service) | Business logic tests | ~130 | AAA, mocker.Mock() |
| Tests (ViewSet) | HTTP tests | ~80 | AAA, mock service |

---

## Development Workflow

1. **Plan**: Identify required operations
2. **Model**: Define/verify data structure
3. **Service**: Implement business logic with DI
4. **Serializer**: Create input/output validation
5. **ViewSet**: Add HTTP endpoints with delegation
6. **Tests (Service)**: Test business logic with mocks
7. **Tests (ViewSet)**: Test HTTP layer with mocked service
8. **URLs**: Register routes
9. **Validate**: Run tests, check coverage

---

**Last Updated**: 2026-03-18
