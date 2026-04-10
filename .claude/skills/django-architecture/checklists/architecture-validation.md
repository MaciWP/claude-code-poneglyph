# Architecture Validation Checklist

Quick validation for service layer separation and architecture compliance.

---

## Level 1: Quick Scan (2 minutes)

### Check 1: Service Layer Exists
```bash
ls apps/*/services.py
```
Each app with business logic should have `services.py`.

### Check 2: No Business Logic in ViewSets
```bash
grep -rn "\.objects\.create\|\.objects\.update\|\.save()" apps/*/views/*.py | grep -v "^#"
```
**Expected**: ZERO results.

### Check 3: No Email/Notification in ViewSets
```bash
grep -rn "send_mail\|send_email\|send_notification" apps/*/views/*.py
```
**Expected**: ZERO results.

### Check 4: ViewSets Have Service Attribute
```bash
grep -L "service = \|service_class = " apps/*/views/*.py
```
ViewSets with custom logic should have service attribute.

---

## Level 2: Detailed Validation (5 minutes)

### Service Layer
- [ ] Service class exists in `apps/<app>/services.py`
- [ ] Service uses dependency injection pattern (has `__init__` with defaults)
- [ ] All dependencies stored as `self.attribute`
- [ ] Type hints on all parameters and return values
- [ ] `@transaction.atomic` on data-modifying methods
- [ ] Methods use `self.dependency` (not hard-coded)
- [ ] NO HTTP concerns (request, response, status)

### ViewSet Layer
- [ ] Has `queryset` with `select_related()` and `order_by()`
- [ ] Has `serializer_class` or `get_serializer_class()`
- [ ] Has service instance (`service = ServiceClass()`)
- [ ] Methods are thin (5-15 lines)
- [ ] Methods delegate to service
- [ ] NO direct ORM calls
- [ ] NO business logic

### Serializer Layer
- [ ] Input serializers for write operations
- [ ] Output serializers for read operations
- [ ] `get_serializer_class()` switches based on action
- [ ] Validation ONLY (no business logic, save, email)

---

## Level 3: Architecture Compliance (10 minutes)

### Transaction Management
- [ ] `@transaction.atomic` on all data-modifying service methods
- [ ] NO `@transaction.atomic` in ViewSets
- [ ] No I/O inside transactions

### Error Handling
- [ ] Service methods raise specific domain exceptions
- [ ] NO generic `except Exception` without re-raising

### Type Hints
- [ ] All service methods have parameter type hints
- [ ] All service methods have return type hints

### Testing
- [ ] Service tests with mocked dependencies (DI)
- [ ] ViewSet tests mock service
- [ ] `mocker.Mock()` not `Mock()`
- [ ] AAA pattern (Arrange, Act, Assert)

---

## Automated Detection Script

```bash
#!/bin/bash
echo "=== Architecture Violation Detection ==="

echo "CRITICAL: Business logic in ViewSets"
grep -rn "\.objects\.create\|\.save()\|send_mail" apps/*/views/*.py 2>/dev/null || echo "None found"

echo "CRITICAL: Missing @transaction.atomic"
grep -B 2 "def create\|def update\|def delete" apps/*/services.py 2>/dev/null | grep -v "@transaction" | head -5 || echo "None found"

echo "HIGH: Missing dependency injection"
grep -L "def __init__" apps/*/services.py 2>/dev/null || echo "None found"

echo "HIGH: Business logic in serializers"
grep -rn "\.save()\|\.create()\|send_" apps/*/serializers/*.py 2>/dev/null || echo "None found"

echo "MEDIUM: Missing type hints"
grep -A 1 "def " apps/*/services.py 2>/dev/null | grep -v " -> " | head -10 || echo "All have type hints"

echo "MEDIUM: Missing query optimization"
grep -rn "queryset = .*\.objects\.all()" apps/*/views/*.py 2>/dev/null || echo "None found"

echo "MEDIUM: unittest.mock usage"
grep -rn "from unittest.mock import Mock" apps/*/tests/ 2>/dev/null || echo "None found"
```

---

## Validation Summary

| Check | Command | Expected | Severity |
|-------|---------|----------|----------|
| ORM in views | `grep "\.create()" apps/*/views/` | 0 results | CRITICAL |
| Email in views | `grep "send_" apps/*/views/` | 0 results | HIGH |
| Service missing | `ls apps/*/services.py` | 1 per app | HIGH |
| No DI | `grep -L "__init__" apps/*/services.py` | 0 results | HIGH |
| No type hints | `grep "def " ... \| grep -v " -> "` | 0 results | MEDIUM |
| Transaction in views | `grep "@transaction" apps/*/views/` | 0 results | HIGH |

---

**Last Updated**: 2026-03-18
