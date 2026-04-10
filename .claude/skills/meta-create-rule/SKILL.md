---
name: meta-create-rule
description: |
  Meta-skill for creating Claude Code rules from standardized templates.
  Use proactively when: creating a new rule, adding project conventions, defining path-scoped behavior.
  Keywords - create rule, new rule, add convention, project rule, path rule
type: encoded-preference
disable-model-invocation: true
argument-hint: "[rule-name] [scope?]"
effort: medium
activation:
  keywords:
    - create rule
    - new rule
    - add rule
    - add convention
    - project rule
for_agents: [extension-architect]
version: "1.0"
---

# Create Rule

Meta-skill for generating Claude Code rules from standardized templates.

## When to Use

Activate this skill when:
- User requests creating a new rule
- Need for project conventions or coding standards
- Request for path-scoped behavior (conditional rules)

## Official Documentation

Before generating, fetch the latest rule format:
`https://code.claude.com/docs/en/memory.md`

## Workflow

### Step 1: Parse Arguments

Extract from `$ARGUMENTS`:

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `rule-name` | Yes | - | Descriptive kebab-case name |
| `scope` | No | prompt user | `always-on` or `path-scoped` |

### Step 2: Determine Scope

If `scope` was not provided, ask:

```
What scope should this rule have?

| Scope | Description | Loaded When |
|-------|-------------|-------------|
| always-on | Applies to all files, every session | Session start |
| path-scoped | Applies only to matching file patterns | Claude reads a matching file |
```

#### Scope Decision Guide

| Scenario | Scope | Reason |
|----------|-------|--------|
| General coding standards | always-on | Applies everywhere |
| Error handling patterns | always-on | Universal convention |
| Formatting rules | always-on | Applies everywhere |
| Security rules | always-on | Universal enforcement |
| API endpoint conventions | path-scoped (`src/api/**`) | Only for API files |
| Test conventions | path-scoped (`**/*.test.*`) | Only for test files |
| Database patterns | path-scoped (`src/db/**`) | Only for DB layer |
| Hook conventions | path-scoped (`.claude/hooks/**`) | Only for hook files |
| Component patterns | path-scoped (`src/components/**`) | Only for UI components |

### Step 3: Gather Rule Details

Ask the user based on the scope:

**For always-on:**
```
What convention or pattern should this rule enforce?
- Rule name: (e.g., error-handling, naming-conventions)
- Purpose: (e.g., enforce typed errors, consistent naming)
- Patterns: (what to do, with examples)
- Anti-patterns: (what to avoid, with alternatives)
```

**For path-scoped:**
```
What convention applies to specific files?
- Rule name: (e.g., api-patterns, test-conventions)
- File patterns: (e.g., src/api/**/*.ts, **/*.test.*)
- Patterns: (what to do in those files)
- Anti-patterns: (what to avoid in those files)
```

### Step 4: Generate Rule File

1. Select template based on scope
2. Replace placeholders with user-provided values
3. Write file to the appropriate location:

| Scope | Location |
|-------|----------|
| always-on | `.claude/rules/{rule-name}.md` |
| path-scoped | `.claude/rules/paths/{rule-name}.md` |

### Step 5: Confirm Creation

```
## Rule Created

**Name**: {rule-name}
**Location**: .claude/rules/{path}/{rule-name}.md

### Configuration
| Field | Value |
|-------|-------|
| Scope | {always-on / path-scoped} |
| Paths | {glob patterns or "all files"} |
| Loaded | {session start / on matching file read} |

### Next Steps
1. Edit content to refine patterns and examples
2. Add more sections if needed (tables, code blocks)
3. Verify with: ask Claude to apply the rule in context
```

---

## Rule System Reference

### Where Rules Live

| Location | Scope | Shared |
|----------|-------|--------|
| `.claude/rules/*.md` | Project | Yes, via VCS |
| `.claude/rules/paths/*.md` | Path-scoped (project) | Yes, via VCS |
| `~/.claude/rules/*.md` | All projects (user) | No |

### Loading Behavior

| Aspect | Detail |
|--------|--------|
| Always-on (no `paths:`) | Loaded at session start, injected into every context |
| Path-scoped (has `paths:`) | Loaded only when Claude reads a matching file |
| Discovery | Files discovered recursively within `.claude/rules/` |
| Priority | Project rules override user-level rules |
| Load order | User-level rules load first, then project rules |
| Granularity | One topic per file; use descriptive filenames |

### CLAUDE.md vs Rules

| Aspect | CLAUDE.md | .claude/rules/ |
|--------|-----------|----------------|
| Format | Free-form markdown | One topic per file |
| Scope | Project, user, local, managed | Project or user |
| Path-scoping | No | Yes (via `paths:` frontmatter) |
| Best for | General project context | Specific conventions, domain patterns |
| Team sharing | Yes (committed) | Yes (committed) |
| Post-compact | Re-injected automatically | Always-on re-inject; path-scoped reload on file access |

---

## Templates Available

