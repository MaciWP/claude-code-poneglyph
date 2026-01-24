---
name: create-agent
description: |
  Meta-skill para crear subagentes de Claude Code desde templates estandarizados.
  Use proactively when: crear nuevo agente, scaffolding de agente, definir especialista delegado.
  Keywords - create, agent, subagent, template, scaffold, specialist, delegate
activation:
  keywords:
    - create agent
    - new agent
    - scaffold agent
    - make agent
    - subagent
disable-model-invocation: true
argument-hint: [agent-name] [type?]
allowed-tools: Read, Write, Glob, Bash
for_agents:
  - extension-architect
version: "1.0"
---

# Create Agent

Meta-skill para generar subagentes de Claude Code desde templates estandarizados.

## When to Use

Activar esta skill cuando:
- Usuario pide crear un nuevo agente/subagente
- Necesidad de scaffolding para especialista delegado
- Solicitud de template de agente

## Workflow

### Step 1: Parse Arguments

Extraer de `$ARGUMENTS`:

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `agent-name` | Yes | - | Nombre en kebab-case |
| `type` | No | prompt user | reader, builder, executor, researcher |

### Step 2: Determine Type

Si `type` no fue proporcionado, preguntar:

```
What type of agent do you want to create?

| Type | Tools | Permission | Use Case |
|------|-------|------------|----------|
| reader | Read, Grep, Glob | plan | Analysis, review, audit |
| builder | Read, Write, Edit, Bash | acceptEdits | Implementation, refactoring |
| executor | Bash, Read | default | Commands, automation |
| researcher | Read, Grep, Glob, WebSearch | plan | Investigation, documentation |
```

### Step 3: Gather Specialization

Preguntar al usuario:

```
What will this agent specialize in?
- Domain: (e.g., security, performance, API design)
- Primary task: (e.g., review code, implement features)
- Key outputs: (e.g., reports, code changes, recommendations)
```

### Step 4: Generate Agent File

1. Leer template desde `.claude/skills/create-agent/templates/{type}.md`
2. Reemplazar placeholders con valores del usuario
3. Escribir archivo a `.claude/agents/{category}/{agent-name}.md`

**Category mapping:**

| Type | Directory |
|------|-----------|
| reader | `.claude/agents/readers/` |
| builder | `.claude/agents/builders/` |
| executor | `.claude/agents/executors/` |
| researcher | `.claude/agents/researchers/` |

### Step 5: Confirm Creation

```
## Agent Created

**Name**: {agent-name}
**Location**: .claude/agents/{category}/{agent-name}.md

### Configuration
| Field | Value |
|-------|-------|
| tools | {tools} |
| permissionMode | {mode} |
| model | {model} |

### Next Steps
1. Edit system prompt in the agent file
2. Add skills if needed: `skills: [skill-name]`
3. Test with: "delegate to {agent-name}"
```

---

## Templates Available

| Type | File | Tools | Permission | Best For |
|------|------|-------|------------|----------|
| reader | `templates/reader.md` | Read, Grep, Glob | plan | Code review, analysis, audits |
| builder | `templates/builder.md` | Read, Write, Edit, Bash, Grep, Glob | acceptEdits | Implementation, refactoring |
| executor | `templates/executor.md` | Bash, Read | default | Running tests, deployments |
| researcher | `templates/researcher.md` | Read, Grep, Glob, WebSearch, WebFetch | plan | Investigation, documentation |

---

## Template: Reader

**Location**: `templates/reader.md`

**Use when**: Analysis, code review, security audit, quality checks.

**Frontmatter**:
```yaml
---
name: {agent-name}
description: |
  {Description of what it analyzes}.
  Use when {trigger keywords - be specific}.
tools: Read, Grep, Glob
permissionMode: plan
model: sonnet
skills: []
---
```

**Placeholders to replace**:

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{{AGENT_NAME}}` | kebab-case name | `security-reviewer` |
| `{{DESCRIPTION}}` | What it does | `Security analysis specialist` |
| `{{TRIGGER_CONDITION}}` | When to delegate | `reviewing for security issues` |
| `{{DOMAIN}}` | Area of expertise | `security vulnerabilities` |
| `{{WHAT_TO_ANALYZE}}` | Analysis target | `code for security issues` |
| `{{PATTERNS_OR_ISSUES}}` | What to find | `vulnerabilities, insecure patterns` |
| `{{CRITERIA}}` | Analysis criteria | `OWASP Top 10, input validation` |

---

## Template: Builder

**Location**: `templates/builder.md`

**Use when**: Feature implementation, code changes, refactoring.

**Frontmatter**:
```yaml
---
name: {agent-name}
description: |
  {Description of what it builds}.
  Use when {trigger keywords}.
