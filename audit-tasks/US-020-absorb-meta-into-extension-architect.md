---
id: US-020
phase: 2.5
status: completed
estimate: 60m
blocks: []
blockedBy: [US-012]
priority: medium
risk: medium
---

# US-020 · ABSORB 6 skills meta-create-* en agent `extension-architect`

## Historia

**Como** mantenedor del sistema poneglyph
**Quiero** ampliar el agent `extension-architect` para que internalice la lógica de las 6 skills meta-create-* eliminadas en US-012
**Para** centralizar la creación de extensiones en un solo agent invocable explícitamente

## Contexto extendido

### Evidencia recogida

Tras US-012:
- Las 6 skills meta-create-* fueron eliminadas
- Sus templates se extrajeron a `.claude/templates/<tipo>.md`
- Queda el agent `extension-architect` que debe asumir el rol

### Estado actual del agent

El agent `extension-architect` ya existe y su description menciona crear agents, skills, hooks, MCP. Pero su prompt actual probablemente delega esa lógica a las skills meta-create-*.

Tras US-012, esas skills ya no existen, por lo que el prompt del agent puede:
1. Hacer referencia al directorio `.claude/templates/` que ahora contiene los templates literales
2. Tener instrucciones inline para validación, naming conventions, etc.
3. Cubrir los 6 tipos: agent, skill, hook, rule, mcp, plugin

### Por qué importa

- **Cerrar el círculo de US-012**: sin ampliar el agent, la funcionalidad "crear extensión" se pierde
- **Centralizar la lógica** en un solo lugar (el agent), no diseminada en 6 skills
- **El agent es invocable explícitamente** ("delega a extension-architect: crea un nuevo hook para X")

## Análisis — pros y contras

### Pros de la absorción

- **Mantiene la funcionalidad** tras US-012
- **Un solo lugar** para mejorar la lógica de creación
- **Templates living** en `.claude/templates/` se actualizan independiente del prompt del agent
- **Frecuencia de uso baja** (semanal max) — invocación explícita es aceptable

### Contras de la absorción

- **Prompt del agent crece**: tiene que cubrir 6 tipos → más extenso
- **Si el agent es Opus, cada invocación es cara**: pero es infrecuente, el coste agregado es bajo
- **Si el usuario olvida cómo invocar**, la funcionalidad queda escondida

### Mitigación de contras

- Estructura el prompt por tipos con secciones claras (no un wall of text)
- Documentar la invocación en CLAUDE.md (US-022)
- Considerar degradar el modelo del agent a Sonnet si el coste es preocupante

## Riesgos identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| El prompt del agent crece a 200+ líneas y se vuelve incoherente | Media | Medio | Modular: secciones por tipo. Si crece mucho, partir en sub-prompts |
| Templates en `.claude/templates/` no están sincronizados con el prompt del agent | Media | Bajo | El prompt referencia los templates con `Read .claude/templates/<tipo>.md`, no los duplica |
| Tras la absorción, crear extensiones se vuelve más lento (más turnos del agent) | Baja | Bajo | Optimizar el prompt para que el agent vaya directo: leer template, rellenar, crear archivo |
| El agent pierde el "auto-trigger" que las skills tenían | Alta | Bajo | Aceptar — invocación explícita es preferible para acciones meta |

## Pasos técnicos detallados

### Paso 1 — Verificar pre-requisito US-012 (3 min)

```bash
Glob .claude/skills/meta-create-*   # debe devolver 0 archivos
Glob .claude/templates/*            # debe haber 6 templates
```

Si US-012 no se completó: parar y ejecutar US-012 primero.

### Paso 2 — Inspeccionar el agent actual (5 min)

```bash
Read .claude/agents/extension-architect.md
```

**Identificar**:
- Tools permitidas
- Modelo (Opus/Sonnet)
- Prompt actual (qué cubre)
- Referencias a las skills meta-create-* (ahora rotas, hay que eliminarlas)

### Paso 3 — Diseñar el prompt ampliado (20 min)

Estructura sugerida:

```markdown
---
name: extension-architect
description: Meta-agent for Claude Code extensions. Creates and manages agents, skills, hooks, rules, MCP configs, plugins.
model: sonnet     # considerar Sonnet vs Opus
tools: [Read, Write, Edit, Glob, Grep, Bash]
memory: project
---

# Extension Architect

## Workflow

1. Identify what type of extension to create (agent, skill, hook, rule, mcp, plugin)
2. `Read .claude/templates/<type>.md` for the template
3. Fill in template based on user requirements
4. Write the new extension file in the correct location
5. Update settings.json / CLAUDE.md if needed
6. Verify with tests

## Types

### Agent
- Location: `.claude/agents/<name>.md`
- Template: `.claude/templates/agent.md`
- Critical fields: name, description (with keywords/triggers), model, tools, memory
- Validation: agent must have `description` field (without it, Claude Code doesn't register it as `subagent_type`)

### Skill
- Location: `.claude/skills/<name>/SKILL.md`
- Template: `.claude/templates/skill.md`
- Critical fields: description (with keywords for matching), allowed-tools (optional)
- Structure: SKILL.md as entry, references/ for lazy-load content
- Validation: SKILL.md ≤150 lines (use references for bulk content)

### Hook
- Location: `.claude/hooks/<name>.ts`
- Template: `.claude/templates/hook.ts`
- Registration: `.claude/settings.json` under the correct event (Stop, PreToolUse, etc.)
- Shebang: prefer `.ts` with bun; if `.sh`, use `#!/bin/bash` (NOT `/usr/bin/env`)
- Validation: must be reachable from Windows PATH (Poneglyph notes apply)

