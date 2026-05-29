---
us: US1
title: Inventario interno exhaustivo del sistema poneglyph
wave: W1
depends_on: []
tdd_mode: skip
estimate: M
status: closed
absorbs_decision: catalogación-completa
---

# US1 — Inventario interno exhaustivo del sistema poneglyph

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W1 |
| **Depends on** | none |
| **Blocks** | [US4, US5] |
| **Files touched** | `build/inventory.md` (crear) |
| **TDD-mode** | skip: feature atípica markdown-only; validations.md = oracle |
| **Estimate** | M (1 sesión) |
| **Cómo arrancar** | `Glob .claude/skills/*/SKILL.md` + `.claude/{commands,agents,hooks,rules,output-styles,plans/templates}/**/*` |
| **Decisión absorbida** | Catalogación 19+4+3+4+4+1+7+meta (frontmatter conventions, state.json schema, drillme integration, hard gates protocol) |

## User story

- **As a**: Oriol (consumidor del audit report)
- **I want**: un inventario exhaustivo y verificable de TODOS los componentes del sistema poneglyph
- **So that**: el scoring (US4) y cross-analysis (US5) operan sobre ground-truth completo, no sobre suposiciones

## Acceptance criteria

- **AC1**: Given el repo poneglyph en commit HEAD, when se ejecuta `Glob` para cada categoría (skills/commands/agents/hooks/rules/output-styles/templates/plans), then el inventario lista TODOS los archivos encontrados con path verificable.
- **AC2**: Given cada componente listado, when se documenta, then incluye (a) path absoluto Windows + forward-slash version para markdown, (b) propósito en ≤2 líneas (extraído de frontmatter o leído del SKILL.md/agent.md), (c) categoría asignada a una de las 14 del scoring, (d) última modificación (git log -1 si relevante).
- **AC3**: Given los meta-componentes (frontmatter conventions, state.json schema, drillme integration protocol, hard gates protocol), when no son archivos sino convenciones, then se documentan en sección dedicada con paths donde la convención se aplica.
- **AC4**: Given snapshot HEAD, when se captura, then se registra `commit_sha` al inicio del `build/inventory.md` para anti-drift (sistema NO debe modificarse durante audit).
- **AC5**: Given el inventario completo, when se cierra, then no excede 2000 palabras y es navegable con índice por categoría.

## Files a crear / a modificar

| Path | Contenido / Cambio |
|---|---|
| `.claude/plans/002-claude-config-deep-audit/build/inventory.md` | Inventario completo categorizado |

## Workflow detallado

1. Capturar `commit_sha` HEAD via `git rev-parse HEAD`. Registrar al inicio del inventory.md.
2. Glob por categoría: `.claude/skills/*/SKILL.md`, `.claude/commands/*.md`, `.claude/agents/*.md`, `.claude/hooks/**/*.ts`, `.claude/rules/**/*.md`, `.claude/output-styles/*.md`, `.claude/plans/templates/*.md`.
3. Para cada archivo: extraer frontmatter (si lo tiene) + primera línea de descripción. Anti-hallucination: leer si frontmatter ausente.
4. Documentar meta-componentes: convención frontmatter (analizar 3-5 SKILLs como muestra), state.json schema (extraer del template), drillme integration (cita SKILL drillme + cómo se invoca desde phases), hard gates protocol (cita CLAUDE.md §Mental model).
5. Asignar cada componente a 1-N categorías de scoring (las 14 definidas en US3).
6. Generar tabla con columns `# | Path | Categoría asignada | Propósito | Última mod`.
7. Sección "Meta-componentes" separada con convenciones documentadas.
8. Resumen counts: "X skills, Y commands, Z agents..."

## Drillme (Socratic check)

| Categoría | Pregunta |
|---|---|
| `[location]` | ¿Algún componente que viva fuera de `.claude/` y deba inventariarse? (CLAUDE.md root, scripts/, etc.) |
| `[approach]` | ¿Por qué Glob estático vs git ls-files? Glob preserva todo incluido untracked relevante; git ls-files solo tracked. Decisión: Glob. |
| `[context]` | ¿El inventario debe incluir tests de hooks (`__tests__/`)? Sí — son parte del hook subsystem aunque no se ejecuten en runtime audit. |
| `[failure]` | ¿Qué pasa si Glob no encuentra un componente conocido (e.g., harness no lista)? Cross-verify con CLAUDE.md inventory; si discrepancia → registrar en open questions. |

## Commandments cubiertos

| # | Cómo |
|---|---|
| II | Anti-hallucination obligatorio: cada componente verified con Glob; cada path absoluto re-checkable |
| V | Entender (cataloga) antes de actuar (scoring) — base ground-truth |
| X | Audit del sistema = mantenibilidad del meta-sistema |

## Reutiliza

- `anti-hallucination` skill — applied per claim de existencia
- Glob (Read tool del Lead)

## Smell signals

- ⚠️ Inventario excede 2000 palabras → reducir descripciones a 1 línea (no eliminar componentes)
- ⚠️ Discrepancia entre Glob result vs CLAUDE.md inventory → flag en OQ-impl

## Verificación post-implementación

- Smoke: contar componentes por categoría — debe coincidir con o superar contadores CLAUDE.md (19 skills, 4 commands, 3 agents, 4 hooks, 4 rules, 1 output-style, 7 templates).
- Verify cada path con `Glob` reproducible.

## Open questions (a resolver en implementación)

- ¿Incluir `scripts/` directory (untracked) en inventario? Decisión: SI contiene utilidades relevantes a poneglyph; NO si es solo scratch.
- ¿Hook tests (`__tests__/`) cuentan como componente separado o son parte del hook? Decisión sugerida: contar como sub-componente del hook (no duplicar en categoría aparte).
