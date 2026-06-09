---
us: US3
title: Corregir scope + decide (3 perspectives sub-≥4)
wave: W2
depends_on: [US1]
tdd_mode: optional
estimate: S
status: closed
absorbs_decision: OQ2
---

# US3 — Corregir `scope` + `decide` (perspectives sub-≥4)

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W2 |
| **Depends on** | [US1] |
| **Blocks** | [US7] |
| **Files touched** | `scope/SKILL.md` (Step 3), `decide/SKILL.md` |
| **TDD-mode** | optional |
| **Estimate** | S |
| **Cómo arrancar** | Read `scope/SKILL.md` Step 3 (spawn 3 perspectives) |
| **Decisión absorbida** | OQ2 |

## User story

- **As a**: Lead
- **I want**: que `scope`/`decide` dejen de spawnear 3 perspectives (sub-≥4)
- **So that**: el sistema no viole su propia regla ≥4

## Acceptance criteria

- **AC1** (spec AC6): Given `scope/SKILL.md` Step 3 (modo full), when se invoca el análisis multi-perspectiva, then corre **inline en main** (Lead adopta las 3 lentes secuencialmente) — **no** spawn de 3 agentes. Si se quiere paralelo real → escalar a **≥4 vía Workflow** (opt-in).
- **AC2**: Given `decide/SKILL.md`, when usa "3 agent perspectives", then idem: inline por defecto, ≥4 vía Workflow si paralelo.
- **AC3**: Given ambos, when referencian el criterio de spawn, then **apuntan al árbol de US1** (no redefinen umbral).

## Files a crear / a modificar

| Path | Cambio |
|---|---|
| `.claude/skills/scope/SKILL.md` | Step 3: "3 perspectives en paralelo (3 Agent calls)" → "inline (3 lentes de razonamiento); ≥4 → Workflow opt-in". Ajustar tabla auxiliary + coste. |
| `.claude/skills/decide/SKILL.md` | "3 agent perspectives" → inline o ≥4. Ajustar el flujo. |

## Workflow detallado

1. Read `scope/SKILL.md` Step 3 + sección auxiliary `decision-stress-test`.
2. Reescribir: las 3 perspectivas (Outsider/User/Product) las **razona el Lead inline** (no spawnea). Nota: si el usuario quiere robustez paralela → escalar a ≥4 perspectivas vía Workflow (opt-in).
3. Read `decide/SKILL.md`; aplicar el mismo criterio.
4. Asegurar que ambos enlazan al árbol canónico (US1) para el umbral.

## Commandments cubiertos

| # | Cómo |
|---|---|
| III | Inline evita spawn innecesario |
| X | Las skills dejan de contradecir la propia regla |

## Verificación post-implementación

- `Grep "3 parallel Agent|3 perspectives" scope/SKILL.md decide/SKILL.md` → reformulado a inline/≥4.
- Lectura: ningún path spawnea exactamente 3 agentes.

## Open questions

- ¿Mantener la opción "≥4 perspectivas vía Workflow" como opt-in documentado, o eliminar perspectivas paralelas del todo? Default: documentar el opt-in ≥4 (no eliminar la capacidad).
