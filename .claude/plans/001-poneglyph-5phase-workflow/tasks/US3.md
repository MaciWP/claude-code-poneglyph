---
us: US3
title: Skill `tech-planner` + command `/plan` (Fase 2) + decisión `planner-protocol`
wave: W2
depends_on: [US1]
tdd_mode: optional
estimate: L
status: approved
approved: 2026-05-28
absorbs_decision: planner-protocol skill (cortar/simplificar/migrar)
---

# US3 — `tech-planner` skill + `/plan` command (Fase 2)

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W2 (paralelo con US2, US4-US7) |
| **Depends on** | US1 (estructura + templates) |
| **Blocks** | US8 (`/flow` necesita esta skill) |
| **Files touched** | crear `.claude/skills/tech-planner/SKILL.md` + `.claude/commands/plan.md`; condicionales: cortar/migrar `planner-protocol/` + actualizar refs en CLAUDE.md, bootstrap, otros |
| **TDD-mode** | optional |
| **Estimate** | L (la más densa de W2 por la decisión absorbida) |
| **Cómo arrancar** | Read `spec.md` aprobado → cuestionario para cerrar plan → investigación obligatoria (Context7 + WebFetch + Grep) → drillme → producir `tasks/index.md` + N `tasks/US{N}.md` |
| **Decisión absorbida** | `planner-protocol` skill: CUT / SIMPLIFICAR / MIGRAR-Y-CUT |

## User story

- **As a**: developer con un `spec.md` aprobado
- **I want**: una skill auto-activable que produzca un plan técnico con HUs atómicas + DAG explícito + investigación previa obligatoria
- **So that**: puedo ejecutar una HU a la vez sin sorpresas de dependencias, respetando el estilo del proyecto

## Acceptance criteria

- **AC1**: Given keywords `plan` / `planifica` / `roadmap` / `tareas` / `HU` + un `spec.md` aprobado disponible, when el Lead procesa el prompt, then la skill `tech-planner` se auto-activa.
- **AC2**: Given la skill activa, when arranca, then investiga obligatoriamente: (a) Context7 MCP para docs oficiales de APIs externas mencionadas en spec; (b) WebFetch para 1-2 proyectos exitosos como referencia (si área nueva); (c) Grep/Glob proyecto para 5-10 ejemplos del patrón a usar.
- **AC3**: Given investigación completada, when produce HUs, then cada HU sigue formato canónico (role/action/benefit + AC Given/When/Then + depends-on + files + TDD-mode + estimate + wave) y se escribe como archivo separado en `.claude/plans/{NNN}-{slug}/tasks/US{N}.md` con su frontmatter.
- **AC4**: Given las HUs, when termina la skill, then el `tasks/index.md` contiene DAG mermaid explícito + tabla resumen + cross-cutting decisions + open questions.
- **AC5**: Given complejidad >60 declarada por el Lead, when hay 2+ soluciones técnicas razonables, then invoca `decision-stress-test` (existente) antes de cerrar el plan.
- **AC6**: Given el plan producido, when la skill cierra, then invoca automáticamente `tdd-designer` (US4) para Fase 2.5 si modo standard/full; reporta al usuario: "tasks/ + tests.md listos — hard gate 2→3".
- **AC7** (decisión absorbida): Given la skill operativa, when se compara con `planner-protocol` (existente, 116 líneas + references), then se ejecuta UNA de tres acciones documentadas:
  - **CUT** si `tech-planner` cubre 100% de los casos de uso de `planner-protocol`.
  - **SIMPLIFICAR** si quedan references útiles no cubiertos (ej: complexity-routing, agent-selection) → reescribir SKILL.md viejo a su núcleo no cubierto.
  - **MIGRAR-Y-CUT** si las references valiosas se absorben en `tech-planner` y se borra el resto.
- **AC8**: Given la decisión de AC7, when se ejecuta, then todas las referencias cruzadas a `planner-protocol` en el repo se actualizan (Grep + Edit), incluyendo CLAUDE.md, otros skills, bootstrap-lead.md.

## Files a crear

