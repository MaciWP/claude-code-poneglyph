---
id: US-023
phase: 2.6
status: completed
estimate: 20m
blocks: []
blockedBy: []
priority: low
risk: very-low
---

> Executed 2026-05-25 (this session, no repo commit — memory lives at `C:/Users/Maci/.claude/projects/D--PYTHON-claude-code-poneglyph/memory/`).
>
> **Scope ampliado**: la US-023 original solo proponía registrar la decisión del audit. Se ejecutó con limpieza agresiva además: 9 archivos → 7. Eliminados (no aportan al proyecto de orquestación): `reference_cachyos_efi_size.md` (info personal Linux), `user_hardware.md` (hardware no afecta a Claude Code), `project_expertise_decide_tiered.md` (obsoleto — agent-scoring eliminado en US-002, active-listener nunca existió). Creado: `project_audit_outcome_2026-05-25.md` con resumen real de esta sesión. MEMORY.md reescrito como índice limpio (sin contenido inline duplicado).

# US-023 · Registrar la decisión y racional en `MEMORY.md` global

## Historia

**Como** mantenedor del sistema poneglyph
**Quiero** dejar registro persistente en la memoria global de qué se cortó y por qué
**Para** que futuras sesiones de Claude Code (y el yo del futuro) entiendan el porqué de la nueva estructura

## Contexto extendido

### Evidencia recogida

- Memoria global ubicada en `C:\Users\Maci\.claude\projects\D--PYTHON-claude-code-poneglyph\memory\`
- Ya contiene 12+ archivos de memoria (`feedback_*.md`, `project_*.md`, `user_hardware.md`, etc.)
- Index en `MEMORY.md` con líneas tipo `- [Title](file.md) — one-line hook`
- Sin esta historia, el racional de la auditoría queda solo en `PONEGLYPH-AUDIT.md` y en commits — no se inyecta automáticamente en futuras sesiones

### Por qué importa

- **Continuidad cognitiva**: en 3 meses, "por qué se cortó X" puede no recordarse
- **Prevención de re-introducción**: alguien (incluido tú mismo) podría re-añadir un componente cortado sin saber por qué se cortó la primera vez
- **Knowledge management**: el aprendizaje de la auditoría debe ser permanente, no efímero

### Entrada sugerida

Crear archivo `project_audit_replanteo_2026-05-22.md`:

```markdown
---
name: project-audit-replanteo-2026-05-22
description: Auditoría completa del sistema poneglyph — qué se cortó, por qué, métricas antes/después
metadata:
  type: project
---

# Replanteo poneglyph — 2026-05-22

## Contexto
Sistema con 7 agents, 28 skills, 25 hooks, 10 commands, 25K LOC. Coste por sesión alto (Opus + 3 Explore paralelos = $237 en 1 sesión registrada). Smoking guns: trace-logger 31 días sin escribir, memoryBytes:0 en spawns, error-patterns 0 fixes, insights HTML 52 días sin generar.

## Decisión
Corte agresivo (Fases 1+2). Eliminación de componentes diseñados pero no ejecutándose.

## Qué se cortó / consolidó (lista no exhaustiva — ver PONEGLYPH-AUDIT.md)
- Hooks: parallelism-metrics, memory-inject (si US-003 confirmó inactivo), validate-file-contains
- Commands: 4 wrappers (decide, sync-claude, explain-changes, planner) + eval-skill (merged)
- Skills: 6 meta-create-*, 3 reviews → review-patterns, decide+decision-stress-test → decide --depth
- Rules: formatting.md (movida a CLAUDE.md), performance.md (merged en orchestrator-protocol), bootstrap-plan-mode (merged en bootstrap-lead)
- Agents: architect (consolidated → planner Mode B), scout (degraded — Explore is default)

## Qué se mantuvo
- 5 agents: builder, reviewer, planner (+Mode B), scout (degraded), extension-architect (ampliado)
- 12-14 skills core
- ~12 hooks
- 5 commands
- 4 rules

## Resultado esperado
- LOC: 25K → ~15K (-40%)
- Coste por sesión: -15% a -30% (hipótesis a verificar tras 1 semana)
- "Componentes ejecutándose / componentes diseñados": ~50% → ~95%

