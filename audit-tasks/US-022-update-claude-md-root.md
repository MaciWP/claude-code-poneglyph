---
id: US-022
phase: 2.6
status: completed
estimate: 45m
blocks: [US-024]
blockedBy: [US-005, US-006, US-007, US-008, US-009, US-010, US-011, US-012, US-013, US-014, US-015, US-016, US-017, US-018, US-019, US-020, US-021]
priority: high
risk: low
---

> Executed 2026-05-25. Scope mínimo (no se tocó la estructura conceptual, solo contadores + refs huérfanas):
>
> - Línea 111 (lista de subagentes): quitado `extension-architect` (agent eliminado), añadida nota de que ahora vive como skill `meta-create`.
> - Línea 118: threshold de delegación `≥3 files` → `≥5 files` (coherente con `bootstrap-lead.md` post US-015 de model reassignment).
> - Eliminada referencia a skill `poneglyph-glossary` que nunca existió.
> - Añadida sección final "System inventory (post-audit 2026-05-25)" con contadores empíricos: 5 agents, 21 skills, 12 hooks, 7 commands, 2 rules + paths/, 1 output-style.
> - También se limpió accidentalmente la carpeta vacía `.claude/agents/meta/` (residuo de US-012+US-020) y las 6 carpetas vacías `meta-create-*/` residuales del `git rm -r` previo que dejó subdirs vacíos en el filesystem.

# US-022 · Actualizar `CLAUDE.md` raíz con la nueva estructura del sistema

## Historia

**Como** mantenedor del sistema poneglyph
**Quiero** actualizar `CLAUDE.md` raíz para reflejar la estructura post-cortes (contadores, referencias, eliminaciones)
**Para** que el documento principal no mienta sobre componentes que ya no existen

## Contexto extendido

### Evidencia recogida

`CLAUDE.md` raíz actual (212 líneas) contiene:
- "16 agents, 24 skills, 30+ hooks"
- Mención a `memory-inject (path-based hints)`
- Mención a `Skill('orchestrator-protocol')`
- Tabla de comandos disponibles (incluye `/decide`, `/sync-claude`, `/explain-changes`, `/planner`, `/parallelism-insights`, `/poneglyph-insights`)
- Referencias a `bootstrap-plan-mode.md`, `formatting.md`, `performance.md` (rules ahora reorganizadas)
- Lista de skills mencionando todas las eliminadas

Tras Fases 2.1-2.5, mucho de esto es **mentira**.

### Por qué importa

- **El documento mentiroso** confunde al Lead en futuras sesiones
- **Cualquier referencia rota** (skill/agent que ya no existe) puede causar fallos en runtime
- **Coherencia: si dijimos "5 agents, ~14 skills", el doc debe reflejarlo**
- **CLAUDE.md raíz se carga automáticamente** — su contenido tiene impacto en cada turno

### Cambios necesarios (lista exhaustiva)

| Línea / sección | Cambio |
|---|---|
| Contadores "16 agents, 24 skills, 30+ hooks" | → "5 agents, ~14 skills, 12-13 hooks" (cifra exacta tras ejecución) |
| Mención a `memory-inject (path-based hints)` | Si US-006 = REPAIR (rename): cambiar a `prompt-enrichment (path-based hints + session title)`. Si US-006 = CUT: eliminar la mención |
| Tabla de comandos | Eliminar entradas para comandos cortados (decide, sync-claude, explain-changes, planner, parallelism-insights, posiblemente poneglyph-insights, eval-skill) |
| Referencia a `bootstrap-plan-mode.md` | Cambiar a `bootstrap-lead.md` (US-016) |
| Referencia a `formatting.md` rule | Eliminar; movida a sección de CLAUDE.md (US-017) |
| Referencia a `performance.md` rule | Cambiar a reference de orchestrator-protocol (US-018) |
| Lista de skills | Eliminar las cortadas (6 meta-create, decision-stress-test, 2 reviews fusionadas en review-patterns) |
| Mención a `architect` agent | Eliminar (US-019, ahora cubierto por planner) |
| Cualquier mención a Trigger A/B | Verificar coherencia con bootstrap-lead actualizado (US-021) |
| Sección "Formatting (style guide)" | Añadir si US-017 movió formatting.md aquí |

