---
us: US4
title: Guard de proporcionalidad en skills consumidoras (bounds → information-gain gating)
wave: W2
depends_on: [US1]
tdd_mode: optional
estimate: S
status: closed
approved: <pending hard gate 2->3>
---

# US4 — Guard de proporcionalidad en consumidoras

## Execution prompt (Phase 3 input)

**Task**: Reenfocar las referencias a drillme en las skills consumidoras: de **número fijo de preguntas** a **invocar drillme + confiar en el gating por information-gain** (proporcionado en baja ambigüedad, exhaustivo donde hay gaps).
**Context**: consumidoras con bounds hardcodeados — `build/SKILL.md` ("intra-HU drillme — 4 questions"), `critic/SKILL.md` ("drillme Q1 only" en light, "drillme 4/4" en standard), `scope/SKILL.md` ("5-question drillme"), `tech-plan/SKILL.md` ("6 phase questions"), `retro/SKILL.md` (Phase 5 bank). Bajo exhaustivo-por-defecto, un número como **tope** contradice "siempre que haya gaps"; como **expectativa típica en baja ambigüedad** es coherente. El riesgo es el mismo que el overfire de binora: o sobre-pregunta (rompe proporcionalidad) o se auto-limita (rompe exhaustividad).
**Constraints**: English. **Ediciones mínimas** — NO reescribir las consumidoras; solo reframe el bound a "invoca drillme; proporcionado por information-gain (típicamente ~N en baja ambigüedad, exhaustivo si hay gaps)". NO tocar los phase banks (US2/spec out-of-scope). Si el cambio colapsa a pocas líneas triviales, considerar fundir con US3 (decisión del ejecutor). Re-leer antes de Edit.
**Deliverable**: las 5 consumidoras con el reframe de proporcionalidad donde hoy hay un número como tope.
**Verify**: `grep -rn "drillme" .claude/skills/{build,critic,scope,tech-plan,retro}/SKILL.md` → las menciones a número son expectativa, no tope duro; coherencia con el modelo de US1.
**Ask first**: nothing — pero si al revisar resulta que las menciones ya son coherentes (número como expectativa, no tope), **declararlo y no editar** (evitar churn cosmético).

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W2 |
| **Depends on** | [US1] |
| **Blocks** | none |
| **Files touched** | `build`, `critic`, `scope`, `tech-plan`, `retro` SKILL.md (los que realmente lo necesiten) |
| **TDD-mode** | optional |
| **Estimate** | S |
| **Cómo arrancar** | Grep drillme en las 5; decidir cuáles tienen bound-como-tope real |
| **Decisión absorbida** | bounds → information-gain gating |

## User story

- **As a**: skill consumidora que invoca drillme
- **I want**: invocar drillme y confiar en que será proporcionado (pocas preguntas en baja ambigüedad, exhaustivo donde hay gaps)
- **So that**: no se hardcodee un tope que contradiga el exhaustivo ni se dispare always-on molesto

## Acceptance criteria

- **AC1**: Given las consumidoras, when referencian un número de preguntas drillme, then ese número es **expectativa típica en baja ambigüedad**, no un **tope duro** que impida exhaustividad cuando hay gaps reales.
- **AC2**: Given una consumidora cuya mención ya es coherente, when se revisa, then **no se edita** (anti-churn cosmético) y se declara en el reporte.
- **AC3**: Given el conjunto, when se cierra, then ninguna consumidora especifica una calibración graduada que contradiga el modelo híbrido de US1.

## Files a crear / a modificar

| Path | Contenido / Cambio |
|---|---|
| `.claude/skills/build/SKILL.md` | "4 questions" intra-HU → expectativa proporcional, no tope |
| `.claude/skills/critic/SKILL.md` | "Q1 only" / "4/4" → proporcional por information-gain |
| `.claude/skills/scope/SKILL.md` | "5-question drillme" → expectativa, no tope |
| `.claude/skills/tech-plan/SKILL.md` | "6 phase questions" → expectativa, no tope |
| `.claude/skills/retro/SKILL.md` | Phase 5 bank → coherencia (solo si necesario) |

## Workflow detallado

1. Grep drillme en las 5 consumidoras; clasificar cada mención: bound-como-tope (editar) vs expectativa-ya-coherente (no tocar).
2. Reframe mínimo donde sea tope.
3. Declarar en el reporte cuáles se tocaron y cuáles no (y por qué).
4. Si colapsa a 1-2 líneas → considerar fundir con US3.

## Drillme (Socratic check)

1. `[approach]` ¿Reframe o reescritura? → Reframe mínimo; reescribir sería over-engineering (Commandment III).
2. `[failure]` ¿Y si quitar el número hace que build/critic sobre-pregunten en cada HU trivial? → El gating por information-gain (US1) lo evita: baja ambigüedad → pocas/0 preguntas. Ese es justamente el guard.

## Commandments cubiertos

| # | Cómo |
|---|---|
| III | Ediciones mínimas; anti-churn; proporcionalidad evita ceremonia |
| X | Coherencia del sistema: consumidoras alineadas con el nuevo drillme |

## Verificación post-implementación

- `grep -rn "drillme" .claude/skills/{build,critic,scope,tech-plan,retro}/SKILL.md` → sin topes duros contradictorios.
- `bun test ./.claude/hooks/` green.

## Smell signals

- ⚠️ Si se acaba reescribiendo secciones enteras de las consumidoras → se ha excedido el alcance (era reframe mínimo).

## Open questions (a resolver en implementación)

- Decisión del ejecutor: si el cambio total son <5 líneas, fundir con US3 en vez de mantener HU separada.
