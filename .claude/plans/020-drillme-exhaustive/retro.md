---
spec: 020-drillme-exhaustive
phase: 5
retro_level: standard
verdict_phase4: APPROVED_WITH_WARNINGS
spec_drift: none
promotions_proposed: 2
promotions_approved: 0
commandment_violations: 0
living_spec_delta: no
action_items: 3
created: 2026-06-18
status: open
---

# Retro — drillme exhaustivo (activación híbrida)

## Resumen ejecutivo

**Problema** (spec.md): `drillme` estaba calibrada en contradicción con la doctrina — la skill decía "3-7 preguntas, >10 = over-engineering, the 10% tool" mientras CLAUDE.md ordena "preguntar hasta cerrar gaps". **Entregado**: reescritura de drillme a exhaustivo con activación híbrida (gated por gaps; batería hasta saturación donde hay ambigüedad, 0 preguntas en trivial), + alineación de references/doctrina/flow + guard de proporcionalidad en consumidoras. **Veredicto**: suave (4 rondas de scope + research convergieron sin re-trabajo; 11/11 AC satisfechos por reviewer independiente; 0 blocker/major). La fricción real fue conceptual, no de implementación.

## Lessons

### ✅ Patrones que funcionaron
- **Recipe operacional > manifiesto declarativo**: el advisor atrapó (antes de escribir) que "ask until information gain ≈ 0" es auto-referencial y el modelo lo ignoraría. Escribir coverage-checklist + funnel + bake-loop + worked-example de 22 preguntas produjo una skill ejecutable. Confirma y extiende `[[feedback-rules-must-be-generation-executable]]`.
- **Dogfooding del propio feature**: la batería exhaustiva que define el feature se usó EN su propio scope (4 rondas + 7 búsquedas web). El usuario validó la dirección iterativamente; el research convirtió su intuición ("siempre, sin excepción") en la política híbrida formal (information-gain, EVPI, epistémico/aleatorio) con respaldo. La mejor prueba de que el patrón aporta valor.
- **Fresh-context reviewer en feature doc-only**: el sesgo de autor era total (escribí todo el modelo). Un reviewer read-only constreñido a correctness/requirements trazó los 11 AC y atrapó 3 bare-counts residuales que yo no veía. Barato y útil incluso en markdown.
- **Anti-churn explícito en US4**: decidir conscientemente NO tocar scope/tech-plan/retro (heredan "floor, not ceiling" de refs/03) evitó 3 ediciones cosméticas. El reviewer confirmó que leen como floor-in-context.

### ❌ Fricciones / lo mejorable
- **Tensión activación-agresiva ↔ Commandment III**: el usuario eligió "siempre sin excepción" (contra mi recomendación lean). No fue error suyo ni mío — faltaba la pieza conceptual (gating por information-gain) que reconcilia ambos. La descubrió el research, no el primer diseño. Lección: cuando una elección del usuario choca con un commandment, buscar la reconciliación en evidencia ANTES de ceder o discutir.
- **Bare-counts residuales**: 2 menciones ("5-question drillme" en scope, "3-5 questions" en tech-plan) quedaron sin reframe (anti-churn). Defendibles como floor-in-context, pero el framing es más débil que el de build/critic. Follow-up opcional.
- **Validación conductual no ejercitable en sesión**: el oracle real (B1-B4) sólo se puede comprobar la próxima sesión (la skill recargada no cambia comportamiento mid-sesión). Confirma `[[feedback-behavioral-ac-next-session]]` — no se puede "banquear el win" hasta medirlo.
- **Frontmatter de US no se cerró en build (Phase 3)**: tras `close-us` los 4 `tasks/US{N}.md` seguían `status: draft`; el retro los cerró residualmente (Step 13). El helper `flow-state.ts close-us` documenta "+ matching US{n}.md frontmatter flip" pero no lo hizo (o flipea a un valor distinto). Mejora: que `close-us` flipee el frontmatter a `closed`, o que build Step 8b lo verifique. Fallo de proceso de Phase 3, no del feature.

## Process audit

