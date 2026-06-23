---
us: US1
title: Reinstaurar skill-advisor como skill propone→ratifica ("drillme de skills")
wave: W1
depends_on: []
tdd_mode: forced
estimate: M
status: closed
approved: 2026-06-23
---

# US1 — Reinstaurar skill-advisor (propone→ratifica)

## Execution prompt (Phase 3 input)

**Task**: Crear `.claude/skills/skill-advisor/SKILL.md` (+ helper `.claude/skills/skill-advisor/lib/rank.ts` testeable) que, dada la tarea actual, lea las skills de disco, rankee un shortlist ≤5 de candidatas y lo presente al usuario vía `AskUserQuestion` para ratificar cuáles activar.
**Context**: Diseño canónico en `.claude/plans/_research-skill-activation-2026-06-09.md` §147-169 ("Implicaciones para skill-advisor"). Patrón: propone→humano-valida; backstop al undertrigger en fronteras de fase donde el auto-trigger es ~0%. Skills viven en `.claude/skills/*/SKILL.md` (proyecto) + `~/.claude/skills/*/SKILL.md` (global). El head de cada SKILL.md trae `name`+`description`+`Keywords` (ver `skill-activation.ts:loadSkills` para el patrón de lectura — reutilizar su enfoque de leer heads). NO re-implementar el matching semántico del modelo: la skill razona sobre el listing + disco, el ranking determinista es solo un pre-filtro.
**Constraints**: NO construir índice de keywords propio (los estudios dan keywords con efecto ~0). NO forzar invocación (imposible). La parte determinista (leer skills de disco + rankear) va en `lib/rank.ts` (TDD forced). La parte de ratificación (`AskUserQuestion`) va en el cuerpo de SKILL.md como procedimiento. Multi-pasada permitida. Su PROPIA `description`+`when_to_use` deben ser directivas (que no caiga ella misma víctima del undertrigger). Inglés en el fichero (Commandment language).
**Deliverable**: `SKILL.md` (frontmatter directivo + workflow propone→ratifica + invocación en fronteras de fase/on-demand) + `lib/rank.ts` (función pura: dada `task` + lista de skills `{name,description,keywords}`, devuelve shortlist ≤5 rankeado) + tests en `__tests__/rank.test.ts`.
**Verify**: `bun test .claude/skills/skill-advisor/__tests__/` verde; el system-reminder de skills muestra `skill-advisor` con `Use when:`+`Keywords -`; smoke: invocar `/skill-advisor "tarea X"` arranca el ranking + AskUserQuestion.
**Ask first**: nada — decisiones cerradas en spec + research.

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W1 |
| **Depends on** | none |
| **Blocks** | US2 (nombra `skill-advisor`) |
| **Files touched** | `.claude/skills/skill-advisor/SKILL.md`, `lib/rank.ts`, `__tests__/rank.test.ts` |
| **TDD-mode** | forced (lógica de ranking) |
| **Estimate** | M |
| **Cómo arrancar** | Leer research §147-169 + `skill-activation.ts:loadSkills`; escribir test rojo de `rank()` |
| **Decisión absorbida** | — |

## User story

- **As a**: Lead (sesión principal) que tiende a olvidar invocar skills
- **I want**: una skill que me proponga un shortlist ratificable de skills relevantes para la tarea
- **So that**: haya un backstop humano al undertrigger en fronteras de fase, sin pelear con el modelo

## Acceptance criteria

- **AC1**: Given una tarea + las skills de `.claude/skills/` y `~/.claude/skills/`, when se invoca skill-advisor, then `rank()` devuelve un shortlist ≤5 ordenado por relevancia (test puro con fixtures).
- **AC2**: Given el shortlist, when la skill corre, then presenta las candidatas vía `AskUserQuestion` para que el humano ratifique cuáles activar (no las activa sola).
- **AC3**: Given el frontmatter de skill-advisor, when lo revisa el harness, then tiene `description` directiva + `when_to_use` con gatillos ES+EN y respeta el cap 1.536.
- **AC4**: `bun test` de la skill verde.

## Files a crear / a modificar

| Path | Contenido / Cambio |
|---|---|
| `.claude/skills/skill-advisor/SKILL.md` | Nueva skill: frontmatter directivo + workflow propone→ratifica |
| `.claude/skills/skill-advisor/lib/rank.ts` | Función pura de ranking (lee skills, pre-filtra, ordena) |
| `.claude/skills/skill-advisor/__tests__/rank.test.ts` | Tests de `rank()` |

## Workflow detallado

1. Leer research §147-169 + `skill-activation.ts` (`loadSkills`/`matchSkills`) para reutilizar el patrón de lectura de heads.
2. (TDD rojo) Escribir `rank.test.ts`: fixtures de skills + tarea → shortlist esperado ≤5.
3. Implementar `rank.ts` (verde): lee skills de ambas rutas, pre-filtra/ordena por señal simple (overlap léxico + presencia), devuelve ≤5. Sin índice persistente.
4. Escribir `SKILL.md`: workflow (1. obtener tarea, 2. `rank()`, 3. `AskUserQuestion` ratificar, 4. multi-pasada si el usuario pide profundizar) + frontmatter directivo + `when_to_use` ES/EN + invocación en fronteras de fase / on-demand.
5. `bun test` verde + smoke.

## Drillme (Socratic check)

1. `[location]` ¿`lib/rank.ts` dentro de la skill, o un script compartido? → dentro: es lógica propia de skill-advisor.
2. `[approach]` ¿por qué pre-filtro determinista + no índice? → keywords tienen efecto ~0 (research); el valor es el ratify gate, no el matching.
3. `[context]` ¿cómo coordina con el hook (US2)? → el hook nombra skill-advisor; esta skill es el paso profundo on-demand/fase, no per-turn.
4. `[failure]` ¿qué pasa si no hay skills que matcheen? → shortlist vacío → la skill lo dice y no fuerza nada.

## SIEMPRE rules implementadas

- Propone, nunca activa sola — el humano ratifica (Commandment I).
- No re-implementa el matching del modelo ni construye índice.

## Commandments cubiertos

| # | Cómo |
|---|---|
| I | Simbiosis: Claude propone shortlist, humano decide |
| III | Mínimo: una skill + un helper puro, sin infra nueva |
| IX | Backstop explícito al undertrigger |

## Reutiliza

- `skill-activation.ts:loadSkills` — patrón de lectura de heads de SKILL.md.

## Verificación post-implementación

- Smoke: `/skill-advisor "optimiza el endpoint lento"` → shortlist + AskUserQuestion.
- `bun test .claude/skills/skill-advisor/__tests__/` verde.