| Path | Contenido |
|---|---|
| `.claude/skills/tech-planner/SKILL.md` | Skill markdown con frontmatter + workflow + drillme + estructura output |
| `.claude/commands/plan.md` | Wrapper trivial |

## Files a modificar/borrar (según decisión AC7)

| Path | Acción condicional |
|---|---|
| `.claude/skills/planner-protocol/` | CUT (borrar dir entera) **O** simplificar SKILL.md y references |
| `.claude/commands/planner.md` | Si planner-protocol se corta → corta este command también (ya es wrapper) |
| `D:\PYTHON\claude-code-poneglyph\CLAUDE.md` | Update sección Mental model + system inventory si refs cambian |
| `.claude/rules/bootstrap-lead.md` (si existe) | Update refs |
| `.claude/skills/orchestrator-protocol/references/` | Purgar refs a planner-protocol |
| Cualquier SKILL.md que mencione "planner-protocol" | Update via Grep |

## Frontmatter de la skill (exacto)

```yaml
---
name: tech-planner
description: |
  Technical plan from approved spec.md: atomic user stories (HUs) + DAG of
  dependencies + obligatory research (Context7 + WebFetch + project Grep).
  Replaces planner-protocol (decided in this same task per AC7).
  Use when: approved spec.md exists and technical decomposition needed,
  "plan", "tareas", "roadmap", "descomponer", "HU", "atomizar".
  Keywords - plan, planifica, roadmap, tareas, HU, atomizar, descomponer,
  DAG, dependencies, wave, parallel, atomic, story
disable-model-invocation: false
argument-hint: "[--minimal|--standard|--full]"
---
```

## Workflow detallado de la skill

1. **Read `spec.md`** del directorio activo. Verificar `status: approved` (si draft → STOP, escalar al usuario).

2. **Cuestionario para cerrar el plan** (respetando scope de Fase 1):
   - "¿Hay estilo/convenciones del proyecto a preservar (linter, formatter, naming)?"
   - "¿APIs externas en juego? ¿Qué versión?"
   - "¿Constraints performance/security adicionales no en spec?"
   - Máximo 3-5 preguntas; saltar si el spec ya lo cubre.

3. **Investigación obligatoria** (paralelizable, mismo mensaje):
   - **Context7 MCP**: docs oficiales de cada API externa mencionada (verificar versión, breaking changes).
   - **WebFetch** (solo si área desconocida): 1-2 proyectos exitosos como referencia.
   - **Grep/Glob proyecto**: 5-10 ejemplos del patrón a usar (preservar estilo).
   - Documentar fuentes en `tasks/index.md` sección "Research".

4. **Cuestionario de mejoras** (proactivo): si detecta un patrón del proyecto que podría mejorarse → preguntar al usuario + dar opinión. NO ejecutar sin permiso.

5. **Drillme Fase 2** (las 5 obligatorias):
   - **Drill 1**: ¿Hay solución más simple que cumpla el spec? (Commandment III)
   - **Drill 2**: ¿Estoy reinventando algo que ya existe en el proyecto?
   - **Drill 3**: ¿Las HUs son verdaderamente atómicas (≤1 sesión cada una)?
   - **Drill 4**: ¿Las dependencias son reales o ficticias (orden cosmético, no técnico)?
   - **Drill 5**: ¿Qué pasa si una HU falla — bloquea todo o el DAG sobrevive?

6. **Si modo `full` + 2+ soluciones razonables**: invocar `decision-stress-test` con las alternativas. Esperar veredicto antes de cerrar plan.

7. **Construir DAG**:
   - Identificar dependencias funcionales (US{N} necesita output de US{M}).
   - Identificar paralelismo (HUs sin deps cruzadas → misma wave).
   - Calcular `Parallel Efficiency Score` (parallel ops / total que pueden serlo).
   - Si Score <50% → STOP, refactor del DAG.

