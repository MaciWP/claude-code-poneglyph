---
us: US9
title: Barrido de referencias en skills auxiliares
wave: W2
depends_on: [US1]
tdd_mode: optional
estimate: S
status: draft
---

# US9 — Barrido de refs a agentes muertos en skills auxiliares

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W2 |
| **Depends on** | [US1] |
| **Blocks** | [US10] |
| **Files touched** | `explain-changes/SKILL.md` + `references/interaction-patterns.md`, `diagnostic-patterns/SKILL.md`, `review-patterns/SKILL.md`, `security-review/SKILL.md`, `prompt-engineer/SKILL.md`, `html-report/SKILL.md` |
| **TDD-mode** | optional |
| **Estimate** | S |
| **Cómo arrancar** | `Grep -n "\b(builder\|reviewer)\b"` en cada uno; reformular ref |
| **Decisión absorbida** | — |

> **Atomicidad**: 7 ficheros pero cambios **triviales 1-línea homogéneos** (reformular "X agent" → "inline / build skill / panel"). Barrido mecánico de bajo riesgo, cohesivo → excepción justificada al límite ≤5 (smell, no ley).

## User story

- **As a**: mantenedor
- **I want**: que las skills auxiliares no remitan a agentes que ya no existen
- **So that**: no queden refs colgando (la incoherencia que el feature combate)

## Acceptance criteria

- **AC1**: Given `explain-changes/SKILL.md` + `references/interaction-patterns.md`, when remiten "delegate to builder agent" para hacer cambios, then reformulado a "Lead inline / `build` skill".
- **AC2**: Given `diagnostic-patterns/SKILL.md:174`, when dice "For: Lead + builder agent", then → "For: el Lead (inline)".
- **AC3**: Given `review-patterns/SKILL.md:83` y `security-review/SKILL.md:182` ("For: reviewer/builder agents"), then reformulado a "review inline / panel-≥4".
- **AC4**: Given `prompt-engineer/SKILL.md:74,115` (ejemplos "planner→builder, builder→reviewer"), then ejemplos actualizados a handoffs vigentes (inline / Workflow agents).
- **AC5**: Given `html-report/SKILL.md:95` ("inside a delegated builder"), then reformulado (inline / Workflow agent).
- **AC6**: Given los falsos positivos (tabla index), then **NO se tocan** (Builder pattern saga, karpathy, meta-create templates, drillme legacy names).

## Files a crear / a modificar

| Path | Cambio (1-línea c/u) |
|---|---|
| `.claude/skills/explain-changes/SKILL.md` | L36,40,155: "Builder agent" → "Lead inline / `build`" |
| `.claude/skills/explain-changes/references/interaction-patterns.md` | L36,123,127: idem |
| `.claude/skills/diagnostic-patterns/SKILL.md` | L174: "builder agent" → "Lead" |
| `.claude/skills/review-patterns/SKILL.md` | L83: "reviewer, builder agents" → "review inline / panel" |
| `.claude/skills/security-review/SKILL.md` | L182: "reviewer agent" → "review inline / panel" |
| `.claude/skills/prompt-engineer/SKILL.md` | L74,115: ejemplos de handoff actualizados |
| `.claude/skills/html-report/SKILL.md` | L95: "delegated builder" → inline / Workflow agent |

## Workflow detallado

1. Por cada fichero: `Grep -n "\b(builder|reviewer)\b"`, leer el contexto de cada hit.
2. Reformular cada ref viva a inline / `build` / panel-≥4 (apuntando al árbol US1).
3. **Saltar** los falsos positivos de la tabla de exentos (verificar que el match no es uno de ellos antes de editar).

## Commandments cubiertos

| # | Cómo |
|---|---|
| X | Cero refs colgando a agentes muertos |

## Smell signals

- ⚠️ Si un fichero requiere reescritura sustantiva (no 1-línea) → no pertenece a este barrido; mover a su HU temática.

## Verificación post-implementación

- `Grep "builder agent|reviewer agent" <los 7>` → 0 vivas.

## Open questions

- Ninguna.
