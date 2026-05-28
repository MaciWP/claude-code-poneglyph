---
us: US4
title: Skill `tdd-designer` + command `/tdd-design` (Fase 2.5) — soporta TDD-mode y validation-mode
wave: W2
depends_on: [US1]
tdd_mode: optional
estimate: M
status: approved
approved: 2026-05-28
---

# US4 — `tdd-designer` skill + `/tdd-design` command (Fase 2.5)

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W2 (paralelo con US2, US3, US5-US7) |
| **Depends on** | US1 |
| **Blocks** | US8 |
| **Files touched** | crear `.claude/skills/tdd-designer/SKILL.md` + `.claude/commands/tdd-design.md` |
| **TDD-mode** | optional |
| **Estimate** | M |
| **Cómo arrancar** | Read `tasks/` + `test-policy.md` → decidir output-mode (TDD o validation) → producir `tests.md` o `validations.md` |
| **Decisión absorbida** | — |

## Decisión de output-mode (NUEVO — feedback usuario 2026-05-28)

`tdd-designer` produce **uno de dos artefactos** según la naturaleza de las HUs:

| Naturaleza HU | Output | Razón |
|---|---|---|
| Código ejecutable (funciones, clases, lógica) | `tests.md` (TDD-mode) | Tests unit/integration/property-based ejecutables — oracle binario |
| Markdown/skills/docs/configs (sin lógica unit-testable) | `validations.md` (validation-mode) | Validaciones declarativas: pre/post-conditions, structural assertions, smoke checks, cross-validations |
| Mixto (algunas HUs código, otras docs) | Ambos archivos | Una HU = un modo según su naturaleza |

La skill detecta la naturaleza por: tipo de archivos en `tasks/USX.md` campo `files` + presencia de `.ts`/`.js`/lenguaje vs `.md`/`.json`/config. **Anti-pattern bloqueado**: producir `tests.md` TDD para HUs que solo cambian markdown — es ceremonia sin oracle real.

## User story

- **As a**: developer con `tasks/` (HUs) listo
- **I want**: una skill que especifique los tests mínimos que cada HU debe pasar ANTES de implementar
- **So that**: cada HU tiene un oráculo ejecutable que cierra el feedback loop antes de generar código

## Acceptance criteria

- **AC1**: Given `tasks/index.md` + US{N}.md recientes en el directorio activo, when el Lead procesa el prompt o termina `tech-planner`, then `tdd-designer` se auto-activa.
- **AC2**: Given la skill activa, when arranca, then lee `.claude/rules/test-policy.md` (creado en commit `2349259`) y declara TDD-mode (`forced`/`adaptive`/`optional`) en el frontmatter de `tests.md`.
- **AC3**: Given cada HU del `tasks/`, when produce specs de test, then cada HU recibe ≥1 test happy path + ≥1 edge case (cuando es testeable).
- **AC4**: Given una HU no-testeable (ej. doc only), when se intenta producir test, then la skill lo declara explícitamente y propone `tdd-skip: <reason>` o re-revisar atomicidad de la HU.
- **AC5**: Given una HU con invariantes claros (parser, transformación pura), when se evalúa, then sugiere property-based test opt-in (evidencia +23-37% sobre TDD plano per arxiv 2506.18315).
- **AC6**: Given el `tests.md` o `validations.md` producido, when cierra, then se combina con `tasks/` para hard gate humano 2→3.
- **AC7** (NUEVO): Given una HU cuyos `files` son solo `.md` / `.json` / configs / skills / templates (sin lógica ejecutable), when se evalúa, then la skill produce **validation-mode** en lugar de TDD-mode — `validations.md` con: Pre-conditions, Post-conditions, Structural assertions, Smoke checks, Cross-validations (NO tests unit ejecutables).
- **AC8** (NUEVO): Given una HU mixta (algunos `files` ejecutables + otros markdown), when se evalúa, then `tdd-designer` aplica per-HU el modo correcto (algunas HUs en `tests.md`, otras en `validations.md`).

## Files a crear

| Path | Contenido |
|---|---|
| `.claude/skills/tdd-designer/SKILL.md` | Skill markdown con frontmatter + workflow + drillme |
| `.claude/commands/tdd-design.md` | Wrapper trivial |

## Frontmatter de la skill

```yaml
---
name: tdd-designer
description: |
  Test design BEFORE implementation. Reads tasks/ (HUs) and produces
  tests.md with per-HU specs (Pre/Action/Assert + expected red).
  Honors .claude/rules/test-policy.md to scale TDD-mode.
  Use when: tasks.md/tasks/ ready and tests pending, "diseña tests",
  "TDD", "test design", "specifica tests".
  Keywords - TDD, tests, test-design, specifica, tasks, oracle
disable-model-invocation: false
---
```

## Workflow detallado

