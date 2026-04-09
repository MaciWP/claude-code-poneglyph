---
name: meta-create-skill
description: |
  Meta-skill for creating Claude Code skills from standardized templates.
  Use proactively when: creating a new skill, knowledge scaffolding, defining a workflow.
  Keywords - create, skill, command, knowledge, workflow, template, scaffold
type: encoded-preference
disable-model-invocation: true
argument-hint: "[skill-name] [type?]"
effort: medium
activation:
  keywords:
    - create skill
    - new skill
    - scaffold skill
    - make skill
    - add command
for_agents: [extension-architect]
version: "1.0"
---

# Create Skill

Meta-skill for generating Claude Code skills from standardized templates.

## When to Use

Activate this skill when:
- User requests creating a new skill/command
- Need to document reusable knowledge
- Request for an automated workflow
- Deep investigation scaffolding

## Workflow

### Step 1: Parse Arguments

Extract from `$ARGUMENTS`:

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `skill-name` | Yes | - | Name in kebab-case |
| `type` | No | prompt user | knowledge-base, encoded-preference, workflow, reference, capability-uplift |

### Step 2: Determine Type

If `type` was not provided, ask:

```
What type of skill do you want to create?

| Type | Description | Use Case |
|------|-------------|----------|
| knowledge-base | Domain patterns, conventions | API patterns, DB conventions, framework guides |
| encoded-preference | Behavioral rules, standards | Code quality, security review, formatting rules |
| workflow | Interactive step-by-step processes | Deploy, migration, scaffolding |
| reference | Lookup material, cheat sheets | Quick reference, checklists |
| capability-uplift | Tool guidance, advanced usage | LSP operations, advanced git |
```

### Step 3: Gather Details

Ask the user based on the type:

**For capability-uplift:**
```
What tool guidance will this skill provide?
- Tool/capability: (e.g., LSP operations, advanced git, regex patterns)
- When to trigger: (e.g., when navigating code, when searching)
- Key techniques to include: (e.g., goToDefinition, findReferences)
```

**For workflow:**
```
What task will this workflow automate?
- Purpose: (e.g., deploy application, run migrations)
- Arguments: (e.g., environment, version)
- Steps: (e.g., build, test, deploy)
```

**For knowledge-base:**
```
What domain knowledge will this skill capture?
- Domain: (e.g., Django models, React hooks, SQL optimization)
- Key patterns: (e.g., model inheritance, hook composition)
- Anti-patterns to avoid: (e.g., N+1 queries, prop drilling)
- Target agents: (e.g., builder, reviewer)
```

**For encoded-preference:**
```
What behavioral rules will this skill encode?
- Rules: (e.g., always use typed errors, never use any)
- When they apply: (e.g., all TypeScript files, only in tests)
- Exceptions: (e.g., legacy code, generated files)
```

**For reference (research/lookup):**
```
What will this skill investigate or provide as reference?
- Topic: (e.g., library comparison, architecture options)
- Questions to answer: (e.g., best tool for X, how to implement Y)
- Sources: (e.g., codebase, documentation, web)
```

### Step 4: Generate Skill

1. Create directory: `.claude/skills/{skill-name}/`
2. Read template from `.claude/skills/meta-create-skill/templates/{type}.md`
3. Replace placeholders with user-provided values
4. Write file: `.claude/skills/{skill-name}/SKILL.md`

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

| Type | Template | Invocation | Best For |
|------|----------|------------|----------|
| knowledge-base | Yes | Auto | Domain patterns, conventions |
| encoded-preference | Yes | Auto | Behavioral rules, standards |
| workflow | Yes | Manual `/cmd` | Step-by-step tasks, automation |
| reference | Yes | Auto | Lookup material, cheat sheets |
| capability-uplift | No (use reference) | Auto | Tool guidance, advanced usage |

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
  Use when: {trigger conditions}.
  Keywords - {keyword1, keyword2, ...}
type: knowledge-base
disable-model-invocation: false
argument-hint: "{hint if applicable}"
effort: low
activation:
  keywords:
    - keyword1
    - keyword2
for_agents: [{agent1}, {agent2}]
version: "1.0"
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
description: |
  {What this workflow does}.
  Use when: {trigger conditions}.
  Keywords - {keyword1, keyword2, ...}
type: workflow
disable-model-invocation: true
argument-hint: "[{arg1}] [{arg2}]"
effort: medium
activation:
  keywords:
    - keyword1
    - keyword2
for_agents: [{agent1}, {agent2}]
version: "1.0"
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

## Template: Research / Reference

**Location**: `templates/research.md`

**Use when**: Deep investigation or lookup material that benefits from isolated context.

