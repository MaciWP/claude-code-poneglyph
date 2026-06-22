---
spec: 020-drillme-exhaustive
tasks: tasks/
created: 2026-06-18
phase: 2.5
status: draft
validation_mode: validation
test_policy: auxiliary
---

# Validations per HU (validation-mode)

## ¿Por qué validation-mode y no TDD?

Las 4 HUs producen exclusivamente markdown (skill `drillme`, references, `CLAUDE.md`, `flow.md`, SKILL.md de consumidoras). No hay código ejecutable nuevo → TDD sería ceremonia. El oracle real de este feature es **conductual**: cómo se comporta drillme cuando corre. Por la lección `behavioral-AC`, ese comportamiento NO se valida por grep ni recarga mid-sesión — se valida en la **próxima sesión** tras tener el cambio en disco. Por eso cada HU separa:

- **Structural** (verificable de inmediato post-build, esta sesión): grep/read de que la recipe/secciones existen y la calibración graduada se eliminó.
- **Behavioral oracle** (próxima sesión): los 4 escenarios que prueban que el comportamiento cambió de verdad.

## Categorías de validación

| Categoría | Significado |
|---|---|
| **Pre-conditions** | Qué debe existir antes de la HU |
| **Post-conditions** | Qué debe ser cierto tras cerrarla |
| **Structural assertions** | Estructura/contenido obligatorio (verificable esta sesión) |
| **Smoke / Behavioral** | Comportamiento observable (próxima sesión salvo grep) |
| **Cross-validations** | Coherencia entre ficheros |

## Behavioral oracle (cross-cutting — el corazón del feature)

Estos 4 escenarios son el oracle del feature completo. Se ejecutan en la **próxima sesión** (tras recarga de la skill desde disco). Definen qué significa "funciona":

| # | Escenario | Input | Comportamiento esperado | Falla si |
|---|---|---|---|---|
| **B1** Ambiguo→batería | Decisión real con gaps (ej. "quiero mejorar el sistema de notificaciones") | `/drillme "<decisión ambigua>"` | Barre categorías y produce una batería (potencialmente 20-40 si los gaps lo exigen) en rondas funnel hasta declarar cero-gaps | Se queda en 3-7 preguntas y cierra con gaps abiertos |
| **B2** Trivial→0 | Tarea sin ambigüedad (ej. "renombra la variable `x` a `count`") | `/drillme` sobre ello | **0 preguntas**, cierre inmediato ("sin gaps que desambiguar") | Genera preguntas ceremoniales sobre un rename |
| **B3** Degradación→soft-stop | Usuario responde evasivo/rubber-stamp repetido | respuestas vagas en iteración | Soft-stop honesto + `[OPEN]` en los gaps irreducibles; NO machaca ni fuerza concreción | Sigue preguntando en bucle o fuerza respuestas de relleno |
| **B4** Intra-HU proporcionado | drillme invocado por `build` en una HU clara | flujo Phase 3 sobre HU sin ambigüedad | Pocas/0 preguntas (proporcionado al information-gain), no un tope fijo "4 questions" | Dispara siempre N preguntas independientemente de la ambigüedad (overfire) |

> B2 es la validación de AC2 (la reconciliación "siempre activo + 0 en trivial"). B4 es el guard de proporcionalidad de US4 (mismo riesgo que el overfire de binora).

## US1 — drillme SKILL.md (recipe exhaustivo)

### Pre
- `spec.md` aprobado; modelo conceptual disponible.

### Post
- `SKILL.md` contiene una recipe operacional (coverage checklist + funnel + bake-loop) y un worked example de batería.

### Structural assertions (esta sesión)
- Existe una sección de **coverage checklist** de categorías (4 socráticas + laterales/edge).
- Existe un `## Worked example` con ≥20 preguntas agrupadas por categoría.
- Existe la descripción de **activación híbrida** (gated por gap; 0 en trivial) y del **bake-loop** (incl. caso standalone).
- Existe el **freno flojo por degradación** + regla **epistémico/aleatorio**.
- `grep -n "over-engineering\|10% tool\|works well 80\|3-7 question" SKILL.md` → **vacío** (AC8).

