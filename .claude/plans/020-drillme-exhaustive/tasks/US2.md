---
us: US2
title: Alinear references de drillme (01/02/03/04) al modelo exhaustivo-híbrido
wave: W2
depends_on: [US1]
tdd_mode: optional
estimate: M
status: closed
approved: <pending hard gate 2->3>
---

# US2 — Alinear references de drillme al modelo exhaustivo-híbrido

## Execution prompt (Phase 3 input)

**Task**: Actualizar las 4 references de drillme para que sean coherentes con el modelo exhaustivo-híbrido definido en US1.
**Context**: `.claude/skills/drillme/references/{01-catalog-socratic,02-complementary-patterns,03-phase-questions,04-quality-check}.md` (las 4 leídas en sesión). El cambio de mayor calado es `04-quality-check.md`: hoy cierra con "≥80% Concrete / max 3 iteration rounds" — debe pasar a **freno flojo por degradación** + **epistémico/aleatorio** + **bake-loop**. `01-catalog-socratic.md` tiene una "Coverage calibration" graduada (trivial 1-2 … high 4-7) que contradice el exhaustivo. `02` cierra con "works well 80% of the time".
**Constraints**: English. NO rediseñar los phase banks de `03` (spec out-of-scope) — solo **ampliarlos** con preguntas laterales/edge si aporta. Mantener coherencia literal con la recipe de US1 (mismas categorías, mismo vocabulario). Re-leer cada fichero antes de Edit (linter).
**Deliverable**: las 4 references alineadas: `04` con loop hasta cerrar-gaps + soft-stop por degradación + epistémico/aleatorio + bake; `01` con coverage-checklist (no tabla graduada por nº); `02` sin el "80%"; `03` ampliado con laterales (opcional, mínimo).
**Verify**: `grep -rn "≥80%\|max 3 iteration\|works well 80\|over-engineering" references/` → vacío o justificado; coherencia de vocabulario con SKILL.md de US1.
**Ask first**: nothing — alineación mecánica al modelo de US1.

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W2 |
| **Depends on** | [US1] |
| **Blocks** | none |
| **Files touched** | `references/01-catalog-socratic.md`, `02-complementary-patterns.md`, `03-phase-questions.md`, `04-quality-check.md` |
| **TDD-mode** | optional |
| **Estimate** | M |
| **Cómo arrancar** | Re-leer US1 SKILL.md cerrado + las 4 references; alinear una a una |
| **Decisión absorbida** | — |

## User story

- **As a**: drillme (al cargar sus references)
- **I want**: que el detalle de catálogo, patrones, phase banks y evaluación de respuestas case con el modelo exhaustivo-híbrido
- **So that**: no haya contradicción interna entre SKILL.md y sus propias references

## Acceptance criteria

- **AC1**: Given `04-quality-check.md`, when se lee el closing criterion, then es **freno flojo por degradación** (evasivas repetidas / rubber-stamping / goalposts) + gaps irreducibles `[OPEN]`, no "≥80% / max 3 rounds".
- **AC2**: Given `04`, when se evalúa una respuesta, then distingue duda epistémica (re-preguntar) de aleatoria (marcar `[OPEN]`, no insistir) y documenta el **bake-loop** (escribir respuestas en el artefacto).
- **AC3**: Given `01-catalog-socratic.md`, when se lee "Coverage calibration", then es una **checklist de cobertura** por categorías (incluidas laterales/edge), no una tabla graduada por número de preguntas.
- **AC4**: Given `02-complementary-patterns.md`, when se lee el cierre, then no afirma "works well 80% of the time" (residuo del modelo ligero).
- **AC5**: Given `03-phase-questions.md`, when se revisa, then los phase banks se **conservan** y, si aporta, se amplían con preguntas laterales — sin rediseño.

## Files a crear / a modificar

| Path | Contenido / Cambio |
|---|---|
| `references/04-quality-check.md` | Closing → soft-stop por degradación; epistémico/aleatorio; bake-loop |
| `references/01-catalog-socratic.md` | Coverage calibration → checklist por categorías + laterales |
| `references/02-complementary-patterns.md` | Quitar "works well 80%"; ajustar caps al modelo exhaustivo |
| `references/03-phase-questions.md` | Conservar; ampliar con laterales (opcional, mínimo) |

## Workflow detallado

1. Re-leer el SKILL.md cerrado de US1 (vocabulario/recipe canónicos).
2. `04`: reescribir Closing criterion + Iteration protocol (soft-stop, epistémico/aleatorio, bake).
3. `01`: reemplazar Coverage calibration graduada por checklist de categorías + laterales.
4. `02`: quitar "80%"; revisar caps.
5. `03`: ampliar phase banks con laterales si aporta; no rediseñar.
6. Greps de verificación + coherencia con US1.

## Commandments cubiertos

| # | Cómo |
|---|---|
| III | Quita la calibración graduada que contradecía el exhaustivo |
| X | Elimina contradicción interna (SKILL.md ↔ references) — anti-rot |

## Verificación post-implementación

- `grep -rn "≥80%\|max 3 iteration\|works well 80" .claude/skills/drillme/references/` → vacío.
- Coherencia de vocabulario con SKILL.md (US1).

## Open questions (a resolver en implementación)

- Si la ampliación de `03` con laterales crece demasiado → diferir a un follow-up; no inflar.
