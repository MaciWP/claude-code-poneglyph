---
us: US1
title: Reescribir drillme SKILL.md como recipe exhaustivo con activación híbrida
wave: W1
depends_on: []
tdd_mode: optional
estimate: L
status: closed
approved: <pending hard gate 2->3>
---

# US1 — Reescribir drillme SKILL.md como recipe exhaustivo con activación híbrida

## Execution prompt (Phase 3 input)

**Task**: Reescribir `.claude/skills/drillme/SKILL.md` para que drillme sea exhaustivo-hasta-cerrar-gaps con activación híbrida, expresado como **recipe operacional** (no manifiesto).
**Context**: Skill actual en `~/.claude/skills/drillme/SKILL.md` (leída en sesión: calibración graduada 3-7, "⚠️ >10 → over-engineering", "the 10% tool", "works well 80%"). El loop iterativo ya existe a medias en Step 6 + `references/04-quality-check.md` (promover, no reinventar). Modelo conceptual completo en `spec.md §Modelo conceptual` (9 principios con fuentes: EVPI/SAGE arXiv 2511.08798, Active Task Disambiguation arXiv 2502.04485, spec-kit, Cursor 2.1, EACL 2024 epistémico/aleatorio).
**Constraints**: English (repo file). Markdown estilo del resto de skills (frontmatter `name`/`description` con `Use when:` + `Keywords -`, secciones When-to-use/When-to-skip/Workflow/SIEMPRE/Anti-patterns/Commandments). NO escribir criterios de parada auto-referenciales sueltos ("ask until information gain ≈ 0") — si aparece esa frase, reemplazar por mecánica concreta. NO tocar `skill-activation.ts`. Conservar el anti-pattern "Synthetic coverage". El linter toca ficheros tras Write → re-leer antes de cualquier Edit (lección `linter-modifies-files-post-write`).
**Deliverable**: `SKILL.md` reescrito con: (1) coverage checklist de categorías de aspecto, (2) estructura funnel de rondas, (3) bake-loop, (4) un worked example de batería de 20-40 preguntas, (5) activación híbrida gated por gaps, (6) freno flojo por degradación, (7) regla epistémico/aleatorio, (8) boundary + escalado a `decision-stress-test`, (9) keywords ampliadas para activación fácil. Eliminadas las tablas/frases de calibración graduada.
**Verify**: `bun test ./.claude/hooks/` green (no toca código); `grep -n "over-engineering\|10% tool\|works well 80" SKILL.md` → vacío; el worked example existe y muestra ≥20 preguntas agrupadas por categoría; smoke conductual diferido a Phase 2.5 oracle.
**Ask first**: nothing — decisiones bloqueadas en scope (4 rondas + research). Si al escribir surge una ambigüedad nueva sobre el formato del bake standalone, resolver con la decisión cross-cutting del index (reporte inline / sección scratch).

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W1 |
| **Depends on** | none |
| **Blocks** | [US2, US3, US4] |
| **Files touched** | `.claude/skills/drillme/SKILL.md` |
| **TDD-mode** | optional |
| **Estimate** | L |
| **Cómo arrancar** | Re-leer `SKILL.md` actual + `spec.md §Modelo conceptual`; reescribir sección a sección |
| **Decisión absorbida** | modelo conceptual completo del feature |

## User story

- **As a**: Lead orchestrator (y cualquier skill que invoque drillme)
- **I want**: que drillme me dé una recipe ejecutable para barrer todos los gaps de una decisión hasta cerrarlos, y 0 preguntas cuando no hay nada que aclarar
- **So that**: ninguna decisión se tome con gaps o cosas al azar, sin generar ceremonia en lo trivial

## Acceptance criteria

- **AC1** (recipe, no manifiesto): Given el nuevo SKILL.md, when se lee el Workflow, then describe una **coverage checklist** de categorías de aspecto a barrer (4 socráticas + laterales/edge: partial failures, retries, downtime, validation, security, perf, ops, migration, UX, cost) y la instrucción operacional "para cada categoría, si hay un gap que cambiaría la decisión, pregunta" — **sin** un criterio de parada auto-referencial suelto.
- **AC2** (worked example): Given el SKILL.md, when se busca un ejemplo, then contiene un **worked example** con una batería de ≥20 preguntas agrupadas por categoría sobre un caso de ejemplo (demuestra el "20-40 si hace falta").
- **AC3** (funnel + rondas): Given el mecanismo, when drillme pregunta, then documenta rondas temáticas con estructura funnel (abrir → sondear → cerrar) vía `AskUserQuestion`, con opciones-ejemplo + "Other" para preguntas abiertas.
- **AC4** (activación híbrida): Given el contexto, when drillme se considera, then dispara preguntas solo donde hay gap/information-gain; **trivial sin ambigüedad → 0 preguntas, cierre inmediato** (documentado como tal, no como "skip").
- **AC5** (bake-loop): Given respuestas obtenidas, when drillme itera, then las **escribe en el artefacto activo** (spec/tasks/decisión); fuera de /flow (standalone) → reporte inline o sección scratch (decisión cross-cutting), nunca las pierde.
- **AC6** (freno flojo + epistémico/aleatorio): Given respuestas que se degradan o un gap irreducible (ni el usuario lo sabe), when drillme evalúa, then soft-stop con `[OPEN]` (no machaca), sin tope numérico de rondas.
- **AC7** (boundary): Given que drillme llega a su techo (desacuerdo de fondo), when no cierra, then escala explícitamente a `decision-stress-test`; las secciones de comparación reflejan el nuevo drillme exhaustivo.
- **AC8** (limpieza): Given el SKILL.md final, when se busca calibración graduada, then NO existe "3-7 questions" como tope, ">10 → over-engineering", "the 10% tool", ni "works well 80%".

