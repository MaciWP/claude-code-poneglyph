---
name: django-testing-patterns
description: |
  pytest-django testing best practices -- AAA pattern, fixture philosophy, mocker.Mock usage,
  test naming conventions, and coverage targets for Django/DRF applications.
  Use when writing or reviewing tests in this Django project.
type: knowledge-base
disable-model-invocation: false
effort: medium
activation:
  keywords:
    - pytest
    - pytest-django
    - fixture
    - conftest
    - mocker
    - test_
    - aaa pattern
    - django test
    - unit test
    - api client
for_agents: [builder, reviewer]
context: fork
version: "2.0.0"
---

# Django Testing Patterns

pytest-django testing standards: AAA structure, fixture-first approach, correct mocking, and YOLO philosophy.

## Core Principle

**THE #1 RULE**: Only test custom logic, NOT Django internals. Use existing conftest fixtures.

## Quick Reference

| Pattern | Rule | Example |
|---------|------|---------|
| Naming | `test_<action>_<context>_<expected>` | `test_create_asset_without_rack_returns_400` |
| Structure | AAA (Arrange, Act, Assert) | Blank lines between sections, no comment separators |
| Fixtures | Use conftest.py first | `api_client_logged`, `two_datacenters_hierarchy` |
| Mocking | `mocker.patch` for external deps | Never mock internal logic |
| Docstrings | NONE (YOLO) | Test name IS the documentation |
| Assertions | `assert` (pytest style) | Never `assertEqual` / `assertTrue` |
| DB marker | `@pytest.mark.django_db` on class | Required for any DB access |

## Decision Table: What to Test

| Layer | What to Test | What NOT to Test |
|-------|-------------|-----------------|
| Service | Business rules, validation, state transitions | Django ORM behavior |
| ViewSet | HTTP status codes, permissions, serializer selection | Serializer field validation |
| Serializer | Custom `validate_*`, `to_representation` | Built-in DRF field validation |
| Model | Custom methods, properties, managers | Field definitions, migrations |

## Decision Table: Mocking Strategy

| Dependency | Mock? | How |
|-----------|-------|-----|
| External service (email, S3) | Yes | `mocker.patch('apps.core.services.email_helper')` |
| Service layer (in ViewSet test) | Yes | `mocker.patch.object(ServiceClass, 'method')` |
| Repository (in Service test) | Yes | `mocker.Mock()` injected via DI |
| Django ORM | No | Use real DB with `@pytest.mark.django_db` |
| Internal business logic | No | Test through public interface |

## Common Testing Mistakes (Top 5)

| # | Mistake | Fix | Severity |
|---|---------|-----|----------|
| 1 | Creating fixture data inline when conftest has it | Use existing fixtures from `conftest.py` | High |
| 2 | Testing Django internals (CharField max_length) | Only test custom logic | High |
| 3 | Adding docstrings to test functions | Remove docstring, make name descriptive (YOLO) | Medium |
| 4 | Using `unittest.mock.Mock` instead of `mocker.Mock()` | Use `mocker` fixture from pytest-mock | High |
| 5 | Missing `@pytest.mark.django_db` | Add marker to class or function | High |

## AAA Pattern

Every test follows Arrange-Act-Assert with blank line separators.

```python
@pytest.mark.django_db
class TestAssetService:

    def test_create_asset_with_valid_data_succeeds(self, mocker, user_factory):
        # Arrange
        mock_repo = mocker.Mock()
        mock_repo.create.return_value = Asset(id=1, name="Test")
        service = AssetService(assets_repository=mock_repo)
        data = {"name": "Test"}

        # Act
        result = service.create(data=data, created_by=user_factory())

        # Assert
        assert result.name == "Test"
        mock_repo.create.assert_called_once()
```

## Fixture Philosophy

### Hierarchy of Fixture Sources

| Priority | Source | When |
|----------|--------|------|
| 1 | Root `conftest.py` | Shared across all apps |
| 2 | App-level `conftest.py` | App-specific fixtures |
| 3 | `@pytest.fixture` in test file | Test-file-specific setup |
| 4 | Inline data in test | Last resort, simple values only |

### Key Binora Fixtures

| Fixture | Purpose | Scope |
|---------|---------|-------|
| `api_client_logged` | Authenticated APIClient with JWT | function |
| `api_user_with_company_logged` | User + Company + JWT (multi-tenant) | function |
| `api_client` | Unauthenticated APIClient | function |
| `api_superuser` | Superuser with extra perms | function |
| `two_datacenters_hierarchy` | Full DC->Room->Row->Rack hierarchy x2 | function |
| `workflow` / `process_instance` | Published workflow / Process (PLANNED) | function |
| `test_company` | Company instance | function |
| `access_profile_all_permissions` | AccessProfile with ALL permissions | function |
| `brand` / `product_model` / `rack_model` | Catalog fixtures | function |
| `predefined_naming_conventions` | Required for Rack code generation | function |

