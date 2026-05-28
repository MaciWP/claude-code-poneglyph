---
spec: 001-poneglyph-5phase-workflow
tasks: tasks/
created: 2026-05-28
mode: full
phase: 2.5
status: approved
approved: 2026-05-28
validation_mode: validation
test_policy: auxiliary
---

# Validations per HU (validation-mode)

## ¿Por qué validation-mode y no TDD?

Este meta-refactor produce mayoritariamente **markdown** (skills, commands, templates, docs) y **decisiones arquitectónicas** (cortar/mantener/migrar). No hay funciones unit-testables. Aplicar TDD clásico sería ceremonia sin oracle real (anti-pattern documentado).

Por tanto: cada HU se verifica con **validaciones declarativas** organizadas en 5 categorías:

| Categoría | Significado |
|---|---|
| **Pre-conditions** | Qué debe existir/cumplirse ANTES de empezar la HU |
| **Post-conditions** | Qué debe existir/cumplirse TRAS cerrar la HU |
| **Structural assertions** | Estructura/contenido obligatorio en los archivos producidos |
| **Smoke checks** | Verificaciones funcionales (skill se auto-activa, command no falla) |
| **Cross-validations** | Refs entre archivos coherentes; nada huérfano |

Las validaciones se ejecutan en Fase 4 (`critic-reviewer`) como parte del checklist de `review.md`. Cuando una validación es scripteable (Glob, Grep, Read existence), se automatiza; cuando requiere lectura humana/LLM (¿el SKILL.md está bien escrito?), se reporta como check manual.

---

## US1 — Foundation: estructura + templates

### Pre
- `.claude/plans/` existe como directorio.
- `.claude/plans/001-poneglyph-5phase-workflow/spec.md` existe con `status: approved` (cerrado en commit `e062127`).

### Post
- `.claude/plans/README.md` existe.
- `.claude/plans/templates/` contiene 7 archivos: `spec.template.md`, `tasks.template.md`, `tasks-index.template.md`, `tests.template.md`, `validations.template.md`, `review.template.md`, `retro.template.md`, `state.template.json`.

### Structural assertions
- Cada `.template.md` tiene frontmatter YAML válido (parseable).
- `tasks.template.md` contiene la sección obligatoria "⚡ Quick reference" con tabla de campos canónica (Status, Wave, Depends on, Blocks, Files touched, TDD-mode, Estimate, Cómo arrancar, Decisión absorbida).
- `spec.template.md` contiene secciones obligatorias: Problema, Resultado esperado, Success criteria, Out of scope.
- `validations.template.md` contiene las 5 categorías (Pre, Post, Structural, Smoke, Cross-validations).
- `state.template.json` es JSON válido (parseable).

### Smoke
- `Read .claude/plans/templates/spec.template.md` retorna markdown coherente (no archivo vacío).
- Aplicar el test IA-friendly ("¿borrar esta sección pierde señal?") a cada sección de cada template → ninguna sección sobrevive el borrado sin pérdida. (Manual review por LLM/usuario.)

### Cross-validations
- Las skills US2-US7 (cuando se implementen) referencian estos templates por path canónico — no debe haber refs muertas.

---

## US2 — `scope-definer` + `/scope`

### Pre
- US1 cerrada (templates existen).

### Post
- `.claude/skills/scope-definer/SKILL.md` existe.
- `.claude/commands/scope.md` existe.

### Structural assertions
- SKILL.md frontmatter contiene: `name: scope-definer`, `description` (con keywords scope/idea/problema/alcance/quiero/necesito), `disable-model-invocation: false`.
- SKILL.md contiene bloque "Drillme — Phase 1" con las 5 preguntas obligatorias literales.
- SKILL.md contiene sección "Workflow detallado" con ≥6 pasos numerados.
- SKILL.md menciona explícitamente: cuestionario intensivo + proactividad sobre gaps (SIEMPRE rules).
- `commands/scope.md` es wrapper trivial (≤10 líneas) que invoca la skill.

### Smoke
- En prompt con keyword "necesito hacer X" → la skill se auto-activa (verificable en US10 dogfooding).
- `/scope <brief>` no falla silenciosamente (manual smoke).

### Cross-validations
- SKILL.md referencia `templates/spec.template.md` (que existe per US1).
- No menciona pieces cortadas (planner-protocol si CUT, etc.).

---

## US3 — `tech-planner` + `/plan` + decisión planner-protocol

### Pre
- US1 cerrada (templates existen).

### Post
- `.claude/skills/tech-planner/SKILL.md` existe.
- `.claude/commands/plan.md` existe.
- Decisión sobre `planner-protocol` ejecutada: CUT / SIMPLIFICAR / MIGRAR-Y-CUT.