| Scope | Template | Frontmatter | Best For |
|-------|----------|-------------|----------|
| always-on | Yes | None required | Universal conventions, coding standards |
| path-scoped | Yes | `paths:` required | Domain-specific patterns, file-type rules |

---

## Template: Always-On Rule

**Use when**: Conventions that apply everywhere, every session.

**Location**: `.claude/rules/{rule-name}.md`

**Frontmatter**: None required. Filename should be descriptive.

```markdown
# {Rule Title}

{Brief description of what this rule enforces.}

## Patterns

| Pattern | When | Example |
|---------|------|---------|
| {pattern} | {when to apply} | {code or description} |

## Anti-Patterns

| Avoid | Use Instead | Reason |
|-------|-------------|--------|
| {bad practice} | {good practice} | {why} |
```

**Placeholders to replace**:

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{Rule Title}` | Title case name | `Error Handling` |
| `{pattern}` | Recommended practice | `Use typed errors` |
| `{bad practice}` | What to avoid | `throw new Error("msg")` |
| `{good practice}` | What to do instead | `throw new AppError(code, msg)` |

**Optional sections** (add as needed):

| Section | When to Include |
|---------|-----------------|
| Examples | Complex patterns that benefit from full code blocks |
| Exceptions | Rules that have valid edge cases |
| References | External docs or standards being followed |
| Checklist | Verification steps before completing |

---

## Template: Path-Scoped Rule

**Use when**: Conventions that only apply to specific file patterns.

**Location**: `.claude/rules/paths/{rule-name}.md`

**Frontmatter**: Required. Only `paths:` is officially supported.

```markdown
---
paths:
  - src/api/**/*.ts
  - src/routes/**/*.ts
---

# {Rule Title}

{Brief description of what this rule enforces for these paths.}

## Patterns

| Pattern | Example |
|---------|---------|
| {pattern} | {code or description} |

## Anti-Patterns

| Avoid | Use Instead |
|-------|-------------|
| {bad practice} | {good practice} |
```

**Placeholders to replace**:

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{paths}` | Glob patterns (YAML list, unquoted) | `src/api/**/*.ts` |
| `{Rule Title}` | Title case name | `API Endpoint Patterns` |
| `{pattern}` | Recommended practice | `Validate all inputs with Zod` |
| `{bad practice}` | What to avoid | `Access raw body without validation` |

---

## Arguments

| Argument | Required | Format | Description |
|----------|----------|--------|-------------|
| `rule-name` | Yes | kebab-case | Unique descriptive identifier for the rule |
| `scope` | No | always-on \| path-scoped | Determines location and loading behavior |

### Validation Rules

| Rule | Check | Error Message |
|------|-------|---------------|
| Name format | Must be kebab-case | "Rule name must be kebab-case (e.g., error-handling)" |
| Name unique | No existing file at target path | "Rule {name} already exists at {path}" |
| Scope valid | `always-on` or `path-scoped` | "Scope must be: always-on or path-scoped" |
| `paths:` syntax | Unquoted glob patterns | "Use unquoted patterns in paths: frontmatter" |
| Size | Under 200 lines | Warning: "Consider splitting into multiple rules" |

---

## Gotchas

**Read these carefully. Each one addresses a non-obvious behavior.**

### 1. `paths:` with Quoted Strings

Quoting glob patterns in `paths:` can fail silently. Always use unquoted patterns:

```yaml
# WRONG - may fail silently
paths:
  - "src/**/*.ts"

# CORRECT
paths:
  - src/**/*.ts
```

### 2. Write Tool Does Not Trigger Path Rules

Path-scoped rules only trigger on file **READ** operations, not Write/Edit. If your rule must apply during file creation, make it always-on instead.

### 3. User-Level Path Rules

`~/.claude/rules/` with `paths:` works, but project rules have higher priority. User-level path rules load first; project rules override on conflict.

### 4. Only `paths:` Is Official Frontmatter

The only officially supported frontmatter field for rules is `paths:`. Other fields (`priority:`, `globs:`, `weight:`, etc.) are NOT part of the Claude Code spec and will be ignored.

### 5. Size Guidance

Keep rules under 200 lines. Large rules dilute context and reduce effectiveness. Split into multiple focused files instead of one mega-rule.

### 6. Post-Compact Behavior

After `/compact`, project-root rules (always-on) re-inject automatically. Path-scoped rules reload **only** when their matching files are accessed again. If the user compacts and then asks about a domain without reading files, the path-scoped rule is not present.

### 7. Naming Conventions

Use descriptive filenames: `error-handling.md`, not `rule-001.md`. The filename helps Claude understand when to apply the rule. Group related path-scoped rules in the `paths/` subdirectory.

### 8. HTML Comments Are Stripped

Any `<!-- ... -->` in rules is stripped before injection to save tokens. Do not rely on HTML comments for content that must reach the model.

---

## Examples

### Example 1: Error Handling Convention (Always-On)

```
/meta-create-rule error-handling always-on
```

**Creates**: `.claude/rules/error-handling.md`

