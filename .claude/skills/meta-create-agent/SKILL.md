---
name: meta-create-agent
description: |
  Meta-skill for creating Claude Code subagents from standardized templates.
  Use proactively when: creating a new agent, agent scaffolding, defining a delegated specialist.
  Keywords - create, agent, subagent, template, scaffold, specialist, delegate
type: encoded-preference
disable-model-invocation: true
argument-hint: "[agent-name] [type?]"
effort: medium
activation:
  keywords:
    - create agent
    - new agent
    - scaffold agent
    - make agent
    - subagent
for_agents: [extension-architect]
version: "1.0"
---

# Create Agent

Meta-skill for generating Claude Code subagents from standardized templates.

## When to Use

Activate this skill when:
- User requests creating a new agent/subagent
- Need for scaffolding a delegated specialist
- Request for an agent template

## Workflow

### Step 1: Parse Arguments

Extract from `$ARGUMENTS`:

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `agent-name` | Yes | - | Name in kebab-case |
| `type` | No | prompt user | reader, builder, executor, researcher |

### Step 2: Determine Type

If `type` was not provided, ask:

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

Ask the user:

```
What will this agent specialize in?
- Domain: (e.g., security, performance, API design)
- Primary task: (e.g., review code, implement features)
- Key outputs: (e.g., reports, code changes, recommendations)
```

### Step 4: Generate Agent File

1. Read template from `.claude/skills/meta-create-agent/templates/{type}.md`
2. Replace placeholders with user-provided values
3. Write file to `.claude/agents/{category}/{agent-name}.md`

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

| Type | File | Tools | permissionMode | Best For |
|------|------|-------|----------------|----------|
| reader | `templates/reader.md` | Read, Grep, Glob | plan | Code review, analysis, audits |
| builder | `templates/builder.md` | Read, Write, Edit, Bash, Grep, Glob, LSP | acceptEdits | Implementation, refactoring |
| executor | `templates/executor.md` | Bash, Read | default | Running tests, deployments |
| researcher | `templates/researcher.md` | Read, Grep, Glob, WebSearch, WebFetch | plan | Investigation, documentation |

---

## Template: Reader

**Location**: `templates/reader.md`

**Use when**: Analysis, code review, security audit, quality checks.

**Frontmatter**:
```yaml
---
description: |
  {{DESCRIPTION}}.
  Use proactively when: {{TRIGGER_CONDITION}}.
  Keywords - {{KEYWORDS}}
tools: Read, Grep, Glob
disallowedTools: Task, Edit, Write, Bash
permissionMode: plan
effort: low
maxTurns: 15
memory:
  scope: project
---
```

**Placeholders to replace**:

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{{AGENT_NAME}}` | kebab-case name (used as filename) | `security-reviewer` |
| `{{DESCRIPTION}}` | What it does | `Security analysis specialist` |
| `{{TRIGGER_CONDITION}}` | When to delegate | `reviewing for security issues, auditing code` |
| `{{KEYWORDS}}` | Comma-separated keywords for matching | `security, review, audit, vulnerability` |
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
description: |
  {{DESCRIPTION}}.
  Use proactively when: {{TRIGGER_CONDITION}}.
  Keywords - {{KEYWORDS}}
tools: Read, Write, Edit, Bash, Grep, Glob, LSP
disallowedTools: Task
permissionMode: acceptEdits
maxTurns: 30
memory:
  scope: project
---
```

**Placeholders to replace**:

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{{AGENT_NAME}}` | kebab-case name (used as filename) | `api-implementer` |
| `{{DESCRIPTION}}` | What it builds | `REST API endpoint specialist` |
| `{{TRIGGER_CONDITION}}` | When to delegate | `implementing API endpoints, building routes` |
| `{{KEYWORDS}}` | Comma-separated keywords for matching | `api, endpoint, route, implement` |
| `{{DOMAIN}}` | Area of expertise | `REST APIs with Elysia` |
| `{{WHAT_TO_BUILD}}` | Implementation target | `API endpoints following project patterns` |

---

## Template: Executor

**Location**: `templates/executor.md`

**Use when**: Running commands, tests, deployments, automation.

**Frontmatter**:
```yaml
---
description: |
  {{DESCRIPTION}}.
  Use proactively when: {{TRIGGER_CONDITION}}.
  Keywords - {{KEYWORDS}}
tools: Bash, Read
disallowedTools: Task, Edit, Write
permissionMode: default
effort: low
maxTurns: 10
---
```

**Placeholders to replace**:

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{{AGENT_NAME}}` | kebab-case name (used as filename) | `test-runner` |
| `{{DESCRIPTION}}` | What commands it runs | `Test execution specialist` |
| `{{TRIGGER_CONDITION}}` | When to delegate | `running tests, checking test results` |
| `{{KEYWORDS}}` | Comma-separated keywords for matching | `test, run, execute, coverage` |
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
description: |
  {{DESCRIPTION}}.
  Use proactively when: {{TRIGGER_CONDITION}}.
  Keywords - {{KEYWORDS}}