## Análisis — pros y contras

### Pros de actualizar

- **Documento coherente** con la realidad del sistema post-cortes
- **Previene fallos en runtime** por referencias rotas
- **Refresca la "narrativa"** del sistema — menos agents, skills, hooks, pero mejor justificados

### Contras de actualizar

- **Trabajo administrativo**: 45 min de edición cuidadosa
- **Riesgo de introducir nuevos errores** al editar manualmente
- **Documento puede crecer** al añadir secciones (Formatting, Templates) — vigilar

### Mitigación de contras

- Hacer cambios en bloques claros (sección por sección)
- Diff revisado antes de commit
- Verificar que el doc no supere las 250 líneas (era 212 originalmente)

## Riesgos identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Olvidar actualizar alguna sección (queda mentira) | Alta | Medio | Checklist exhaustivo en pasos técnicos |
| Romper el flujo lógico al editar | Media | Bajo | Leer el doc completo después de los cambios, no solo el diff |
| Introducir nuevas inconsistencias (e.g. mencionar US-016 sin contexto) | Media | Bajo | No referenciar las US en el doc; describir el estado final |
| Contadores incorrectos | Alta | Bajo | Re-contar al final con `Glob` (real, no estimado) |

## Pasos técnicos detallados

### Paso 0 — Pre-requisito: verificar Fases 2.1-2.5 ejecutadas

```bash
Glob .claude/skills/                          # contar carpetas
Glob .claude/agents/                          # contar
Glob .claude/commands/                        # contar
Glob .claude/rules/                           # contar
Read .claude/settings.json                    # contar hooks registrados
```

Documentar los contadores reales:
- Skills: ___
- Agents: ___
- Commands: ___
- Rules: ___
- Hooks registrados: ___

### Paso 1 — Leer `CLAUDE.md` raíz actual (5 min)

```bash
Read CLAUDE.md
```

Identificar todas las secciones a actualizar.

### Paso 2 — Aplicar cambios sección por sección (25 min)

#### Cambio 1: Contadores
```bash
Edit CLAUDE.md
# Buscar y reemplazar:
# "16 agents, 24 skills, 30+ hooks" → cifras reales del Paso 0
```

#### Cambio 2: Actualizar `memory-inject` según veredicto de US-006
- Si US-006 = REPAIR (rename a `prompt-enrichment`): sustituir todas las apariciones del nombre del archivo. La descripción "(path-based hints)" es correcta y se preserva; añadir "+ session title" si se quiere completitud.
- Si US-006 = CUT total: buscar mención a "memory-inject" o "path-based hints" y eliminar.

#### Cambio 3: Actualizar tabla de comandos
Editar tabla para eliminar comandos cortados. Si la tabla queda muy corta, considerar refactor a lista bullet.

#### Cambio 4: Referencias a rules
- `bootstrap-plan-mode.md` → `bootstrap-lead.md` (sección B)
- `formatting.md` rule → eliminar referencia (ahora es sección de este mismo CLAUDE.md)
- `performance.md` rule → "references/09-performance.md de orchestrator-protocol"

#### Cambio 5: Lista de skills
Eliminar todas las cortadas. Añadir las nuevas (`review-patterns`).

#### Cambio 6: Lista de agents
Eliminar `architect`. Verificar que `planner` describe correctamente sus dos modos.

#### Cambio 7: Sección Formatting (si US-017 movió contenido aquí)
Añadir la sección al final con el contenido de `formatting.md`.

#### Cambio 8: Trigger A/B (verificar coherencia con bootstrap-lead actualizado)
Si hay tabla de Trigger B en CLAUDE.md, sincronizar con la actualizada en US-021.

### Paso 3 — Re-lectura completa (5 min)

```bash
Read CLAUDE.md   # leer el documento ya actualizado
```

Verificar que:
- No hay menciones a componentes eliminados
- Los contadores son correctos
- El documento fluye lógicamente
- Tamaño no excede 250 líneas