```markdown
# Error Handling

Typed error handling conventions. Never throw raw strings or untyped errors.

## Patterns

| Pattern | When | Example |
|---------|------|---------|
| Use typed errors | Any error thrown | `throw new AppError("NOT_FOUND", "User not found")` |
| Use Result type | Functions that can fail | `function parse(): Result<T, ParseError>` |
| Wrap at boundaries | External library errors | `catch (e) { throw AppError.from(e) }` |
| Always include code | Creating errors | `new AppError(code, message, cause?)` |

## Anti-Patterns

| Avoid | Use Instead | Reason |
|-------|-------------|--------|
| `throw new Error("msg")` | `throw new AppError(code, msg)` | Untyped errors lose classification |
| `throw "something"` | `throw new AppError(code, msg)` | String throws have no stack trace |
| `catch (e) { /* ignore */ }` | `catch (e) { log.error(e); throw }` | Silent failures hide bugs |
| Broad `catch (e: any)` | Narrow `catch (e: AppError)` | Catches unrelated errors |

## Exceptions

| Exception | Context | Handling |
|-----------|---------|----------|
| Third-party callbacks | Library expects untyped throw | Wrap in typed error at boundary |
| Process exit handlers | `process.on("uncaughtException")` | Log and terminate gracefully |
```

### Example 2: API Endpoint Patterns (Path-Scoped)

```
/meta-create-rule api-patterns path-scoped
```

**Creates**: `.claude/rules/paths/api-patterns.md`

```markdown
---
paths:
  - src/api/**/*.ts
  - src/routes/**/*.ts
---

# API Endpoint Patterns

Conventions for REST API endpoints in this project.

## Patterns

| Pattern | Example |
|---------|---------|
| Validate all inputs with schema | `const data = Schema.parse(body)` |
| Return consistent error format | `{ error: { code, message, details? } }` |
| Use proper HTTP status codes | 201 for creation, 204 for deletion |
| Include request ID in responses | `res.header("X-Request-Id", id)` |

## Status Code Guide

| Action | Success | Client Error | Not Found |
|--------|---------|-------------|-----------|
| GET item | 200 | 400 | 404 |
| GET list | 200 | 400 | - |
| POST create | 201 | 400/422 | - |
| PUT update | 200 | 400/422 | 404 |
| DELETE | 204 | 400 | 404 |

## Anti-Patterns

| Avoid | Use Instead |
|-------|-------------|
| Raw body access without validation | Schema validation (Zod, Valibot) |
| Generic 500 for all errors | Specific error codes per failure type |
| Returning stack traces to client | Log internally, return safe message |
| Inline validation logic | Reusable schema definitions |
```

### Example 3: Test Conventions (Path-Scoped)

```
/meta-create-rule test-conventions path-scoped
```

**Creates**: `.claude/rules/paths/test-conventions.md`

```markdown
---
paths:
  - "**/*.test.*"
  - "**/*.spec.*"
  - "**/test/**"
---

# Test Conventions

Standards for test files in this project.

## Patterns

| Pattern | Example |
|---------|---------|
| Use describe/it structure | `describe("UserService", () => { it("creates user", ...) })` |
| One assertion per test (prefer) | Each `it` block tests one behavior |
| Name tests as behaviors | `"returns 404 when user not found"` |
| Clean up after tests | `afterEach(() => cleanup())` |

## Anti-Patterns

| Avoid | Use Instead |
|-------|-------------|
| Mocking the database | Real database with test fixtures |
| Testing implementation details | Test public behavior and outputs |
| Shared mutable state between tests | Fresh setup in beforeEach |
| Skipped tests without reason | `it.skip("reason: ...")` or remove |
```

---

## Directory Structure

```
.claude/rules/
├── error-handling.md        # Always-on: typed errors
├── naming-conventions.md    # Always-on: casing, prefixes
├── formatting.md            # Always-on: code style
├── config-scope.md          # Always-on: config architecture
└── paths/
    ├── api-patterns.md      # Path-scoped: src/api/**
    ├── test-conventions.md  # Path-scoped: **/*.test.*
    ├── hooks.md             # Path-scoped: .claude/hooks/**
    └── orchestration.md     # Path-scoped: .claude/rules/**
```

---

## Frontmatter Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `paths` | YAML list | Only for path-scoped | Glob patterns for conditional loading |

**Note**: `paths` is the ONLY officially supported frontmatter field for rules. All other fields are ignored.

### What Goes in Frontmatter vs Body

| Content | Where | Example |
|---------|-------|---------|
| File pattern matching | `paths:` frontmatter | `paths: [src/api/**/*.ts]` |
| Rule description | Body heading | `# API Patterns` |
| Patterns and examples | Body tables/code blocks | Pattern tables, code examples |
| Anti-patterns | Body tables | Avoid/Instead columns |

---

## Related

- `/meta-create-agent`: Create subagents
- `/meta-create-skill`: Create skills
- `extension-architect`: Meta-agent managing all extensions
