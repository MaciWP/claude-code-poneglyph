# SPEC-020: Skills Extension System

> **Status**: approved | **Version**: 1.0 | **Updated**: 2026-01-21

## 0. Research Summary

### Fuentes Consultadas

| Tipo | Fuente | Link | Relevancia |
|------|--------|------|------------|
| Docs oficial | Claude Code Skills | [code.claude.com](https://code.claude.com/docs/en/skills) | Alta |
| Best practices | alexop.dev | [Guide](https://alexop.dev/posts/claude-code-customization-guide-claudemd-skills-subagents/) | Alta |
| Community | awesome-claude-skills | [GitHub](https://github.com/ComposioHQ/awesome-claude-skills) | Media |
| Deep dive | Mikhail Shilkov | [Blog](https://mikhail.io/2025/10/claude-code-skills/) | Alta |
| Internal | Skills System Prompts | [GitHub](https://github.com/Piebald-AI/claude-code-system-prompts) | Alta |

### Decisiones Informadas por Research

| Decisión | Basada en |
|----------|-----------|
| SKILL.md como archivo principal | Docs oficiales - estándar de Claude Code |
| Description como trigger semántico | No hay keyword matching, es LLM reasoning |
| `context: fork` para aislamiento | Docs oficiales - previene context pollution |
| `!command` syntax para dynamic injection | Docs oficiales - ejecuta antes de render |

### Información No Encontrada

- Límites de tamaño recomendados para skills
- Performance impact de muchas skills
- Best practices para skill composition

### Confidence Assessment

| Área | Nivel | Razón |
|------|-------|-------|
| SKILL.md format | Alta | Documentación oficial completa |
| Activation patterns | Alta | Explicado en deep dive |
| Tool restrictions | Alta | Docs oficiales |
| Best practices | Media | Community patterns |

---

## 1. Vision

> **Press Release**: El Skills Extension System proporciona un framework estandarizado para crear, gestionar y distribuir skills en el proyecto Poneglyph. Incluye plantillas, validación y comandos de generación que aseguran consistencia y calidad.

**Background**: Claude Code permite crear skills personalizadas, pero sin estándares cada skill tiene formato diferente.

**Usuario objetivo**: Desarrolladores que crean o mantienen skills del proyecto.

**Métricas de éxito**:
- 100% skills con formato estandarizado
- < 30 segundos crear skill con plantilla
- 0 errores de formato en skills

---

## 2. Goals & Non-Goals

### Goals

- [ ] Definir plantilla estándar para SKILL.md
- [ ] Documentar todos los campos de frontmatter
- [ ] Crear `/create-skill` generator command
- [ ] Establecer convenciones de naming
- [ ] Definir categorías de skills (reference, workflow, research)
- [ ] Documentar patrones de activation

### Non-Goals

- [ ] Runtime validation de skills (ver SPEC-022 Hooks)
- [ ] Skill marketplace/sharing externo
- [ ] Versioning de skills (usar git)
- [ ] Skill dependencies automáticas

---

## 3. Alternatives Considered

| Alternativa | Pros | Cons | Fuente | Decisión |
|-------------|------|------|--------|----------|
| **SKILL.md estándar** | Oficial, soportado | Learning curve | Docs | ✅ Elegida |
| YAML files | Familiar | No oficial, sin soporte | - | ❌ |
| JSON config | Strict schema | Menos legible | - | ❌ |
| No template | Flexible | Inconsistente | - | ❌ |

---

## 4. Design

### 4.1 Skill Directory Structure

```
.claude/skills/
├── {category}/
│   └── {skill-name}/
│       ├── SKILL.md          # Required: main file
│       ├── reference.md      # Optional: detailed docs
│       ├── examples.md       # Optional: usage examples
│       └── scripts/          # Optional: helper scripts
│           └── validate.sh
```

**Categories**:

| Category | Purpose | Examples |
|----------|---------|----------|
| `builder/` | For builder agent | typescript-patterns, security-coding |
| `reviewer/` | For reviewer agent | code-quality, security-review |
| `error-analyzer/` | For error analysis | retry-patterns, diagnostic-patterns |
| `shared/` | Cross-agent | anti-hallucination, logging-strategy |
| `workflow/` | User-triggered workflows | deploy, release, commit |

### 4.2 SKILL.md Template

```yaml
---
# === IDENTITY ===
name: {skill-name}
description: |
  {One paragraph describing:
   - What this skill does
   - When Claude should use it
   - Keywords that trigger activation}

# === INVOCATION CONTROL ===
disable-model-invocation: false  # true = solo /command manual
user-invocable: true             # false = solo Claude puede usar

# === ARGUMENTS ===
argument-hint: [{arg1}] [{arg2}]  # Shown in autocomplete

# === TOOL RESTRICTIONS ===
allowed-tools: Read, Grep, Glob   # Comma-separated, omit for all

# === EXECUTION CONTEXT ===
context: fork                     # fork = isolated, omit = main context
agent: Explore                    # Delegate to: Explore, Plan, custom-agent
model: sonnet                     # sonnet, opus, haiku, inherit

# === LIFECYCLE HOOKS ===
hooks:
  on-invoke: ./scripts/setup.sh   # Run before skill executes
---

# {Skill Name}

## Purpose

{Brief explanation of what this skill provides}

## When to Use

Use this skill when:
- {Condition 1}
- {Condition 2}
- {Condition 3}

## Rules / Patterns

### {Pattern 1 Name}

{Description}

```{language}
{Code example}
```

### {Pattern 2 Name}

{Description}

## Checklist

Before completing, verify:
- [ ] {Check 1}
- [ ] {Check 2}
- [ ] {Check 3}

## Examples

### Example: {Use Case}

**Input**: {What user provides}

**Output**: {Expected result}

## References

- [{Reference 1}](url)
- [{Reference 2}](url)
```

### 4.3 Skill Types

#### Type A: Reference Skill (Knowledge)

Para convenciones, patrones, guías que Claude aplica al trabajo actual.

```yaml
---
name: api-conventions
description: API design patterns. Use when creating or reviewing API endpoints.
---

# API Conventions

## Endpoint Naming
- Use plural nouns: `/users`, `/sessions`
- Use kebab-case for multi-word: `/user-profiles`
...
```

**Características**:
- Sin `context: fork` (se aplica en contexto principal)
- Sin `disable-model-invocation` (Claude activa automáticamente)
- Sin `allowed-tools` (no ejecuta acciones)

#### Type B: Workflow Skill (Task)

Para flujos paso a paso controlados por usuario.

```yaml
---
name: deploy
description: Deploy application to production
disable-model-invocation: true
argument-hint: [environment]
allowed-tools: Bash, Read
---

# Deploy

Deploy $ARGUMENTS following these steps:
1. Run tests
2. Build application
3. Push to registry
4. Deploy to environment
5. Verify health
```

**Características**:
- `disable-model-invocation: true` (solo manual)
- `allowed-tools` restringido
- Usa `$ARGUMENTS`

#### Type C: Research Skill (Exploration)

Para investigación aislada sin modificar contexto principal.

```yaml
---
name: deep-research
description: Research a topic thoroughly. Use when asked to investigate or understand something.
context: fork
agent: Explore
---

# Deep Research

Research $ARGUMENTS:
1. Find relevant files
2. Analyze patterns
3. Summarize findings with file references
```

**Características**:
- `context: fork` (aislado)
- `agent: Explore` (delegado a explorer)
- Read-only tools

### 4.4 Activation Patterns

Claude usa **semantic matching** en description, no keywords literales.

| Description | Triggers When |
|-------------|---------------|
| "Use when writing TypeScript code" | User mentions TS, creating TS files |
| "Security patterns for authentication" | Auth code, login, JWT mentions |
| "API design conventions" | Creating endpoints, REST discussion |

**Best Practices**:
```yaml
# ✅ GOOD - Specific, actionable
description: |
  TypeScript best practices for async/await, error handling, and type safety.
  Use when writing or reviewing TypeScript code.

# ❌ BAD - Vague
description: TypeScript stuff
```

### 4.5 Dynamic Context Injection

Usar `` !`command` `` para inyectar datos antes de que Claude vea el skill:

```yaml
---
name: pr-context
context: fork
agent: Explore
---

## Current PR
- Diff: !`gh pr diff`
- Files changed: !`gh pr diff --name-only`

Analyze this PR...
```

**Orden de procesamiento**:
1. Comandos se ejecutan inmediatamente
2. Output reemplaza el placeholder
3. Claude recibe prompt renderizado

### 4.6 Generator Command

Crear `/create-skill` que genera scaffolding:

```yaml
---
name: create-skill
description: Create a new skill from template
disable-model-invocation: true
argument-hint: [skill-name] [category]
---

Create skill "$ARGUMENTS" with this structure:

1. Ask for skill type (reference/workflow/research)
2. Generate SKILL.md from template
3. Create directory structure
4. Add to INDEX if exists
```

---

## 5. FAQ

**Q: ¿Cuántas skills puede tener un proyecto?**
A: Sin límite documentado, pero descriptions se cargan en contexto. Mantener < 50 para evitar context bloat.

**Q: ¿Cómo debuggear si skill no se activa?**
A: Verificar description tiene keywords relevantes. Test con `/skill-name` directo. [Source: Docs]

**Q: ¿Skills heredan tools del thread?**
A: Sí, si omites `allowed-tools`. Whitelist para control estricto. [Source: Docs]

**Q: ¿Diferencia entre skill y command?**
A: Commands mergeados en skills. Ambos crean `/slash-command`. Skills tienen más features (context fork, hooks). [Source: Docs]

---

## 6. Acceptance Criteria (BDD)

```gherkin
Feature: Skills Extension System

Scenario: Create skill from template
  Given /create-skill command exists
  When user runs /create-skill my-skill builder
  Then skill directory .claude/skills/builder/my-skill/ is created
  And SKILL.md has all required sections
  And frontmatter has name, description fields

Scenario: Skill auto-activation
  Given skill with description "Use when writing tests"
  When user asks "help me write tests"
  Then Claude activates the skill automatically
  And skill content is loaded into context

Scenario: Workflow skill manual only
  Given skill with disable-model-invocation: true
  When user asks related question
  Then Claude does NOT auto-activate
  And skill only triggers via /skill-name command

Scenario: Research skill isolation
  Given skill with context: fork
  When skill is invoked
  Then execution happens in separate context
  And main context is not polluted

Scenario: Tool restrictions enforced
  Given skill with allowed-tools: Read, Grep
  When skill tries to use Edit tool
  Then Edit is blocked
  And only Read, Grep are available
```

---

## 7. Open Questions

- [ ] ¿Máximo recomendado de skills por proyecto?
- [ ] ¿Auto-discovery de skills en subdirectorios?
- [ ] ¿Skill versioning para breaking changes?

---

## 8. Sources

- [Claude Code Skills Docs](https://code.claude.com/docs/en/skills) - Official reference
- [Skills Deep Dive](https://mikhail.io/2025/10/claude-code-skills/) - Internal mechanics
- [Customization Guide](https://alexop.dev/posts/claude-code-customization-guide-claudemd-skills-subagents/) - Best practices
- [awesome-claude-skills](https://github.com/ComposioHQ/awesome-claude-skills) - Community catalog

---

## 9. Next Steps

- [ ] Crear plantilla SKILL.md en `.claude/templates/`
- [ ] Implementar `/create-skill` command
- [ ] Migrar skills existentes al formato estándar
- [ ] Documentar todas las skills en catalog
- [ ] Crear hook de validación de formato (ver SPEC-022)
