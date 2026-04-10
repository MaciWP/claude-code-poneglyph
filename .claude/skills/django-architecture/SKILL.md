---
name: django-architecture
description: |
  Django 3-layer architecture patterns (Views -> Services -> Models), dependency injection,
  transaction management, and service layer best practices.
  Use when implementing features, reviewing architecture, refactoring business logic,
  or designing new services in Django/DRF projects.
type: knowledge-base
disable-model-invocation: false
effort: high
activation:
  keywords:
    - django architecture
    - service layer
    - views services models
    - 3-layer
    - business logic
    - dependency injection
    - transaction
    - atomic
    - django service
    - refactor views
for_agents: [builder, reviewer, planner, scout]
context: fork
version: "2.0.0"
---

# Django Architecture

**THE #1 RULE: Views -> Services -> Models. Zero business logic in views.**

```
ViewSets (HTTP)  ->  Services (Business Logic)  ->  Models (Data)
   |                       |                          |
Request parsing     ALL business logic          Data structure
Response format     Email, logging              DB constraints
Permissions         Validation                  Simple properties
Status codes        Transactions
                    External APIs
```

---

## Quick Reference

| Layer | Allowed | NOT Allowed |
|-------|---------|-------------|
| **ViewSet** | Parse request, validate via serializer, delegate to service, return Response with status code | ORM ops, email, logging, business validation, external APIs |
| **Service** | Business logic, ORM via injected repo, transactions, email/notifications, complex validation | Import Request/Response/status, return HTTP objects |
| **Serializer** | Input validation, field-level formatting | Business logic, `.save()`, `.create()`, side effects |
| **Model** | Field definitions, constraints, `__str__`, simple properties | Business logic, external calls, email |

## Service Patterns

| Pattern | When | Reference |
|---------|------|-----------|
| **Factory** (`__new__`) | Environment-dependent impl (local vs remote) | `apps/core/services/authservice.py` |
| **Constructor DI** | Services with external deps needing testability | `apps/core/services/localauthservice.py` |
| **Static Methods** | Pure functions, no instance state | `apps/hierarchy/services.py` |
| **Rules Decorator** | Pre/post hooks for workflows | `apps/processes/services.py` |
| **Cleaned Data** | Update only changed fields + `update_fields=` | `apps/assets/services.py` |

## Dependency Injection

```python
class AssetService:
    def __init__(self, asset_repository=None, naming_service=None):
        self.asset_repository = asset_repository or Asset.objects
        self.naming_service = naming_service or NamingConventionService()

    @transaction.atomic
    def create_asset(self, data: dict) -> Asset:
        code = self.naming_service.generate_code(Asset, data['asset_type'])
        return self.asset_repository.create(code=code, **data)
```

**Rules**: Defaults = real impl. Tests inject mocks via constructor. Helpers separated by concern (EmailHelper, PasswordHelper).

## Transaction Management

| Technique | When | Example |
|-----------|------|---------|
| `@transaction.atomic` decorator | Simple mutations (create/update/delete) | All service write methods |
| Context manager | Fine-grained control, I/O after commit | `with transaction.atomic(): ...` then email |
| Savepoints | Batch ops with partial failures | Nested `with transaction.atomic()` in loop |
| `select_for_update()` | Concurrent writes on same row | Balance transfers, counters |

**Rules**: ALL mutations wrapped in `@transaction.atomic`. NO I/O inside transactions (email, HTTP). Transactions < 1 second. Never catch exceptions without re-raise inside transaction (breaks rollback).

```python
# I/O OUTSIDE transaction
def create_user(self, data: dict) -> User:
    with transaction.atomic():
        user = User.objects.create(**data)
    send_email(user)  # After commit
    return user
```

## Anti-Patterns

| Anti-Pattern | Correction | Why | Severity |
|--------------|------------|-----|----------|
| Business logic in views/serializers | Move to service, call from `perform_*` | Reusability, testability without HTTP, SRP | CRITICAL |
| Service imports Request/Response/status | Service receives validated dicts, returns domain objects | Framework independence, callable from CLI/tasks/tests | CRITICAL |
| Service receives serializer objects | Pass `serializer.validated_data` (dict) to service | Explicit contract, DRF-agnostic, easy testing with dicts | CRITICAL |
| Missing `@transaction.atomic` on mutations | Add decorator on create/update/delete | All-or-nothing data integrity, auto rollback on exception | CRITICAL |
| I/O inside `@transaction.atomic` (HTTP, email, file) | Move I/O after transaction commit | I/O holds locks -> deadlocks. I/O is not rollbackable | CRITICAL |
| Generic exceptions (`except Exception:`) | Domain exceptions: `raise InvalidPasswordException()` | Clarity, catchable, HTTP mapping (400/403), error codes i18n | CRITICAL |
| `unittest.mock.Mock()` in tests | Use `mocker.Mock()` from pytest-mock | Auto cleanup, better pytest integration, project standard | CRITICAL |
| Hard-coded deps (`User.objects.create()` direct) | Constructor DI: `self.repo = repo or User.objects` | Testability without monkey-patch, flexibility, explicit deps | HIGH |
| `mocker.patch()` to mock service deps in tests | Inject mocks via constructor DI | Explicit, robust to refactors, no import path issues | HIGH |
| God Object service (>10 public methods) | Split by domain: UserService, EmailService | SRP, maintainability, testability | HIGH |
| Signals for business logic (`post_save` -> email) | Explicit: `service.create()` -> `email_helper.send()` | Implicit flow hides logic, hard to test and debug | HIGH |
| Service returns dict instead of model | Return typed model: `-> User`, `-> Asset` | Type safety, IDE autocomplete, lazy loading ORM | HIGH |
| Mutate before validating | Validate BEFORE mutating: fail fast | No wasted DB resources, cleaner error handling | HIGH |
| Single serializer for read/write | Separate Input/Output serializers | Different validation needs per operation | MEDIUM |