## Lecciones aprendidas
- Diseño elegante ≠ ejecución útil — los hooks de memoria llevaban meses sin inyectar nada y nadie lo sabía
- Observatorio sin uso es ruido: el dashboard HTML no se mira → no se necesita
- Anthropic recomienda 1-3 agents, 5-8 skills; setups más complejos requieren justificación demostrable

## Para NO re-introducir sin evidencia
- Memory inject de subagents (es por diseño imposible vía hooks UserPromptSubmit)
- Metrics que no se miran semanalmente
- Skills meta-create-* (el agent extension-architect cubre)
- Reviews especializadas separadas (review-patterns con --mode las cubre)
```

## Análisis — pros y contras

### Pros de registrar en memoria

- **Knowledge persistente** entre sesiones
- **Prevención de regresión**: futuras sesiones que sugieran "añadamos métricas" verán la nota y considerarán el porqué se quitaron
- **Auto-documentación del sistema**: el sistema explica su propia evolución

### Contras

- **Trabajo administrativo**: 20 min
- **El archivo de memoria se queda obsoleto** si en 6 meses el sistema cambia de nuevo (mitigación: actualizar entonces)

## Pasos técnicos detallados

### Paso 1 — Decidir el nombre y tipo (3 min)

Sugerencia: `project_audit_replanteo_2026-05-22.md` (tipo `project` por la naturaleza de la decisión)

### Paso 2 — Crear el archivo (10 min)

```bash
Write C:\Users\Maci\.claude\projects\D--PYTHON-claude-code-poneglyph\memory\project_audit_replanteo_2026-05-22.md
```

Contenido según plantilla del Contexto.

### Paso 3 — Actualizar `MEMORY.md` index (3 min)

```bash
Edit C:\Users\Maci\.claude\projects\D--PYTHON-claude-code-poneglyph\memory\MEMORY.md
```

Añadir línea al final:

```markdown
## Replanteo Poneglyph (2026-05-22)
- [Auditoría y cortes](project_audit_replanteo_2026-05-22.md) — sistema reducido de 25K → 15K LOC; smoking guns + decisión corte agresivo Fases 1+2
```

### Paso 4 — Verificar feedback memories aún relevantes (3 min)

Algunos archivos en memoria pueden estar obsoletos tras los cortes:
- `feedback_no_ask_edit_permission.md` → sigue siendo relevante
- `feedback_shebang_hooks.md` → relevante (sobre hooks que existan)
- `feedback_verify_before_denying_existence.md` → siempre relevante

Si alguno se vuelve irrelevante (e.g. menciona un agent eliminado), actualizar o marcar.

### Paso 5 — Commit (1 min)

```
docs(memory): record audit decisions for future sessions

- New: project_audit_replanteo_2026-05-22.md
- Updated: MEMORY.md index

Captures: what was cut, why, and what NOT to re-introduce without evidence.
```

## Criterios de aceptación

- [ ] Archivo `project_audit_replanteo_2026-05-22.md` existe con contenido completo
- [ ] `MEMORY.md` index actualizado con entrada al nuevo archivo
- [ ] Memorias obsoletas marcadas o actualizadas (si las hay)
- [ ] Smoke test (opcional): sesión nueva, primer mensaje "qué cambios recientes hubo en el sistema poneglyph" → el Lead debe mencionar la auditoría (vía auto-memory)
- [ ] Commit realizado

## Definition of Done

1. Archivo de memoria creado
2. MEMORY.md index actualizado
3. Commit
4. Frontmatter `status: completed`

## Rollback plan

```bash
git revert <hash>
```

Trivial — no afecta ejecución del sistema, solo documentación.

## Notas

- La memoria global se inyecta automáticamente como `# auto memory` block en CLAUDE.md → futuras sesiones lo verán sin esfuerzo
- Si el archivo crece (>50 líneas), considerar partirlo en sub-archivos referenciados desde el principal
- Esta historia es **independiente** del orden — puede ejecutarse en cualquier momento de Fase 2.6, incluso antes de US-022 si quieres registrar el racional antes de que el doc raíz cambie