### Structural assertions
- SKILL.md frontmatter: keywords plan/planifica/roadmap/tareas/HU.
- SKILL.md contiene bloque "Drillme — Phase 2" con las 5 preguntas obligatorias.
- SKILL.md menciona investigación obligatoria (Context7 + WebFetch + Grep proyecto).
- SKILL.md menciona invocación condicional de `decision-stress-test` (modo full).

### Smoke
- En prompt con `spec.md` aprobado disponible + keyword "plan" → skill se auto-activa.
- `/plan` produce `tasks/index.md` + N archivos `US{N}.md` con frontmatter válido.

### Cross-validations
- Si decisión = CUT/MIGRAR-Y-CUT: `Grep "planner-protocol" .claude/` retorna 0 refs vivas (solo históricas en memorias del proyecto).
- Si decisión = SIMPLIFICAR: `planner-protocol/SKILL.md` reescrita; refs valiosas migradas o preservadas.
- CLAUDE.md no menciona pieces cortadas.

---

## US4 — `tdd-designer` + `/tdd-design` (TDD-mode + validation-mode)

### Pre
- US1 cerrada.

### Post
- `.claude/skills/tdd-designer/SKILL.md` existe.
- `.claude/commands/tdd-design.md` existe.

### Structural assertions
- SKILL.md soporta ambos output-modes (TDD-mode produce `tests.md`; validation-mode produce `validations.md`).
- SKILL.md contiene bloque "Drillme — Phase 2.5" con las 3 preguntas obligatorias.
- SKILL.md describe heurística de decisión TDD vs validation (basada en tipo de `files` de cada HU).
- SKILL.md respeta `.claude/rules/test-policy.md` para declarar TDD-mode en frontmatter del output.

### Smoke
- Dadas HUs solo markdown → produce `validations.md` (no `tests.md`).
- Dadas HUs con código `.ts` → produce `tests.md` con specs Pre/Action/Assert.
- Dadas HUs mixtas → produce ambos archivos (cada HU en el correcto).

### Cross-validations
- Frontmatter del output declara `validation_mode` o `tdd_mode` según corresponda.
- HUs referenciadas en validations/tests existen en `tasks/`.

---

## US5 — `story-executor` + `/build` + decisión builder agent

### Pre
- US1 cerrada.

### Post
- `.claude/skills/story-executor/SKILL.md` existe.
- `.claude/commands/build.md` existe.
- Decisión builder agent: CUT / KEEP-conditional / ABSORB ejecutada.

### Structural assertions
- SKILL.md frontmatter: keywords build/implementa/ejecuta/construye.
- SKILL.md contiene bloque "Drillme — Phase 3 (intra-HU)" con las 4 preguntas obligatorias.
- SKILL.md documenta criterio de invocación de `builder` agent (si KEEP-cond: ≥5 archivos OR cambio arquitectural).
- SKILL.md describe red→green flow para HUs con TDD-mode=forced.
- SKILL.md menciona "Si duda → AskUserQuestion. Nunca improvisar" (SIEMPRE rule).

### Smoke
- `/build US{N}` ejecuta la HU específica y actualiza `state.json`.
- Auto-activación: prompt con "implementa US3" + tasks/ presente → skill se activa.

### Cross-validations
- Si decisión = CUT: `.claude/agents/builder.md` no existe; refs en CLAUDE.md purgadas.
- Si decisión = KEEP-cond: `builder.md` existe; SKILL.md de story-executor lo referencia con criterio.
- Si decisión = ABSORB: contenido relevante migrado al SKILL.md; agent borrado.

---

## US6 — `critic-reviewer` + `/critic` + decisiones reviewer/review-patterns

### Pre
- US1 cerrada.

### Post
- `.claude/skills/critic-reviewer/SKILL.md` existe.
- `.claude/commands/critic.md` existe.
- Decisión reviewer agent: CUT / KEEP-conditional / ABSORB ejecutada.
- `.claude/skills/review-patterns/` **sin cambios** (KEEP per AC8 de US6).

### Structural assertions
- SKILL.md contiene bloque "Drillme — Phase 4" con las 4 preguntas obligatorias.
- SKILL.md describe los 5 grupos de validaciones (Correctness / Quality / Security / Performance / Mantenibilidad).
- SKILL.md describe veredictos (APPROVED / NEEDS_CHANGES / BLOCKED).
- SKILL.md documenta invocación condicional de `reviewer` agent (Opus).
- SKILL.md documenta invocación de `review-patterns` skill (modo quality o performance según contenido).
- SKILL.md menciona living-spec loop (detección de delta spec ↔ implementación).