**Frontmatter**:
```yaml
---
name: {skill-name}
description: |
  {What this researches}.
  Use when: {trigger conditions}.
  Keywords - {keyword1, keyword2, ...}
type: reference
disable-model-invocation: false
argument-hint: "{hint if applicable}"
effort: high
activation:
  keywords:
    - keyword1
    - keyword2
for_agents: [{agent1}, {agent2}]
version: "1.0"
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

## Template: Knowledge Base

**Location**: `templates/knowledge-base.md`

**Use when**: Capturing domain-specific patterns and conventions that agents auto-invoke during implementation or review.

**Frontmatter**:
```yaml
---
name: {{SKILL_NAME}}
description: |
  {{DESCRIPTION}}
  Use when: {{USE_CASES}}
  Keywords - {{KEYWORDS}}
type: knowledge-base
disable-model-invocation: false
argument-hint: "[file-path or module]"
effort: medium
activation:
  keywords:
    - {{KEYWORD_1}}
    - {{KEYWORD_2}}
for_agents: [builder, reviewer]
version: "1.0"
---
```

**Placeholders to replace**:

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{{SKILL_NAME}}` | kebab-case name | `django-patterns` |
| `{{SKILL_TITLE}}` | Display title | `Django Patterns` |
| `{{DESCRIPTION}}` | What knowledge it provides | `Django model and view conventions` |
| `{{USE_CASES}}` | When to auto-load | `working with Django models, views, or serializers` |
| `{{KEYWORDS}}` | Comma-separated keywords | `django, model, view, serializer` |
| `{{KEYWORD_1}}, {{KEYWORD_2}}` | Activation keywords | `django`, `model` |
| `{{PATTERN}}` | Pattern name | `Fat Models` |
| `{{WHEN}}` | When to apply | `Business logic in models` |
| `{{EXAMPLE}}` | Code or usage example | `model.clean()` |
| `{{AVOID}}` | Anti-pattern | `Logic in views` |
| `{{ALTERNATIVE}}` | Preferred approach | `Move to model method` |
| `{{REASON}}` | Why | `Testability and reuse` |
| `{{REFERENCE_LINKS}}` | Documentation links | `https://docs.djangoproject.com/` |

**Body template**:
```markdown
# {{SKILL_TITLE}}

## Overview
{{OVERVIEW}}

## Patterns
| Pattern | When | Example |
|---------|------|---------|
| {{PATTERN}} | {{WHEN}} | {{EXAMPLE}} |

## Anti-Patterns
| Avoid | Use Instead | Why |
|-------|-------------|-----|
| {{AVOID}} | {{ALTERNATIVE}} | {{REASON}} |

## References
- {{REFERENCE_LINKS}}
```

**Key sections**:
- Overview - What domain this covers
- Patterns - Table of recommended patterns with examples
- Anti-Patterns - What to avoid and why
- References - External documentation links

---

## Template: Encoded Preference

**Location**: `templates/encoded-preference.md`

**Use when**: Encoding behavioral rules and standards that agents apply automatically during their work.

**Frontmatter**:
```yaml
---
name: {{SKILL_NAME}}
description: |
  {{DESCRIPTION}}
  Use proactively when: {{USE_CASES}}
  Keywords - {{KEYWORDS}}
type: encoded-preference
disable-model-invocation: false
effort: low
activation:
  keywords:
    - {{KEYWORD_1}}
    - {{KEYWORD_2}}
for_agents: [builder, reviewer]
version: "1.0"
---
```

**Placeholders to replace**:

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{{SKILL_NAME}}` | kebab-case name | `error-handling-rules` |
| `{{SKILL_TITLE}}` | Display title | `Error Handling Rules` |
| `{{DESCRIPTION}}` | What rules it encodes | `Typed error handling conventions` |
| `{{USE_CASES}}` | When to auto-load | `writing error handling, catch blocks, Result types` |
| `{{KEYWORDS}}` | Comma-separated keywords | `error, catch, Result, typed error` |
| `{{KEYWORD_1}}, {{KEYWORD_2}}` | Activation keywords | `error`, `catch` |
| `{{RULE}}` | Rule name | `Always use typed errors` |
| `{{WHEN}}` | When it applies | `Any catch block` |
| `{{EXAMPLE}}` | Code or usage example | `catch (e: AppError)` |
| `{{EXCEPTION}}` | Exception to the rule | `Third-party library callbacks` |
| `{{CONTEXT}}` | When exception applies | `Library expects untyped throw` |
| `{{HANDLING}}` | How to handle the exception | `Wrap in typed error at boundary` |

**Body template**:
```markdown
# {{SKILL_TITLE}}

## Rules
| Rule | Applies When | Example |
|------|-------------|---------|
| {{RULE}} | {{WHEN}} | {{EXAMPLE}} |

