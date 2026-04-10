# Transaction Management

Patterns for data integrity in Django service layer.

---

## Decorator (Simple)

Use for straightforward mutations where all operations must succeed or all rollback.

```python
@transaction.atomic
def create_user(self, data: dict) -> User:
    user = User.objects.create(**data)
    Profile.objects.create(user=user)  # Both or neither
    return user
```

---

## Context Manager (Fine-grained)

Use when I/O (email, HTTP) must happen AFTER the transaction commits.

```python
def create_user(self, data: dict) -> User:
    with transaction.atomic():
        user = User.objects.create(**data)
        Profile.objects.create(user=user)
    # I/O AFTER commit - not rolled back if email fails
    send_email(user)
    return user
```

---

## Savepoints (Partial Failures)

Use for batch operations where individual items can fail independently.

```python
@transaction.atomic
def batch_create(self, items: list[dict]) -> list[Asset]:
    created = []
    for item in items:
        try:
            with transaction.atomic():  # Savepoint
                created.append(Asset.objects.create(**item))
        except ValidationError:
            continue  # Rollback savepoint, continue outer
    return created
```

---

## Select For Update (Concurrency)

Use when multiple requests may modify the same row simultaneously.

```python
@transaction.atomic
def transfer_balance(self, from_user: User, to_user: User, amount: Decimal):
    from_acc = Account.objects.select_for_update().get(user=from_user)
    to_acc = Account.objects.select_for_update().get(user=to_user)
    from_acc.balance -= amount
    to_acc.balance += amount
    from_acc.save(update_fields=['balance'])
    to_acc.save(update_fields=['balance'])
```

---

## Rules

| Rule | Why |
|------|-----|
| Decorator for simple mutations | Clean, readable, automatic rollback |
| Context manager for partial atomicity | I/O after commit, fine-grained control |
| Savepoints for batches | Partial success without aborting entire batch |
| NO I/O inside transaction (HTTP, email) | I/O holds locks, not rollbackable |
| Never catch exceptions without re-raise | Breaks automatic rollback mechanism |
| Transactions < 1 second | Fewer locks, prevents deadlocks |
| `select_for_update()` for concurrent writes | Prevents race conditions and lost updates |

---

## Decision Matrix

| Scenario | Technique |
|----------|-----------|
| Single model create/update/delete | `@transaction.atomic` decorator |
| Multi-model operation, no I/O | `@transaction.atomic` decorator |
| Multi-model + email/HTTP after | Context manager, I/O outside |
| Batch with partial failure tolerance | Savepoints (nested `with transaction.atomic()`) |
| Counter/balance updates | `select_for_update()` |
| Long-running operation (>1s) | Break into smaller transactions |

---

**Last Updated**: 2026-03-18
