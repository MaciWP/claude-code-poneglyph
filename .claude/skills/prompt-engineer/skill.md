---
name: prompt-engineer
description: >
  Mejora prompts de usuario y genera system prompts para agentes Claude Code.
  Use proactively when: prompts vagos, crear nuevo agente, mejorar agent prompt existente.
  Keywords - prompt, agent, mejorar, vago, crear agente, system prompt, enhance, improve
context: fork
agent: architect
activation:
  keywords:
    - prompt
    - agent
    - crear agente
    - mejorar prompt
    - vago
    - unclear
    - enhance prompt
    - system prompt
for_agents: [builder, architect]
version: "1.0"
---

# Prompt Engineer Skill

Skill dual para:
1. **Mejorar prompts de usuario** (requests vagos → estructurados)
2. **Generar system prompts de agentes** (YAML frontmatter + Markdown)

---

## Part 1: Prompt Quality Scoring

### Quick Score (5 criterios × 20 pts = 100 total)

| Criterio | 20 pts | 10 pts | 0 pts |
|----------|--------|--------|-------|
| **Clarity** | Action verb + target específico | Verb genérico ("update") | "fix this", "arregla esto" |
| **Context** | File paths + tech stack + versions | Solo tech mencionado | Nada |
| **Structure** | Secciones organizadas (XML/headers) | Párrafos separados | Bloque de texto |
| **Success Criteria** | Métricas cuantificables (<100ms, >90%) | Vago ("mejor", "faster") | Sin criterio |
| **Actionable** | Ejecutable sin preguntas | 1-2 clarificaciones necesarias | Muy vago, necesita mucha info |

### Thresholds

| Score | Acción |
|-------|--------|
| ≥ 70 | Usar prompt as-is |
| < 70 | **Mejorar automáticamente** con patterns |

### Vague Words (Red Flags)

```
somehow, maybe, various, some, stuff, things, better, improve, optimize (sin métricas),
fix (sin target), arregla, mejora, algo, eso, esto
```

---

## Part 2: Enhancement Patterns

### Pattern 1: Template Pattern

**Cuándo**: Prompts vagos sin estructura

**Input**: `"fix the login"`

**Output**:
```xml
<task>Fix [specific issue] in [file path]</task>

<context>
  <file>[path:line]</file>
  <error>[error message if applicable]</error>
  <tech_stack>[detected from project]</tech_stack>
</context>

<instructions>
1. Identify the specific issue
2. Locate relevant files
3. Diagnose root cause
4. Implement fix
5. Verify fix works
</instructions>

<success_criteria>
- [Specific measurable outcome]
- [Test passes / error resolved]
</success_criteria>
```

---

### Pattern 2: Chain of Thought (CoT)

**Cuándo**: Tareas multi-step complejas (arquitectura, refactoring, debugging)

**Añade al prompt**:
```xml
<thinking>
Think step-by-step before implementing:
1. Analyze current state
2. Identify all components involved
3. Plan changes in order of dependencies
4. Consider edge cases and error scenarios
5. Execute with validation at each step
</thinking>
```

---

### Pattern 3: Context Builder

**Cuándo**: Falta contexto del proyecto

**Auto-detecta y añade**:
- Tech stack (package.json → Bun/Node, manage.py → Django, etc.)
- Archivos relevantes por keywords en el prompt
- Patterns existentes en el proyecto (de CLAUDE.md si existe)

**Output**:
```xml
<context>
  <project>[detected project name]</project>
  <tech_stack>
    - Runtime: [detected]
    - Framework: [detected]
    - Database: [if applicable]
  </tech_stack>
  <relevant_files>
    - [file1.ts] (detected by keyword match)
    - [file2.ts] (detected by keyword match)
  </relevant_files>
</context>
```

---

## Part 3: Agent Prompt Generator

### Formato Oficial Claude Code (YAML Frontmatter)

```yaml
---
name: agent-identifier          # kebab-case, único
description: >
  [Role description].
  Use proactively when [trigger conditions].
  Keywords - keyword1, keyword2, keyword3.
model: sonnet | opus | haiku    # sonnet por defecto
tools: [Read, Write, Edit, Bash, Grep, Glob, WebFetch, WebSearch]
disallowedTools: [Write, Bash]  # opcional, para read-only agents
---
```

### Permisos por Rol