### Paso 4 — Tests (3 min)

```bash
Bash: bun test ./.claude/hooks/
```

Aunque CLAUDE.md no afecta tests directamente, ejecutar como sanity check.

### Paso 5 — Smoke test (5 min)

Sesión nueva, primer mensaje no trivial. Verificar:
- El Lead no intenta cargar componentes eliminados
- El Lead aplica el flujo (orchestrator-protocol carga correctamente)
- Si se menciona alguna skill en el output del Lead, debe ser una existente

### Paso 6 — Commit (2 min)

```
docs(claude-md): update CLAUDE.md root to reflect post-audit structure

Updates after Phases 2.1-2.5 of the audit:
- Counters: 7→5 agents, 28→~14 skills, 15→12 hooks, 10→5 commands, 7→4 rules
- Removed references to: memory-inject, formatting.md rule, performance.md rule,
  architect agent, 6 meta-create skills, decision-stress-test, 4 wrapper commands
- Added: Formatting style guide section, review-patterns skill, planner Mode A/B
- Synchronized Trigger A/B with bootstrap-lead.md
```

## Criterios de aceptación

- [ ] Contadores en CLAUDE.md reflejan el estado real (verificable con Glob)
- [ ] No hay menciones a componentes eliminados (Grep para cada uno)
- [ ] Lista de comandos refleja solo los que existen en `.claude/commands/`
- [ ] Lista de skills refleja solo las que existen en `.claude/skills/`
- [ ] Lista de agents refleja solo los que existen en `.claude/agents/`
- [ ] Trigger A/B coherente con `bootstrap-lead.md` actualizado
- [ ] Sección Formatting añadida si US-017 lo requirió
- [ ] Tamaño del doc razonable (<250 líneas)
- [ ] Smoke test ok
- [ ] Commit realizado

## Definition of Done

1. CLAUDE.md actualizado integralmente
2. Verificación cruzada con Glob/Grep (no hay menciones a inexistentes)
3. Smoke test ok
4. Commit
5. Frontmatter `status: completed`

## Rollback plan

```bash
git revert <hash>
# Restaura CLAUDE.md anterior (inconsistente con el estado real del sistema)
```

**Caveat**: el rollback de CLAUDE.md no restaura los componentes eliminados, por lo que el documento revertido será inconsistente. El rollback útil aquí es solo si el diff actual fue mal hecho — en ese caso, mejor reescribir que revertir.

## Checklist de verificación final

Antes de commit:

- [ ] `Grep "memory-inject" CLAUDE.md` → 0 (siempre, tras US-006; si REPAIR debe aparecer `prompt-enrichment` en su lugar; si CUT no debe aparecer ningún nombre)
- [ ] `Grep "decision-stress-test" CLAUDE.md` → 0 (US-013)
- [ ] `Grep "code-quality\\|security-review\\|performance-review" CLAUDE.md` → 0 referencias huérfanas, sí referencia a `review-patterns`
- [ ] `Grep "meta-create" CLAUDE.md` → 0
- [ ] `Grep "architect" CLAUDE.md` → solo `extension-architect` o `planner Mode B`, no el agent `architect`
- [ ] `Grep "/parallelism-insights\\|/eval-skill" CLAUDE.md` → 0
- [ ] `Grep "bootstrap-plan-mode" CLAUDE.md` → 0 (ahora `bootstrap-lead`)
- [ ] `Grep "formatting.md\\|performance.md" CLAUDE.md` → 0 referencias a rules eliminadas

## Notas

- Esta historia es la que **cosecha el trabajo** de las anteriores. Sin actualizar CLAUDE.md, los cortes están hechos pero el doc miente
- Considerar dividir en sub-commits si las secciones son grandes (e.g. uno por categoría: contadores, comandos, skills, agents, rules)
- Tras esta historia, US-024 puede ejecutar la verificación end-to-end del sistema entero
- Si tras el smoke test del Paso 5 el Lead empieza a cargar componentes inexistentes, eso indica que falta corregir alguna sección — no avanzar hasta que el smoke test pase limpio