| Fase | Esfuerzo | Fricción | Mejora |
|---|---|---|---|
| 1 scope | L | La más pesada (4 rondas + research) — pero JUSTIFICADA: es el feature dogfooded | — |
| 2 tech-plan | M | Descomposición clara (group-by-locus); el advisor reorientó del manifiesto a la recipe | El advisor antes de escribir HUs evitó un US1 inútil |
| 2.5 tdd-design | S | Trivial — todo validation-mode; oracle conductual ya definido por advisor | — |
| 3 build | M | Sin fricción; linter no tocó los references (no editados antes) | — |
| 4 critic | S | Fresh reviewer aportó 3 findings; 2 triviales arreglados en el acto | — |

Fase más pesada: **scope**, por diseño (este feature ES sobre questioning exhaustivo).

## Drillme — Phase 5

1. `[approach]` **¿Fase demasiado pesada?** Scope fue L pero justificado (dogfooding); no recortable sin traicionar el feature.
2. `[approach]` **¿Fricción evitable?** La tensión activación↔III no era evitable sin el research; el research debió venir antes de la 1ª recomendación lean. Menor.
3. `[approach]` **¿Patrón reutilizable?** Sí: "skill que ordena comportamiento → escríbela como recipe + worked example, nunca criterio declarativo". Promovible.
4. `[context]` **¿Global/local/memory?** El patrón anterior → memoria (extiende una existente). El fix de binora → action item.
5. `[failure]` **¿Commandment violado en silencio?** No. III estuvo en tensión pero se resolvió con la híbrida, no se violó.

## Promotion candidates (NO auto-aplicadas — ratifica tú)

| Candidato | Scope | Tipo | Por qué | Propuesta concreta |
|---|---|---|---|---|
| Extender lección "generation-executable" con el corolario recipe+worked-example | global | memory | El advisor + este feature confirman: skills que ordenan comportamiento iterativo/exhaustivo necesitan coverage-checklist + ejemplo, no un criterio declarativo | Editar `feedback-rules-must-be-generation-executable.md`: añadir "corolario: behavioral skill = recipe + worked example, no manifiesto auto-referencial (drillme 020)" |
| Eval cases B1/B2 para drillme | local | eval | Los oracle conductuales (typo→0, ambiguo→batería) son el regression-check natural de la activación híbrida | Añadir a `.claude/evals/cases.jsonl`: caso "trivial input → drillme 0 questions" + "ambiguous → battery", grader determinista, `source: retro 020` |

> Failure→eval: no hubo un fallo de build real (verdict limpio); los eval cases propuestos derivan del oracle conductual, no de un fallo. Honesto: son regression-checks preventivos, no post-fallo.

## Commandments audit

| # | Cumplido | Evidencia |
|---|---|---|
| I | ✅ | Señalé desacuerdo estructurado 2× (activación literal), mantuve posición con razón, actualicé con research; marqué assumptions `[ASSUMPTION]` en el spec |
| II | ✅ | 7 búsquedas web con fuentes citadas; aclaré que "no existe drillme original externa" en vez de inventar |
| III | ✅ | Tensión activación-agresiva resuelta vía híbrida (0 en trivial), no violada; US4 anti-churn |
| IV | ✅ | 2 hard gates humanos + verdict; 105 tests green en cada HU |
| V | ✅ | Research antes de diseñar; leí drillme + similares + cableado antes de tocar |
| VI | ✅ | Sin secrets; el feature no toca superficie sensible. (binora security-gate → action item) |
| VII | ✅ | Búsquedas web en paralelo; 1 solo fresh reviewer (no panel) en review |
| VIII | ✅ | US1 escrita como recipe; Execution prompts con Task/Context/Constraints/Deliverable/Verify |
| IX | ✅ | Este retro + eval cases propuestos + memoria binora |
| X | ✅ | Eliminada la contradicción doctrina↔skill (X2 grep CLEAN); cross-ref stale corregido |

0 violaciones.

## Action items

| Acción | Owner | Trigger | Due |
|---|---|---|---|
| Validar oracle conductual B1-B4 de drillme | next-session | próxima sesión con drillme recargada | next session |
| Arreglar security-gate overfire en binora-backend ([[binora-backend-hook-overfires]]) | Lead | feature 020 cerrado (= ahora) | siguiente, tras cierre |
| (Opcional) touch-up bare-counts scope/tech-plan a "floor, not cap" | Lead | si se retoma drillme | sin prisa |

## Próximo paso

Lifecycle cerrado tras este retro. Pendiente tu ratificación de las 2 promociones. El primer action item operativo es el fix del security-gate de binora (lo prometido para "al cerrar 020").