### Rule
- Location: `.claude/rules/<name>.md` (or `.claude/rules/paths/<name>.md` for path-scoped)
- Template: `.claude/templates/rule.md`
- Frontmatter: `paths:` for path-scoped, `priority:` for ordering
- Question: is it really a rule (conditional/blocking) or a style guide?

### MCP
- Location: `.claude/<settings or mcp>.json`
- Template: `.claude/templates/mcp.json`
- Required: server name, command, args, env (if needed)
- Validation: `--list-mcp-servers` shows the new entry

### Plugin
- Location: `.claude/plugins/<name>/`
- Template: `.claude/templates/plugin.md`
- Structure: bundles skills/agents/hooks/MCPs as a unit
- Validation: plugin manifest is valid; installation script works

## Naming Conventions
- kebab-case for names (e.g., `meta-create-hook`, `error-analyzer`)
- Avoid generic names (`helper`, `utils`)
- Be specific about scope and purpose

## Validation (post-creation)
- Run `bun test ./.claude/hooks/` if it's a hook
- Smoke test: invoke the new extension in a sample prompt
- Verify settings.json sintaxis JSON válida
```

Total: ~120-150 líneas.

### Paso 4 — Implementar el prompt ampliado (10 min)

```bash
Edit .claude/agents/extension-architect.md
```

Reemplazar el prompt actual con el diseño del Paso 3.

### Paso 5 — Verificar `.claude/templates/` (5 min)

```bash
Glob .claude/templates/*
Read .claude/templates/agent.md
Read .claude/templates/skill.md
# ... revisar los 6
```

Verificar que los templates son útiles. Si alguno está roto o vacío, extraer del git history (los archivos originales de las skills meta-create-* eliminadas):

```bash
git show HEAD~N:.claude/skills/meta-create-agent/SKILL.md > .claude/templates/agent.md.original
# Manualmente extraer la sección de template y guardar en .claude/templates/agent.md
```

### Paso 6 — Smoke test (12 min)

Probar la creación de cada tipo:

1. "Delega a extension-architect: crea un nuevo hook trivial llamado `say-hello.ts` que loguee 'hello' al Stop event"
   - Verificar que el agent: lee template hook.ts, crea el archivo, actualiza settings.json
2. "Crea una nueva skill llamada `test-skill` con triggers 'test' y 'hello'"
   - Verificar que crea SKILL.md con frontmatter válido
3. (Opcional) Probar los otros 4 tipos para validación completa

Tras smoke test, **LIMPIAR** las extensiones de prueba:
```bash
Bash: rm .claude/hooks/say-hello.ts
Bash: rm -rf .claude/skills/test-skill
# Revertir settings.json si fue modificado
```

### Paso 7 — Commit (5 min)

```
refactor(agents): absorb meta-create-* logic into extension-architect

- 6 meta-create-* skills removed in US-012; agent now handles all types
- Templates live in .claude/templates/<type>.md (read lazily)
- Single entry point for creating Claude Code extensions
- Smoke-tested: agent, skill, hook, rule creation works end-to-end

Frequency of use is low (~weekly), justifying explicit invocation
over auto-trigger skills.
```

## Criterios de aceptación

- [ ] Pre-requisito: US-012 completo
- [ ] `.claude/agents/extension-architect.md` ampliado con secciones por tipo
- [ ] `.claude/templates/` contiene 6 archivos (1 por tipo) bien formados
- [ ] Smoke test: crear un nuevo hook funciona end-to-end
- [ ] Smoke test: crear una nueva skill funciona end-to-end
- [ ] `bun test ./.claude/hooks/` pasa
- [ ] Commit realizado

## Definition of Done

1. Agent ampliado
2. Templates verificados
3. Smoke test ok para al menos 2 tipos (hook + skill, los más comunes)
4. Commit
5. Frontmatter `status: completed`

## Rollback plan

```bash
git revert <hash-de-US-020>
git revert <hash-de-US-012>     # si quieres restaurar las 6 skills también
```

## Notas

- Considerar **degradar `extension-architect` de Sonnet a Sonnet 4.6** explícitamente. Como su uso es infrecuente, el coste Opus no se justifica. Documentar la decisión en MEMORY.md (US-023)
- Si el smoke test del Paso 6 falla por algún tipo (e.g. plugin es complejo), evaluar mantener una skill `meta-create-plugin` específica como excepción justificada (no toda la regla aplica al 100% de los casos)
- Los templates en `.claude/templates/` deberían tener un README breve explicando qué contienen y cuándo se usan
