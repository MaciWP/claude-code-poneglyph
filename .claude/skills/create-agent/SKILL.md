---
name: create-agent
description: Create a new Claude Code subagent from template. Use when user wants to create an agent, subagent, or delegate specialist.
disable-model-invocation: true
argument-hint: [agent-name] [type?]
allowed-tools: Read, Write, Glob, Bash
---

# Create Agent Skill

Generate a new Claude Code subagent from standardized templates.

## Usage

```
/create-agent <agent-name> [type]
```

**Examples**:
```
/create-agent code-reviewer reader
/create-agent implementer builder
/create-agent test-runner executor
/create-agent deep-researcher researcher
/create-agent my-agent
```

---

## Workflow

### Step 1: Parse Arguments

Extract from `$ARGUMENTS`:
- `agent-name`: Required - kebab-case name
- `type`: Optional - reader | builder | executor | researcher

### Step 2: Determine Type (if not provided)

Ask user:

```
What type of agent do you want to create?

| Type | Tools | Use Case |
|------|-------|----------|
| **reader** | Read, Grep, Glob | Analysis, review, audit |
| **builder** | Read, Write, Edit, Bash | Implementation, refactoring |
| **executor** | Bash, Read | Running commands, automation |
| **researcher** | Read, Grep, Glob, WebSearch | Investigation, documentation |
```

### Step 3: Determine Permission Mode

Ask user:

```
What permission mode?

| Mode | Behavior |
|------|----------|
| **default** | Standard permission prompts |
| **plan** | Read-only exploration (recommended for readers) |
| **acceptEdits** | Auto-accept file edits (for trusted builders) |
```

### Step 4: Generate Agent File

Create file at: `.claude/agents/{category}/{agent-name}.md`

**Category mapping**:
- reader → `readers/`
- builder → `builders/`
- executor → `executors/`
- researcher → `researchers/`

### Step 5: Confirm Creation

Show summary:
```
✅ Agent created: .claude/agents/{category}/{agent-name}.md

Configuration:
- Type: {type}
- Tools: {tools}
- Permission Mode: {mode}
- Model: sonnet

Next steps:
1. Edit the system prompt in the agent file
2. Add skills if needed (skills: [skill-name])
3. Test with: "delegate to {agent-name}"
```

---

## Templates by Type

### Reader Template

```yaml
---
name: {agent-name}
description: |
  {Agent description - what it analyzes and when to use it.
   Include keywords for automatic delegation.}
tools: Read, Grep, Glob
permissionMode: plan
model: sonnet
skills: []
---

You are a specialized analyst focused on {domain}.

## Primary Responsibilities

- Analyze {what}
- Identify {patterns/issues}
- Report findings clearly

## Workflow

When invoked:

1. Understand the analysis request
2. Gather relevant files using Read/Grep/Glob
3. Analyze for {criteria}
4. Report findings organized by priority

## Output Format

### Critical Issues
- {issue with file:line reference}

### Warnings
- {issue}

### Suggestions
- {improvement}

## Constraints

- Read-only analysis - no modifications
- Always cite file:line for findings
- Prioritize actionable feedback
```

### Builder Template

```yaml
---
name: {agent-name}
description: |
  {Agent description - what it builds and when to use it.
   Include keywords for automatic delegation.}
tools: Read, Write, Edit, Bash, Grep, Glob
permissionMode: acceptEdits
model: sonnet
skills: []
---

You are a specialized developer focused on {domain}.

## Primary Responsibilities

- Implement {what}
- Follow project conventions
- Write tests for new code

## Workflow

When invoked:

1. Understand requirements
2. Read existing related code
3. Implement following project patterns
4. Write tests
5. Verify implementation

## Output Format

Report after implementation:

### Files Created/Modified
- `path/to/file.ts` - {description}

### Tests Added
- `path/to/file.test.ts` - {coverage}

### Notes
- {any important notes}

## Constraints

- Follow existing code style
- Add tests for new functionality
- Don't break existing tests
```

### Executor Template

```yaml
---
name: {agent-name}
description: |
  {Agent description - what commands it runs and when to use it.
   Include keywords for automatic delegation.}
tools: Bash, Read
permissionMode: default
model: haiku
---

You execute specific commands for {purpose}.

## Allowed Commands

Only execute these commands:
- `{command1}`
- `{command2}`
- `{command3}`

## Workflow

1. Validate the request matches allowed commands
2. Execute command
3. Report results

## Output Format

```
Command: {command}
Exit Code: {code}