### Smoke
- `/critic` con todas las HUs cerradas → produce `review.md` con checklist + findings + veredicto.

### Cross-validations
- `review-patterns/SKILL.md` sigue intacta.
- Si decisión reviewer = CUT: `reviewer.md` no existe; refs purgadas.
- Si decisión reviewer = KEEP-cond: criterio (complejidad >60 OR áreas críticas) documentado en SKILL.md de critic-reviewer.

---

## US7 — `retro-learner` + `/retro` + living-spec loop

### Pre
- US1 cerrada.

### Post
- `.claude/skills/retro-learner/SKILL.md` existe.
- `.claude/commands/retro.md` existe.

### Structural assertions
- SKILL.md contiene bloque "Drillme — Phase 5" con las 5 preguntas obligatorias.
- SKILL.md describe formato `retro.md` (Resumen, Lecciones, Proceso, Promociones, Living-spec deltas, Commandments check, Action items).
- SKILL.md describe living-spec loop: detección de delta + propuesta de diff + aprobación humana (NO edita spec.md automático).
- SKILL.md describe formato tabla promociones (candidate × scope × tipo × razón × propuesta concreta).
- SKILL.md menciona honestidad sobre lo que NO funcionó (SIEMPRE — Commandment I).

### Smoke
- `/retro` con feature cerrada (review APPROVED) → produce `retro.md`.
- `retro.md` resulting actualiza frontmatter de spec.md y tasks/index.md a `status: closed`.

### Cross-validations
- Living-spec deltas (si existen) se proponen como diff, NO se aplican automáticamente.
- Promociones candidatas tienen paths verificables (anti-hallucination).

---

## US8 — Command `/flow` + decisión orchestrator-protocol

### Pre
- US2-US7 todas cerradas.

### Post
- `.claude/commands/flow.md` existe.
- (Opcional) `.claude/commands/flow.ts` si hay lógica condicional compleja.
- Decisión `orchestrator-protocol`: CUT / SIMPLIFICAR / KEEP ejecutada.

### Structural assertions
- `flow.md` frontmatter: `argument-hint: "[--minimal|--standard|--full|--resume <slug>] <task>"`.
- `flow.md` documenta encadenado: `scope-definer` → gate 1→2 → `tech-planner` → `tdd-designer` → gate 2→3 → loop `story-executor` por HU → `critic-reviewer` → `retro-learner`.
- `flow.md` documenta los dos hard gates humanos (1→2 y 2→3).

### Smoke
- `/flow <task>` sin flag → estima triaje y declara modo.
- `/flow --minimal <task>` → salta a Fase 3 directo, sin directorio.
- `/flow --standard <task>` → ejecuta las 5 fases con 2 gates humanos.
- `/flow --resume <slug>` → continúa desde `state.json`.

### Cross-validations
- Si decisión = CUT: `orchestrator-protocol/` no existe.
- Si decisión = SIMPLIFICAR: SKILL.md reescrita a núcleo; refs valiosas preservadas.
- CLAUDE.md, bootstrap-lead.md, otros: refs actualizadas según decisión.

---

## US9 — Update CLAUDE.md raíz

### Pre
- US8 cerrada (todas las decisiones tomadas).

### Post
- CLAUDE.md actualizado.

### Structural assertions
- Sección "Mental model" describe 5 fases (con Fase 2.5 explícita).
- System inventory refleja counts correctos post-decisiones.
- Commandment IX menciona living-spec loop como mecánica de self-improvement.

### Smoke
- Lectura fría de CLAUDE.md por sesión nueva → entiende sistema en <2 min.
- `bun test ./.claude/hooks/` sigue 81/81 (no toca código).

### Cross-validations
- `Grep` en CLAUDE.md no retorna refs a pieces cortadas (planner-protocol, reviewer/builder agents si cortados, orchestrator-protocol si cortada).
- CLAUDE.md referencia correctamente las 6 nuevas skills + `/flow` + estructura `.claude/plans/`.

---

## US11 — `drillme` skill + `/drillme` command (Socratic catalog transversal)

### Pre
- US1 cerrada (templates existen).

### Post
- `.claude/skills/drillme/SKILL.md` existe.
- `.claude/commands/drillme.md` existe.

### Structural assertions
- SKILL.md frontmatter: `name: drillme`, `description` con keywords drill/drillme/socratic/5-whys/valida/cuestiona/challenge/antes-de-cerrar.
- SKILL.md contiene el catálogo canónico literal de las 4 categorías Socratic (`[location]`, `[approach]`, `[context]`, `[failure]`) con sus template questions.
- SKILL.md describe técnicas complementarias (5-whys, first principles, inversión).
- SKILL.md describe los modos de operación: contexto explícito (`/drillme <brief>`) vs auto-detección de fase activa.
- SKILL.md declara explícitamente que es **guidance, NO gate** (Commandment IV no aplica — su fallo no rompe outputs de fase).
- `commands/drillme.md` es wrapper trivial con `argument-hint: "[contexto o pregunta]"`.