tools: Read, Write, Edit, Bash, Grep, Glob
permissionMode: acceptEdits
model: sonnet
skills: []
---
```

**Placeholders to replace**:

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{{AGENT_NAME}}` | kebab-case name | `api-implementer` |
| `{{DESCRIPTION}}` | What it builds | `REST API endpoint specialist` |
| `{{TRIGGER_CONDITION}}` | When to delegate | `implementing API endpoints` |
| `{{DOMAIN}}` | Area of expertise | `REST APIs with Elysia` |
| `{{WHAT_TO_BUILD}}` | Implementation target | `API endpoints following project patterns` |

---

## Template: Executor

**Location**: `templates/executor.md`

**Use when**: Running commands, tests, deployments, automation.

**Frontmatter**:
```yaml
---
name: {agent-name}
description: |
  {Description of what commands it runs}.
  Use when {trigger keywords}.
tools: Bash, Read
permissionMode: default
model: haiku
---
```

**Placeholders to replace**:

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{{AGENT_NAME}}` | kebab-case name | `test-runner` |
| `{{DESCRIPTION}}` | What commands | `Test execution specialist` |
| `{{TRIGGER_CONDITION}}` | When to delegate | `running tests` |
| `{{PURPOSE}}` | Command purpose | `running and reporting test results` |
| `{{COMMAND_1}}` | Allowed command | `bun test` |
| `{{COMMAND_2}}` | Allowed command | `bun test --coverage` |
| `{{COMMAND_3}}` | Allowed command | `bun test --watch` |

---

## Template: Researcher

**Location**: `templates/researcher.md`

**Use when**: Investigation, documentation research, complex questions.

**Frontmatter**:
```yaml
---
name: {agent-name}
description: |
  {Description of what it researches}.
  Use when {trigger keywords}.
tools: Read, Grep, Glob, WebSearch, WebFetch
permissionMode: plan
model: sonnet
---
```

**Placeholders to replace**:

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{{AGENT_NAME}}` | kebab-case name | `library-researcher` |
| `{{DESCRIPTION}}` | Research focus | `Library and API documentation specialist` |
| `{{TRIGGER_CONDITION}}` | When to delegate | `researching library usage` |
| `{{TOPIC}}` | Research topic | `library APIs and best practices` |
| `{{WHAT_TO_RESEARCH}}` | Investigation target | `library documentation and examples` |

---

## Arguments

| Argument | Required | Format | Description |
|----------|----------|--------|-------------|
| `agent-name` | Yes | kebab-case | Unique identifier for the agent |
| `type` | No | reader\|builder\|executor\|researcher | Agent category |

### Validation Rules

| Rule | Check | Error Message |
|------|-------|---------------|
| Name format | Must be kebab-case | "Agent name must be kebab-case (e.g., code-reviewer)" |
| Name unique | No existing file | "Agent {name} already exists at {path}" |
| Type valid | One of 4 types | "Type must be: reader, builder, executor, researcher" |

---

## Examples

### Example 1: Security Reviewer

```
/create-agent security-reviewer reader
```

**Creates**: `.claude/agents/readers/security-reviewer.md`

```yaml
---
name: security-reviewer
description: |
  Security analysis specialist. Reviews code for vulnerabilities,
  injection risks, and insecure patterns.
  Use when reviewing security, checking vulnerabilities, or auditing code.
tools: Read, Grep, Glob
permissionMode: plan
model: sonnet
skills:
  - security-patterns
---

You are a specialized analyst focused on security vulnerabilities.

## Primary Responsibilities

- Analyze code for security issues
- Identify vulnerabilities, injection risks, insecure patterns
- Report findings clearly with file:line references

## Workflow

When invoked:

1. Understand the security review scope
2. Gather relevant files using Read/Grep/Glob
3. Analyze for OWASP Top 10, input validation, auth issues
4. Report findings organized by severity

## Output Format

### Critical Issues (Must Fix)
- {issue} (`file.ts:123`)

### Warnings (Should Fix)
- {issue} (`file.ts:45`)

### Suggestions (Consider)
- {improvement}

## Constraints

- Read-only analysis - no modifications
- Always cite file:line for findings
- Prioritize actionable feedback
- Be specific, not generic
```

