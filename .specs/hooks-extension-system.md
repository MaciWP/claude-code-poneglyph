# SPEC-022: Hooks Extension System

> **Status**: approved | **Version**: 1.0 | **Updated**: 2026-01-21

## 0. Research Summary

### Fuentes Consultadas

| Tipo | Fuente | Link | Relevancia |
|------|--------|------|------------|
| Docs oficial | Claude Code Hooks | [code.claude.com](https://code.claude.com/docs/en/hooks) | Alta |
| Tutorial | eesel.ai Guide | [Blog](https://www.eesel.ai/blog/hooks-in-claude-code) | Alta |
| Examples | claude-code-hooks-mastery | [GitHub](https://github.com/disler/claude-code-hooks-mastery) | Alta |
| Showcase | claude-code-showcase | [GitHub](https://github.com/ChrisWiles/claude-code-showcase) | Alta |
| GitButler | Integration Guide | [Docs](https://docs.gitbutler.com/features/ai-integration/claude-code-hooks) | Media |

### Decisiones Informadas por Research

| Decisión | Basada en |
|----------|-----------|
| JSON I/O vía stdin/stdout | Docs oficiales - estándar de comunicación |
| Exit codes (0, 2, otros) | Docs oficiales - control de flujo |
| Matchers con regex | Docs oficiales - pattern matching |
| 10+ event types | Docs oficiales - lifecycle completo |
| `type: prompt` para LLM evaluation | Docs oficiales - Stop/SubagentStop events |

### Información No Encontrada

- Performance impact de múltiples hooks
- Best practices para hook testing
- Límites de timeout recomendados

### Confidence Assessment

| Área | Nivel | Razón |
|------|-------|-------|
| Event types | Alta | Documentación oficial completa |
| JSON format | Alta | Ejemplos extensos |
| Exit codes | Alta | Docs oficiales |
| Best practices | Media | Community patterns |

---

## 1. Vision

> **Press Release**: El Hooks Extension System proporciona un framework para crear validaciones, automatizaciones y controles de seguridad que se ejecutan en puntos específicos del ciclo de vida de Claude Code. Incluye plantillas, patrones de validación y ejemplos de seguridad probados.

**Background**: Claude Code hooks permiten control determinístico, pero sin estándares los hooks son inconsistentes y difíciles de mantener.

**Usuario objetivo**: Desarrolladores que crean automatizaciones y validaciones.

**Métricas de éxito**:
- 100% hooks con formato estandarizado
- JSON I/O validado en todos los hooks
- < 60s timeout en todos los hooks

---

## 2. Goals & Non-Goals

### Goals

- [ ] Documentar todos los eventos de hooks
- [ ] Definir plantillas por tipo de hook (validator, automator, logger)
- [ ] Crear `/create-hook` generator command
- [ ] Establecer patrones de seguridad (Damage Control)
- [ ] Documentar JSON I/O format
- [ ] Definir exit codes y comportamientos

### Non-Goals

- [ ] GUI para configurar hooks
- [ ] Hook marketplace/sharing
- [ ] Persistent hook state
- [ ] Cross-session hook communication

---

## 3. Alternatives Considered

| Alternativa | Pros | Cons | Fuente | Decisión |
|-------------|------|------|--------|----------|
| **Shell scripts + JSON** | Oficial, flexible | Requiere parsing | Docs | ✅ Elegida |
| MCP tools | Más integrado | No para validation | - | ⚠️ Complementario |
| Custom middleware | Más control | No soportado | - | ❌ |

---

## 4. Design

### 4.1 Hook Directory Structure

```
.claude/
├── settings.json                    # Hook configuration
├── settings.local.json              # Personal overrides (gitignored)
└── hooks/
    ├── validators/                  # Validation hooks
    │   ├── bash-validator.py
    │   ├── file-validator.py
    │   └── prompt-validator.py
    ├── automators/                  # Automation hooks
    │   ├── post-edit-linter.sh
    │   └── session-setup.sh
    ├── loggers/                     # Logging hooks
    │   └── tool-logger.py
    └── security/                    # Security hooks
        └── damage-control/
            ├── patterns.yaml
            ├── bash-tool-damage-control.py
            ├── edit-tool-damage-control.py
            └── write-tool-damage-control.py
```

### 4.2 Settings.json Configuration

```json
{
  "hooks": {
    "EventName": [
      {
        "matcher": "ToolPattern",
        "hooks": [
          {
            "type": "command",
            "command": "./hooks/script.py",
            "timeout": 60
          }
        ]
      }
    ]
  }
}
```

**Fields**:

| Field | Required | Description |
|-------|----------|-------------|
| `matcher` | For tool events | Regex pattern for tool names |
| `type` | Yes | `"command"` or `"prompt"` |
| `command` | For command type | Shell command to execute |
| `prompt` | For prompt type | LLM prompt for evaluation |
| `timeout` | No | Seconds before cancel (default: 60) |

### 4.3 Event Types Reference

#### Tool-Related Events (Support Matchers)

| Event | Trigger | Use Case |
|-------|---------|----------|
| `PreToolUse` | Before tool execution | Validate, modify, block |
| `PostToolUse` | After tool completes | React, log, lint |
| `PermissionRequest` | Permission dialog shown | Auto-approve/deny |

**Common Matchers**:
```
Bash                    # Shell commands
Write|Edit              # File modifications
Read                    # File reading
Task                    # Subagent tasks
Glob|Grep               # Search operations
WebFetch|WebSearch      # Web operations
mcp__*                  # MCP tools
```

#### Non-Tool Events (No Matchers)

| Event | Trigger | Use Case |
|-------|---------|----------|
| `UserPromptSubmit` | Before Claude processes prompt | Validate input, add context |
| `Stop` | Main agent finishes | Control termination |
| `SubagentStop` | Subagent finishes | Validate subagent work |
| `Notification` | Alert sent | Handle notifications |
| `SessionStart` | Session begins | Setup environment |
| `SessionEnd` | Session ends | Cleanup |
| `PreCompact` | Before context compaction | matchers: `manual`, `auto` |
| `Setup` | Repo initialization | matchers: `init`, `maintenance` |

### 4.4 JSON Input/Output Format

#### Input (via stdin)

```json
{
  "session_id": "abc123",
  "transcript_path": "/path/to/transcript.jsonl",
  "cwd": "/current/working/directory",
  "permission_mode": "default",
  "hook_event_name": "PreToolUse",
  "tool_name": "Bash",
  "tool_input": {
    "command": "rm -rf /",
    "description": "Delete everything",
    "timeout": 300000
  },
  "tool_use_id": "toolu_01ABC..."
}
```

#### Output (via stdout)

```json
{
  "continue": true,
  "stopReason": "optional reason",
  "suppressOutput": false,
  "systemMessage": "optional message for Claude",
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow|deny|ask",
    "permissionDecisionReason": "explanation",
    "updatedInput": { "field": "modified_value" },
    "additionalContext": "context for Claude"
  }
}
```

### 4.5 Exit Codes

| Code | Meaning | Behavior |
|------|---------|----------|
| `0` | Success | Allow operation, parse stdout JSON |
| `2` | Block | Block operation, use stderr as error |
| Other | Error | Non-blocking error, log stderr |

### 4.6 Hook Templates

#### Template A: Validator Hook (Python)

```python
#!/usr/bin/env python3
"""
Hook: {name}
Event: PreToolUse
Matcher: {pattern}
Purpose: {description}
"""

import json
import sys
import re

def main():
    # Read input from stdin
    input_data = json.load(sys.stdin)

    tool_name = input_data.get("tool_name")
    tool_input = input_data.get("tool_input", {})

    # Validation logic
    if should_block(tool_input):
        # Exit 2 = block operation
        print(f"Blocked: {reason}", file=sys.stderr)
        sys.exit(2)

    if should_modify(tool_input):
        # Return modified input
        output = {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "allow",
                "updatedInput": modified_input
            }
        }
        print(json.dumps(output))
        sys.exit(0)

    # Allow without modification
    sys.exit(0)

def should_block(tool_input):
    """Define blocking conditions"""
    command = tool_input.get("command", "")
    # Example: Block dangerous commands
    dangerous = [r"rm\s+-rf", r"git\s+reset\s+--hard"]
    return any(re.search(p, command) for p in dangerous)

def should_modify(tool_input):
    """Define modification conditions"""
    return False

if __name__ == "__main__":
    main()
```

#### Template B: Automator Hook (Bash)

```bash
#!/bin/bash
#
# Hook: {name}
# Event: PostToolUse
# Matcher: {pattern}
# Purpose: {description}

# Read input from stdin
INPUT=$(cat)

# Parse tool info
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Automation logic
if [[ "$TOOL_NAME" == "Edit" || "$TOOL_NAME" == "Write" ]]; then
    # Run linter on modified file
    if [[ -n "$FILE_PATH" && -f "$FILE_PATH" ]]; then
        eslint --fix "$FILE_PATH" 2>/dev/null || true
    fi
fi

# Always allow (post-tool hook)
exit 0
```

#### Template C: Stop Hook (Prompt-based)

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Before stopping, verify:\n1. All requested tasks are complete\n2. Tests pass\n3. No errors introduced\n\nRespond with JSON: {\"ok\": true/false, \"reason\": \"explanation\"}",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

#### Template D: Session Setup Hook

```bash
#!/bin/bash
#
# Hook: session-setup
# Event: SessionStart
# Purpose: Initialize environment for session

# Persist environment variables
if [[ -n "$CLAUDE_ENV_FILE" ]]; then
    echo 'export NODE_ENV=development' >> "$CLAUDE_ENV_FILE"
    echo 'export DEBUG=true' >> "$CLAUDE_ENV_FILE"
fi

# Setup project-specific config
if [[ -f ".env.local" ]]; then
    source .env.local
fi

exit 0
```

### 4.7 Security Pattern: Damage Control

Implementación de defensa en profundidad:

```yaml
# patterns.yaml
bashToolPatterns:
  # Dangerous commands - BLOCK
  - pattern: 'rm\s+-rf'
    action: block
    message: "Blocked: rm -rf is dangerous"

  - pattern: 'git\s+reset\s+--hard'
    action: block
    message: "Blocked: git reset --hard loses changes"

  # Risky commands - ASK
  - pattern: 'npm\s+publish'
    action: ask
    message: "Publishing to npm - are you sure?"

pathProtection:
  # No access at all
  zeroAccessPaths:
    - ~/.ssh/
    - ~/.aws/credentials
    - .env

  # Read allowed, write blocked
  readOnlyPaths:
    - ~/.zshrc
    - ~/.bashrc
    - .git/

  # All except delete
  noDeletePaths:
    - src/
    - package.json
```

### 4.8 Configuration Locations

| Level | Path | Scope | Priority |
|-------|------|-------|----------|
| Global | `~/.claude/settings.json` | All projects | Lowest |
| Project | `.claude/settings.json` | Current project (shared) | Medium |
| Project Personal | `.claude/settings.local.json` | Current project (personal) | Highest |

### 4.9 Generator Command

Crear `/create-hook` que genera scaffolding:

```yaml
---
name: create-hook
description: Create a new hook from template
disable-model-invocation: true
argument-hint: [hook-name] [event-type]
---

Create hook "$ARGUMENTS":

## Steps

1. Ask for hook type:
   - validator (PreToolUse - validate/block)
   - automator (PostToolUse - react/lint)
   - logger (any - log activity)
   - security (PreToolUse - damage control)

2. Ask for event:
   - PreToolUse / PostToolUse / PermissionRequest
   - UserPromptSubmit / Stop / SessionStart

3. Ask for matcher (if tool event):
   - Bash / Write|Edit / Read / * / custom

4. Generate hook script from template

5. Update settings.json with hook config

6. Test hook with dry run
```

### 4.10 Environment Variables

| Variable | Description | Available In |
|----------|-------------|--------------|
| `CLAUDE_PROJECT_DIR` | Absolute path to project root | All hooks |
| `CLAUDE_ENV_FILE` | File to persist env vars | SessionStart, Setup |
| `CLAUDE_CODE_REMOTE` | "true" if web environment | All hooks |

---

## 5. FAQ

**Q: ¿Hooks se ejecutan en paralelo?**
A: Sí, todos los hooks matching se ejecutan en paralelo. [Source: Docs]

**Q: ¿Qué pasa si hook timeout?**
A: El hook específico se cancela pero otros continúan. No afecta la operación. [Source: Docs]

**Q: ¿Puedo modificar tool input en PreToolUse?**
A: Sí, retornando `hookSpecificOutput.updatedInput`. [Source: Docs]

**Q: ¿Stop hook puede prevenir que Claude termine?**
A: Sí, retornando `{decision: "block", reason: "..."}`. [Source: Docs]

---

## 6. Acceptance Criteria (BDD)

```gherkin
Feature: Hooks Extension System

Scenario: PreToolUse blocks dangerous command
  Given hook with matcher "Bash" and block pattern "rm -rf"
  When Claude tries to execute "rm -rf /"
  Then hook exits with code 2
  And command is blocked
  And error message shown

Scenario: PreToolUse modifies input
  Given hook that sanitizes file paths
  When Claude tries to write to "/etc/passwd"
  Then hook modifies path to safe location
  And operation continues with modified input

Scenario: PostToolUse runs linter
  Given hook with matcher "Edit|Write"
  When Claude edits a TypeScript file
  Then hook runs eslint --fix
  And file is formatted

Scenario: Stop hook validates completion
  Given prompt-based Stop hook
  When Claude tries to stop
  Then LLM evaluates completion
  And can block if tasks incomplete

Scenario: SessionStart sets environment
  Given session setup hook
  When new session starts
  Then environment variables are set
  And persisted via CLAUDE_ENV_FILE

Scenario: Multiple hooks run in parallel
  Given two PreToolUse hooks for Bash
  When Claude executes Bash command
  Then both hooks run simultaneously
  And both must allow for operation to proceed
```

---

## 7. Open Questions

- [ ] ¿Límite de hooks por evento?
- [ ] ¿Hooks deduplication strategy?
- [ ] ¿Hook testing framework?

---

## 8. Sources

- [Claude Code Hooks Docs](https://code.claude.com/docs/en/hooks) - Official reference
- [eesel.ai Guide](https://www.eesel.ai/blog/hooks-in-claude-code) - Tutorial
- [claude-code-hooks-mastery](https://github.com/disler/claude-code-hooks-mastery) - Examples
- [claude-code-showcase](https://github.com/ChrisWiles/claude-code-showcase) - Showcase
- [GitButler Integration](https://docs.gitbutler.com/features/ai-integration/claude-code-hooks) - Integration

---

## 9. Next Steps

- [ ] Crear plantillas de hooks en `.claude/templates/`
- [ ] Implementar `/create-hook` command
- [ ] Crear suite de hooks de seguridad (Damage Control)
- [ ] Documentar todos los hooks del proyecto
- [ ] Crear test suite para hooks
- [ ] Implementar hook para validar specs/skills format
