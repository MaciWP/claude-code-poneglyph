---
id: 025-flow-backhalf-gate
created: 2026-06-30
approved: 2026-06-30
mode: full
phase: 1
status: closed
---

# Problema

`/flow` enforza las hard gates frontales (1→2 scope, 2→3 plan) pero la mitad trasera del lifecycle (build→critic→retro) no tiene **visibilidad ni recordatorio**: `flow-state.ts` solo muta `state.json`, nunca lo reporta, así que un plan con `feature_closed:false` queda invisible y se abandona. Raíz, no síntoma: no hay forma de *ver* qué ciclos están a medias. Evidencia (auditoría 2026-06-30): 4/8 features en binora/cv quedaron en "código hecho" sin review.md/retro.md; `flow.md:281` ya lo nombra como smell.

# Resultado esperado

- El usuario puede ver de un vistazo qué planes están incompletos y en qué fase quedaron (visibilidad → cierre).
- La retrospectiva (motor de auto-mejora, Commandment IX) deja de perderse silenciosamente: su estado de ratificación es explícito, no un `pending` flotante.
- Se respeta la doctrina: ningún hard gate humano nuevo si un report + recordatorio basta (pulir > añadir).

# Success criteria (medibles, Given/When/Then)

- **AC1**: Given varios `state.json` bajo `.claude/plans/` (algunos `feature_closed:false`), when ejecuto `bun .claude/scripts/flow-state.ts status`, then lista cada plan incompleto con su `current_phase`, gates aprobados y HUs pendientes/completadas, y los completos los marca/omite — verificable ejecutando el comando.
- **AC2**: Given un plan sano y uno con `state.json` malformado/ausente, when ejecuto `status`, then no crashea: reporta el sano y marca el roto sin abortar — verificable con un caso de fixture.
- **AC3**: Given las funciones puras nuevas (p.ej. `summarizeState`/`findOpenPlans`), when corro su suite, then pasan en verde junto con `bun test ./.claude/hooks/` (sin regresión) — verificable mecánicamente.
- **AC4**: Given el flujo documentado, when leo `flow.md` y la skill `retro`, then el schema canónico de `state.json` está completo (incluye `us_history` y `current_phase:"closed"`, hoy ausentes — finding D4) y la ratificación de retro tiene owner/estado explícito — verificable por lectura.

# Out of scope (explícito)

- **NO** un nuevo hard gate HUMANO post-build (la doctrina lo prohíbe si un report+recordatorio basta; mantiene human-in-loop sin fricción).
- **NO** auto-ejecutar `critic`/`retro` (sigue siendo decisión humana).
- **NO** tocar las gates frontales (1→2, 2→3) ni el modo `minimal` (build trivial no necesita ceremonia).
- **NO** telemetría ni automatización de cierre.
- **NO** la limpieza cross-repo (P3) — va aparte.
- **NO** rehacer `flow-state.ts`: se EXTIENDE (tres líneas similares > abstracción prematura, Commandment III).

# Constraints

- Técnico: Bun + TypeScript; extiende `flow-state.ts` (no lo reescribe). Funciones puras testeables exportadas.
- Compatibilidad: `bun test ./.claude/hooks/` debe seguir green; no rompe los subcomandos existentes (close-us/approve-gate/verdict/close-feature).
- Doctrina: `auxiliary` test-policy → el nodo del subcomando opta a `tdd: forced` por tener lógica no trivial.

# Stakeholders

- **Oriol** — sufre el problema (pierde retros/learnings), decide los gates, valida el outcome.

# Open questions

- **OQ1 — RESUELTA en gate 1→2 (2026-06-30)**: el alcance incluye **report manual `status` + recordatorio automático pasivo**. El recordatorio menciona planes abiertos de forma no intrusiva (sin bloquear, sin enforcement duro) reusando un hook existente. Decisión del usuario: visibilidad proactiva > superficie always-on mínima añadida.