### Example 2: Test Runner

```
/create-agent test-runner executor
```

**Creates**: `.claude/agents/executors/test-runner.md`

```yaml
---
name: test-runner
description: |
  Test execution specialist. Runs tests and reports results clearly.
  Use when running tests, checking test coverage, or test status.
tools: Bash, Read
permissionMode: default
model: haiku
---

You execute test commands and report results clearly.

## Allowed Commands

Only execute these commands:
- `bun test`
- `bun test --coverage`
- `bun test {specific-file}`

## Workflow

1. Validate the request matches allowed commands
2. Execute command with appropriate flags
3. Capture output and errors
4. Report results clearly

## Output Format

```
Command: {exact command run}
Exit Code: {0 for success, non-zero for failure}

Output:
{stdout content}

Errors (if any):
{stderr content}
```

### Summary
- Tests passed: {count}
- Tests failed: {count}
- Coverage: {percentage}

## Constraints

- Only run allowed commands from the list above
- Never modify files directly
- Report all errors clearly
- Timeout after 5 minutes
```

### Example 3: API Implementer

```
/create-agent api-implementer builder
```

**Creates**: `.claude/agents/builders/api-implementer.md`

```yaml
---
name: api-implementer
description: |
  REST API implementation specialist. Builds endpoints following project patterns.
  Use when implementing API routes, endpoints, or handlers.
tools: Read, Write, Edit, Bash, Grep, Glob
permissionMode: acceptEdits
model: sonnet
skills: []
---

You are a specialized developer focused on REST APIs with Elysia.

## Primary Responsibilities

- Implement API endpoints following project patterns
- Follow project conventions and patterns
- Write tests for new endpoints
- Ensure proper validation and error handling

## Workflow

When invoked:

1. Understand endpoint requirements
2. Read existing routes for patterns
3. Implement following project conventions
4. Write tests covering main scenarios
5. Verify implementation works

## Output Format

### Files Created/Modified
- `path/to/file.ts` - {what was done}

### Tests Added
- `path/to/file.test.ts` - {what is covered}

### Verification
- [ ] Code compiles
- [ ] Tests pass
- [ ] Follows project style

### Notes
- {any important decisions}

## Constraints

- Follow existing route patterns strictly
- Add tests for new endpoints
- Don't break existing tests
- Include input validation
- Handle errors properly
```

---

## Directory Structure

```
.claude/agents/
├── readers/
│   ├── code-reviewer.md
│   ├── security-reviewer.md
│   └── performance-auditor.md
├── builders/
│   ├── api-implementer.md
│   ├── feature-developer.md
│   └── refactorer.md
├── executors/
│   ├── test-runner.md
│   ├── build-runner.md
│   └── deployer.md
└── researchers/
    ├── library-researcher.md
    ├── architecture-analyst.md
    └── documentation-writer.md
```

---

## Frontmatter Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Unique kebab-case identifier |
| `description` | string | Yes | Purpose + trigger keywords |
| `tools` | string | Yes | Comma-separated tool whitelist |
| `disallowedTools` | string | No | Comma-separated tool blacklist |
| `model` | string | No | `sonnet` (default), `opus`, `haiku`, `inherit` |
| `permissionMode` | string | No | `default`, `plan`, `acceptEdits`, `dontAsk`, `bypassPermissions` |
| `skills` | list | No | Pre-loaded skill names |
| `hooks` | object | No | Lifecycle hooks configuration |

---

## Permission Modes

| Mode | Behavior | Recommended For |
|------|----------|-----------------|
| `default` | Standard permission prompts | General purpose |
| `plan` | Read-only, no write operations | Readers, researchers |
| `acceptEdits` | Auto-accept file edits | Trusted builders |
| `dontAsk` | Auto-deny permission requests | Strict read-only |
| `bypassPermissions` | Skip all permission checks | Automation only |

---

## Model Selection

| Model | Cost | Speed | Recommended For |
|-------|------|-------|-----------------|
| `haiku` | Cheapest | Fastest | Simple executors, quick tasks |
| `sonnet` | Balanced | Balanced | General purpose (default) |
| `opus` | Expensive | Slowest | Complex reasoning, architecture |
| `inherit` | Same as main | Same | Consistency with parent |

---

## Related

- **SPEC-021**: Subagents Extension System
- **SPEC-020**: Skills Extension System
- `/create-skill`: Create skills for agents to use
- `extension-architect`: Meta-agent managing all extensions
