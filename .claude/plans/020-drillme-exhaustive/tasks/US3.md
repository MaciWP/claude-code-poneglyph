---
us: US3
title: Alinear doctrina (CLAUDE.md) y cablear drillme en /flow (scope + 2 gates)
wave: W2
depends_on: [US1]
tdd_mode: optional
estimate: S
status: closed
approved: <pending hard gate 2->3>
---

# US3 — Doctrina + cableado /flow

## Execution prompt (Phase 3 input)

**Task**: Alinear la doctrina de CLAUDE.md con el drillme exhaustivo y cablear su invocación en `/flow` (scope + ambos hard gates).
**Context**: `CLAUDE.md:76` (Proactive multi-round questioning — ya alineado en intención) y `CLAUDE.md:100` (describe drillme como "Socratic check, 4 canonical categories" — desactualizado: omite el exhaustivo-híbrido). `.claude/commands/flow.md:20` ("deep drillme" en full), `:253` (multi-round en scope/gates), `:313` (related). El spec decide: `/flow` invoca drillme exhaustivo en **scope (Phase 1) + hard gate 1→2 + hard gate 2→3**.
**Constraints**: English. CLAUDE.md es always-loaded (capa de activación más fiable — lección `verify-load-layer`) → la redacción aquí es la que de facto "activa fácil" drillme. Ediciones quirúrgicas, no reescribir secciones enteras. Re-leer antes de Edit (linter). Sync no necesario manual (symlink), pero anotar si CLAUDE.md regenera vía sync-claude.
**Deliverable**: `CLAUDE.md` con la descripción de drillme actualizada (exhaustivo-híbrido, gated por gaps) + `flow.md` con el cableado explícito de drillme en scope + gate 1→2 + gate 2→3.
**Verify**: `grep -n "drillme" CLAUDE.md flow.md` muestra descripción coherente; el cableado en los 3 puntos de /flow es explícito.
**Ask first**: nothing.

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W2 |
| **Depends on** | [US1] |
| **Blocks** | none |
| **Files touched** | `CLAUDE.md`, `.claude/commands/flow.md` |
| **TDD-mode** | optional |
| **Estimate** | S |
| **Cómo arrancar** | Re-leer CLAUDE.md:76,100 + flow.md:20,253,313; editar quirúrgico |
| **Decisión absorbida** | — |

## User story

- **As a**: Lead (que carga CLAUDE.md siempre) y `/flow`
- **I want**: que la doctrina describa drillme como exhaustivo-híbrido y que /flow lo invoque en scope + ambos gates
- **So that**: drillme se active fácil (vía la capa always-loaded) y de forma consistente en el lifecycle

## Acceptance criteria

- **AC1**: Given `CLAUDE.md:100`, when se lee la descripción de drillme, then refleja "exhaustivo hasta cerrar gaps, activación híbrida gated por information-gain", no solo "Socratic check, 4 categories".
- **AC2**: Given `CLAUDE.md:76`, when se lee Proactive multi-round questioning, then queda coherente con el nuevo drillme (sin contradicción residual).
- **AC3**: Given `flow.md`, when se ejecuta /flow, then drillme exhaustivo se invoca en **scope (Phase 1)** + **hard gate 1→2** + **hard gate 2→3** de forma explícita.

## Files a crear / a modificar

| Path | Contenido / Cambio |
|---|---|
| `CLAUDE.md` | Línea ~100: descripción drillme → exhaustivo-híbrido; verificar coherencia línea ~76 |
| `.claude/commands/flow.md` | Cablear drillme en scope + gate 1→2 + gate 2→3 (explícito) |

## Workflow detallado

1. Re-leer las líneas citadas (post-linter).
2. CLAUDE.md: actualizar descripción de drillme (línea ~100); verificar línea ~76.
3. flow.md: añadir/reforzar invocación de drillme en los 3 puntos (scope, gate 1→2, gate 2→3).
4. Grep de verificación.

## Commandments cubiertos

| # | Cómo |
|---|---|
| I | Cablear en la capa fiable (always-loaded) en vez de confiar en auto-trigger probabilístico |
| X | Doctrina y skill dejan de contradecirse |

## Verificación post-implementación

- `grep -n "drillme" CLAUDE.md .claude/commands/flow.md` → descripción y cableado coherentes.
- `bun test ./.claude/hooks/` green (no toca código).

## Open questions (a resolver en implementación)

- Si CLAUDE.md se regenera vía `sync-claude.ts`, confirmar que el cambio persiste en la fuente del repo (no solo en el symlink).
