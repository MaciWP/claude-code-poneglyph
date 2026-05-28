---
us: US7
title: Skill `retro` (Fase 5) — sin wrapper command + living-spec loop
wave: W2
depends_on: [US1]
tdd_mode: optional
estimate: M
status: implemented
approved: 2026-05-28
implemented: 2026-05-28
---

# US7 — `retro` skill + `/retro` command (Fase 5)

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | ✅ implemented (2026-05-28) |
| **Wave** | W2 (paralelo con US2-US6) |
| **Depends on** | US1 |
| **Blocks** | US8 |
| **Files touched** | crear `.claude/skills/retro/SKILL.md` (NO wrapper command — docs Anthropic 2026) |
| **TDD-mode** | optional |
| **Estimate** | M |
| **Cómo arrancar** | Read `spec.md` + `tasks/` + `review.md` + `state.json` → drillme retrospectivo → producir `retro.md` con promociones |
| **Decisión absorbida** | — (living-spec loop es feature nueva, no decisión sobre legacy) |

## User story

- **As a**: developer que cerró una feature (review.md APPROVED)
- **I want**: una skill que capture lecciones + proponga qué promover a poneglyph global vs proyecto local
- **So that**: el conocimiento persiste entre sesiones y el sistema se mejora a sí mismo (Commandment IX + X)

## Acceptance criteria

- **AC1**: Given Fase 4 cerrada (review.md APPROVED), when se invoca o auto-activa, then `retro` arranca.
- **AC2**: Given la skill activa, when produce `retro.md`, then incluye: Resumen, Lecciones técnicas (✅/❌), Proceso (fricción, fase más pesada), Promociones candidatas, Living-spec deltas, Commandments check, Action items.
- **AC3**: Given lecciones identificadas reusables, when se proponen como promoción, then tabla con `candidate × scope (global/local/memory) × tipo (skill/rule/hook/command) × razón × propuesta concreta (path + diff)`.
- **AC4**: Given el proceso Fase 1-4, when detecta algún Commandment violado, then lo reporta honestamente (sin softening — Commandment I).
- **AC5** (living-spec loop): Given delta legítimo entre `spec.md` original y lo entregado, when existe, then propone update a `spec.md` (no edita automático — propone diff para aprobación). Razón explícita en `retro.md`.
- **AC6**: Given `retro.md` producido, when cierra, then frontmatter de `spec.md`/`tasks/index.md` pasa a `status: closed`.

## Files a crear

| Path | Contenido |
|---|---|
| `.claude/skills/retro/SKILL.md` | Skill markdown |
| `.claude/commands/retro.md` | Wrapper |

## Frontmatter de la skill

```yaml
---
name: retro
description: |
  Post-feature retrospective: extracts lessons, proposes promotions
  (global poneglyph layer vs project local vs only-memory), closes
  living-spec loop (deltas spec.md ↔ implementation), audits commandments
  compliance. Closes the feature lifecycle.
  Use when: review.md APPROVED, feature done, "retro", "aprender",
  "retrospectiva", "qué hemos aprendido".
  Keywords - retro, retrospectiva, aprender, learn, capturar, promover,
  living-spec, lecciones, mejoras
disable-model-invocation: false
---
```

## Workflow detallado

1. **Read** `spec.md` + `tasks/` + `tests.md` + `review.md` + `state.json`.
2. **Resumen ejecutivo**: 1-2 párrafos. Qué se hizo, cómo salió.
3. **Lecciones técnicas**: enumerar (a) ✅ Funcionó patrón X (por qué); (b) ❌ No funcionó Y (por qué).
4. **Proceso**: qué fase pesó más + razón; fricción evitable; drillme útil/inútil.
5. **Drillme Fase 5** (las 5):
   - **Drill 1**: ¿Qué fase pesó más de lo necesario?
   - **Drill 2**: ¿Hubo fricción evitable?
   - **Drill 3**: ¿Surgió un patrón reusable más allá de esta tarea?
   - **Drill 4**: ¿Es promovible a `~/.claude/` global o solo a este proyecto?
   - **Drill 5**: ¿Algún Commandment se violó en el camino sin que se note?
6. **Promociones candidatas**: tabla. Usuario aprueba qué promover.
7. **Living-spec loop**:
   - Comparar `spec.md` aprobado original vs lo entregado.
   - Si hay delta legítimo (necesario, no error) → escribir el diff propuesto en `retro.md`.
   - **NO editar `spec.md` automáticamente** — propuesta para aprobación humana.
   - Criterio "legítimo" (a refinar en implementación): el delta resuelve un edge case real descubierto en Fase 3-4 + no contradice la intención original + se documenta el por qué.
8. **Commandments check**: tabla 10 commandments × cumplido en esta tarea? Si alguno NO → explicar.
9. **Action items**: lista con dueño (usuario / Lead / sesión futura).
10. **Producir `retro.md`** rellenando `templates/retro.template.md` (de US1).
11. **Actualizar** frontmatter `spec.md` y `tasks/index.md` a `status: closed`.
12. **Reportar** al usuario: resumen + tabla de promociones para aprobación.

## Drillme block (literal)

```markdown
## Drillme — Phase 5 (retrospective)

1. **Phase too heavy?** Which phase weighed more than it needed to?
2. **Avoidable friction?** Was there friction that didn't add value?
3. **Reusable pattern?** Did a pattern emerge that's reusable beyond this task?
4. **Global vs local?** Is this promotable to ~/.claude/ global or just this project?
5. **Commandment violated silently?** Did any Commandment get violated without noticing?

> **For full Socratic check, invoke the `drillme` skill** (US11). The 5 questions above are phase-specific (retro lens); drillme provides the canonical 4-category catalog applicable to any retro decision. Do NOT duplicate the canon here.
>
> Skill→skill invocation is probabilistic — if drillme does not auto-fire, the Lead invokes `/drillme "Phase 5 retro of <NNN-slug>"` manually before declaring the feature closed.
```

