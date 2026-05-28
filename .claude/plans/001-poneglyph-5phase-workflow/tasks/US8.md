---
us: US8
title: Command `/flow` orquestador + decisión `orchestrator-protocol` (SIMPLIFICAR ratificado)
wave: W3
depends_on: [US2, US3, US4, US5, US6, US7]
tdd_mode: optional
estimate: L
status: closed
approved: 2026-05-28
implemented: 2026-05-28
closed: 2026-05-28
absorbs_decision: orchestrator-protocol skill (SIMPLIFICAR ratificado)
ratified_decision: |
  SIMPLIFICAR — orchestrator-protocol mantiene su núcleo turn-level (5-step Lead
  protocol) + 5 references útiles (01/03/04/05/06). CUT 3 references obsoletas/
  duplicadas: 02-prompt-scoring (-> prompt-engineer skill), 07-delegation-recovery
  (-> error-recovery.md rule), 08-output-style (-> output-styles/poneglyph.md).
  /flow command es feature-level (multi-turn lifecycle); orchestrator-protocol
  es turn-level (Lead 5-step per turn). Complementarios, no redundantes.
---

# US8 — Command `/flow` orquestador

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | ✅ implemented (2026-05-28) |
| **Wave** | W3 |
| **Depends on** | US2-US7 (las 6 skills deben existir) |
| **Blocks** | US9 (CLAUDE.md update espera saber si orchestrator-protocol queda) |
| **Files touched** | crear `.claude/commands/flow.md` (+ posible `flow.ts`); condicional sobre `.claude/skills/orchestrator-protocol/` |
| **TDD-mode** | optional (testeable en US10 dogfooding) |
| **Estimate** | L |
| **Cómo arrancar** | Parsear flags `--minimal/--standard/--full` → estimar triaje → crear `.claude/plans/{NNN}-{slug}/` → encadenar skills US2-US7 según modo + gates |
| **Decisión absorbida** | `orchestrator-protocol` skill: CUT / SIMPLIFICAR / KEEP |

## User story

- **As a**: developer que quiere aplicar el workflow completo a una tarea
- **I want**: un único command que dispara las 5 fases en orden con triaje + gates apropiados
- **So that**: no tengo que invocar 5 commands manuales ni recordar el orden de las skills

## Acceptance criteria

- **AC1**: Given `/flow <task>` sin flag, when se invoca, then estima complejidad y resuelve triaje (minimal/standard/full) declarándolo en el output.
- **AC2**: Given `/flow --minimal|--standard|--full <task>`, when se invoca, then fuerza el nivel.
- **AC3**: Given triaje resuelto, when ejecuta, then crea `.claude/plans/{NNN}-{slug}/` (excepto modo minimal) y encadena fases según el modo.
- **AC4**: Given fase con hard gate (1→2 o 2→3), when llega, then pausa con `AskUserQuestion` o mensaje al usuario para aprobación.
- **AC5**: Given sesión interrumpida (cerrada antes Fase 5), when se reabre con `/flow --resume <slug>`, then lee `state.json` y continúa.
- **AC6**: Given todas las fases cerradas, when termina, then reporta resumen + paths de artefactos + status final.
- **AC7** (decisión absorbida): Given `/flow` operativo, when se compara con `orchestrator-protocol` skill (116 líneas + references 01-08), then se ejecuta UNA de tres:
  - **CUT** si `/flow` cubre 100% (incluyendo verification, complexity routing, agent selection).
  - **SIMPLIFICAR** si quedan references valiosos (ej. prompt-scoring, agent-selection matrices) no cubiertos por `/flow` — reescribir SKILL.md a su núcleo.
  - **KEEP** si la skill es referencia complementaria al command.

## Files a crear

| Path | Contenido |
|---|---|
| `.claude/commands/flow.md` | Command markdown con frontmatter + instrucciones al Lead para encadenar skills |
| (opcional) `.claude/commands/flow.ts` | Script de orquestación si la lógica condicional excede capacidad markdown |

## Files condicionales (decisión AC7)

| Path | Acción |
|---|---|
| `.claude/skills/orchestrator-protocol/` | CUT (rm -rf) / SIMPLIFICAR (editar SKILL.md + references) / KEEP (sin cambio) |
| Refs en CLAUDE.md, bootstrap-lead.md, otros | Update si cortada/simplificada |

## Workflow del command

