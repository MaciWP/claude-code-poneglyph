# YOLO Philosophy - Why and How

**The rationale behind minimal comments and techniques for self-documenting code.**

---

## Why YOLO?

### 1. Comments Lie

Comments rot. Code gets updated, comments stay behind. Every stale comment is a landmine for the next developer.

```python
# Increment counter
counter -= 1  # Code changed, comment didn't!
```

The test suite catches broken code. Nothing catches broken comments.

### 2. Comments Clutter

Line-by-line narration doubles visual noise and halves readability. The brain parses code and comments separately -- forcing both is a context-switching tax.

```python
# 50% of lines are noise
user = User.objects.create(email=email)  # Create user
send_email(user)  # Send email
log_event(user)  # Log event
return user  # Return user

# Same code, zero noise
user = User.objects.create(email=email)
send_email(user)
log_event(user)
return user
```

### 3. Comments Hide Bad Code

If code needs a comment to explain what it does, the code is the problem. Comments are a band-aid over unclear naming, god methods, or missing abstractions.

```python
# Band-aid comment over unclear code
# Get all active users that haven't been emailed
users = User.objects.filter(is_active=True, last_email_sent__isnull=True)

# The real fix: extract a meaningful queryset method
users = User.objects.get_users_pending_email()
```

### 4. Docstrings That Restate the Name

A docstring that repeats the function name adds zero information and violates DRY at the documentation level.

```python
# Zero value added
def create_user(email: str) -> User:
    """Create a user with the given email."""
    ...

# Self-explanatory -- no docstring needed
def create_user(email: str) -> User:
    ...
```

---

## How to Write Self-Explanatory Code

The goal is code that communicates intent without prose. Three techniques cover 95% of cases.

### 1. Descriptive Names

Names are the cheapest form of documentation. A good name eliminates the need for a comment.

```python
# Needs comment because names are vague
u = User.objects.filter(a=True)

# Self-documenting
active_users = User.objects.filter(is_active=True)
```

| Bad Name | Good Name | Why |
|----------|-----------|-----|
| `data` | `validated_asset_data` | Describes content and state |
| `result` | `created_user` | Describes what it holds |
| `flag` | `is_email_verified` | Boolean intent is clear |
| `process()` | `assign_task_to_operator()` | Action + target + recipient |
| `tmp` | `unprocessed_batch` | Lifecycle is obvious |

### 2. Extract Methods

Complex conditions and multi-step logic should become named methods. The method name IS the comment.

```python
# Complex condition needs a comment to explain
if user.is_active and not user.email_verified and user.created_at > threshold:
    ...

# Extracted method -- the name explains the intent
if user.needs_email_verification_reminder():
    ...
```

```python
# Multi-step logic with inline comments
# Validate asset, check capacity, assign rack
validate_asset(asset)
if rack.available_units < asset.required_units:
    raise InsufficientCapacity()
rack.assign(asset)

# Extracted into a single well-named service method
rack_service.place_asset_in_rack(asset, rack)
```

### 3. Type Hints as Documentation

Type hints tell the reader what goes in and what comes out. With good types, parameter comments become redundant.

```python
# Unclear without reading implementation
def process(data):
    ...

# Types tell the full story
def process_asset_import(data: dict[str, list[AssetRow]]) -> QuerySet[Asset]:
    ...
```

For Django/DRF specifically:

| Instead of Comment | Use Type Hint |
|-------------------|---------------|
| `# Returns a list of users` | `-> list[User]` |
| `# Optional email parameter` | `email: str | None = None` |
| `# Dict mapping codes to assets` | `code_map: dict[str, Asset]` |
| `# Queryset of active assets` | `-> QuerySet[Asset]` |

---

## The Litmus Test

Before writing a comment, ask:

1. Can I rename something to eliminate this comment?
2. Can I extract a method whose name says what the comment says?
3. Can I add a type hint that makes the comment redundant?

If any answer is yes, refactor instead of commenting.

---

**Rule**: If you need a comment, refactor the code first. Comments are the last resort, not the first tool.