8. **Producir artefactos**:
   - `.claude/plans/{NNN}-{slug}/tasks/index.md` con resumen + DAG + tabla.
   - Un archivo por HU: `tasks/US{N}.md` con frontmatter + contenido completo.
   - Cada HU rellena el template `tasks.template.md` (campos obligatorios: role/action/benefit + AC + depends_on + files + tdd_mode + estimate + wave).

9. **Resolver AC7 (decisión planner-protocol)**:
   - Auditar `planner-protocol/SKILL.md` y references (already verified: 116 líneas + 8 references docs).
   - Comparar cobertura con `tech-planner`:
     - ¿§0 Level Triage cubierto? Sí, en el workflow de tech-planner (modo minimal/standard/full).
     - ¿§1 Fundamental Goals cubierto? Parcial — TDD pasa a `tdd-designer`, parallelism queda aquí.
     - ¿§2 Task Classification 🔵🟡🔴? Sí, en construcción del DAG.
     - ¿§4 Output Format? Sí — adaptado al nuevo formato (un archivo por HU).
     - References 01-08: algunas válidas como referencia técnica (gap-analysis, classification-waves, workflow-phases) → migrar a `tech-planner/references/` si aporta; cortar el resto.
   - Decisión propuesta: **MIGRAR-Y-CUT** — absorber references útiles, cortar el resto + cortar `/planner` command.

10. **Ejecutar decisión**:
    - Si CUT/MIGRAR-Y-CUT: `rm -rf .claude/skills/planner-protocol/` + `rm .claude/commands/planner.md`.
    - Update refs vía Grep + Edit en repo entero.

11. **Invocar `tdd-designer`** automáticamente si modo standard/full (Fase 2.5).

12. **Reportar al usuario**:
    - Paths: `tasks/index.md` + N archivos `tasks/US{N}.md`.
    - Resumen DAG (waves + total HUs).
    - Decisión sobre `planner-protocol` (qué se cortó/migró).
    - Indicación: "Hard gate 2→3 — necesito tu aprobación junto con tests.md (siguiente skill)."

## Drillme block (literal)

```markdown
## Drillme — Phase 2

Before closing this phase, validate:

1. **Simpler option?** Is there a simpler solution that meets the spec?
2. **Reinventing wheel?** Am I duplicating something already in the project?
3. **Truly atomic?** Each US completable in ≤1 session?
4. **Real deps?** Are dependencies functional or just cosmetic ordering?
5. **Failure tolerance?** If one US fails mid-implementation, does the DAG survive?

If any answer is "I don't know" or evasive → iterate plan; do NOT close.

> **For full Socratic check, invoke the `drillme` skill** (US11). The 5 questions above are phase-specific; drillme provides the canonical 4-category catalog + complementary patterns. Do NOT duplicate the canon here.
>
> Skill→skill invocation is probabilistic — if drillme does not auto-fire, the Lead invokes `/drillme "Phase 2 plan closing for <NNN-slug>"` manually before approving the hard gate 2→3.
```

## SIEMPRE rules implementadas

- Cuestionario para cerrar el plan (respetando scope Fase 1).
- Cuestionario de mejoras (proactivo si detecta patrón mejorable del proyecto).
- Glob/Grep ejemplos similares antes de proponer estructura (respetar estilo).

## Commandments cubiertos

| # | Cómo |
|---|---|
| II | Context7/Grep/WebFetch antes de afirmar viabilidad |
| III | Drillme drill 1 + 2 detectan over-engineering y reinvención |
| V | Investigación obligatoria = entender antes de planear |
| VII | DAG identifica paralelismo (Parallel Efficiency Score >50%) |
| VIII | Cuestionarios estructurados + investigación dirigida |

## Reutiliza

- `decision-stress-test` (solo modo full + alternativas razonables).
- `anti-hallucination` (verificar funciones/archivos antes de afirmar existencia en HUs).
- Context7 MCP, WebFetch, Glob, Grep.

## Adaptación intra-fase

| Señal | Adaptación |
|---|---|
| Spec de complejidad ≤30, 1-2 archivos conocidos | Saltar Context7/WebFetch; 1-3 HUs simples; saltar decision-stress-test |
| Spec con APIs externas no triviales | Context7 obligatorio; verificar versión y breaking changes |
| Spec multi-dominio | Construir 2-3 sub-DAGs por dominio; identificar interfaces entre dominios |

