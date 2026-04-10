# Detecting and Fixing YOLO Violations

**Operational guide: grep commands to find violations and before/after refactoring patterns.**

---

## Detection Commands

### Find Obvious Comments

```bash
# Comments that restate the next line's action (create, return, get, set, check, send, etc.)
grep -rnE '^\s*#\s*(Create|Return|Get|Set|Check|Send|Delete|Update|Save|Initialize|Import|Define|Call|Add|Remove)\s' apps/

# Single-word comments (almost always obvious)
grep -rnE '^\s*#\s*\w+\s*$' apps/

# "the" or "a/an" pattern -- narrative comments
grep -rnE '^\s*#\s*(The|A|An)\s' apps/
```

### Find Docstrings That Restate Function Names

```bash
# Docstrings on test functions (always forbidden)
grep -rnA1 'def test_' apps/ | grep '"""'

# One-liner docstrings that mirror the function name
grep -rnB1 '""".*"""' apps/ | grep -E 'def (create|get|update|delete|list|retrieve)'
```

### Find Comment-Heavy Files

```bash
# Files with high comment-to-code ratio (>20% comments)
for f in $(find apps/ -name "*.py" -not -path "*/migrations/*"); do
    total=$(wc -l < "$f")
    comments=$(grep -cE '^\s*#' "$f" 2>/dev/null || echo 0)
    if [ "$total" -gt 20 ] && [ "$comments" -gt 0 ]; then
        ratio=$((comments * 100 / total))
        if [ "$ratio" -gt 20 ]; then
            echo "$ratio% comments: $f ($comments/$total lines)"
        fi
    fi
done
```

### Find AAA Comment Separators in Tests

```bash
# Arrange/Act/Assert comment separators (forbidden -- use blank lines)
grep -rnE '^\s*#\s*(Arrange|Act|Assert)\s*$' apps/ tests_app/
```

---

## Before/After Refactoring Patterns

### Pattern 1: Step-by-Step Narration

```python
# BEFORE -- every line narrated
def register_asset(data: dict) -> Asset:
    # Validate the data
    validate_asset_data(data)
    # Generate the code
    code = naming_service.generate_code(Asset, data["asset_type"])
    # Create the asset
    asset = Asset.objects.create(code=code, **data)
    # Return the created asset
    return asset

# AFTER -- code speaks for itself
def register_asset(data: dict) -> Asset:
    validate_asset_data(data)
    code = naming_service.generate_code(Asset, data["asset_type"])
    return Asset.objects.create(code=code, **data)
```

### Pattern 2: Condition Explanation via Extract Method

```python
# BEFORE -- comment explains a complex condition
def should_notify(user: User) -> bool:
    # Check if user is active, has email, and hasn't been notified in 24h
    return (
        user.is_active
        and user.email_verified
        and (timezone.now() - user.last_notified_at).total_seconds() > 86400
    )

# AFTER -- extracted helper with descriptive name
def should_notify(user: User) -> bool:
    return user.is_active and user.email_verified and user.notification_cooldown_expired()
```

### Pattern 3: Variable Rename Eliminates Comment

```python
# BEFORE -- comment needed because variable name is vague
# Assets that need maintenance
qs = Asset.objects.filter(last_maintenance__lt=threshold, status="active")

# AFTER -- variable name IS the documentation
assets_needing_maintenance = Asset.objects.filter(last_maintenance__lt=threshold, status="active")
```

### Pattern 4: Inline Type Comment to Type Hint

```python
# BEFORE -- type documented in comment
def get_rack_capacity(rack):
    # Returns dict with total, used, available (all ints)
    ...

# AFTER -- type hint replaces comment
def get_rack_capacity(rack: Rack) -> dict[str, int]:
    ...
```

### Pattern 5: Test Docstring to Test Name

```python
# BEFORE -- docstring restates what the test does
def test_create_asset(self, api_client_logged):
    """Test that creating an asset with valid data returns 201."""
    response = api_client_logged.post(URL, data=valid_data)
    assert response.status_code == 201

# AFTER -- test name carries all the information
def test_create_asset_with_valid_data_returns_201(self, api_client_logged):
    response = api_client_logged.post(URL, data=valid_data)
    assert response.status_code == 201
```

### Pattern 6: Section Separators to Methods

```python
# BEFORE -- comments as section headers in a long method
def process_workflow(workflow: Workflow) -> None:
    # Validate workflow
    if not workflow.is_published:
        raise WorkflowNotPublished()

    # Create process instance
    process = Process.objects.create(workflow=workflow, status="planned")

    # Assign tasks
    for stage in workflow.stages.all():
        Task.objects.create(process=process, stage=stage)

    # Notify stakeholders
    for user in workflow.stakeholders.all():
        send_notification(user, process)

# AFTER -- each section is a well-named method call
def process_workflow(workflow: Workflow) -> None:
    validate_workflow_is_published(workflow)
    process = create_process_instance(workflow)
    assign_stage_tasks(process, workflow)
    notify_stakeholders(workflow, process)
```

---

## Quick Audit Workflow

1. Run the detection commands above against the changed files
2. For each hit, apply the matching refactoring pattern
3. If the comment is genuinely non-obvious (algorithm, workaround, security), keep it
4. Run `nox -s format && nox -s lint` to verify