1. Parsear `$ARGUMENTS`:
   - Detectar flag `--resume <slug>`: si sí → ir a paso 4.
   - Detectar flag `--minimal|--standard|--full`: si sí → forzar mode.
   - Si no hay flag → estimar complejidad (heurística: # archivos mencionados, # dominios, palabras-clave de arquitectura).
2. **Si mode = minimal**: invocar `story-executor` directamente con el prompt + ejecutar Fase 4 light al cerrar. Sin directorio creado.
3. **Si mode = standard/full**:
   - Generar `NNN-slug`, crear `.claude/plans/{NNN}-{slug}/`.
   - Invocar `scope-definer` (US2) → produce `spec.md`.
   - **Pausa hard gate 1→2** (AskUserQuestion: "Aprobar spec.md? [yes/refine]").
   - Invocar `tech-planner` (US3) → produce `tasks/`.
   - Invocar `tdd-designer` (US4) → produce `tests.md`.
   - **Pausa hard gate 2→3** (AskUserQuestion: "Aprobar tasks + tests? [yes/refine]").
   - Loop HUs: invocar `story-executor` (US5) por cada HU del DAG respetando deps.
   - Invocar `critic-reviewer` (US6) → produce `review.md`.
   - Si NEEDS_CHANGES → vuelta a Fase 3 (HUs específicas).
   - Invocar `retro-learner` (US7) → produce `retro.md`.
4. **Si --resume**: Read `state.json` del `<slug>` → continuar desde `current_phase`.
5. **Actualizar `state.json`** en cada transición de fase.
6. **Reportar** paths + status final.

## Decisión AC7 — análisis

Tras Read `orchestrator-protocol/SKILL.md` (116 líneas):

| Sección de orchestrator-protocol | Cubierto por `/flow`? |
|---|---|
| §1 Verification principles | Parcial — `/flow` verifica artefactos pero no detalla principios |
| §2 5-step checklist | Sí — `/flow` lo encadena |
| Complexity routing | Sí — triaje minimal/standard/full |
| Agent selection (references/04) | Parcial — `/flow` decide invocar agents según AC7 de US5/US6 |
| Skill matching (references/05) | NO — sigue siendo útil como matriz keyword→skill |
| Context Arch H (references/06) | Obsoleto (premisa Arch H era falsa según research) |
| Delegation recovery (references/07) | Parcial — solapa con `diagnostic-patterns` skill |

**Veredicto propuesto**: **SIMPLIFICAR** — mantener `orchestrator-protocol/SKILL.md` reescrita a su núcleo (verification principles + skill matching matrix); cortar references que son obsoletos (Arch H) o duplicados (delegation recovery → diagnostic-patterns). Resultado: SKILL.md de ~50 líneas + 1-2 references útiles.

Alternativa: CUT total si `/flow` + `tech-planner` + `diagnostic-patterns` + skill-matching rule cubren todo. Decidir empíricamente en implementación.

## SIEMPRE rules

- Hard gates humanos en 1→2 y 2→3 (no automáticos).
- Soft checkpoints en resto (3→4, 4→5).
- Cuestionario al usuario si triaje es ambiguo (mode no claro).

## Commandments cubiertos

| # | Cómo |
|---|---|
| III | Triaje adaptativo evita ceremonia |
| IV | Hard gates aseguran aprobación humana |
| VII | Encadenado eficiente; paralelo donde aplica (W2 de las HUs del DAG) |
| X | Orquesta sin acumular complejidad |

## Reutiliza

- Las 6 skills US2-US7.
- `decision-stress-test` (si tech-planner lo invoca en modo full).
- `diagnostic-patterns` (si surgen fallos durante el flujo).

## Adaptación intra-fase

| Mode | Adaptación |
|---|---|
| minimal | Salta Fase 1+2+2.5; Fase 3 directo; Fase 4 light; Fase 5 corta (o saltada) |
| standard | 5 fases con drillme normal; 1 hard gate humano (1→2 y 2→3) |
| full | 5 fases con drillme profundo + agentes producto background F1 + decision-stress-test F2 |

## Casos edge

- **Edge 1**: `/flow --resume <slug>` pero `state.json` corrupto → fallback a leer artefactos existentes + reconstruir estado.
- **Edge 2**: Hard gate 1→2 rechazado por usuario → refinar Fase 1; permitir múltiples iteraciones.
- **Edge 3**: NEEDS_CHANGES en review.md → identificar HU específica, no rehacer todo.
- **Edge 4**: Usuario invoca `/flow` mid-conversación cuando ya hay `spec.md` activo → reusar o crear nuevo slug? Probablemente preguntar.

## Smell signals

- ⚠️ Si triaje siempre resuelve `full` → la heurística de complejidad está mal calibrada.
- ⚠️ Si hard gate 2→3 falla en >50% casos → tech-planner está produciendo HUs mal definidas.
- ⚠️ Si `/flow` se usa <20% del tiempo (vs auto-activación de skills sueltas) → revisar si el orquestador aporta valor.

## Verificación post-implementación

- Smoke: `/flow "feature mini"` → ejecuta minimal o standard según heurística.
- Smoke: `/flow --standard "feature acotada"` → 5 fases completas con 2 hard gates.
- Smoke: `/flow --resume 001-foo` → continúa desde state.json.
- Si decisión AC7 = CUT/SIMPLIFICAR: refs a `orchestrator-protocol` actualizadas en CLAUDE.md, bootstrap, etc.

## Open questions (implementación)

- `/flow` declarativo (markdown) o `.ts`? Probar declarativo primero; si la lógica condicional (resume, gate handling) se vuelve compleja → `.ts`.
- ¿Estimación de complejidad: heurística (# archivos) o el Lead estima por inspección del prompt? — empezar manual + recoger datos.
- ¿`state.json` versionado en git o gitignored? Probablemente gitignored (work-in-progress).

## Closeout (2026-05-28)

**AC7 ratificado**: SIMPLIFICAR `orchestrator-protocol`.

### Análisis empírico

`/flow` y `orchestrator-protocol` NO se solapan al 100%:
- `/flow` = **feature-level** orchestration (multi-turn, 5 phases, artefactos en plans/).
- `orchestrator-protocol` = **turn-level** orchestration (Lead 5-step per turn: Triage/Complexity/Context/Delegate/Validate).

Cortar = romper bootstrap del Lead (post-compact.ts hook + CLAUDE.md raíz dependen de la skill). KEEP = ceremonia (8 refs cuando 5 alcanzan).

### Cortes ejecutados

| Ref | Veredicto | Razón / canonical source |
|---|---|---|
| `01-verification.md` | KEEP | Turn-level anti-hallucination — Lead lo necesita |
| `02-prompt-scoring.md` | **CUT** | Duplicado de `prompt-engineer` skill (4-context coverage) |
| `03-complexity-routing.md` | KEEP | Tiered/team/worktree mode no replicados en `/flow` |
| `04-agent-selection.md` | KEEP | Exploration matrix (Explore vs scout) no replicada |
| `05-skill-matching.md` | KEEP | Keywords→skills mapping (Arch H) |
| `06-context-arch-h.md` | KEEP | Delegation prompt template (Arch H canonical) |
| `07-delegation-recovery.md` | **CUT** | Duplicado de `.claude/rules/error-recovery.md` |
| `08-output-style.md` | **CUT** | Duplicado de `.claude/output-styles/poneglyph.md` |

### Open Q resueltas

1. **Declarativo vs .ts**: declarativo (`.claude/commands/flow.md`) suficiente. Lógica condicional (resume, gates, mode dispatch) implementable en markdown que el Lead lee + ejecuta. No se introduce `.ts`.
2. **Estimación complejidad**: heurística simple en `flow.md` Step 2 (sentence length + file count hint + arquitectura keywords). Empezar manual; recoger datos en US10 dogfooding.
3. **`state.json` en git**: gitignored (work-in-progress per-feature). Si una feature cerrada (`feature_closed: true`) interesa preservar → commit explícito a discreción del usuario.

### Entregables

| Path | Estado | Notas |
|---|---|---|
| `.claude/commands/flow.md` | Creado (~500 líneas) | Frontmatter (description + argument-hint + allowed-tools); 7-step workflow declarativo; state.json schema canonical; 3 modes (minimal/standard/full); hard gates 1→2 y 2→3 con AskUserQuestion; edge cases + smell signals |
| `.claude/skills/orchestrator-protocol/SKILL.md` | Reescrita (~100 líneas) | Cross-ref explícita a `/flow` (turn-level vs feature-level); content map actualizado (5 refs KEEP); sección "Removed references" documenta el corte y dónde vive ahora cada conocimiento |
| `.claude/skills/orchestrator-protocol/references/02-prompt-scoring.md` | **CUT** | `git rm` (preserva historia) |
| `.claude/skills/orchestrator-protocol/references/07-delegation-recovery.md` | **CUT** | `git rm` |
| `.claude/skills/orchestrator-protocol/references/08-output-style.md` | **CUT** | `git rm` |
| `CLAUDE.md` (raíz) | Modificada | 2 líneas: ref output-style (línea 41) → poneglyph.md; tabla mapping legacy (línea 203) actualizada con 2 entradas nuevas (delegation-recovery → error-recovery.md, output-style → poneglyph.md) |

### Verificación post-impl

- `bun test ./.claude/hooks/` → 81/81 ✅
- Harness registra `/flow` command ✅
- Harness registra `orchestrator-protocol` skill actualizada (description refleja "turn-level" + cross-ref a /flow) ✅
- 5 references KEEP siguen presentes (`Glob .claude/skills/orchestrator-protocol/references/*.md` → 5 archivos) ✅
- post-compact.ts hook continuará re-invocando `Skill('orchestrator-protocol')` post-compaction sin romperse ✅

### Smoke pendiente

Smoke real ocurrirá en US10 (dogfooding): `/flow "feature mini"` → ejecuta minimal; `/flow --standard "feature acotada"` → 5 fases completas con 2 hard gates; `/flow --resume 001-foo` → continúa desde state.json. Documentado en US10.
