# SPEC-021: Subagents Extension System

> **Status**: approved | **Version**: 1.0 | **Updated**: 2026-01-21

## 0. Research Summary

### Fuentes Consultadas

| Tipo | Fuente | Link | Relevancia |
|------|--------|------|------------|
| Docs oficial | Claude Code Subagents | [code.claude.com](https://code.claude.com/docs/en/sub-agents) | Alta |
| Best practices | PubNub | [Guide](https://www.pubnub.com/blog/best-practices-for-claude-code-sub-agents/) | Alta |
| Collection | awesome-claude-code-subagents | [GitHub](https://github.com/VoltAgent/awesome-claude-code-subagents) | Alta |
| Internal | System Prompts | [GitHub](https://github.com/Piebald-AI/claude-code-system-prompts) | Alta |
| SDK | Anthropic Agent SDK | [Docs](https://platform.claude.com/docs/en/agent-sdk/subagents) | Alta |

### Decisiones Informadas por Research

| Decisión | Basada en |
|----------|-----------|
| YAML frontmatter + Markdown prompt | Docs oficiales - formato estándar |
| Tools whitelist para seguridad | Best practices - principle of least privilege |
| `permissionMode` para control | Docs oficiales - 5 modos disponibles |
| Hooks integration en frontmatter | Docs oficiales - lifecycle events |
| Model selection (haiku/sonnet/opus) | Docs - haiku 90% performance, 3x cheaper |

### Información No Encontrada

- Performance benchmarks de subagents vs main context
- Límite de subagents concurrentes
- Memory isolation entre subagents

### Confidence Assessment

| Área | Nivel | Razón |
|------|-------|-------|
| Agent file format | Alta | Documentación oficial completa |
| Tools configuration | Alta | Ejemplos extensos |
| Permission modes | Alta | Docs oficiales detallados |
| Best practices | Media | Community patterns |

---

## 1. Vision

> **Press Release**: El Subagents Extension System proporciona un framework para crear agentes especializados que Claude delega automáticamente. Incluye plantillas, patrones de seguridad y comandos de generación que aseguran agentes consistentes y seguros.

**Background**: Claude Code permite crear subagents personalizados, pero sin estándares cada agente tiene diferente nivel de seguridad y formato.

**Usuario objetivo**: Desarrolladores que crean agentes especializados.

**Métricas de éxito**:
- 100% agents con formato estandarizado
- Tools whitelist en todos los agents
- < 30 segundos crear agent con plantilla

---

## 2. Goals & Non-Goals

### Goals

- [ ] Definir plantilla estándar para agent.md
- [ ] Documentar todos los campos de frontmatter
- [ ] Crear `/create-agent` generator command
- [ ] Establecer patrones de seguridad (tools whitelist)
- [ ] Definir categorías de agents (read-only, builder, executor)
- [ ] Documentar permission modes

### Non-Goals

- [ ] Modificar agents built-in (Explore, Plan)
- [ ] Multi-agent orchestration complejo
- [ ] Agent-to-agent communication directo
- [ ] Persistent agent state entre sesiones

---

## 3. Alternatives Considered

| Alternativa | Pros | Cons | Fuente | Decisión |
|-------------|------|------|--------|----------|
| **agent.md estándar** | Oficial, soportado | - | Docs | ✅ Elegida |
| Skills con context:fork | Más simple | Menos control | - | ⚠️ Para casos simples |
| Claude Agent SDK | Más features | Más complejo | SDK Docs | ⚠️ Para producción |

---

## 4. Design

### 4.1 Agent Directory Structure

```
.claude/agents/
├── {category}/
│   └── {agent-name}.md       # Agent definition file
```

**Categories**:

| Category | Purpose | Tools | Examples |
|----------|---------|-------|----------|
| `readers/` | Analysis only | Read, Grep, Glob | code-reviewer, auditor |
| `builders/` | Create/modify | Read, Write, Edit, Bash | implementer, refactorer |
| `executors/` | Run commands | Bash, Read | test-runner, deployer |
| `researchers/` | Investigate | Read, Grep, Glob, WebSearch | researcher, documenter |

### 4.2 Agent.md Template

```yaml
---
# === IDENTITY ===
name: {agent-name}
description: |
  {Clear description of:
   - What this agent specializes in
   - When Claude should delegate to it
   - Expected output format}

# === TOOLS ===
tools: Read, Grep, Glob                # Whitelist - explicit is safer
disallowedTools: Write, Edit, Bash     # Blacklist - use for exclusions

# === MODEL ===
model: sonnet                          # sonnet | opus | haiku | inherit

# === PERMISSIONS ===
permissionMode: default                # See permission modes below

# === SKILLS (preloaded) ===
skills:
  - security-review
  - code-quality

# === LIFECYCLE HOOKS ===
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate-command.sh"
  PostToolUse:
    - matcher: "Edit|Write"
      hooks:
        - type: command
          command: "./scripts/run-linter.sh"
  Stop:
    - hooks:
        - type: prompt
          prompt: "Verify all tasks completed before stopping"
---

# {Agent Name}

You are a specialized AI assistant focused on {domain}.

## Primary Responsibilities

- {Responsibility 1}
- {Responsibility 2}
- {Responsibility 3}

## Workflow

When invoked:

1. {Step 1}
2. {Step 2}
3. {Step 3}

## Output Format

Provide output as:

```
{Expected format}
```

## Constraints

- {Constraint 1}
- {Constraint 2}

## Examples

### Example: {Use Case}

**Input**: {What triggers this agent}

**Process**: {What agent does}

**Output**: {Expected result}
```

### 4.3 Permission Modes

| Mode | Behavior | Use Case |
|------|----------|----------|
| `default` | Standard permission prompts | General purpose |
| `acceptEdits` | Auto-accept file edits | Trusted builders |
| `dontAsk` | Auto-deny permission prompts | Read-only analysis |
| `bypassPermissions` | Skip all checks | Fully automated (⚠️ dangerous) |
| `plan` | Read-only exploration | Planning, research |

```yaml
# Read-only agent
permissionMode: plan
tools: Read, Grep, Glob

# Trusted builder
permissionMode: acceptEdits
tools: Read, Write, Edit, Bash

# Dangerous automation
permissionMode: bypassPermissions  # USE WITH CAUTION
```

### 4.4 Agent Types

#### Type A: Read-Only Agent (Reviewer)

Para análisis sin modificaciones.

```yaml
---
name: code-reviewer
description: |
  Expert code review specialist. Reviews code for quality, security,
  and maintainability. Use proactively after code changes.
tools: Read, Grep, Glob, Bash
permissionMode: plan
skills:
  - code-quality
  - security-review
---

You are a senior code reviewer ensuring high standards.

## Review Checklist

- Code is clear and readable
- No duplicated code
- Proper error handling
- No exposed secrets
- Input validation implemented
- Good test coverage
- Performance considerations

## Output Format

Provide feedback organized by priority:

### Critical Issues (Must Fix)
- {issue}

### Warnings (Should Fix)
- {issue}

### Suggestions (Consider)
- {suggestion}
```

#### Type B: Builder Agent (Implementer)

Para crear y modificar código.

```yaml
---
name: implementer
description: |
  Implementation specialist. Creates code following project conventions.
  Use when building new features or fixing bugs.
tools: Read, Write, Edit, Bash, Grep, Glob
permissionMode: acceptEdits
model: sonnet
skills:
  - typescript-patterns
  - bun-best-practices
---

You are an expert developer implementing features.

## Workflow

1. Understand requirements
2. Read existing related code
3. Implement following project patterns
4. Write tests
5. Verify implementation

## Constraints

- Follow existing code style
- Add tests for new functionality
- Don't break existing tests
```

#### Type C: Executor Agent (Automation)

Para ejecutar comandos específicos con validación.

```yaml
---
name: test-runner
description: |
  Test execution specialist. Runs tests and reports results.
  Use when testing is requested.
tools: Bash, Read, Grep
permissionMode: default
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: |
            # Only allow test commands
            echo "$TOOL_INPUT" | grep -qE "^(bun test|npm test|pytest)" || exit 2
---

You execute tests and report results.

## Allowed Commands

- `bun test`
- `npm test`
- `pytest`

## Output Format

```
✅ Tests Passed: X
❌ Tests Failed: Y
⚠️ Tests Skipped: Z

Failed Tests:
- {test name}: {error}
```
```

#### Type D: Research Agent (Explorer)

Para investigación con acceso a web.

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

You research topics thoroughly.

## Methodology

1. Search codebase first
2. Web search for external info
3. Cross-reference findings
4. Summarize with sources

## Output Format

## Findings

### From Codebase
- {finding} (source: {file}:{line})

### From Web
- {finding} (source: {url})

## Confidence: {High|Medium|Low}
```

### 4.5 Hooks Integration

Los agents pueden definir hooks en frontmatter para validación:

```yaml
hooks:
  # Before tool execution
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./validate-bash.sh"
          timeout: 30
    - matcher: "Write|Edit"
      hooks:
        - type: command
          command: "./validate-file.sh"

  # After tool execution
  PostToolUse:
    - matcher: "Write|Edit"
      hooks:
        - type: command
          command: "./run-linter.sh"

  # Before agent stops
  Stop:
    - hooks:
        - type: prompt
          prompt: |
            Before stopping, verify:
            1. All requested tasks completed
            2. No errors introduced
            3. Tests pass
          timeout: 30
```

### 4.6 Skills Preloading

Los agents pueden precargar skills en su contexto:

```yaml
skills:
  - typescript-patterns    # Cargado completamente
  - security-coding        # Cargado completamente
```

**Importante**: Skills se cargan completas (no solo description). Los agents NO heredan skills del conversation principal.

### 4.7 Model Selection Strategy

| Model | Cost | Speed | Use Case |
|-------|------|-------|----------|
| `haiku` | 3x cheaper | 2x faster | Simple tasks, high frequency |
| `sonnet` | Balanced | Balanced | General purpose (default) |
| `opus` | Most expensive | Slowest | Complex reasoning |
| `inherit` | Same as main | Same | Consistency needed |

```yaml
# High-frequency simple agent
model: haiku

# Complex analysis
model: opus

# Match main conversation
model: inherit
```

### 4.8 Generator Command

Crear `/create-agent` que genera scaffolding:

```yaml
---
name: create-agent
description: Create a new subagent from template
disable-model-invocation: true
argument-hint: [agent-name] [type]
---

Create agent "$ARGUMENTS" with this structure:

## Steps

1. Ask for agent type:
   - reader (Read, Grep, Glob only)
   - builder (Read, Write, Edit, Bash)
   - executor (Bash, Read)
   - researcher (Read, Grep, Glob, WebSearch)

2. Ask for permission mode:
   - default (standard)
   - acceptEdits (trusted)
   - plan (read-only)

3. Generate agent.md from template

4. Create in appropriate category directory
```

---

## 5. FAQ

**Q: ¿Diferencia entre agent y skill con context:fork?**
A: Agents tienen más control (tools whitelist, permissionMode, hooks). Skills con fork son más simples. [Source: Docs]

**Q: ¿Cómo sabe Claude cuándo delegar?**
A: Por la description del agent. Claude evalúa semánticamente qué agent es apropiado. [Source: Docs]

**Q: ¿Se pueden encadenar agents?**
A: No directamente. El agent retorna al main context, que puede delegar a otro. [Source: Docs]

**Q: ¿Agents acceden a MCP tools?**
A: Sí, si omites tools whitelist. Con whitelist, solo los listados. [Source: Docs]

---

## 6. Acceptance Criteria (BDD)

```gherkin
Feature: Subagents Extension System

Scenario: Create agent from template
  Given /create-agent command exists
  When user runs /create-agent my-agent reader
  Then agent file .claude/agents/readers/my-agent.md is created
  And frontmatter has tools: Read, Grep, Glob
  And permissionMode is plan

Scenario: Agent tools whitelist enforced
  Given agent with tools: Read, Grep
  When agent tries to use Write tool
  Then Write is blocked
  And only Read, Grep are available

Scenario: Agent auto-delegation
  Given agent with description "code review specialist"
  When user asks "review this code"
  Then Claude delegates to the agent
  And agent executes in separate context

Scenario: Agent hooks execute
  Given agent with PreToolUse hook for Bash
  When agent executes Bash command
  Then hook runs before execution
  And hook can block with exit 2

Scenario: Agent skills preloaded
  Given agent with skills: [typescript-patterns]
  When agent is invoked
  Then typescript-patterns content is in context
  And agent can reference patterns

Scenario: Permission mode respected
  Given agent with permissionMode: plan
  When agent tries to Write file
  Then write is blocked
  And agent operates read-only
```

---

## 7. Open Questions

- [ ] ¿Límite de agents concurrentes?
- [ ] ¿Agent-to-agent communication?
- [ ] ¿Persistent state entre invocaciones?

---

## 8. Sources

- [Claude Code Subagents Docs](https://code.claude.com/docs/en/sub-agents) - Official reference
- [Best Practices Guide](https://www.pubnub.com/blog/best-practices-for-claude-code-sub-agents/) - PubNub
- [awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents) - 100+ examples
- [Anthropic Agent SDK](https://platform.claude.com/docs/en/agent-sdk/subagents) - SDK docs
- [System Prompts](https://github.com/Piebald-AI/claude-code-system-prompts) - Internal prompts

---

## 9. Next Steps

- [ ] Crear plantilla agent.md en `.claude/templates/`
- [ ] Implementar `/create-agent` command
- [ ] Migrar agents existentes al formato estándar
- [ ] Documentar todos los agents en catalog
- [ ] Crear hook de validación de formato
- [ ] Definir security policies por tipo de agent