## Exceptions
| Exception | Context | Handling |
|-----------|---------|----------|
| {{EXCEPTION}} | {{CONTEXT}} | {{HANDLING}} |
```

**Key sections**:
- Rules - Table of behavioral rules with applicability
- Exceptions - When rules can be relaxed and how

---

## Arguments

| Argument | Required | Format | Description |
|----------|----------|--------|-------------|
| `skill-name` | Yes | kebab-case | Unique identifier for the skill |
| `type` | No | knowledge-base\|encoded-preference\|workflow\|reference\|capability-uplift | Skill category |

### Validation Rules

| Rule | Check | Error Message |
|------|-------|---------------|
| Name format | Must be kebab-case | "Skill name must be kebab-case (e.g., api-patterns)" |
| Name unique | No existing directory | "Skill {name} already exists at {path}" |
| Type valid | One of 5 types | "Type must be: knowledge-base, encoded-preference, workflow, reference, capability-uplift" |

---

## Examples

### Example 1: API Conventions (Reference)

```
/meta-create-skill api-conventions reference
```

**Creates**: `.claude/skills/api-conventions/SKILL.md`

```yaml
---
name: api-conventions
description: |
  REST API design patterns and conventions for this project.
  Use when: creating or modifying API endpoints, routes, or handlers.
  Keywords - api, rest, endpoint, route, handler, validation
type: knowledge-base
disable-model-invocation: false
argument-hint: "[endpoint-path]"
effort: low
activation:
  keywords:
    - api
    - rest
    - endpoint
    - route
for_agents: [builder, reviewer]
version: "1.0"
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
/meta-create-skill deploy workflow
```

**Creates**: `.claude/skills/deploy/SKILL.md`

```yaml
---
name: deploy
description: |
  Deploy application to specified environment.
  Use when: deploying, releasing, pushing to staging or production.
  Keywords - deploy, release, staging, production, rollout
type: workflow
disable-model-invocation: true
argument-hint: "[environment] [--dry-run?]"
effort: medium
activation:
  keywords:
    - deploy
    - release
    - staging
    - production
for_agents: [builder]
version: "1.0"
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
/meta-create-skill arch-analysis research
```

**Creates**: `.claude/skills/arch-analysis/SKILL.md`

```yaml
---
name: arch-analysis
description: |
  Analyze codebase architecture patterns and structure.
  Use when: asked about architecture, module structure, or design decisions.
  Keywords - architecture, structure, modules, design, patterns, analysis
type: reference
disable-model-invocation: false
argument-hint: "[module-or-path]"
effort: high
activation:
  keywords:
    - architecture
    - structure
    - modules
    - design patterns
for_agents: [architect, scout]
version: "1.0"
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

## Frontmatter Reference (v2 Canonical)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Unique kebab-case identifier |
| `description` | string | Yes | Purpose + "Use when:" + "Keywords -" lines |
| `type` | string | Yes | `knowledge-base` \| `encoded-preference` \| `workflow` \| `reference` \| `capability-uplift` |
| `disable-model-invocation` | boolean | No | `true` = manual only (workflow), `false` = auto-trigger by keywords |
| `argument-hint` | string | No | Args shown in autocomplete (e.g., `"[file-path or module]"`) |
| `effort` | string | No | `low` (quick reference) \| `medium` (moderate analysis) \| `high` (deep audit) |
| `activation.keywords` | list | No | YAML list of keywords for auto-matching |
| `for_agents` | list | No | Agents that benefit most from this skill |
| `version` | string | No | Semantic version (default "1.0") |

### Fields NOT valid in skill frontmatter

| Invalid Field | Reason | Alternative |
|---------------|--------|-------------|
| `allowed-tools` | Not a valid skill field | Use agent frontmatter `allowedTools` instead |
| `model` | Not a valid skill field | Model routing is handled by Lead dynamically |

### Invocation Model: Agents = Behavior, Skills = Knowledge

Skills provide domain knowledge that any agent can leverage. The `disable-model-invocation` field controls whether agents can self-invoke the skill:

| Skill Category | `disable-model-invocation` | Reason |
|----------------|---------------------------|--------|
| **Knowledge** (knowledge-base, reference, capability-uplift) | `false` | Any agent can invoke when needed -- builder, reviewer, etc. |
| **Behavioral/Workflow** (workflow, mode toggles) | `true` | User-initiated -- decisions, modes, scaffolding |
| **Meta** (encoded-preference for meta ops) | `true` | User-initiated -- agent/skill creation |

A builder working on Django can self-invoke a `django-patterns` skill. A reviewer on the same project uses the same skill for review context. The skill is shared knowledge; the agent decides how to apply it.

---

## Skill Types Comparison

| Aspect | knowledge-base | encoded-preference | workflow | reference | capability-uplift |
|--------|---------------|-------------------|----------|-----------|-------------------|
| Invocation | Auto | Auto | Manual | Auto | Auto |
| Context | main | main | main | main | main |
| Purpose | Domain patterns | Behavioral rules | Tasks | Lookup material | Tool guidance |
| Template | Yes | Yes | Yes | Yes | No (use reference) |
| User triggers | Keywords | Keywords | `/command` | Keywords | Keywords |

---

## Related

- **SPEC-020**: Skills Extension System
- `/meta-create-agent`: Create subagents that can use skills
- `extension-architect`: Meta-agent managing all extensions