| Tipo | Tools | Caso de Uso |
|------|-------|-------------|
| **Read-Only** | `Read, Grep, Glob` | Reviewers, analyzers |
| **Research** | `Read, Grep, Glob, WebFetch, WebSearch` | Documentation, investigation |
| **Code Writer** | `Read, Write, Edit, Bash, Glob, Grep` | Implementation |
| **Full Access** | `*` (todas) | Complex tasks, debugging |

### Template de System Prompt

```markdown
# [Agent Name]

You are a [ROLE] with expertise in [DOMAIN].

## Your Task
1. [Primary objective]
2. [Secondary objective]
3. [Validation step]

## Process
1. [Step 1 with tool to use]
2. [Step 2]
3. [Step 3]
4. [Validation]

## Guidelines
- [Behavioral constraint 1]
- [Behavioral constraint 2]
- [Quality standard]

## Output Format

[Structure with example]

| Field | Description |
|-------|-------------|
| ... | ... |

## Important Constraints
- [Critical restriction 1]
- [Critical restriction 2]

## Anti-Hallucination Rules
1. Use Glob/Grep to verify files exist before referencing
2. Read files before making claims about their content
3. Never assume code structure without verification
```

---

## Examples

### Example 1: User Prompt Enhancement

**Input** (Score: 15/100):
```
fix the user bug
```

**Output** (Score: 78/100):
```xml
<task>Fix bug in user module</task>

<context>
  <project>claude-code-poneglyph</project>
  <tech_stack>Bun 1.x, Elysia (backend), React 18 (frontend)</tech_stack>
  <relevant_files>
    - claude-code-ui/server/src/services/users.ts
    - claude-code-ui/web/src/components/User/
  </relevant_files>
</context>

<instructions>
1. Identify the specific bug (error message, unexpected behavior)
2. Locate relevant user-related files
3. Diagnose root cause
4. Implement fix
5. Test the fix
</instructions>

<success_criteria>
- Bug is resolved
- No regression in related functionality
- Tests pass (if applicable)
</success_criteria>
```

---

### Example 2: Agent Generation

**Input**: `crear agente para code review`

**Output**:
```yaml
---
name: code-reviewer
description: >
  Senior code reviewer for quality, security, and maintainability.
  Use proactively after code changes or before commits.
  Keywords - review, quality, security, audit, check code.
model: sonnet
tools: [Read, Grep, Glob]
disallowedTools: [Write, Edit, Bash]
---

# Code Reviewer

You are a senior code reviewer ensuring high standards of quality and security.

## Your Task
1. Analyze code for best practices violations
2. Identify security vulnerabilities
3. Check for performance issues
4. Verify test coverage adequacy

## Process
1. Use Glob to find changed files
2. Read each file completely
3. Analyze against quality criteria
4. Generate structured report

## Guidelines
- Never modify code directly
- Provide actionable feedback with file:line references
- Prioritize by severity (Critical > High > Medium > Low)
- Reference specific code snippets in findings

## Output Format

### Code Review Report

| Severity | Location | Issue | Recommendation |
|----------|----------|-------|----------------|
| CRITICAL | file.ts:45 | SQL injection risk | Use parameterized queries |
| HIGH | file.ts:78 | Missing error handling | Add try/catch block |

### Summary
- Total issues: X
- Critical: X | High: X | Medium: X | Low: X

## Anti-Hallucination Rules
1. Only report issues in files you have read
2. Quote exact code when referencing issues
3. Verify line numbers are accurate
```

---

## Ubicaciones de Archivos

| Tipo | Path | Alcance |
|------|------|---------|
| Skills proyecto | `.claude/skills/` | Solo este proyecto |
| Skills usuario | `~/.claude/skills/` | Todos los proyectos |
| Agentes proyecto | `.claude/agents/` | Solo este proyecto |
| Agentes usuario | `~/.claude/agents/` | Todos los proyectos |

---

## Quick Reference

### Mejorar prompt de usuario:
1. Calcular score (5 criterios)
2. Si < 70 → Aplicar Template Pattern
3. Añadir Context Builder si falta contexto
4. Añadir CoT si es tarea compleja

### Crear agente:
1. Determinar rol y permisos
2. Usar YAML frontmatter template
3. Estructurar prompt: Task → Process → Guidelines → Output → Constraints
4. Incluir Anti-Hallucination Rules