Declarar en `tasks/index.md`: "Plan minimal/standard/full — modo X por motivo Y".

## Casos edge

- **Edge 1**: spec.md con `status: approved
approved: 2026-05-28` (no aprobado) → STOP, escalar al usuario para aprobar Fase 1 antes.
- **Edge 2**: spec.md con Open questions no resueltas → resolver con usuario antes de planear (no asumir).
- **Edge 3**: HUs con ciclo en el DAG → smell signal — refactor.
- **Edge 4**: Wave con >10 HUs paralelas → revisar si todas son realmente independientes; sospechar de granularidad excesiva.

## Smell signals

- ⚠️ Si una HU requiere >5 archivos → demasiado grande, split.
- ⚠️ Si una HU tiene >5 deps → granularidad mal definida, refactor.
- ⚠️ Si el DAG es lineal (todas secuenciales) → revisar si hay paralelismo no explotado.
- ⚠️ Si la decisión AC7 (planner-protocol) se vuelve "mantener todo" → cuestionar; el solapamiento con tech-planner es real.

## Verificación post-implementación

- `bun test ./.claude/hooks/` sigue 81/81.
- Si `planner-protocol` se cortó: `Grep "planner-protocol" .claude/` retorna 0 matches (excepto históricos en memoria/spec).
- Smoke: invocar `/plan` con un spec.md de ejemplo → produce `tasks/index.md` + N archivos US{N}.md.
- Smoke: invocar `/tech-planner` (auto-activación por keyword) → idem.

## Socratic categories (canonical mapping — research 2026-05-28)

El drillme de Fase 2 mapeado contra las **4 categorías canónicas** del [Socratic Prompt Method](https://blogs.jaseci.org/blog/2026/03/10/socratic-prompt-method/):

| Pregunta drillme | Categoría canónica | Etiqueta |
|---|---|---|
| Drill 1 — Simpler option? | Challenge approach | `[approach]` |
| Drill 2 — Reinventing wheel? | Introduce context (¿qué hay ya en el proyecto?) | `[context]` |
| Drill 3 — Truly atomic? | Challenge approach (granularidad) | `[approach]` |
| Drill 4 — Real deps? | Introduce context (dependencias funcionales reales) | `[context]` |
| Drill 5 — Failure tolerance? | Probe failure modes | `[failure]` |

**Cobertura**: 3/4 — falta `[location]` (¿es el sitio correcto para esta planificación?). Para reforzar, añadir en implementación una sexta pregunta opcional: `[location]` ¿Estos archivos viven en el directorio correcto, o el proyecto tiene una convención que las HUs están ignorando?

## Nota sobre fiabilidad skill→skill (research 2026-05-28)

`tech-planner` invoca automáticamente `tdd-designer` al cerrar (AC6) y opcionalmente `decision-stress-test` (AC5). Según [docs Anthropic](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) + [Issue #59968](https://github.com/anthropics/claude-code/issues/59968):

- La invocación skill→skill **NO está garantizada al 100%**. Es probabilística (description-match) o de alta-fiabilidad-pero-no-absoluta (instrucción inline).
- **Mitigación recomendada**: en el SKILL.md de `tech-planner`, escribir la invocación de `tdd-designer` como instrucción **imperativa explícita** ("MUST invoke `/tdd-design` after producing tasks/ — do not return control to user yet"), no como sugerencia. Si falla → el Lead detecta el gap en la verificación post-skill.
- Si la invocación falla repetidamente → considerar promover a invocación programática vía `/flow` (US8 lo encadena).

## Open questions (implementación)

- Si `planner-protocol/references/` tiene contenido valioso (ej. agent-selection.md), ¿migrar a `tech-planner/references/` o a `orchestrator-protocol`? Decidir en implementación tras leer cada reference.
- Si la decisión es CUT total → revisar si `bootstrap-lead.md` referencia planner-protocol y actualizar.