## Service vs ViewSet Testing

| Aspect | Service Tests | ViewSet Tests |
|--------|--------------|---------------|
| Focus | Business logic | HTTP layer |
| Mock what | Repositories, external deps | Service layer |
| Assert what | State changes, mock calls | HTTP status, response format |
| Coverage | Business rules | API contract, permissions |
| File naming | `<model>_service_tests.py` | `<model>_views_tests.py` |

## Anti-Patterns

| # | Anti-Pattern | Correction | Severity |
|---|-------------|------------|----------|
| 1 | `from unittest.mock import Mock` | Use `mocker.Mock()` fixture | Critical |
| 2 | Docstrings in test functions | Remove, use descriptive test names | High |
| 3 | Testing multiple behaviors in one test | One test per behavior | High |
| 4 | Direct `APIClient()` instantiation | Use `api_client` fixture | Medium |
| 5 | `User.objects.create()` inline | Use `user_factory()` from conftest | Medium |
| 6 | No mock verification | Add `assert_called_once()` or similar | High |
| 7 | Testing implementation (HOW) not behavior (WHAT) | Assert on results, not internals | High |
| 8 | Poor test names (`test_user`, `test_1`) | Format: `test_<action>_<context>_<expected>` | Medium |
| 9 | Only testing happy path | Add error/edge case tests | High |
| 10 | `assertEqual` / unittest style assertions | Use `assert` (pytest native) | Medium |

## Test File Structure

```
apps/<app>/tests/
    __init__.py
    conftest.py                    # App-specific fixtures
    <model>_service_tests.py       # Service layer tests
    <model>_views_tests.py         # ViewSet/HTTP tests
    <model>_serializer_tests.py    # Custom serializer tests (if any)
```

## Running Tests

```bash
# Full suite (2-pass: no-migrations then migrations)
nox -s test

# Single app
pytest apps/assets/tests/ --no-migrations -m "not migrations" -v --tb=short

# Single file
pytest apps/core/tests/user_views_tests.py -v --tb=short

# Single test
pytest apps/core/tests/user_views_tests.py -k "test_create_user" -v

# With coverage
pytest apps/core/tests/ --cov=apps/core --cov-report=term-missing
```

## Coverage Targets

| Scope | Target | Strategy |
|-------|--------|----------|
| Service layer | 95%+ | Test all branches, error paths |
| ViewSet layer | 90%+ | Status codes, permissions, delegation |
| Serializers | Only custom logic | `validate_*`, `to_representation` |
| Models | Only custom methods | Properties, managers, custom `save()` |

## Documentation

| Type | File | Content |
|------|------|---------|
| Example | `${CLAUDE_SKILL_DIR}/examples/aaa_pattern_real_tests.md` | AAA pattern examples following Binora conventions |
| Example | `${CLAUDE_SKILL_DIR}/examples/fixture_patterns_conftest.md` | Factory registration, API client, tenant fixtures |
| Example | `${CLAUDE_SKILL_DIR}/examples/mocker_vs_mock_violations.md` | Why mocker.Mock() over unittest.mock.Mock |
| Example | `${CLAUDE_SKILL_DIR}/examples/service_vs_viewset_testing.md` | Layer-specific testing strategies |
| Checklist | `${CLAUDE_SKILL_DIR}/checklists/coverage_improvement_guide.md` | Steps to reach 100% coverage |
| Checklist | `${CLAUDE_SKILL_DIR}/checklists/test_quality_validation.md` | Quick/detailed/quality validation levels |
| Template | `${CLAUDE_SKILL_DIR}/templates/conftest_patterns.md` | Factory, API client, tenant fixture templates |
| Template | `${CLAUDE_SKILL_DIR}/templates/service_test_template.md` | Copy-paste service test with mocked deps |
| Template | `${CLAUDE_SKILL_DIR}/templates/viewset_test_template.md` | Copy-paste ViewSet test with mocked service |
| Reference | `${CLAUDE_SKILL_DIR}/references/common_test_mistakes.md` | 10 common mistakes with fixes |
| Reference | `${CLAUDE_SKILL_DIR}/references/pytest_django_best_practices.md` | Markers, parametrize, fixtures, running tests |

## Critical Reminders

1. NO docstrings in tests -- test name IS the documentation (YOLO)
2. ALWAYS use `mocker.Mock()` from pytest-mock, NEVER `unittest.mock.Mock`
3. Check `conftest.py` BEFORE creating inline test data
4. AAA with blank lines -- Arrange, Act, Assert sections clearly separated
5. One behavior per test -- split multi-action tests into separate functions
6. Test both happy path AND error/edge cases

**Last Updated**: 2025-01-23
