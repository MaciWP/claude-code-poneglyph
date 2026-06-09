---
us: US4
title: Alinear referenciadores narrativos del Trigger A
wave: W2
depends_on: [US1]
tdd_mode: optional
estimate: M
status: closed
closed: 2026-06-09
implemented: 2026-06-09
---

# US4 — Alinear referenciadores narrativos del Trigger A

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W2 |
| **Depends on** | [US1] |
| **Blocks** | [US7] |
| **Files touched** | `CLAUDE.md`, `commands/flow.md`, `retro/SKILL.md`, `meta-create/SKILL.md`, `docs/lead-mode-when-needed.md` |
| **TDD-mode** | optional |
| **Estimate** | M |
| **Cómo arrancar** | `Grep "≥5 files" -n` en los 5 ficheros; reemplazar el "→ builder" por el árbol |
| **Decisión absorbida** | — |

## User story

- **As a**: Lead
- **I want**: que la prosa que repite "≥5 files → builder" apunte al árbol canónico
- **So that**: no queden definiciones divergentes del umbral de spawn

## Acceptance criteria

- **AC1** (spec AC2): Given los 5 ficheros, when referencian el criterio de spawn, then **apuntan al árbol de US1** (no redefinen "≥5 files → builder").
- **AC2**: Given `CLAUDE.md`, when se lee §When to delegate + System inventory, then Trigger A está reescrito (inline/Workflow) y el inventario dice **0 agentes custom** (antes "3: builder, reviewer, scout").
- **AC3**: Given todos, when se busca "delegates to builder"/"→ builder", then 0 ocurrencias vivas como regla de spawn.

## Files a crear / a modificar

| Path | Cambio |
|---|---|
| `CLAUDE.md` | §When to delegate (Trigger A); Lead Orchestrator allowed tools; System inventory (Agents 3→0); ≥4 rule → enlazar árbol |
| `.claude/commands/flow.md` | L196, L218: "≥5 files → builder" → inline/Workflow default |
| `.claude/skills/retro/SKILL.md` | L271, L347: promo "≥5 files → builder" → Lead inline (default-allow) |
| `.claude/skills/meta-create/SKILL.md` | L7,27,62,87,136: "≥5 files → builder" → inline; el diagrama mermaid |
| `.claude/docs/lead-mode-when-needed.md` | L26,77: "≥5 files → builder" → inline/Workflow |

## Workflow detallado

1. `Grep "builder|≥5 files|context isolation" -n` en cada uno de los 5.
2. Reemplazar cada "→ builder por isolation" por la referencia al árbol (US1): ≥5 files de 1 unidad = inline; ≥4 unidades = Workflow.
3. `CLAUDE.md`: actualizar System inventory (tabla de Agents → 0 custom; nota explicando el corte + link a plan 008).
4. Verificar coherencia: ninguna prosa contradice el árbol.

## Commandments cubiertos

| # | Cómo |
|---|---|
| X | Elimina definiciones divergentes; todo referencia el árbol |
| II | El inventario refleja el estado real (0 agentes) |

## Verificación post-implementación

- `Grep "→ builder|delegates to .builder|≥5 files OR architectural → builder"` en los 5 → 0 vivas.
- `CLAUDE.md` System inventory: Agents = 0 custom, con nota.

## Open questions

- Ninguna.
