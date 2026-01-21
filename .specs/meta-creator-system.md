# SPEC-024: Meta-Creator System

> **Status**: draft | **Version**: 1.0 | **Updated**: 2026-01-21
> **Replaces**: SPEC-020, SPEC-021, SPEC-022, SPEC-023 (parcialmente - extrae la parte de creación)

## 0. Research Summary

### Fuentes Consultadas

| Tipo | Fuente | Link | Relevancia |
|------|--------|------|------------|
| Architecture | Meta-Agent Patterns 2025 | [MarkTechPost](https://www.marktechpost.com/2025/11/15/comparing-the-top-5-ai-agent-architectures-in-2025-hierarchical-swarm-meta-learning-modular-evolutionary/) | Alta |
| Meta-Agent | aiXplain Evolver | [Blog](https://aixplain.com/blog/evolver-meta-agent-self-improving-ai/) | Alta |
| Docs oficial | Claude Code Subagents | [Docs](https://code.claude.com/docs/en/sub-agents) | Alta |
| Docs oficial | Claude Code Skills | [Docs](https://code.claude.com/docs/en/skills) | Alta |
| Docs oficial | Claude Code Hooks | [Docs](https://code.claude.com/docs/en/hooks) | Alta |
| Best practices | PubNub Guide | [Blog](https://www.pubnub.com/blog/best-practices-for-claude-code-sub-agents/) | Alta |
| Internal | SPEC-020 to SPEC-023 | Este proyecto | Alta |

### Decisiones Informadas por Research

| Decisión | Basada en | Por qué |
|----------|-----------|---------|
| **Un agente + múltiples skills** | Docs oficiales | Subagents NO pueden spawner otros subagents. Skills sí se pueden precargar |
| **Skills como conocimiento declarativo** | Meta-Agent patterns | El agente orquesta, las skills proveen patrones |
| **Documentación inline del "por qué"** | Best practices | Reduce alucinaciones, enseña mientras genera |
| **Operaciones CRUD** | User requirement | Create + Modify + List para gestión completa |

### Información Clave del Research

> "The Self Organizing Modular Agent is built from modules... A **meta controller or orchestrator** chooses which modules to activate." - MarkTechPost 2025

> "Subagents cannot spawn other subagents - this prevents infinite nesting." - Claude Code Docs

### Confidence Assessment

| Área | Nivel | Razón |
|------|-------|-------|
| Agent + Skills architecture | Alta | Limitación documentada de subagents |
| Template formats | Alta | Docs oficiales completos |
| Operations (CRUD) | Alta | Patrón estándar |
| Best practices inline | Media | Community patterns |

---

## 1. Vision

> **Press Release**: El Meta-Creator System proporciona un agente especializado (`meta-creator`) que utiliza 5 skills de conocimiento para crear, modificar y listar componentes de Claude Code (skills, agents, hooks, commands, MCP servers). Cada skill contiene templates Y documentación del "por qué" de cada decisión de diseño, actuando como guía de aprendizaje mientras genera código.

**Background**: Los SPEC-020 a SPEC-023 definían templates y comandos `/create-*` separados. Este spec los unifica en un sistema coherente donde un agente usa skills especializadas.

**Usuario objetivo**: Desarrolladores que crean o mantienen la infraestructura de Claude Code del proyecto.

**Métricas de éxito**:
- Un único punto de entrada para crear cualquier componente
- 100% de campos con documentación del "por qué"
- Operaciones CREATE, MODIFY, LIST funcionales

---

## 2. Goals & Non-Goals

### Goals

- [x] Crear agente `meta-creator` que orquesta la creación de componentes
- [x] Crear 5 skills de conocimiento:
  - `skill-creator-patterns` - Para crear skills
  - `agent-creator-patterns` - Para crear agentes
  - `hook-creator-patterns` - Para crear hooks
  - `command-creator-patterns` - Para crear comandos
  - `mcp-creator-patterns` - Para crear/configurar MCP servers
- [x] Documentar el "por qué" de cada campo en cada skill
- [x] Soportar operaciones: CREATE, MODIFY, LIST
- [x] Mantener consistencia con specs anteriores (SPEC-020 a 023)

### Non-Goals

- [ ] Reemplazar los specs de extensión (siguen siendo la referencia técnica)
- [ ] Auto-mejora del propio meta-creator (no es self-improving)
- [ ] Validación runtime de componentes (ver SPEC-022 Hooks)
- [ ] GUI para el meta-creator

---

## 3. Alternatives Considered

| Alternativa | Pros | Cons | Decisión |
|-------------|------|------|----------|
| **Agente + Skills** | Reutiliza infraestructura, skills enseñan | Requiere diseñar 5 skills | ✅ Elegida |
| Comandos separados (`/create-*`) | Más directo | 4+ comandos, no enseñan "por qué" | ❌ |
| Un mega-skill | Simple | Demasiado grande, difícil mantener | ❌ |
| Solo templates sin agente | Mínimo | No guía, usuario debe saber qué hacer | ❌ |

---

## 4. Design

### 4.1 Architecture Overview

```
.claude/
├── agents/
│   └── meta/
│       └── meta-creator.md          # El agente orquestador
│
└── skills/
    └── meta/
        ├── skill-creator-patterns/
        │   └── SKILL.md             # Conocimiento para crear skills
        ├── agent-creator-patterns/
        │   └── SKILL.md             # Conocimiento para crear agents
        ├── hook-creator-patterns/
        │   └── SKILL.md             # Conocimiento para crear hooks
        ├── command-creator-patterns/
        │   └── SKILL.md             # Conocimiento para crear commands
        └── mcp-creator-patterns/
            └── SKILL.md             # Conocimiento para crear MCP configs
```

### 4.2 Meta-Creator Agent

```yaml
---
name: meta-creator
description: |
  Meta-agent especializado en crear y gestionar componentes de Claude Code.
  Use this agent when:
  - User wants to create a new skill, agent, hook, command, or MCP config
  - User wants to modify an existing component
  - User wants to list available components

  Keywords: crear skill, nuevo agente, add hook, crear comando, configurar MCP,
  listar skills, modificar agente, actualizar hook

tools: Read, Write, Edit, Glob, Grep, Bash
permissionMode: acceptEdits
model: sonnet

skills:
  - meta/skill-creator-patterns
  - meta/agent-creator-patterns
  - meta/hook-creator-patterns
  - meta/command-creator-patterns
  - meta/mcp-creator-patterns
---

# Meta-Creator Agent

You are a specialized agent for creating and managing Claude Code components.
You have access to 5 knowledge skills that contain templates and explanations.

## Primary Operations

### 1. CREATE - Generate new component

When user wants to create something:

1. **Detect type** from user request:
   - "crear skill", "nueva skill", "add skill" → Use skill-creator-patterns
   - "crear agente", "nuevo agent" → Use agent-creator-patterns
   - "crear hook", "nuevo hook" → Use hook-creator-patterns
   - "crear comando", "nuevo command" → Use command-creator-patterns
   - "configurar MCP", "nuevo MCP server" → Use mcp-creator-patterns

2. **Ask clarifying questions** based on the skill's guidance

3. **Generate component** using the skill's template

4. **Explain decisions** - For each significant field, explain WHY it's configured that way

5. **Write file** to appropriate location

### 2. MODIFY - Update existing component

When user wants to modify something:

1. **Read existing component** using Glob + Read

2. **Understand current state** - What's configured and why

3. **Apply changes** following the skill's patterns

4. **Preserve existing decisions** unless explicitly changing them

5. **Edit file** with changes

### 3. LIST - Show available components

When user wants to list components:

```bash
# Skills
Glob(".claude/skills/**/SKILL.md")

# Agents
Glob(".claude/agents/**/*.md")

# Hooks
Read(".claude/settings.json") → parse hooks section

# Commands
Glob(".claude/commands/**/*.md")

# MCP Servers
Read(".claude/mcp.json") OR Read("~/.config/claude/mcp.json")
```

Present as table with: Name | Type | Description | Location

## Output Format

When creating components, ALWAYS include:

1. **The generated file** with all fields
2. **Explanation section** with:
   - Why each major field is set that way
   - What would happen if configured differently
   - References to documentation

## Constraints

- ALWAYS use the appropriate skill's template
- NEVER guess field values without asking
- ALWAYS explain the "why" for non-obvious decisions
- Follow existing project conventions when detected
```

### 4.3 Meta-Skill: skill-creator-patterns

```yaml
---
name: skill-creator-patterns
description: |
  Knowledge patterns for creating Claude Code skills.
  Contains templates, field explanations, and best practices.
  Use when meta-creator needs to generate a skill.

disable-model-invocation: true  # Only meta-creator uses this
---

# Skill Creator Patterns

## What is a Skill?

A skill is a **prompt injection** that adds context, rules, or workflows to Claude's responses.
Skills are stored in `.claude/skills/{category}/{name}/SKILL.md`.

## Template with Explanations

```yaml
---
# ═══════════════════════════════════════════════════════════════════
# IDENTITY SECTION
# ═══════════════════════════════════════════════════════════════════

name: {skill-name}
# WHY: Unique identifier. Used for /skill-name invocation and logging.
# FORMAT: lowercase-kebab-case
# EXAMPLE: typescript-patterns, security-review, deploy-workflow

description: |
  {One paragraph describing:
   - What this skill does
   - When Claude should use it (activation triggers)
   - Keywords that might trigger it}
# WHY: Claude uses SEMANTIC MATCHING on this field to decide when to activate.
#      There's NO keyword matching - Claude reasons about relevance.
# BEST PRACTICE: Include verbs (use when, invoke for) and domain keywords.
# BAD EXAMPLE: "TypeScript stuff" - too vague
# GOOD EXAMPLE: "TypeScript best practices for async/await and error handling.
#               Use when writing or reviewing TypeScript code."

# ═══════════════════════════════════════════════════════════════════
# INVOCATION CONTROL
# ═══════════════════════════════════════════════════════════════════

disable-model-invocation: false
# WHY: Controls whether Claude can AUTO-ACTIVATE this skill.
# - false (default): Claude activates when description matches user intent
# - true: ONLY activates via explicit /skill-name command
# USE CASE for true: Dangerous operations (deploy), user preference workflows
# USE CASE for false: Reference skills, coding patterns, best practices

user-invocable: true
# WHY: Controls whether USERS can invoke via /skill-name
# - true (default): Appears in autocomplete, user can invoke
# - false: Only Claude or other skills can use (internal skill)
# USE CASE for false: Helper skills used by other skills

# ═══════════════════════════════════════════════════════════════════
# ARGUMENTS
# ═══════════════════════════════════════════════════════════════════

argument-hint: [{arg1}] [{arg2}]
# WHY: Shows in autocomplete to help users know what arguments to provide
# EXAMPLE: [file-path] [--dry-run]
# ACCESS: Use $ARGUMENTS in skill body to get user input
# OMIT IF: Skill doesn't need arguments

# ═══════════════════════════════════════════════════════════════════
# TOOL RESTRICTIONS
# ═══════════════════════════════════════════════════════════════════

allowed-tools: Read, Grep, Glob
# WHY: Whitelist - ONLY these tools available during skill execution
# SECURITY: Principle of least privilege
# OMIT IF: Skill needs all tools (inherits from conversation)
# COMMON PATTERNS:
#   - Read-only skill: Read, Grep, Glob
#   - Builder skill: Read, Write, Edit, Bash, Glob, Grep
#   - Research skill: Read, Grep, Glob, WebSearch, WebFetch

# ═══════════════════════════════════════════════════════════════════
# EXECUTION CONTEXT
# ═══════════════════════════════════════════════════════════════════

context: fork
# WHY: Isolates skill execution from main conversation
# - fork: Runs in SEPARATE context, results summarized back
# - (omit): Runs in MAIN context, all content visible
# USE fork WHEN: Research, exploration, anything that produces lots of output
# USE main WHEN: Reference skills that should influence ongoing work

agent: Explore
# WHY: Delegates to a specific subagent for execution
# OPTIONS: Explore (read-only), Plan (research), custom-agent-name
# OMIT IF: Execute in current context without delegation

model: sonnet
# WHY: Override model for this skill
# OPTIONS: sonnet (balanced), opus (complex), haiku (fast/cheap), inherit
# USE haiku: High-frequency simple skills
# USE opus: Complex analysis requiring deep reasoning
# OMIT/inherit: Use same model as conversation
---

# {Skill Name}

## Purpose

{Brief explanation of what this skill provides - 1-2 sentences}

## When to Use

Use this skill when:
- {Trigger condition 1}
- {Trigger condition 2}
- {Trigger condition 3}

## Rules / Patterns

### {Pattern 1 Name}

{Description of the pattern}

```{language}
{Code example demonstrating the pattern}
```

**Why this way?** {Explanation of why this pattern is recommended}

### {Pattern 2 Name}

{Description}

## Checklist

Before completing, verify:
- [ ] {Verification item 1}
- [ ] {Verification item 2}
- [ ] {Verification item 3}

## Examples

### Example: {Use Case Name}

**Input**: {What user provides}

**Process**: {What skill does}

**Output**: {Expected result}

## References

- [{Reference 1}](url) - {What it provides}
- [{Reference 2}](url) - {What it provides}
```

## Skill Types Decision Tree

```
Is it knowledge/patterns that influence work?
├─ YES → Type A: Reference Skill
│        - No context:fork (apply in main)
│        - No disable-model-invocation (auto-activate OK)
│        - No allowed-tools (no actions)
│
Is it a user-triggered workflow?
├─ YES → Type B: Workflow Skill
│        - disable-model-invocation: true
│        - allowed-tools: specific to workflow
│        - Uses $ARGUMENTS
│
Is it exploration/research that produces lots of output?
└─ YES → Type C: Research Skill
         - context: fork (isolate)
         - agent: Explore
         - Read-only tools
```

## Directory Structure

```
.claude/skills/
├── {category}/              # Group by purpose
│   └── {skill-name}/
│       ├── SKILL.md         # Required: main skill file
│       ├── reference.md     # Optional: detailed documentation
│       ├── examples.md      # Optional: extended examples
│       └── scripts/         # Optional: helper scripts
│           └── validate.sh

Categories:
- builder/     → For builder agents (typescript-patterns, security-coding)
- reviewer/    → For reviewer agents (code-quality, security-review)
- workflow/    → User workflows (deploy, release, commit)
- research/    → Investigation skills (deep-research, codebase-explore)
- shared/      → Cross-purpose (anti-hallucination, logging-strategy)
- meta/        → THIS category - skills for creating other components
```

## Common Mistakes to Avoid

| Mistake | Why it's wrong | Correct approach |
|---------|----------------|------------------|
| Vague description | Claude can't match semantically | Be specific with triggers |
| context:fork for reference | Content won't influence main work | Omit for reference skills |
| No allowed-tools for workflow | Workflow might do dangerous things | Always whitelist |
| Huge skill file | Consumes context unnecessarily | Split into reference.md |
```

### 4.4 Meta-Skill: agent-creator-patterns

```yaml
---
name: agent-creator-patterns
description: |
  Knowledge patterns for creating Claude Code subagents.
  Contains templates, permission modes, and security patterns.
  Use when meta-creator needs to generate an agent.

disable-model-invocation: true
---

# Agent Creator Patterns

## What is a Subagent?

A subagent is an **autonomous specialist** that Claude delegates tasks to.
Each subagent has its own context window, tools, and permissions.
Stored in `.claude/agents/{category}/{name}.md` or `.claude/agents/{name}.md`.

## Template with Explanations

```yaml
---
# ═══════════════════════════════════════════════════════════════════
# IDENTITY SECTION
# ═══════════════════════════════════════════════════════════════════

name: {agent-name}
# WHY: Unique identifier for delegation and Task tool calls
# FORMAT: lowercase-kebab-case
# EXAMPLE: code-reviewer, implementer, test-runner

description: |
  {Description explaining:
   - What this agent specializes in
   - When Claude should delegate to it
   - Expected inputs and outputs}
# WHY: Claude uses this to decide WHEN to delegate. Be explicit.
# INCLUDE: Trigger phrases, input expectations, output format
# BEST PRACTICE: Add <example> blocks showing delegation scenarios

# ═══════════════════════════════════════════════════════════════════
# TOOLS SECTION
# ═══════════════════════════════════════════════════════════════════

tools: Read, Grep, Glob
# WHY: WHITELIST of tools this agent can use
# SECURITY: Principle of least privilege - only what's needed
# PATTERNS:
#   - Read-only (reviewers): Read, Grep, Glob
#   - Builders: Read, Write, Edit, Bash, Glob, Grep
#   - Executors: Bash, Read
#   - Researchers: Read, Grep, Glob, WebSearch, WebFetch
# NOTE: Omitting = inherits ALL tools (including MCP) - usually too permissive

disallowedTools: Write, Edit
# WHY: BLACKLIST - alternative to whitelist
# USE WHEN: "All tools EXCEPT these"
# PREFER tools: (whitelist) for security

# ═══════════════════════════════════════════════════════════════════
# MODEL SELECTION
# ═══════════════════════════════════════════════════════════════════

model: sonnet
# WHY: Control cost/capability tradeoff
# OPTIONS:
#   - haiku: 3x cheaper, 2x faster. Good for simple tasks.
#   - sonnet: Balanced. Default choice.
#   - opus: Most capable. Complex reasoning.
#   - inherit: Match main conversation model.
# DECISION FACTORS:
#   - High frequency + simple task → haiku
#   - Complex analysis → opus
#   - Need consistency → inherit

color: blue
# WHY: Visual identification in UI
# OPTIONS: blue, green, yellow, red, purple, orange
# CONVENTION:
#   - blue: general
#   - green: success/build
#   - yellow: warning/review
#   - red: dangerous/security

# ═══════════════════════════════════════════════════════════════════
# PERMISSIONS SECTION
# ═══════════════════════════════════════════════════════════════════

permissionMode: default
# WHY: Controls permission prompts during agent execution
# OPTIONS:
#
# | Mode              | Behavior                        | Use Case           |
# |-------------------|--------------------------------|---------------------|
# | default           | Normal permission prompts      | General purpose     |
# | acceptEdits       | Auto-accept file edits         | Trusted builders    |
# | dontAsk           | Auto-deny permission prompts   | Read-only analysis  |
# | bypassPermissions | Skip ALL checks (⚠️ DANGEROUS) | Full automation     |
# | plan              | Read-only exploration          | Planning, research  |
#
# SECURITY WARNING: bypassPermissions can do ANYTHING without asking

# ═══════════════════════════════════════════════════════════════════
# SKILLS PRELOADING
# ═══════════════════════════════════════════════════════════════════

skills:
  - typescript-patterns
  - security-review
# WHY: Pre-load skills into agent's context
# EFFECT: Full skill content loaded (not just description)
# USE FOR: Domain knowledge the agent needs
# NOTE: Agents do NOT inherit skills from main conversation

# ═══════════════════════════════════════════════════════════════════
# LIFECYCLE HOOKS
# ═══════════════════════════════════════════════════════════════════

hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate-command.sh"
          timeout: 30
  PostToolUse:
    - matcher: "Edit|Write"
      hooks:
        - type: command
          command: "./scripts/run-linter.sh"
  Stop:
    - hooks:
        - type: prompt
          prompt: "Verify all tasks completed"
          timeout: 30
# WHY: Add deterministic control to agent execution
# PreToolUse: Validate/modify/block before tool runs
# PostToolUse: React after tool completes (lint, log)
# Stop: Validate before agent finishes
# SEE: hook-creator-patterns for detailed hook design
---

# {Agent Name}

You are a specialized AI assistant focused on {domain}.

## Primary Responsibilities

- {Responsibility 1}
- {Responsibility 2}
- {Responsibility 3}

## Workflow

When invoked:

1. {Step 1 - usually understand the task}
2. {Step 2 - gather context}
3. {Step 3 - execute main work}
4. {Step 4 - verify results}

## Output Format

{Describe expected output structure}

```
{Template of output format}
```

## Constraints

- {Constraint 1 - what NOT to do}
- {Constraint 2 - boundaries}

## Examples

### Example: {Use Case}

**Trigger**: {What user says}

**Process**: {What agent does}

**Output**: {Expected result}
```

## Agent Types Decision Tree

```
Does it ONLY analyze without modifying?
├─ YES → Type A: Read-Only Agent (Reviewer)
│        - tools: Read, Grep, Glob
│        - permissionMode: plan
│        - Example: code-reviewer, auditor
│
Does it CREATE or MODIFY code?
├─ YES → Type B: Builder Agent
│        - tools: Read, Write, Edit, Bash, Glob, Grep
│        - permissionMode: acceptEdits (if trusted)
│        - Example: implementer, refactorer
│
Does it EXECUTE commands?
├─ YES → Type C: Executor Agent
│        - tools: Bash, Read
│        - permissionMode: default (ask for dangerous)
│        - hooks: PreToolUse to validate commands
│        - Example: test-runner, deployer
│
Does it RESEARCH with web access?
└─ YES → Type D: Research Agent
         - tools: Read, Grep, Glob, WebSearch, WebFetch
         - permissionMode: plan
         - Example: deep-researcher, documenter
```

## Directory Structure

```
.claude/agents/
├── readers/           # Analysis only
│   ├── code-reviewer.md
│   └── security-auditor.md
├── builders/          # Create/modify
│   ├── implementer.md
│   └── refactorer.md
├── executors/         # Run commands
│   ├── test-runner.md
│   └── deployer.md
├── researchers/       # Investigate
│   └── deep-researcher.md
└── meta/              # Meta agents
    └── meta-creator.md
```

## Common Mistakes to Avoid

| Mistake | Why it's wrong | Correct approach |
|---------|----------------|------------------|
| No tools whitelist | Agent can do anything | Always specify tools |
| bypassPermissions for untrusted | Security risk | Use default or acceptEdits |
| Vague description | Claude won't delegate properly | Include trigger examples |
| No permissionMode | Defaults may not match intent | Always explicit |
```

### 4.5 Meta-Skill: hook-creator-patterns

```yaml
---
name: hook-creator-patterns
description: |
  Knowledge patterns for creating Claude Code hooks.
  Contains templates for validators, automators, and security hooks.
  Use when meta-creator needs to generate a hook.

disable-model-invocation: true
---

# Hook Creator Patterns

## What is a Hook?

A hook is a **deterministic control point** that runs at specific moments in Claude's execution.
Hooks are shell scripts that receive JSON input and control behavior via exit codes.
Configured in `.claude/settings.json`, scripts in `.claude/hooks/`.

## Configuration Template with Explanations

```json
// .claude/settings.json
{
  "hooks": {
    "{EventName}": [
      {
        "matcher": "{ToolPattern}",
        // WHY matcher: Regex pattern to match tool names
        // REQUIRED FOR: PreToolUse, PostToolUse, PermissionRequest
        // EXAMPLES:
        //   "Bash"           → Only Bash commands
        //   "Write|Edit"     → File modifications
        //   "mcp__.*"        → All MCP tools
        //   ".*"             → All tools
        // OMIT FOR: Non-tool events (Stop, SessionStart, etc.)

        "hooks": [
          {
            "type": "command",
            // WHY type: Execution type
            // OPTIONS:
            //   "command" → Run shell script
            //   "prompt"  → LLM evaluation (only Stop/SubagentStop)

            "command": "./hooks/{script}.py",
            // WHY command: Path to hook script
            // RECEIVES: JSON via stdin
            // RETURNS: JSON via stdout (optional)
            // EXIT CODES:
            //   0 = Allow (parse stdout)
            //   2 = Block (use stderr as error)
            //   other = Error (non-blocking, log stderr)

            "timeout": 60
            // WHY timeout: Seconds before cancellation
            // DEFAULT: 60
            // RECOMMENDATION:
            //   - Validators: 5-30s
            //   - Automators: 30-120s
            //   - Loggers: 5-10s
          }
        ]
      }
    ]
  }
}
```

## Event Types Reference

### Tool-Related Events (Support Matchers)

| Event | Trigger | Input | Use Case |
|-------|---------|-------|----------|
| `PreToolUse` | Before tool execution | tool_name, tool_input | Validate, modify, block |
| `PostToolUse` | After tool completes | tool_name, tool_input, tool_result | React, log, lint |
| `PermissionRequest` | Permission dialog shown | tool_name, permission_type | Auto-approve/deny |

### Non-Tool Events (No Matchers)

| Event | Trigger | Special Fields | Use Case |
|-------|---------|----------------|----------|
| `UserPromptSubmit` | Before Claude processes | prompt | Validate input, add context |
| `Stop` | Main agent finishes | stop_reason | Control termination |
| `SubagentStop` | Subagent finishes | agent_name, result | Validate subagent work |
| `Notification` | Alert sent | notification_type | Handle notifications |
| `SessionStart` | Session begins | - | Setup environment |
| `SessionEnd` | Session ends | - | Cleanup |
| `PreCompact` | Before context compaction | compact_type | matchers: "manual", "auto" |
| `Setup` | Repo initialization | setup_type | matchers: "init", "maintenance" |

## JSON Input Format

```json
{
  "session_id": "abc123",
  "transcript_path": "/path/to/transcript.jsonl",
  "cwd": "/current/working/directory",
  "permission_mode": "default",
  "hook_event_name": "PreToolUse",

  // Tool events only:
  "tool_name": "Bash",
  "tool_input": {
    "command": "rm -rf /",
    "description": "Delete everything",
    "timeout": 300000
  },
  "tool_use_id": "toolu_01ABC..."
}
```

## JSON Output Format

```json
{
  "continue": true,
  // WHY: Whether to continue execution

  "stopReason": "optional reason",
  // WHY: Reason for stopping (if continue=false)

  "suppressOutput": false,
  // WHY: Hide tool output from Claude

  "systemMessage": "optional message for Claude",
  // WHY: Add context/instructions for Claude

  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",

    "permissionDecision": "allow",
    // OPTIONS: "allow", "deny", "ask"

    "permissionDecisionReason": "explanation",

    "updatedInput": {
      "field": "modified_value"
    },
    // WHY: Modify tool input before execution

    "additionalContext": "context for Claude"
  }
}
```

## Hook Script Templates

### Template A: Validator (Python)

```python
#!/usr/bin/env python3
"""
Hook: {name}
Event: PreToolUse
Matcher: {pattern}
Purpose: {description}

Exit Codes:
  0 = Allow operation
  2 = Block operation
  other = Error (non-blocking)
"""

import json
import sys
import re

# Dangerous patterns to block
BLOCK_PATTERNS = [
    r"rm\s+-rf\s+/",           # Delete root
    r"git\s+reset\s+--hard",    # Lose changes
    r"git\s+push.*--force",     # Force push
    r"chmod\s+777",             # Insecure permissions
]

# Patterns requiring confirmation
ASK_PATTERNS = [
    r"npm\s+publish",           # Publishing
    r"docker\s+push",           # Container push
]

def main():
    # Read input from stdin
    input_data = json.load(sys.stdin)

    tool_name = input_data.get("tool_name")
    tool_input = input_data.get("tool_input", {})

    # Get command for Bash tool
    if tool_name == "Bash":
        command = tool_input.get("command", "")

        # Check for blocking patterns
        for pattern in BLOCK_PATTERNS:
            if re.search(pattern, command, re.IGNORECASE):
                print(f"BLOCKED: Command matches dangerous pattern: {pattern}",
                      file=sys.stderr)
                sys.exit(2)  # Exit 2 = Block

        # Check for ask patterns
        for pattern in ASK_PATTERNS:
            if re.search(pattern, command, re.IGNORECASE):
                output = {
                    "hookSpecificOutput": {
                        "hookEventName": "PreToolUse",
                        "permissionDecision": "ask",
                        "permissionDecisionReason": f"Command may have side effects: {pattern}"
                    }
                }
                print(json.dumps(output))
                sys.exit(0)

    # Allow by default
    sys.exit(0)

if __name__ == "__main__":
    main()
```

### Template B: Automator (Bash)

```bash
#!/bin/bash
#
# Hook: {name}
# Event: PostToolUse
# Matcher: {pattern}
# Purpose: {description}
#
# This hook runs AFTER tool completion.
# Exit code doesn't block (already done).

# Read JSON input
INPUT=$(cat)

# Parse tool info
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Run linter on modified files
if [[ "$TOOL_NAME" == "Edit" || "$TOOL_NAME" == "Write" ]]; then
    if [[ -n "$FILE_PATH" && -f "$FILE_PATH" ]]; then
        # TypeScript/JavaScript
        if [[ "$FILE_PATH" =~ \.(ts|tsx|js|jsx)$ ]]; then
            eslint --fix "$FILE_PATH" 2>/dev/null || true
        fi

        # Python
        if [[ "$FILE_PATH" =~ \.py$ ]]; then
            black "$FILE_PATH" 2>/dev/null || true
        fi
    fi
fi

exit 0
```

### Template C: Logger (Python)

```python
#!/usr/bin/env python3
"""
Hook: tool-logger
Event: PostToolUse
Matcher: .*
Purpose: Log all tool executions for audit
"""

import json
import sys
from datetime import datetime
from pathlib import Path

LOG_FILE = Path(".claude/logs/tool-usage.jsonl")

def main():
    input_data = json.load(sys.stdin)

    # Create log entry
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "session_id": input_data.get("session_id"),
        "tool_name": input_data.get("tool_name"),
        "tool_input": input_data.get("tool_input"),
        "event": input_data.get("hook_event_name")
    }

    # Append to log file
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with LOG_FILE.open("a") as f:
        f.write(json.dumps(log_entry) + "\n")

    # Always allow
    sys.exit(0)

if __name__ == "__main__":
    main()
```

### Template D: Stop Hook (Prompt-based)

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Before stopping, verify:\n1. All requested tasks are complete\n2. No errors were introduced\n3. Tests pass (if applicable)\n\nRespond with JSON: {\"ok\": true, \"reason\": \"explanation\"} or {\"ok\": false, \"reason\": \"what's missing\"}",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

## Hook Types Decision Tree

```
Does it VALIDATE/BLOCK before tool execution?
├─ YES → Type A: Validator Hook
│        - Event: PreToolUse
│        - Exit 2 to block
│        - Example: bash-validator, path-protector
│
Does it REACT after tool execution?
├─ YES → Type B: Automator Hook
│        - Event: PostToolUse
│        - Run linters, formatters, etc.
│        - Example: post-edit-linter, git-auto-stage
│
Does it LOG for audit?
├─ YES → Type C: Logger Hook
│        - Event: PreToolUse or PostToolUse
│        - Write to log file
│        - Example: tool-logger, security-audit
│
Does it CONTROL when Claude stops?
└─ YES → Type D: Stop Hook
         - Event: Stop or SubagentStop
         - type: prompt for LLM evaluation
         - Example: completion-validator
```

## Directory Structure

```
.claude/
├── settings.json         # Hook configuration
├── settings.local.json   # Personal overrides (gitignored)
└── hooks/
    ├── validators/       # PreToolUse hooks
    │   ├── bash-validator.py
    │   └── file-validator.py
    ├── automators/       # PostToolUse hooks
    │   ├── post-edit-linter.sh
    │   └── git-auto-stage.sh
    ├── loggers/          # Audit logging
    │   └── tool-logger.py
    └── security/         # Security-focused
        └── damage-control/
            ├── patterns.yaml
            └── bash-damage-control.py
```

## Common Mistakes to Avoid

| Mistake | Why it's wrong | Correct approach |
|---------|----------------|------------------|
| Exit 1 for blocking | Exit 1 is error, not block | Use exit 2 to block |
| No timeout | Hook could hang forever | Always set timeout |
| Print to stdout without JSON | Breaks parsing | Only JSON to stdout |
| PostToolUse trying to block | Tool already ran | Use PreToolUse for blocking |
```

### 4.6 Meta-Skill: command-creator-patterns

```yaml
---
name: command-creator-patterns
description: |
  Knowledge patterns for creating Claude Code commands.
  Contains templates and $ARGUMENTS usage patterns.
  Use when meta-creator needs to generate a command.

disable-model-invocation: true
---

# Command Creator Patterns

## What is a Command?

A command is a **slash-invoked workflow** stored as markdown.
Commands are simpler than skills - they're basically skills with `disable-model-invocation: true`.
Stored in `.claude/commands/{name}.md` or `.claude/commands/{category}/{name}.md`.

## Relationship to Skills

| Aspect | Command | Skill |
|--------|---------|-------|
| Invocation | Only `/command-name` | Auto or `/skill-name` |
| Location | `.claude/commands/` | `.claude/skills/` |
| Format | Same YAML frontmatter | Same |
| Features | Same | Same |
| Use case | User-triggered workflows | Knowledge + workflows |

**In practice**: Commands are just skills with `disable-model-invocation: true`.
The separate location is organizational convention, not technical requirement.

## Template with Explanations

```yaml
---
name: {command-name}
# WHY: Used for /command-name invocation
# FORMAT: lowercase-kebab-case
# CONVENTION: Verb-first (run-tests, deploy-prod, create-pr)

description: |
  {What this command does}
# WHY: Shown in /help and autocomplete
# NOTE: Since disable-model-invocation=true, description is just for humans

disable-model-invocation: true
# WHY: Commands are ALWAYS user-triggered, never auto-activated
# THIS IS THE DEFINING CHARACTERISTIC of a command vs skill

user-invocable: true
# WHY: Commands should always be user-invocable
# (Would be weird to have a command that users can't invoke)

argument-hint: [{arg1}] [--flag]
# WHY: Shows in autocomplete what arguments are expected
# EXAMPLES:
#   [environment] [--dry-run]
#   [file-path]
#   [branch-name] [--force]

allowed-tools: Bash, Read, Write, Edit
# WHY: Limit what the command can do
# COMMON PATTERNS:
#   - Test command: Bash, Read
#   - Deploy command: Bash, Read
#   - Refactor command: Read, Write, Edit, Bash
#   - Research command: Read, Grep, Glob, WebSearch
---

# {Command Name}

{Brief description of what this command does}

## Arguments

This command accepts: $ARGUMENTS

Expected format: `{format description}`

Examples:
- `/command-name arg1` - {what this does}
- `/command-name arg1 --flag` - {what this does}

## Steps

1. {Step 1}
2. {Step 2}
3. {Step 3}

## Example Usage

```
/command-name production --dry-run
```

## Notes

- {Important note 1}
- {Important note 2}
```

## $ARGUMENTS Variable

```markdown
# In your command:
Deploy $ARGUMENTS to production.

# User invokes:
/deploy staging --skip-tests

# Claude sees:
Deploy staging --skip-tests to production.
```

**Parsing $ARGUMENTS**:

```markdown
## Arguments Parsing

Parse $ARGUMENTS as follows:
- First word: environment (staging|production)
- --dry-run: If present, only show what would happen
- --skip-tests: If present, don't run tests

If no arguments provided, ask user for environment.
```

## Command Types

### Type A: Execution Command

Runs a specific workflow with Bash.

```yaml
---
name: run-tests
description: Run test suite with coverage
disable-model-invocation: true
argument-hint: [filter] [--watch]
allowed-tools: Bash, Read
---

# Run Tests

Run test suite for $ARGUMENTS (or all tests if no filter).

## Steps

1. Parse arguments:
   - filter: Test file/pattern to run
   - --watch: Enable watch mode

2. Execute tests:
   ```bash
   bun test $filter $watch_flag
   ```

3. Report results with pass/fail counts
```

### Type B: Generation Command

Creates files or content.

```yaml
---
name: create-component
description: Create a new React component
disable-model-invocation: true
argument-hint: [ComponentName] [--with-tests]
allowed-tools: Read, Write, Glob
---

# Create Component

Create React component named $ARGUMENTS.

## Steps

1. Parse ComponentName from $ARGUMENTS
2. Check if component exists (Glob)
3. Generate component file
4. If --with-tests, generate test file
5. Report created files
```

### Type C: Information Command

Gathers and displays information.

```yaml
---
name: status
description: Show project status
disable-model-invocation: true
allowed-tools: Bash, Read, Grep, Glob
---

# Project Status

Show comprehensive project status.

## Gather

1. Git status
2. Test status (last run)
3. Build status
4. TODO items count
5. Open issues (if GitHub)

## Display

Format as table:
| Area | Status | Details |
|------|--------|---------|
| Git | ... | ... |
```

## Directory Structure

```
.claude/commands/
├── dev/
│   ├── run-tests.md
│   ├── start-server.md
│   └── build.md
├── git/
│   ├── create-pr.md
│   ├── commit.md
│   └── sync.md
├── deploy/
│   ├── staging.md
│   └── production.md
└── project/
    ├── status.md
    └── setup.md
```

## Common Mistakes to Avoid

| Mistake | Why it's wrong | Correct approach |
|---------|----------------|------------------|
| No disable-model-invocation | It's not a command then | Always set true for commands |
| Complex argument parsing | Hard to maintain | Keep arguments simple |
| No argument-hint | Users don't know what to pass | Always provide hint |
| Dangerous without allowed-tools | Command could do anything | Whitelist tools |
```

### 4.7 Meta-Skill: mcp-creator-patterns

```yaml
---
name: mcp-creator-patterns
description: |
  Knowledge patterns for configuring MCP servers in Claude Code.
  Contains configuration templates and integration patterns.
  Use when meta-creator needs to set up MCP servers.

disable-model-invocation: true
---

# MCP Creator Patterns

## What is MCP?

MCP (Model Context Protocol) is a **standardized way to connect Claude Code with external tools**.
Think of it as "USB-C for AI" - one protocol, many integrations.
Configured in `.claude/mcp.json` (project) or `~/.config/claude/mcp.json` (global).

## Configuration Template with Explanations

```json
// .claude/mcp.json or ~/.config/claude/mcp.json
{
  "mcpServers": {
    "{server-name}": {
      // WHY server-name: Unique identifier
      // CONVENTION: lowercase-kebab-case
      // APPEARS AS: mcp__{server-name}__{tool-name} in Claude

      "command": "node",
      // WHY command: Executable to run
      // COMMON: "node", "python", "npx", "bunx"
      // FOR NPM PACKAGES: Use the package binary name directly

      "args": ["path/to/server.js"],
      // WHY args: Arguments to the command
      // FOR NPM: ["@modelcontextprotocol/server-github"]

      "env": {
        "API_KEY": "$API_KEY"
        // WHY env: Environment variables for the server
        // USE $VAR: References system env var (recommended)
        // USE "literal": Hardcoded (avoid for secrets)
      },

      "transport": "stdio"
      // WHY transport: Communication method
      // OPTIONS:
      //   "stdio" (default): For local processes
      //   "http": For REST APIs
      //   "sse": For Server-Sent Events
    },

    // Remote server example
    "{remote-server}": {
      "url": "https://api.example.com/mcp",
      // WHY url: Endpoint for HTTP/SSE transport

      "transport": "http",

      "headers": {
        "Authorization": "Bearer $TOKEN"
        // WHY headers: Auth headers for remote
      }
    }
  }
}
```

## Official MCP Servers

Pre-built servers you can use immediately:

| Server | Package | Purpose | Required Env |
|--------|---------|---------|--------------|
| GitHub | `@modelcontextprotocol/server-github` | Issues, PRs, repos | `GITHUB_TOKEN` |
| Filesystem | `@modelcontextprotocol/server-filesystem` | File operations | - |
| PostgreSQL | `@modelcontextprotocol/server-postgres` | Database queries | `DATABASE_URL` |
| Slack | `@modelcontextprotocol/server-slack` | Messages, channels | `SLACK_TOKEN` |
| Memory | `@modelcontextprotocol/server-memory` | Persistent memory | - |
| Puppeteer | `@modelcontextprotocol/server-puppeteer` | Browser automation | - |
| Brave Search | `@modelcontextprotocol/server-brave-search` | Web search | `BRAVE_API_KEY` |

### Installation Pattern

```bash
# 1. Install globally
npm install -g @modelcontextprotocol/server-github

# 2. Configure in mcp.json
{
  "mcpServers": {
    "github": {
      "command": "mcp-server-github",
      "env": {
        "GITHUB_TOKEN": "$GITHUB_TOKEN"
      }
    }
  }
}

# 3. Set environment variable
export GITHUB_TOKEN="ghp_xxx..."
```

## Configuration Patterns

### Pattern A: NPM Package Server

```json
{
  "mcpServers": {
    "github": {
      "command": "mcp-server-github",
      "args": [],
      "env": {
        "GITHUB_TOKEN": "$GITHUB_TOKEN"
      }
    }
  }
}
```

### Pattern B: Local Script Server

```json
{
  "mcpServers": {
    "custom": {
      "command": "node",
      "args": [".claude/servers/custom/index.js"],
      "env": {
        "DEBUG": "true"
      }
    }
  }
}
```

### Pattern C: Python Server

```json
{
  "mcpServers": {
    "python-tool": {
      "command": "python",
      "args": [".claude/servers/python-tool/server.py"],
      "env": {
        "PYTHONPATH": "."
      }
    }
  }
}
```

### Pattern D: Remote HTTP Server

```json
{
  "mcpServers": {
    "remote-api": {
      "url": "https://api.example.com/mcp",
      "transport": "http",
      "headers": {
        "Authorization": "Bearer $API_TOKEN",
        "X-Project-ID": "my-project"
      }
    }
  }
}
```

## MCP Server Capabilities

Each server can provide:

| Capability | Description | Claude Access |
|------------|-------------|---------------|
| **Tools** | Functions Claude can call | `mcp__{server}__{tool}` |
| **Resources** | Data to reference | `@server:resource` |
| **Prompts** | Slash commands | `/server:prompt` |

## Custom Server Template (TypeScript)

```typescript
// .claude/servers/{name}/index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server(
  {
    name: "{server-name}",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

// Define tools
server.setRequestHandler("tools/list", async () => ({
  tools: [
    {
      name: "my_tool",
      description: "Does something useful",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" }
        },
        required: ["query"]
      }
    }
  ]
}));

server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "my_tool") {
    const result = await doSomething(args.query);
    return { content: [{ type: "text", text: result }] };
  }

  throw new Error(`Unknown tool: ${name}`);
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

## Configuration Locations

| Scope | Path | Use Case |
|-------|------|----------|
| Global | `~/.config/claude/mcp.json` | Personal tools (GitHub, etc.) |
| Project | `.claude/mcp.json` | Project-specific integrations |
| Both | Merged | Project inherits global |

## Tool Search (Context Optimization)

When you have many MCP tools:

```json
{
  "settings": {
    "mcp": {
      "toolSearchEnabled": true,
      "toolSearchThreshold": 0.10,
      "maxToolsInContext": 50
    }
  }
}
```

**How it works**:
1. Only tool descriptions loaded initially
2. Claude decides which tool it needs
3. Full tool definition loaded on-demand
4. Reduces context usage

**Requirement**: Sonnet 4+ or Opus 4+ (Haiku doesn't support tool_reference)

## Common Mistakes to Avoid

| Mistake | Why it's wrong | Correct approach |
|---------|----------------|------------------|
| Hardcoded secrets | Security risk, not portable | Use `$ENV_VAR` |
| Missing transport | Defaults may not work | Always specify |
| Wrong command for npm | Package might need different binary | Check package docs |
| No timeout handling | Server could hang | Implement timeouts |
```

---

## 5. FAQ

**Q: ¿Por qué un agente en lugar de comandos separados?**
A: Los subagents no pueden spawner otros subagents (limitación de Claude Code). Un agente con múltiples skills precargadas sí puede usar todo el conocimiento junto.

**Q: ¿Por qué skills en lugar de un mega-documento?**
A: Separar en skills permite:
1. Carga selectiva según el tipo de componente
2. Mantenimiento independiente
3. Reuso en otros contextos

**Q: ¿Por qué documentar el "por qué" inline?**
A: Reduce alucinaciones al generar. El agente ve la explicación junto al campo, no tiene que "recordar" de otra fuente.

**Q: ¿Cómo se diferencia de los SPEC-020 a 023?**
A: Los specs originales son la **referencia técnica completa**. Este sistema es la **herramienta práctica** que usa ese conocimiento para generar componentes.

---

## 6. Acceptance Criteria (BDD)

```gherkin
Feature: Meta-Creator System

Scenario: Create new skill via meta-creator
  Given meta-creator agent is available
  When user says "crea una skill para validar TypeScript"
  Then agent uses skill-creator-patterns
  And asks clarifying questions (type, triggers, tools)
  And generates SKILL.md with all fields documented
  And explains why each field is configured that way

Scenario: Create new agent via meta-creator
  Given meta-creator agent is available
  When user says "necesito un agente para revisar PRs"
  Then agent uses agent-creator-patterns
  And asks about tools, permissions, model
  And generates agent.md with security considerations
  And explains permission mode choice

Scenario: Create new hook via meta-creator
  Given meta-creator agent is available
  When user says "quiero un hook que bloquee rm -rf"
  Then agent uses hook-creator-patterns
  And generates validator hook script
  And updates settings.json
  And explains exit codes and JSON format

Scenario: List existing components
  Given meta-creator agent is available
  When user says "lista todas las skills"
  Then agent uses Glob to find SKILL.md files
  And presents table with Name, Type, Description, Location

Scenario: Modify existing component
  Given meta-creator agent is available
  And skill "typescript-patterns" exists
  When user says "modifica typescript-patterns para incluir async patterns"
  Then agent reads existing skill
  And preserves current configuration
  And adds new content following patterns
  And explains changes made

Scenario: Documentation of "why" included
  Given meta-creator generates any component
  Then every significant field has inline comment
  And comments explain WHY not just WHAT
  And references to documentation included
```

---

## 7. Open Questions

- [ ] ¿Debería el meta-creator validar componentes existentes?
- [ ] ¿Integración con SPEC-022 hooks para validación automática?
- [ ] ¿Template para plugins (combinación de agent + skills + hooks)?

---

## 8. Sources

- [Claude Code Subagents Docs](https://code.claude.com/docs/en/sub-agents) - Official reference
- [Claude Code Skills Docs](https://code.claude.com/docs/en/skills) - Official reference
- [Claude Code Hooks Docs](https://code.claude.com/docs/en/hooks) - Official reference
- [MCP Protocol](https://modelcontextprotocol.io) - Protocol specification
- [Meta-Agent Architectures 2025](https://www.marktechpost.com/2025/11/15/comparing-the-top-5-ai-agent-architectures-in-2025-hierarchical-swarm-meta-learning-modular-evolutionary/) - Architecture patterns
- [aiXplain Evolver](https://aixplain.com/blog/evolver-meta-agent-self-improving-ai/) - Meta-agent concepts
- [PubNub Best Practices](https://www.pubnub.com/blog/best-practices-for-claude-code-sub-agents/) - Subagent patterns

---

## 9. Next Steps

- [ ] Crear estructura de directorios para meta-creator
- [ ] Implementar meta-creator.md agent
- [ ] Implementar las 5 meta-skills
- [ ] Probar creación de cada tipo de componente
- [ ] Documentar en el INDEX.md del proyecto
- [ ] Considerar si SPEC-020 a 023 deben marcarse como "superseded by" o "complemented by"

---

## 10. Implementation Files

Al implementar, crear:

```
.claude/
├── agents/
│   └── meta/
│       └── meta-creator.md
│
└── skills/
    └── meta/
        ├── skill-creator-patterns/
        │   └── SKILL.md
        ├── agent-creator-patterns/
        │   └── SKILL.md
        ├── hook-creator-patterns/
        │   └── SKILL.md
        ├── command-creator-patterns/
        │   └── SKILL.md
        └── mcp-creator-patterns/
            └── SKILL.md
```