## SIEMPRE rules

- Honestidad sobre lo que NO funcionó (Commandment I — radical honesty).
- Si hay algo a mejorar en el proceso → preguntar o mencionarlo.

## Commandments cubiertos

| # | Cómo |
|---|---|
| I | Honest sobre fallos del proceso y del producto |
| IX | Observabilidad + self-improvement (auto-aprendizaje formal) |
| X | Promociones mantienen poneglyph sano |

## Reutiliza

- Sistema `auto-memory` del Lead (escribe insights en MEMORY.md cuando aplica).
- `anti-hallucination` (verificar promociones antes de proponerlas — el path existe, el nombre no choca).

## Living-spec loop — detalle (gap único de poneglyph)

Ningún framework SDD existente (spec-kit, Pimzino, etc.) tiene este loop. Poneglyph lo aporta.

**Criterio "delta legítimo"**:
- El delta resuelve un edge case real descubierto en Fase 3 o 4.
- NO contradice la intención original del spec (verificar drillme drill 5).
- Se documenta el por qué (no es change-of-mind sin razón).

**Output del loop**:
- Sección "Living-spec deltas" en `retro.md` con: sección de `spec.md` afectada + diff propuesto + razón.
- **Acción**: el usuario aprueba el diff → `spec.md` se actualiza con nota "v2 — delta de retro 001 (motivo X)".

## Adaptación intra-fase

| Señal | Adaptación |
|---|---|
| Retro tras Fase 4 light (feature trivial) | Retro corta: resumen + 1-2 lecciones + 0-1 promociones. Saltar drillme exhaustivo + commandments check |
| Retro tras feature arquitectural | Retro completa con drillme + promociones + living-spec loop |
| Feature con violación Commandment evidente | Sección dedicada "Lessons learned from commandment X violation" |

## Casos edge

- **Edge 1**: `review.md` BLOCKED → no producir retro; escalar.
- **Edge 2**: Spec.md original ya no existe (borrado) → trabajar solo sobre lo entregado + nota en retro.
- **Edge 3**: Promoción candidata ya existe (skill con mismo nombre en `~/.claude/`) → smell, proponer rename o merge.

## Smell signals

- ⚠️ Si retros consecutivos no proponen ninguna promoción → smell — o el sistema está perfecto (improbable) o el retro no es honesto.
- ⚠️ Si `retro.md` no menciona ninguna fricción → smell similar.
- ⚠️ Si living-spec deltas aparecen en >50% retros → la Fase 1 está mal hecha (spec demasiado superficial); revisar criterios de `scope-definer`.

## Verificación post-implementación

- Smoke: invocar `/retro` con feature cerrada → produce `retro.md` válido.
- Verificar que `status: closed` se aplica a spec/tasks tras retro.
- Si hay living-spec delta → el spec.md se actualiza solo tras aprobación humana, no automáticamente.

## Open questions (implementación)

- ¿Promociones a global se aplican automático tras aprobación (escribir el archivo) o se generan como propuesta PR-like? — empezar con propuesta manual.
- ¿`retro.md` queda inmutable post-cierre o se puede editar manualmente después?

## Closeout (2026-05-28)

US sin decisión absorbida (la única limpia de W2 phase skills). Living-spec loop formalizado como feature nueva.

**Entregables**:

| Path | Estado | Notas |
|---|---|---|
| `.claude/skills/retro/SKILL.md` | Creado (438 líneas) | Frontmatter empírico; 14-step workflow; 8 secciones del retro.md (Summary/Lessons/Process/Drillme/Promotions/Living-spec/Commandments/Action items); 5 auxiliary skills block; embedded fallback si `retro.template.md` falta |
| `.claude/commands/retro.md` | NO creado | Docs Anthropic 2026: skill name = command name; `/retro` resuelve directo |

**Open Q resueltas**:

1. **Auto-apply promociones tras aprobación**: NO. La skill produce candidatas; el usuario aprueba; el Lead (no la skill) escribe el archivo target con su default-allow gate (o delega a `builder` si ≥5 archivos / arquitectural). Documentado en Step 14 + Edge 5.
2. **Inmutabilidad post-cierre de `retro.md`**: editable post-cierre. La skill no impone inmutabilidad; las acciones aprobadas tras el cierre actualizan `promotions_approved` counter del frontmatter.
3. **Criterio "delta legítimo" formalizado** (Step 9): 3 condiciones AND — (a) real edge case Phase 3/4, (b) no contradice spec.md intent, (c) rationale documentado en retro.md §Living-spec deltas.

**Living-spec loop ratificado**: consume `review.md.frontmatter.spec_drift` clasificado por `critic` en Phase 4. 4 ramas: `none` (skip), `legitimate` (propose diff), `scope_creep` (log ❌, no spec update), `skipped_ac` (log ❌ + opciones).

**Promotion scope matrix ratificado**: global (`~/.claude/`) cross-project / local (`.claude/`) project-specific / memory (`MEMORY.md`) one-off.

**Verificación post-impl**:
- `bun test ./.claude/hooks/` → 81/81 ✅
- Harness registra `/retro` con metadata empírica ✅
- Auxiliaries (anti-hallucination, drillme, explain-changes, meta-create, meta-settings-cookbook) disponibles ✅
- NO `commands/retro.md` creado — patrón canónico nuevo ✅

**Smoke**: invocar `/retro` no aplica hasta que una feature llegue a Phase 5 (dogfooding US10 + orquestación US8 `/flow`).