## ViewSet Pattern

```python
class AssetViewSet(viewsets.ModelViewSet):
    queryset = Asset.objects.select_related('rack').order_by('code')
    asset_service = AssetService()

    def get_serializer_class(self):
        if self.action in ['create', 'update']:
            return AssetInputSerializer
        return AssetOutputSerializer

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        asset = self.asset_service.create(**serializer.validated_data)
        return Response(AssetOutputSerializer(asset).data, status=201)
```

**Rules**: Methods 5-15 lines. Always `select_related`/`prefetch_related` + `order_by`. Service instance as class attribute.

---

## Documentation

| Document | Description |
|----------|-------------|
| `${CLAUDE_SKILL_DIR}/references/architecture-principles.md` | 10 core principles with code examples (SRP, DI, DRY, transactions, fail fast, composition) |
| `${CLAUDE_SKILL_DIR}/references/service-patterns.md` | All service patterns: Factory, DI, Static, Rules Decorator, Cleaned Data with tests |
| `${CLAUDE_SKILL_DIR}/references/transaction-management.md` | Decorator, context manager, savepoints, select_for_update with rules |
| `${CLAUDE_SKILL_DIR}/examples/three-layer-workflow.md` | End-to-end feature: Model -> Service -> Serializer -> ViewSet -> Tests |
| `${CLAUDE_SKILL_DIR}/examples/business-logic-separation.md` | Before/after: monolithic ViewSet refactored to service layer |
| `${CLAUDE_SKILL_DIR}/examples/dependency-injection.md` | DI patterns: anti-pattern, correct pattern, usage, testing |
| `${CLAUDE_SKILL_DIR}/examples/service-violation-detection.md` | Detection patterns with grep commands and refactoring guide |
| `${CLAUDE_SKILL_DIR}/checklists/architecture-validation.md` | 3-level validation (Quick Scan, Detailed, Compliance) with bash scripts |
| `${CLAUDE_SKILL_DIR}/checklists/refactoring-guide.md` | 5-step process: Analyze -> Create Service -> Refactor ViewSet -> Update Tests -> Validate |
| `${CLAUDE_SKILL_DIR}/templates/service-boilerplate.md` | 5 canonical templates: Basic CRUD, Complex Logic, External Deps, Read-Only, Multi-Model |
| `${CLAUDE_SKILL_DIR}/templates/viewset-boilerplate.md` | 5 templates: Basic, Custom Actions, Read-Only, I/O Serializers, Filters+Permissions |
| `${CLAUDE_SKILL_DIR}/templates/testing-boilerplate.md` | Service tests, ViewSet tests, Integration tests, Fixtures/Factories |

---

## Critical Reminders

1. **NEVER** put business logic in views or serializers -- delegate to services
2. **ALWAYS** use `@transaction.atomic` on service methods that mutate data
3. **ALWAYS** use dependency injection in services (constructor with defaults)
4. **ALWAYS** separate input/output serializers
5. **ALWAYS** add type hints to service method parameters and returns

---

## External References

- [HackSoftware Django Styleguide](https://github.com/HackSoftware/Django-Styleguide)
- [Django Docs - Transactions](https://docs.djangoproject.com/en/5.0/topics/db/transactions/)
- Two Scoops of Django (Daniel & Audrey Roy Greenfeld)
- breadcrumbscollector.tech - Service Layer in DRF

**Project References**: `apps/core/services/authservice.py` (Factory), `apps/core/services/localauthservice.py` (DI), `apps/hierarchy/services.py` (Static), `apps/assets/services.py` (Cleaned Data), `apps/processes/services.py` (Rules), `apps/core/exceptions.py` (Domain Exceptions)

---

**Version**: 2.0.0
**Last Updated**: 2026-03-18