### Smoke / Behavioral
- Escenarios B1 + B2 (próxima sesión) operan sobre esta HU.

### Cross-validations
- El vocabulario de categorías de SKILL.md coincide con `references/01` y `04` (US2).

## US2 — references alineadas

### Pre
- US1 cerrada (modelo/vocabulario canónico fijado).

### Post
- Las 4 references coherentes con el modelo exhaustivo-híbrido.

### Structural assertions (esta sesión)
- `grep -rn "≥80%\|max 3 iteration\|works well 80\|over-engineering" references/` → vacío.
- `04-quality-check.md` documenta soft-stop por degradación + epistémico/aleatorio + bake-loop.
- `01-catalog-socratic.md` tiene checklist de cobertura (no tabla graduada por nº).
- `03-phase-questions.md` conserva los 6 phase banks (no rediseñados).

### Smoke / Behavioral
- B3 (degradación→soft-stop) ejercita la lógica de `04` en próxima sesión.

### Cross-validations
- Sin contradicción SKILL.md ↔ references (mismo modelo).

## US3 — doctrina + cableado /flow

### Pre
- US1 cerrada.

### Post
- `CLAUDE.md` describe drillme exhaustivo-híbrido; `/flow` lo cablea en scope + 2 gates.

### Structural assertions (esta sesión)
- `CLAUDE.md` línea de descripción de drillme menciona exhaustivo/híbrido (no solo "4 categories").
- `flow.md` invoca drillme explícitamente en scope, gate 1→2 y gate 2→3.

### Smoke / Behavioral (próxima sesión)
- En una sesión nueva, un prompt no trivial activa drillme con más facilidad (capa always-loaded). Validación conductual, no grep de presencia.

### Cross-validations
- La descripción en CLAUDE.md no contradice el SKILL.md de US1.

## US4 — guard de proporcionalidad en consumidoras

### Pre
- US1 cerrada.

### Post
- Las consumidoras invocan drillme sin hardcodear topes que contradigan el exhaustivo.

### Structural assertions (esta sesión)
- En `build/critic/scope/tech-plan/retro`, las menciones a número de preguntas drillme son **expectativa** (proporcional), no **tope duro**.
- Las consumidoras ya coherentes NO se editaron (anti-churn) — declarado en el reporte de la HU.

### Smoke / Behavioral
- B4 (intra-HU proporcionado) es el oracle de esta HU (próxima sesión).

### Cross-validations
- Ninguna consumidora reintroduce calibración graduada contradictoria con US1.

---

## Cross-cutting validations

- **X1** (no-regresión): `bun test ./.claude/hooks/` sigue green tras las 4 HUs (ninguna toca código).
- **X2** (anti-contradicción): tras el feature, no existe en `~/.claude/` una afirmación de que drillme sea "ligero / 3-7 / 10% tool" coexistiendo con la doctrina exhaustiva (AC11 del spec).
- **X3** (anti-padding vivo): el worked example de US1 NO debe leerse como "haz siempre 20+"; el recipe ancla en "pregunta donde hay gap". Validación por lectura humana en el gate.

## Drillme — Phase 2.5

1. `[failure]` **Happy + edge?** Cada HU tiene oracle: B1/B2 (US1), B3 (US2), cableado (US3), B4 (US4) + assertions estructurales. ✓
2. `[approach]` **Untestable HU?** Ninguna es untestable: todas tienen structural (esta sesión) + behavioral (próxima). El comportamiento conductual es el oracle honesto para una skill. ✓
3. `[approach]` **Property-based fit?** N/A — no hay parsers/transforms; el oracle es conductual, no de invariantes. ✓

Coverage: 2/4 categorías canónicas (fase enfocada en oracle; location/context cubiertos en Phase 2).
