---
name: create-skill
description: |
  Meta-skill para crear skills de Claude Code desde templates estandarizados.
  Use proactively when: crear nuevo skill, scaffolding de conocimiento, definir workflow.
  Keywords - create, skill, command, knowledge, workflow, template, scaffold
activation:
  keywords:
    - create skill
    - new skill
    - scaffold skill
    - make skill
    - add command
disable-model-invocation: true
argument-hint: [skill-name] [type?]
allowed-tools: Read, Write, Glob, Bash
for_agents:
  - extension-architect
version: "1.0"
---

# Create Skill

Meta-skill para generar skills de Claude Code desde templates estandarizados.

## When to Use

Activar esta skill cuando:
- Usuario pide crear una nueva skill/comando
- Necesidad de documentar conocimiento reutilizable
- Solicitud de workflow automatizado
- Scaffolding de investigacion profunda

## Workflow

### Step 1: Parse Arguments

Extraer de `$ARGUMENTS`:

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `skill-name` | Yes | - | Nombre en kebab-case |
| `type` | No | prompt user | reference, workflow, research |

### Step 2: Determine Type

Si `type` no fue proporcionado, preguntar:

```
What type of skill do you want to create?

| Type | Invocation | Context | Use Case |
|------|------------|---------|----------|
| reference | Auto by Claude | main | Knowledge, patterns, conventions |
| workflow | Manual /command | main | Step-by-step tasks, automation |
| research | Auto + fork | fork | Deep investigation, exploration |
```

### Step 3: Gather Details

Preguntar al usuario segun el tipo:

**For reference:**
```
What knowledge will this skill provide?
- Topic: (e.g., API patterns, security best practices)
- When to trigger: (e.g., when creating APIs, when reviewing security)
- Key patterns to include: (e.g., authentication flow, validation)
```

**For workflow:**
```
What task will this workflow automate?
- Purpose: (e.g., deploy application, run migrations)
- Arguments: (e.g., environment, version)
- Steps: (e.g., build, test, deploy)
```

**For research:**
```
What will this skill investigate?
- Topic: (e.g., library comparison, architecture options)
- Questions to answer: (e.g., best tool for X, how to implement Y)
- Sources: (e.g., codebase, documentation, web)
```

### Step 4: Generate Skill

1. Crear directorio: `.claude/skills/{skill-name}/`
2. Leer template desde `.claude/skills/create-skill/templates/{type}.md`
3. Reemplazar placeholders con valores del usuario
4. Escribir archivo: `.claude/skills/{skill-name}/SKILL.md`

### Step 5: Confirm Creation

```
## Skill Created

**Name**: {skill-name}
**Location**: .claude/skills/{skill-name}/SKILL.md

### Configuration
| Field | Value |
|-------|-------|
| Type | {type} |
| Invocation | {auto|manual} |
| Context | {main|fork} |

### Next Steps
1. Edit content in SKILL.md
2. Add keywords to description for auto-trigger
3. Test with: /{skill-name} [args]
```

---

## Templates Available

| Type | File | Invocation | Context | Best For |
|------|------|------------|---------|----------|
| reference | `templates/reference.md` | Auto | main | Knowledge, patterns, best practices |
| workflow | `templates/workflow.md` | Manual `/cmd` | main | Step-by-step tasks, automation |
| research | `templates/research.md` | Auto | fork | Investigation, deep analysis |

---

## Template: Reference

**Location**: `templates/reference.md`

**Use when**: Documenting patterns, conventions, best practices for auto-retrieval.

**Frontmatter**:
```yaml
---
name: {skill-name}
description: |
  {What knowledge this provides}.
  Use when {trigger conditions - include keywords for auto-trigger}.
---
```

**Placeholders to replace**:

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{{SKILL_NAME}}` | kebab-case name | `api-conventions` |
| `{{SKILL_TITLE}}` | Display title | `API Conventions` |
| `{{DESCRIPTION}}` | What it provides | `REST API design patterns` |
| `{{TRIGGER_CONDITION}}` | When to auto-load | `creating or modifying API endpoints` |
| `{{Condition 1-3}}` | Usage conditions | `Creating new API endpoint` |
| `{{Pattern 1-2 Name}}` | Pattern names | `Request Validation` |
| `{{language}}` | Code language | `typescript` |
| `{{Code example}}` | Pattern code | `app.post('/api', validate(schema))` |

**Key sections**:
- When to Use - Conditions for activation
- Patterns - Code examples with explanations
- Checklist - Verification before completing
- Anti-Patterns - What to avoid
- References - External documentation

---

## Template: Workflow

**Location**: `templates/workflow.md`

**Use when**: Creating manual commands for multi-step tasks.

**Frontmatter**:
```yaml
---
name: {skill-name}
description: {What this workflow does}
disable-model-invocation: true
argument-hint: [{arg1}] [{arg2}]
allowed-tools: {comma-separated tools}
---
```

**Placeholders to replace**:

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{{SKILL_NAME}}` | kebab-case name | `deploy` |
| `{{SKILL_TITLE}}` | Display title | `Deploy Application` |
| `{{DESCRIPTION}}` | What it does | `Deploy application to environment` |
| `{{ARG1}}, {{ARG2}}` | Arguments | `environment`, `version` |
| `{{TOOLS}}` | Required tools | `Bash, Read, Write` |
| `{{Prerequisite 1-2}}` | Requirements | `Environment configured` |
| `{{Action Title}}` | Step names | `Build Application` |
| `{{Error 1-2}}` | Error cases | `Build failed` |