1. **Read** `tasks/index.md` + cada `tasks/US{N}.md` del directorio activo.
2. **Read** `.claude/rules/test-policy.md`. Declarar TDD-mode en frontmatter de `tests.md`:
   - `business-critical` → forced (test antes de impl obligatorio).
   - `mixed` → adaptive (per-HU decisión según files que toca).
   - `auxiliary` → optional (tests como verification post-impl).
3. **Por cada HU**:
   - Identificar comportamiento esperado (de los AC Given/When/Then).
   - Generar T{N}.1 happy path: Pre, Action, Assert, falla esperada antes de impl (red).
   - Generar T{N}.2 edge case: ≥1 caso límite.
   - Si HU tiene invariantes → generar T{N}.3 property-based con `generator` + `invariant`.
4. **Drillme Fase 2.5** (las 3 obligatorias):
   - **Drill 1**: ¿Cada HU tiene happy + edge?
   - **Drill 2**: ¿Hay HU no testeable? Si sí, ¿la HU está bien definida?
   - **Drill 3**: ¿Property-based aporta en alguna HU?
5. **Producir `tests.md`** rellenando `templates/tests.template.md` (de US1).
6. **Reportar**: "tests.md lista — junto con tasks/, pendiente aprobación humana (hard gate 2→3)".

## Drillme block (literal)

```markdown
## Drillme — Phase 2.5

1. **Happy + edge?** Each HU has ≥1 happy path + ≥1 edge case test?
2. **Untestable HU?** If any HU has no natural test → is the HU well-defined or atomic?
3. **Property-based fit?** Does any HU have invariants (parsers, pure transforms) that property-based would cover better than examples?

> **For full Socratic check, invoke the `drillme` skill** (US11). The 3 questions above are phase-specific (focused on oracle design); drillme provides the canonical 4-category catalog (covers `[location]`/`[approach]`/`[context]`/`[failure]` more broadly). Do NOT duplicate the canon here.
>
> Skill→skill invocation is probabilistic — if drillme does not auto-fire, the Lead invokes `/drillme "Phase 2.5 test design for <NNN-slug>"` manually before approving hard gate 2→3.
```

## SIEMPRE rules

- Mencionar HU no-testeable: señal de que la HU no es atómica o está mal definida.

## Commandments cubiertos

| # | Cómo |
|---|---|
| II | Tests verificables ejecutables |
| IV | Tests pasan o nada se mergea (blocking gate) |
| VIII | Cuestionario estructurado |

## Reutiliza

- `test-policy.md` rule (commit `2349259`).
- TDD-mode declaration en `planner-protocol/SKILL.md` §0.1 (commit `2349259`). **Nota**: si US3 corta `planner-protocol`, esta lógica de TDD-mode declaration **migra** a `tdd-designer/SKILL.md`.
- `anti-hallucination` (verificar funciones/módulos referenciados en tests).

## Adaptación intra-fase

| Señal | Adaptación |
|---|---|
| `test-policy.md` = auxiliary + mode minimal | tests.md solo happy path, sin edge ni property-based |
| HUs con muchas invariantes (parsers) | Property-based explícito en mayoría de HUs |
| HUs solo de docs/config | `tdd-skip` en mayoría, tests.md mínimo (smoke "doc generado") |

## Casos edge

- **Edge 1**: HU con `tdd-skip: <reason>` en `tasks/USX.md` → tests.md no genera tests para esa HU (skip honesto).
- **Edge 2**: `test-policy.md` no existe → tratar como `auxiliary` por defecto + advertir al usuario.
- **Edge 3**: HU referenciada en `tests.md` no existe en `tasks/` → smell, abortar.

## Smell signals

- ⚠️ Si >30% HUs son no-testeables → la descomposición está mal hecha; volver a Fase 2.
- ⚠️ Si los tests duplican AC del `tasks/USX.md` literal sin añadir oráculo ejecutable → tests decorativos, refactor.

## Verificación post-implementación

- Smoke: invocar `/tdd-design` con un `tasks/index.md` de ejemplo → produce `tests.md` válido.
- Verificar frontmatter de `tests.md` declara TDD-mode correctamente según test-policy.md.

## Socratic categories (canonical mapping — research 2026-05-28)

El drillme de Fase 2.5 (3 preguntas — la fase más focalizada) mapeado contra las **4 categorías canónicas** del [Socratic Prompt Method](https://blogs.jaseci.org/blog/2026/03/10/socratic-prompt-method/):

| Pregunta drillme | Categoría canónica | Etiqueta |
|---|---|---|
| Drill 1 — Happy + edge? | Probe failure modes (cobertura mínima) | `[failure]` |
| Drill 2 — Untestable HU? | Challenge approach (HU mal definida) | `[approach]` |
| Drill 3 — Property-based fit? | Challenge approach (técnica de test óptima) | `[approach]` |

**Cobertura**: 2/4 — faltan `[location]` y `[context]`. Aceptable porque Fase 2.5 está focalizada en oracle design, no en arquitectura global; las otras dimensiones se cubren en Fase 2 (tech-planner). NO añadir preguntas artificialmente — sería ceremonia (Commandment III).
