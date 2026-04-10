# Service Layer Violation Detection

Patterns for detecting business logic in Views/Serializers.

---

## Detection Patterns

### Pattern 1: Direct Model Manipulation in Views

```bash
grep -rn "\.objects\.create\|\.save()\|\.delete()" apps/*/views/*.py
```

**Expected**: ZERO results. All ORM calls should be in services.

### Pattern 2: Email/Notifications in Views

```bash
grep -rn "send_mail\|send_email\|send_notification" apps/*/views/*.py
```

### Pattern 3: Business Logic in Serializers

```bash
grep -rn "\.save()\|\.create()\|send_" apps/*/serializers/*.py
```

### Pattern 4: Missing Service Layer

```bash
grep -L "service = \|service_class = " apps/*/views/*.py
```

### Pattern 5: Long ViewSet Methods (>20 lines = likely has business logic)

```bash
awk '/def (create|update|destroy)/ {p=1; c=0} p {c++; if (c > 20) {print FILENAME ":" NR; p=0}}' apps/*/views/*.py
```

### Pattern 6: Services Without DI

```bash
grep -L "def __init__" apps/*/services.py
```

### Pattern 7: Missing Type Hints

```bash
grep -A 1 "def " apps/*/services.py | grep -v " -> "
```

### Pattern 8: Missing @transaction.atomic

```bash
grep -B 2 "def create\|def update\|def delete" apps/*/services.py | grep -v "@transaction"
```

### Pattern 9: unittest.mock Usage

```bash
grep -rn "from unittest.mock import Mock" apps/*/tests/
```

---

## Quick Decision Tree

```
Is this HTTP-related (parsing request, formatting response, status codes)?
  YES -> ViewSet
  NO  -> Put in Service

Does this manipulate models or trigger side effects?
  YES -> Must be in Service
  NO  -> Might be in View (if purely HTTP)

Does this send emails, log events, or call external APIs?
  YES -> Must be in Service
  NO  -> Check if business validation (Service) or input validation (Serializer)
```

---

## Refactoring Steps

1. **Identify** business logic in ViewSet (ORM, email, logging, validation)
2. **Create** service class with `__init__` (DI pattern)
3. **Extract** business logic to service methods with `@transaction.atomic`
4. **Refactor** ViewSet to delegate: `self.service.method(**serializer.validated_data)`
5. **Test** service independently (mock deps) + ViewSet (mock service)

---

## Violation Summary

| Violation | Severity | Detection | Fix |
|-----------|----------|-----------|-----|
| Business logic in ViewSet | CRITICAL | `grep "\.create()" views/` | Move to service |
| Missing DI | HIGH | `grep -L "__init__" services.py` | Add __init__ with defaults |
| Missing type hints | MEDIUM | `grep -v " -> " services.py` | Add type hints |
| Missing @transaction | CRITICAL | `grep -v "@transaction" services.py` | Add @transaction.atomic |
| Logic in serializers | HIGH | `grep "\.save()" serializers/` | Move to service |
| No serializer separation | MEDIUM | `grep -L "InputSerializer"` | Create Input/Output |
| unittest.mock usage | HIGH | `grep "unittest.mock"` | Use mocker fixture |

---

**Last Updated**: 2026-03-18