**Key sections**:
- Usage - Command syntax and examples
- Prerequisites - What must be ready
- Steps - Numbered execution steps
- Output - Success and failure formats
- Error Handling - Problems and solutions
- Rollback - Recovery steps

---

## Template: Research

**Location**: `templates/research.md`

**Use when**: Deep investigation that benefits from isolated context.

**Frontmatter**:
```yaml
---
name: {skill-name}
description: |
  {What this researches}.
  Use when {trigger conditions - keywords for auto-trigger}.
context: fork
agent: Explore
---
```

**Placeholders to replace**:

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{{SKILL_NAME}}` | kebab-case name | `arch-analysis` |
| `{{SKILL_TITLE}}` | Display title | `Architecture Analysis` |
| `{{DESCRIPTION}}` | Research focus | `Codebase architecture patterns` |
| `{{TRIGGER_CONDITION}}` | When to activate | `analyzing architecture, structure, design` |
| `{{TOPIC}}` | Research topic | `codebase architecture` |
| `{{Area 1-2}}` | Research areas | `Module Dependencies` |
| `{{Question 1-2}}` | Questions to answer | `What patterns are used?` |

**Key sections**:
- Methodology - Research approach
- Research Areas - Topics to investigate
- Output Format - How to present findings
- Constraints - Rules for research

---

## Arguments

| Argument | Required | Format | Description |
|----------|----------|--------|-------------|
| `skill-name` | Yes | kebab-case | Unique identifier for the skill |
| `type` | No | reference\|workflow\|research | Skill category |

### Validation Rules

| Rule | Check | Error Message |
|------|-------|---------------|
| Name format | Must be kebab-case | "Skill name must be kebab-case (e.g., api-patterns)" |
| Name unique | No existing directory | "Skill {name} already exists at {path}" |
| Type valid | One of 3 types | "Type must be: reference, workflow, research" |

---

## Examples

### Example 1: API Conventions (Reference)

```
/create-skill api-conventions reference
```

**Creates**: `.claude/skills/api-conventions/SKILL.md`

```yaml
---
name: api-conventions
description: |
  REST API design patterns and conventions for this project.
  Use when creating or modifying API endpoints, routes, or handlers.
---

# API Conventions

Standard patterns for REST API development in this project.

## When to Use

Use this skill when:
- Creating new API endpoints
- Modifying existing routes
- Reviewing API code

## Patterns

### Request Validation

All endpoints must validate input using Zod schemas.

```typescript
import { z } from 'zod';

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
});

app.post('/api/users', async ({ body }) => {
  const validated = CreateUserSchema.parse(body);
  // ... implementation
});
```

### Error Responses

Use consistent error format across all endpoints.

```typescript
interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// Example: 400 Bad Request
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": { "field": "email" }
  }
}
```

## Checklist

Before completing, verify:
- [ ] Input validated with Zod schema
- [ ] Consistent error format
- [ ] Proper HTTP status codes
- [ ] OpenAPI documentation updated

## Anti-Patterns

| Avoid | Instead |
|-------|---------|
| Raw body access | Use validation schema |
| Generic 500 errors | Specific error codes |
| Inline validation | Reusable schemas |

## References