tools: Read, Grep, Glob, WebSearch, WebFetch
disallowedTools: Task, Edit, Write
permissionMode: plan
maxTurns: 20
memory:
  scope: project
---
```

**Placeholders to replace**:

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{{AGENT_NAME}}` | kebab-case name (used as filename) | `library-researcher` |
| `{{DESCRIPTION}}` | Research focus | `Library and API documentation specialist` |
| `{{TRIGGER_CONDITION}}` | When to delegate | `researching library usage, investigating APIs` |
| `{{KEYWORDS}}` | Comma-separated keywords for matching | `research, investigate, library, documentation` |
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
/meta-create-agent security-reviewer reader
```

**Creates**: `.claude/agents/readers/security-reviewer.md`

```yaml
---
description: |
  Security analysis specialist. Reviews code for vulnerabilities,
  injection risks, and insecure patterns.
  Use proactively when: reviewing security, checking vulnerabilities, auditing code.
  Keywords - security, vulnerability, audit, injection, review
tools: Read, Grep, Glob
disallowedTools: Task, Edit, Write, Bash
permissionMode: plan
effort: low
maxTurns: 15
memory:
  scope: project
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
/meta-create-agent test-runner executor
```

**Creates**: `.claude/agents/executors/test-runner.md`

```yaml
---
description: |
  Test execution specialist. Runs tests and reports results clearly.
  Use proactively when: running tests, checking test coverage, test status.
  Keywords - test, run, execute, coverage, results
tools: Bash, Read
disallowedTools: Task, Edit, Write
permissionMode: default
effort: low
maxTurns: 10
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
/meta-create-agent api-implementer builder
```

**Creates**: `.claude/agents/builders/api-implementer.md`

```yaml
---
description: |
  REST API implementation specialist. Builds endpoints following project patterns.
  Use proactively when: implementing API routes, endpoints, handlers.
  Keywords - api, endpoint, route, handler, implement, REST
tools: Read, Write, Edit, Bash, Grep, Glob, LSP
disallowedTools: Task
permissionMode: acceptEdits
maxTurns: 30
memory:
  scope: project
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

**CRITICAL**: `description` MUST include "Use proactively when:" and "Keywords -" lines. Without these, Claude Code will NOT register the agent as a valid `subagent_type`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `description` | string | **Yes** | Purpose + "Use proactively when: {situations}." + "Keywords - {kw1, kw2, ...}" |
| `tools` | string | **Yes** | Comma-separated tool whitelist. Plain names only (no scoped syntax like `Task(scout)`) |
| `disallowedTools` | string/list | No | Tools blocked. **camelCase** (e.g., `Task`, `NotebookEdit`) — NOT snake_case |
| `permissionMode` | string | No | `default`, `plan`, `acceptEdits`, `dontAsk`, `bypassPermissions` |
| `effort` | string | No | `low`/`medium`/`high`. Only set if **invariable** for this agent type |
| `maxTurns` | number | No | Safety net for max turns. Use generous values, not flow control |
| `skills` | list | No | Skills auto-loaded when agent starts |
| `memory` | object | No | `scope: user\|project\|local` |
| `background` | boolean | No | `true` = always run in background |
| `hooks` | object | No | Hooks scoped to agent (PreToolUse, PostToolUse, Stop) |
| `isolation` | string | No | `worktree` = isolated git worktree |
| `initialPrompt` | string | No | Auto-submitted prompt on agent start |

### Fields NOT in agent frontmatter

| Field | Reason |
|-------|--------|
| `name` | Agent is identified by filename, not a `name` field |
| `model` | Model routing is dynamic — the Lead determines model per-invocation based on complexity |

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

## Model Selection (Dynamic — NOT in Frontmatter)

Model is determined dynamically by the Lead based on agent category and task complexity. Do NOT set `model` in agent frontmatter.

| Agent Category | Complexity < 30 | 30-50 | > 50 |
|----------------|----------------|-------|------|
| Code agents (builder, reviewer) | sonnet | sonnet | opus |
| Read-only agents (scout, executor) | haiku | haiku | sonnet |
| Strategic agents (planner, architect) | opus | opus | opus |

---

## Related

- **SPEC-021**: Subagents Extension System
- **SPEC-020**: Skills Extension System
- `/meta-create-skill`: Create skills for agents to use
- `extension-architect`: Meta-agent managing all extensions