### Smoke
- `/drillme "estoy dudando entre A y B"` → produce 3-5 preguntas etiquetadas con `[categoría]`.
- En prompt con keyword "valida esto" o "challenge my decision" → la skill se auto-activa.
- Invocada desde otra skill (US2-US7) → arranca; si falla por probabilismo, el Lead la invoca manualmente con contexto de fase.

### Cross-validations
- Las skills US2-US7 (cuando se implementen) referencian drillme en sus drillme blocks **sin duplicar el catálogo canónico** (las 4 categorías solo viven en drillme/SKILL.md).
- `tasks/index.md` lista US11 en W2 + DAG actualizado.

---

## US10 — Dogfooding final + retro consolidado

### Pre
- US1-US9 cerradas.

### Post
- Mini-feature ejecutada en `.claude/plans/002-{slug}/` con `/flow --standard "<mini-task>"`.
- `retro.md` del meta-refactor en `.claude/plans/001-poneglyph-5phase-workflow/retro.md`.
- Frontmatter de spec.md y tasks/index.md del meta-refactor en `status: closed`.

### Structural assertions
- El mini-feature genera artefactos completos: spec, tasks, validations (o tests), review, retro.
- `retro.md` del meta-refactor contiene secciones del template (Resumen, Lecciones, Proceso, Promociones, Living-spec deltas, Commandments check, Action items).
- `retro.md` identifica explícitamente ≥1 fricción real + ≥1 promoción candidata (AC4 del spec).

### Smoke
- Dogfooding ejecuta el flujo end-to-end **sin intervención manual extraordinaria** (salvo hard gates esperados).
- Mini-feature cierra en `status: closed`.

### Cross-validations
- Todas las HUs (US1-US9) marcadas `status: closed` en sus frontmatters.
- Commit final pushed a origin/main con mensaje "feat(workflow): close 001-poneglyph-5phase-workflow after dogfooding validation".
- `bun test ./.claude/hooks/` sigue 81/81.

---

## Validaciones cross-cutting (sobre el meta-refactor entero)

### Validation X1: Coherencia post-decisiones
Tras todas las decisiones de US3/US5/US6/US8:
- No quedan refs muertas a pieces cortadas en NINGÚN archivo del repo (ni `.md`, ni `.ts`, ni `.json`).
- Verificable con `Grep` exhaustivo en `.claude/` + `CLAUDE.md` + `.husky/` + `.github/`.

### Validation X2: Test policy preservada
- `.claude/rules/test-policy.md` sigue existiendo y declara `auxiliary` para poneglyph (no se cambia).
- `tdd-designer` lo respeta para declarar TDD-mode optional por defecto.

### Validation X3: Hooks no se rompen
- `bun test ./.claude/hooks/` sigue 81/81 al final del meta-refactor.
- No se añaden hooks nuevos sin justificación (Commandment III).

### Validation X4: Commits limpios
- Cada wave produce ≥1 commit con mensaje convencional (`feat(skills): ...`, `feat(commands): ...`, `refactor(agents): ...`).
- Mensajes claros sobre qué decisión absorbida se ejecutó.

### Validation X5: Plans dir convención
- `.claude/plans/` contiene solo dirs con formato `NNN-slug/` (excepto `templates/` y posible `README.md`).
- Numeración secuencial sin huecos.

---

## ¿Por qué este formato (validation-mode) y no TDD para este refactor?

Decisión usuario 2026-05-28: "no sé si es necesario el TDD como tal, lo que sí podríamos poner ciertas validaciones que deben ocurrir en la skill o unos requisitos extras".

Razonamiento:
1. **Sin código ejecutable nuevo** = sin oracle binario natural para tests unit.
2. **Smoke + structural assertions** son verificables (Grep, Read, manual review) sin necesidad de framework de test.
3. **Validation-mode es generalizable**: cualquier futuro refactor que produzca skills/docs/configs puede usarlo (la skill `tdd-designer` lo soporta per US4 AC7).
4. **Anti-pattern bloqueado**: producir `tests.md` con red→green fake para verificar que "el SKILL.md tiene una sección Drillme" es ceremonia sin valor real.

Esto **NO degrada** Commandment IV (blocking quality gates) — las validaciones son ejecutables (la mayoría vía Grep/Read) y deben pasar antes de cerrar Fase 4 en `review.md`. Solo cambia el *formato* del oracle, no su existencia.
