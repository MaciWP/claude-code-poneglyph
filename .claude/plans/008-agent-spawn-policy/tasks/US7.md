---
us: US7
title: Hooks + config + tests (bloqueante bun test)
wave: W2
depends_on: [US1]
tdd_mode: optional
estimate: M
status: draft
---

# US7 — Hooks + config + tests 🩻 (bloqueante AC8)

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W2 (ejecutar inmediatamente tras US2) |
| **Depends on** | [US1] |
| **Blocks** | [US10] |
| **Files touched** | `hooks/post-compact.ts`, `hooks/__tests__/post-compact.test.ts`, `config/cost-budget.json` |
| **TDD-mode** | optional → el test SÍ es oracle ejecutable aquí |
| **Estimate** | M |
| **Cómo arrancar** | Read los 3; editar hook **y** su test JUNTOS |
| **Decisión absorbida** | bloqueante AC8 |

## User story

- **As a**: mantenedor
- **I want**: que el reminder post-compact, su test y el config de coste no referencien agentes muertos
- **So that**: `bun test` quede verde y el reminder no mienta tras el corte

## Acceptance criteria

- **AC1**: Given `hooks/post-compact.ts`, when se lee `LEAD_REMINDER`, then **no menciona** "builder, reviewer, scout" como subagentes disponibles ni "Delegate to builder for ≥5 files"; refleja el árbol (inline / Workflow / Explore).
- **AC2** (bloqueante): Given `hooks/__tests__/post-compact.test.ts`, when corre, then sus asserts se actualizan al nuevo reminder y **pasa** (no asierta strings de agentes muertos).
- **AC3**: Given `config/cost-budget.json`, when se lee el mapa `scout/reviewer/builder → modelo`, then se **elimina o reescribe** (OQ: borrar si ningún hook lo consume; reescribir a tiers de Workflow si sí). Verificar consumidores con `Grep "cost-budget"`.
- **AC4** (spec AC8): Given `bun test ./.claude/hooks/`, when corre tras esta HU, then **verde** (mismo contador o ajustado coherentemente).

## Files a crear / a modificar

| Path | Cambio |
|---|---|
| `.claude/hooks/post-compact.ts` | `LEAD_REMINDER` L6-7: quitar "builder, reviewer, scout"/"Delegate to builder"; describir el árbol (inline/Workflow/Explore) |
| `.claude/hooks/__tests__/post-compact.test.ts` | L6-8: actualizar asserts al nuevo reminder (no `toContain("builder"/"reviewer"/"scout")`) |
| `.claude/config/cost-budget.json` | L31-33: borrar/reescribir el mapa agente→modelo (según consumidores) |

## Workflow detallado

1. Read los 3 + `Grep -rn "cost-budget" .claude` (¿quién consume el config?).
2. Editar `post-compact.ts` `LEAD_REMINDER` → describir el árbol; quitar nombres de agentes muertos.
3. **En el mismo paso**, actualizar `post-compact.test.ts` para que asierte el nuevo reminder.
4. Resolver `cost-budget.json`: si 0 consumidores → borrar el bloque de agentes; si hay → reescribir a tiers genéricos.
5. `bun test ./.claude/hooks/` → debe quedar verde antes de cerrar.

## Commandments cubiertos

| # | Cómo |
|---|---|
| II | El reminder refleja el estado real (0 agentes) |
| IV | `bun test` verde es gate bloqueante de esta HU |

## Casos edge

- Edge 1: otros hooks/tests referencian agentes → `Grep` en `hooks/` lo detecta; plegar aquí o nota a US10.
- Edge 2: `cost-budget.json` consumido por un hook no inventariado → reescribir, no borrar.

## Verificación post-implementación

- `bun test ./.claude/hooks/` → verde.
- `Grep "builder|reviewer|scout" hooks/` → 0 (salvo histórico/comentario justificado).

## Open questions

- Destino exacto de `cost-budget.json` (borrar vs reescribir) — se resuelve con el Grep de consumidores.