## Files a crear / a modificar

| Path | Contenido / Cambio |
|---|---|
| `.claude/skills/drillme/SKILL.md` | Reescritura: Underlying principle, When-to-use/skip, Workflow (coverage checklist + funnel + bake-loop + worked example), activación híbrida, freno flojo, epistémico/aleatorio, boundary+escalado, keywords ampliadas; eliminar calibración graduada |

## Workflow detallado

1. Re-leer el `SKILL.md` actual (post-linter) y `spec.md §Modelo conceptual` (9 principios + fuentes).
2. Reescribir `Underlying principle`: de "10% tool ligero" a "barrido exhaustivo de gaps gated por information-gain".
3. Reescribir `When to use` / `When to skip`: activación híbrida — se considera siempre; 0 preguntas cuando no hay gap (no una tabla de "trivial = N preguntas").
4. Reescribir el `Workflow` como recipe: (a) **coverage checklist** de categorías; (b) por categoría, detectar gap → preguntar; (c) **funnel** de rondas (abrir→sondear→cerrar) vía AskUserQuestion; (d) **bake-loop** (escribir respuestas en artefacto / scratch); (e) freno flojo por degradación; (f) epistémico/aleatorio → `[OPEN]`.
5. Añadir un `## Worked example` con batería de ≥20 preguntas agrupadas por categoría (caso de ejemplo realista).
6. Actualizar las secciones de boundary (`drillme vs decision-stress-test`, `Relationship`) para el nuevo modelo + escalado.
7. Ampliar `Keywords -` del frontmatter para activación fácil (sin robar excesivamente los slots del hook).
8. Eliminar: tablas de calibración 1-7, smell ">10 questions → over-engineering", "the 10% tool", "works well 80%".
9. `bun test ./.claude/hooks/` (green) + greps de verificación (AC8).

## Drillme (Socratic check)

1. `[location]` ¿Todo el modelo vive en SKILL.md, o parte (loop/quality) pertenece a `04-quality-check.md` (US2)? → SKILL.md define el modelo + recipe; el detalle de evaluación de respuestas va en references (US2).
2. `[approach]` ¿Por qué recipe + worked example y no un criterio declarativo? → Porque el declarativo es auto-referencial y el modelo lo ignora (lección + advisor).
3. `[context]` ¿Las keywords ampliadas chocan con el hook conservador (2 slots)? → Equilibrar: ampliar sin saturar; la activación fácil se apoya también en doctrina (US3).
4. `[failure]` ¿Qué pasa si el worked example se interpreta como "haz siempre 20+"? → El recipe ancla en "pregunta donde hay gap"; el ejemplo ilustra capacidad, no cuota (anti-padding explícito).

## SIEMPRE rules implementadas

- Coverage checklist barrida por categorías antes de cerrar; gap detectado → pregunta.
- 0 preguntas cuando no hay information gain (trivial); nunca ceremonia.
- Respuestas bakeadas, nunca perdidas; gaps irreducibles marcados `[OPEN]`.
- Anti-padding: jamás inventar preguntas para una cuota.

## Commandments cubiertos

| # | Cómo |
|---|---|
| I | Honestidad: gaps irreducibles se marcan `[OPEN]`, no se fuerza concreción falsa |
| III | Activación híbrida: 0 preguntas en trivial evita ceremonia; anti-padding |
| V | Entender antes de actuar: barrido exhaustivo de gaps antes de decidir |
| VIII | El recipe + coverage checklist ES meta-prompting estructurado |

## Reutiliza

- `references/04-quality-check.md` — el loop iterativo a promover (no reinventar) — coordinado en US2.

## Smell signals

- ⚠️ Si la reescritura supera SKILL.md razonable y arrastra el detalle de evaluación de respuestas → eso pertenece a `04-quality-check.md` (US2), no aquí.

## Verificación post-implementación

- Smoke conductual (diferido a Phase 2.5 oracle): tarea ambigua → batería; typo → 0 preguntas.
- `grep -n "over-engineering\|10% tool\|works well 80\|3-7 question" SKILL.md` → vacío.
- `bun test ./.claude/hooks/` sigue green.

## Open questions (a resolver en implementación)

- Redacción final de las keywords ampliadas (equilibrio cobertura/ruido del hook).