Output:
{stdout}

Errors (if any):
{stderr}
```

## Constraints

- Only run allowed commands
- Never modify files directly
- Report all errors clearly
```

### Researcher Template

```yaml
---
name: {agent-name}
description: |
  {Agent description - what it researches and when to use it.
   Include keywords for automatic delegation.}
tools: Read, Grep, Glob, WebSearch, WebFetch
permissionMode: plan
model: sonnet
---

You research {topic} thoroughly.

## Primary Responsibilities

- Investigate {what}
- Cross-reference sources
- Summarize findings

## Methodology

1. Search codebase first (Read, Grep, Glob)
2. Search web for external info (WebSearch)
3. Fetch detailed content (WebFetch)
4. Cross-reference findings
5. Summarize with sources

## Output Format

## Findings

### From Codebase
- {finding} (source: {file}:{line})

### From Web
- {finding} (source: {url})

## Confidence: {High|Medium|Low}

## Sources
- [{title}]({url})

## Constraints

- Always cite sources
- Indicate confidence level
- Prioritize official documentation
```

---

## Frontmatter Reference

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Agent identifier (kebab-case) |
| `description` | string | When Claude should delegate (include keywords) |
| `tools` | string | Comma-separated tool whitelist |
| `disallowedTools` | string | Comma-separated tool blacklist |
| `model` | string | `sonnet` \| `opus` \| `haiku` \| `inherit` |
| `permissionMode` | string | `default` \| `plan` \| `acceptEdits` \| `dontAsk` \| `bypassPermissions` |
| `skills` | list | Pre-loaded skills |
| `hooks` | object | Lifecycle hooks (PreToolUse, PostToolUse, Stop) |

---

## Permission Modes

| Mode | Behavior | Recommended For |
|------|----------|-----------------|
| `default` | Standard prompts | General purpose |
| `plan` | Read-only, no writes | Readers, researchers |
| `acceptEdits` | Auto-accept file changes | Trusted builders |
| `dontAsk` | Auto-deny permissions | Strict read-only |
| `bypassPermissions` | Skip all checks | ⚠️ Automation only |

---

## Model Selection

| Model | Cost | Speed | Recommended For |
|-------|------|-------|-----------------|
| `haiku` | Cheapest | Fastest | Simple executors |
| `sonnet` | Balanced | Balanced | General purpose |
| `opus` | Expensive | Slowest | Complex reasoning |
| `inherit` | Same as main | Same | Consistency |

---

## Examples

### Example 1: Code Reviewer

```
/create-agent code-reviewer reader
```

Creates: `.claude/agents/readers/code-reviewer.md`

```yaml
---
name: code-reviewer
description: |
  Expert code review specialist. Reviews code for quality, security,
  and maintainability. Use when reviewing PRs or code changes.
tools: Read, Grep, Glob
permissionMode: plan
model: sonnet
skills:
  - code-quality
  - security-review
---
```

### Example 2: Test Runner

```
/create-agent test-runner executor
```

Creates: `.claude/agents/executors/test-runner.md`

```yaml
---
name: test-runner
description: |
  Test execution specialist. Runs tests and reports results.
  Use when testing is requested.
tools: Bash, Read
permissionMode: default
model: haiku
---
```

### Example 3: Deep Researcher

```
/create-agent deep-researcher researcher
```

Creates: `.claude/agents/researchers/deep-researcher.md`

```yaml
---
name: deep-researcher
description: |
  Research specialist. Investigates topics thoroughly using codebase
  and web resources. Use for complex research questions.
tools: Read, Grep, Glob, WebSearch, WebFetch
permissionMode: plan
model: sonnet
---
```

---

## Directory Structure

```
.claude/agents/
├── readers/
│   ├── code-reviewer.md
│   └── auditor.md
├── builders/
│   ├── implementer.md
│   └── refactorer.md
├── executors/
│   ├── test-runner.md
│   └── deployer.md
└── researchers/
    ├── deep-researcher.md
    └── documenter.md
```

---

## Related

- **SPEC-021**: Subagents Extension System
- **SPEC-020**: Skills Extension System
- `/create-skill`: Create skills for agents

---

**Version**: 1.0.0
**Category**: generator
**Spec**: SPEC-021
