---
name: create-skill
description: Create a new Claude Code skill from template. Use when user wants to create a skill, command, or knowledge module.
disable-model-invocation: true
argument-hint: [skill-name] [type?]
allowed-tools: Read, Write, Glob, Bash
---

# Create Skill

Generate a new Claude Code skill from standardized templates.

## Usage

```
/create-skill <skill-name> [type]
```

**Examples**:
```
/create-skill api-conventions reference
/create-skill deploy workflow
/create-skill deep-analysis research
/create-skill my-skill
```

---

## Workflow

### Step 1: Parse Arguments

Extract from `$ARGUMENTS`:
- `skill-name`: Required - kebab-case name
- `type`: Optional - reference | workflow | research

### Step 2: Determine Type (if not provided)

Ask user:

```
What type of skill do you want to create?

| Type | Invocation | Use Case |
|------|------------|----------|
| **reference** | Auto by Claude | Knowledge, patterns, conventions |
| **workflow** | Manual /command | Step-by-step tasks, automation |
| **research** | Auto + fork context | Deep investigation, exploration |
```

### Step 3: Generate Skill

Create directory: `.claude/skills/{skill-name}/`
Create file: `.claude/skills/{skill-name}/SKILL.md`

### Step 4: Confirm Creation

```
✅ Skill created: .claude/skills/{skill-name}/SKILL.md

Configuration:
- Type: {type}
- Invocation: {auto|manual}
- Context: {main|fork}

Next steps:
1. Edit the skill content
2. Add keywords to description for auto-trigger
3. Test with: /{skill-name}
```

---

## Templates by Type

### Reference Skill (Knowledge)

Auto-triggered by Claude when relevant keywords detected.

```yaml
---
name: {skill-name}
description: |
  {What knowledge this provides}.
  Use when {conditions - include keywords for auto-trigger}.
---

# {Skill Name}

{Brief overview}

## When to Use

Use this skill when:
- {Condition 1}
- {Condition 2}

## Patterns

### {Pattern 1}

{Description}

```{language}
{Code example}
```

### {Pattern 2}

{Description}

## Checklist

- [ ] {Verification 1}
- [ ] {Verification 2}

## References

- [{Source}](url)
```

### Workflow Skill (Task)

Manual-only, step-by-step execution.

```yaml
---
name: {skill-name}
description: {What this workflow does}
disable-model-invocation: true
argument-hint: [{arg1}] [{arg2}]
allowed-tools: {tools needed}
---

# {Skill Name}

{Purpose of this workflow}

## Usage

```
/{skill-name} {arguments}
```

## Steps

### Step 1: {Action}

{Instructions}

### Step 2: {Action}

{Instructions}

### Step 3: {Action}

{Instructions}

## Output

{Expected output format}

## Error Handling

| Error | Solution |
|-------|----------|
| {error} | {solution} |
```

### Research Skill (Investigation)

Auto-triggered, runs in isolated fork context.

```yaml
---
name: {skill-name}
description: |
  {What this researches}.
  Use when {conditions - keywords for auto-trigger}.
context: fork
agent: Explore
---

# {Skill Name}

Research {topic} thoroughly.

## Methodology

1. Search codebase using Read/Grep/Glob
2. Search web if needed using WebSearch
3. Cross-reference findings
4. Summarize with confidence levels

## Output Format

## Findings

### From Codebase
- {finding} (`file:line`)

### From Web
- {finding} ([source](url))

## Confidence: {High|Medium|Low}

## Sources
- [{title}](url)
```

---

## Frontmatter Reference

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Skill identifier (kebab-case) |
| `description` | Yes | When to use (include keywords) |
| `disable-model-invocation` | No | `true` = manual only |
| `user-invocable` | No | `false` = Claude only |
| `argument-hint` | No | Args shown in autocomplete |
| `allowed-tools` | No | Tool whitelist |
| `context` | No | `fork` = isolated context |
| `agent` | No | Delegate to: Explore, Plan, etc |
| `model` | No | sonnet, opus, haiku |

---

## Directory Structure

```
.claude/skills/
├── {skill-name}/
│   ├── SKILL.md           # Required: main file
│   ├── reference.md       # Optional: detailed docs
│   ├── examples.md        # Optional: usage examples
│   └── scripts/           # Optional: helper scripts
```

---

## Examples

### Example 1: API Conventions (Reference)

```
/create-skill api-conventions reference
```

Creates: `.claude/skills/api-conventions/SKILL.md`

```yaml
---
name: api-conventions
description: |
  API design patterns and conventions.
  Use when creating or reviewing API endpoints.
---
```

### Example 2: Deploy (Workflow)

```
/create-skill deploy workflow
```

Creates: `.claude/skills/deploy/SKILL.md`

```yaml
---
name: deploy
description: Deploy application to environment
disable-model-invocation: true
argument-hint: [environment]
allowed-tools: Bash, Read
---
```

### Example 3: Architecture Analysis (Research)

```
/create-skill arch-analysis research
```

Creates: `.claude/skills/arch-analysis/SKILL.md`

```yaml
---
name: arch-analysis
description: |
  Analyze codebase architecture.
  Use when asked about architecture, structure, or design.
context: fork
agent: Explore
---
```

---

## Related

- **SPEC-020**: Skills Extension System
- `/create-agent`: Create subagents
- `extension-architect`: Meta-agent for all extensions

---

**Version**: 1.0.0
**Category**: generator
**Spec**: SPEC-020