- [Elysia Validation](https://elysiajs.com/validation)
- [HTTP Status Codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)

---

**Version**: 1.0.0
```

### Example 2: Deploy (Workflow)

```
/create-skill deploy workflow
```

**Creates**: `.claude/skills/deploy/SKILL.md`

```yaml
---
name: deploy
description: Deploy application to specified environment
disable-model-invocation: true
argument-hint: [environment] [--dry-run?]
allowed-tools: Bash, Read
---

# Deploy Application

Deploy the application to staging or production environment.

## Usage

```
/deploy <environment> [--dry-run]
```

**Examples**:
```
/deploy staging
/deploy production --dry-run
```

---

## Prerequisites

Before running:
- [ ] All tests passing
- [ ] No uncommitted changes
- [ ] Environment variables configured

---

## Steps

### Step 1: Verify Clean State

Check for uncommitted changes and test status.

```bash
git status --porcelain
bun test
```

### Step 2: Build Application

Create production build.

```bash
bun run build
```

### Step 3: Run Migrations

Apply database migrations to target environment.

```bash
bun run migrate --env={environment}
```

### Step 4: Deploy

Push to deployment target.

```bash
bun run deploy:{environment}
```

### Step 5: Verify

Check deployment health.

```bash
curl -f https://{environment}.example.com/health
```

---

## Output

### Success

```
Deploy completed successfully

Environment: {environment}
Version: {git-sha}
URL: https://{environment}.example.com
Duration: {time}
```

### Failure

```
Deploy failed at step: {step}

Error: {error message}
Rollback: Run /deploy-rollback {environment}
```

---

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| Tests failing | Code issues | Fix tests before deploy |
| Build failed | Compilation error | Check build logs |
| Migration failed | Schema conflict | Review migration files |
| Health check failed | App not starting | Check logs, rollback |

---

## Rollback

If something goes wrong:

1. Run `/deploy-rollback {environment}`
2. Check logs for root cause
3. Fix issue and redeploy

---

**Version**: 1.0.0
```

### Example 3: Architecture Analysis (Research)

```
/create-skill arch-analysis research
```

**Creates**: `.claude/skills/arch-analysis/SKILL.md`

```yaml
---
name: arch-analysis
description: |
  Analyze codebase architecture patterns and structure.
  Use when asked about architecture, module structure, or design decisions.
context: fork
agent: Explore
---

# Architecture Analysis

Research and analyze codebase architecture patterns.

## Methodology

1. **Codebase First**: Search local files using Read, Grep, Glob
2. **Structure Analysis**: Map module dependencies and layers
3. **Pattern Recognition**: Identify architectural patterns used
4. **Summarize**: Present findings with confidence assessment

## Research Areas

### Area 1: Module Structure

Questions to answer:
- What is the high-level directory structure?
- How are modules organized (by feature, layer, both)?
- What are the main entry points?

### Area 2: Dependencies

Questions to answer:
- What are the core dependencies?
- How do modules depend on each other?
- Are there any circular dependencies?

### Area 3: Patterns

Questions to answer:
- What architectural patterns are used?
- How is state managed?
- How is configuration handled?

## Output Format

## Architecture Analysis: {Project}

### Summary
{One paragraph overview of architecture}

### Module Structure
```
project/
├── src/
│   ├── routes/      - API endpoints
│   ├── services/    - Business logic
│   ├── data/        - Database access
│   └── utils/       - Shared utilities
```

### Findings from Codebase

| Finding | Source | Confidence |
|---------|--------|------------|
| Uses layered architecture | `src/` structure | High |
| DI pattern for services | `container.ts:45` | High |

### Patterns Identified

| Pattern | Usage | Example |
|---------|-------|---------|
| Repository | Data access | `src/data/userRepo.ts` |
| Service Layer | Business logic | `src/services/auth.ts` |

### Recommendations
1. {Recommendation based on findings}
2. {Improvement opportunity}

### Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Structure | High | Clear directory layout |
| Patterns | Medium | Some implicit patterns |

### Sources
- `src/index.ts` - main entry point
- `package.json` - dependencies

## Constraints

- Always cite sources
- Indicate confidence levels
- Focus on facts from codebase
- Admit when information is not found

---

**Version**: 1.0.0
```

---

## Directory Structure

```
.claude/skills/
├── {skill-name}/
│   ├── SKILL.md           # Required: main skill file
│   ├── reference.md       # Optional: detailed documentation
│   ├── examples.md        # Optional: usage examples
│   └── scripts/           # Optional: helper scripts
│       └── validate.sh
```

---

## Frontmatter Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Unique kebab-case identifier |
| `description` | string | Yes | Purpose + trigger keywords |
| `disable-model-invocation` | boolean | No | `true` = manual only |
| `user-invocable` | boolean | No | `false` = Claude only |
| `argument-hint` | string | No | Arguments shown in autocomplete |
| `allowed-tools` | string | No | Comma-separated tool whitelist |
| `context` | string | No | `fork` = isolated context |
| `agent` | string | No | Delegate to: Explore, Plan, etc |
| `model` | string | No | sonnet, opus, haiku |

---

## Skill Types Comparison

| Aspect | Reference | Workflow | Research |
|--------|-----------|----------|----------|
| Invocation | Auto | Manual | Auto |
| Context | main | main | fork |
| Purpose | Knowledge | Tasks | Investigation |
| Tools | None | Specified | Read, Grep, etc |
| User triggers | Keywords | `/command` | Keywords |

---

## Related

- **SPEC-020**: Skills Extension System
- `/create-agent`: Create subagents that can use skills
- `extension-architect`: Meta-agent managing all extensions
