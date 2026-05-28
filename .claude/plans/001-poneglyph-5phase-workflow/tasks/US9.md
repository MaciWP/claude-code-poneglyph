---
us: US9
title: Update CLAUDE.md raíz reflejando workflow 5-fases
wave: W4
depends_on: [US8]
tdd_mode: optional
estimate: S
status: approved
approved: 2026-05-28
---

# US9 — Update CLAUDE.md raíz

## ⚡ Quick reference

| Campo | Valor |
|---|---|
| **Status** | 🟡 draft |
| **Wave** | W4 |
| **Depends on** | US8 (debe estar resuelto saber si `orchestrator-protocol` queda o no, y `planner-protocol` ya resuelto en US3) |
| **Blocks** | US10 (dogfooding) |
| **Files touched** | edit `D:\PYTHON\claude-code-poneglyph\CLAUDE.md` |
| **TDD-mode** | optional |
| **Estimate** | S |
| **Cómo arrancar** | Read CLAUDE.md actual → identificar secciones a actualizar (Mental model, system inventory, Commandment IX) → edits |
| **Decisión absorbida** | — (las decisiones ya están tomadas en US3, US5, US6, US8) |

## User story

- **As a**: developer/sesión futura que lee CLAUDE.md para entender el sistema
- **I want**: la sección Mental model + system inventory + Commandment IX reflejen el workflow 5-fases real
- **So that**: cualquier sesión futura entiende el sistema sin tener que leer el spec.md histórico

## Acceptance criteria

- **AC1**: Given el workflow operativo (US1-US8 cerrados), when se edita CLAUDE.md, then sección "Mental model: 4 phases" pasa a "Mental model: 5 phases" con detalle actualizado (incluyendo Fase 2.5 TDD design).
- **AC2**: Given las 6 skills nuevas, when se actualiza el system inventory, then refleja conteos correctos (skills, commands).
- **AC3**: Given las decisiones de US3/US5/US6/US8, when las skills/agents viejas se cortaron, then todas las referencias muertas a `planner-protocol`, `builder`/`reviewer` agents (si cortados), `orchestrator-protocol` (si cortada) se purgan.
- **AC4**: Given el living-spec loop (US7), when se edita Commandment IX, then se menciona explícitamente como mecánica de auto-improvement (no solo el `usage-snapshot.ts` ya cortado en commits previos).
- **AC5**: Given el principio "no built-in telemetry pipeline" (commit `1944dc0`), when se reconcilia con el workflow nuevo, then se documenta que la telemetría sigue siendo ad-hoc reactiva (no es papel de las 5 fases).

## Files a modificar

| Path | Cambios |
|---|---|
| `D:\PYTHON\claude-code-poneglyph\CLAUDE.md` | Sección Mental model (4→5 fases) + system inventory counts + Commandment IX (living-spec loop) + purga refs muertas |

## Workflow

1. Read `CLAUDE.md` actual.
2. Identificar secciones a tocar:
   - "Mental model: 4 phases of work" → renombrar y expandir a 5 fases con Fase 2.5 TDD design.
   - "System inventory" → actualizar skills/agents/commands counts según decisiones AC7 de US3/US5/US6/US8.
   - Commandment IX → añadir living-spec loop como mecánica de auto-improvement.
3. Grep refs a las pieces cortadas (`planner-protocol`, `orchestrator-protocol`, `builder`, `reviewer`) → purgar o actualizar según decisiones tomadas.
4. Edit CLAUDE.md con cambios precisos (sin reescritura completa — preservar estructura).
5. Verificar resultado: `bun test ./.claude/hooks/` sigue 81/81.

## Commandments cubiertos

| # | Cómo |
|---|---|
| II | Verifica antes de purgar refs (Grep las hace explícitas) |
| X | Mantiene CLAUDE.md como single source de verdad |

## Smell signals

- ⚠️ Si CLAUDE.md crece >300 líneas → revisar si la documentación es esencial o decorativa.
- ⚠️ Si quedan refs muertas tras esta HU → la auditoría no fue exhaustiva; volver a Grep.

## Verificación post-implementación

- `Grep "planner-protocol\|orchestrator-protocol" CLAUDE.md` retorna solo refs históricas legítimas (si las hay) o vacío.
- Smoke: leer CLAUDE.md como recién llegado → en <2 minutos entender qué hace el sistema.
- `bun test ./.claude/hooks/` sigue 81/81.
